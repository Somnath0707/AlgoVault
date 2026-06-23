import { fetchUserProfile, fetchSolvedProblems, fetchAllSubmissions, fetchContestHistory } from "../lib/api/leetcode"
import { BACKEND_URL } from "../lib/constants"
import { getUserSettings, getUsername, setLastSync, setUsername, storage } from "../lib/storage"
import {
  sendSelfReport,
  sendSessionEvent,
  sendSessionHeartbeat,
  sendSubmissionResult,
  startSession
} from "../lib/api/backend"

export {}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error))

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_side_panel" && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId })
  }

  if (message.action === "get_prediction") {
    getUsername()
      .then((username) => {
        if (!username) throw new Error("Set your LeetCode username in AlgoVault settings first")
        return fetch(`${BACKEND_URL}/api/predict/${message.slug}`, {
          headers: { "X-Leetcode-Username": username }
        })
      })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch prediction")
        return res.json()
      })
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "sync_history") {
    runSync(message.username).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }

  if (message.action === "get_zerotrac") {
    fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json")
      .then((res) => res.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "session_start") {
    getUserSettings()
      .then((settings) => startSession(message.mode || settings.sessionMode || "PRACTICE"))
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "session_event") {
    sendSessionEvent(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "session_heartbeat") {
    sendSessionHeartbeat(message.payload)
      .then((data) => {
        storage.set("algovault.currentSession", data)
        sendResponse({ ok: true, data })
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "submission_result") {
    sendSubmissionResult(message.payload)
      .then((data) => {
        storage.set("algovault.currentSession", data)
        sendResponse({ ok: true, data })
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "post_solve_report") {
    sendSelfReport(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }
})

async function runSync(username: string) {
  if (!username || !username.trim()) {
    throw new Error("LeetCode username is required")
  }
  const normalizedUsername = username.trim()
  await setUsername(normalizedUsername)

  const updateStatus = (status: string, msg: string, count = 0, subCount = 0) => {
    chrome.storage.local.set({ syncStatus: { status, message: msg, count, subCount } })
  }

  try {
    updateStatus("RUNNING", "Fetching user profile...")
    const profileRes = await fetchUserProfile(normalizedUsername)
    if (!profileRes.data?.matchedUser) throw new Error("User not found on LeetCode")
    const profile = profileRes.data.matchedUser

    updateStatus("RUNNING", "Fetching solved problems...", 0, 0)
    const problemsRes = await fetchSolvedProblems(0, 5000)
    const problems = problemsRes.data?.problemsetQuestionList?.questions || []

    updateStatus("RUNNING", "Fetching submissions...", problems.length, 0)
    const subsRes = await fetchAllSubmissions(0, 3000)
    const rawSubs = subsRes.submissions_dump || []
    const submissions = rawSubs.map((s: any) => ({
      id: String(s.id),
      title: s.title,
      titleSlug: s.title_slug,
      statusDisplay: s.status_display,
      lang: s.lang,
      timestamp: String(s.timestamp),
      runtime: s.runtime,
      memory: s.memory
    }))

    updateStatus("RUNNING", "Fetching contest history...", problems.length, submissions.length)
    const contestRes = await fetchContestHistory(normalizedUsername)
    const contestHistory = contestRes.data?.userContestRankingHistory || []
    const contestRanking = contestRes.data?.userContestRanking || null

    updateStatus("RUNNING", "Pushing to AlgoVault backend...", problems.length, submissions.length)

    const response = await fetch(`${BACKEND_URL}/api/sync/leetcode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Leetcode-Username": normalizedUsername
      },
      body: JSON.stringify({
        username: normalizedUsername,
        profile: profile.profile,
        solvedProblems: problems,
        submissions,
        contestHistory,
        contestRanking
      })
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`Backend sync failed: ${errBody}`)
    }

    await setLastSync(Date.now())
    updateStatus("SUCCESS", "Sync completed successfully!", problems.length, submissions.length)
    return { ok: true }
  } catch (e: any) {
    console.error("Sync Error:", e)
    updateStatus("ERROR", e.message || "An unknown error occurred during sync")
    return { ok: false, error: e.message }
  }
}
