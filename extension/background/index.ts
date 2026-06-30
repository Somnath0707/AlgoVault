import { fetchUserProfile, fetchSolvedProblems, fetchAllSubmissions, fetchContestHistory, fetchProblemMetadata, fetchUserStatus, fetchContestQuestions, fetchReplayEvents } from "../lib/api/leetcode"
import { getUserSettings, getUsername, setLastSync, setUsername, storage, getGithubPat, getGithubRepo, getZerotracData, getZerotracLastFetched, setZerotracData } from "../lib/storage"
import { commitToGithub, getExtensionForLanguage } from "../lib/api/github"
import { fetchEntrantHubHistory, fetchEntrantHubRealtime, fetchEntrantHubUpcoming, type LeetCodeRegion } from "../lib/api/entranthub"
import {
  fetchPrediction,
  fetchCurrentSession,
  sendSelfReport,
  sendSessionEvent,
  sendSessionHeartbeat,
  sendSubmissionResult,
  startSession,
  endSession,
  fetchContests,
  syncLeetcode
} from "../lib/api/backend"

export {}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error))

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_side_panel" && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId })
  }

  if (message.action === "get_prediction") {
    fetchPrediction(message.slug)
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "get_contests_backend") {
    fetchContests()
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "get_entranthub_prediction") {
    const { contestSlug, username, region = "US" } = message.payload;
    fetchEntrantHubRealtime(contestSlug, username, region.toUpperCase() as LeetCodeRegion)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_entranthub_history") {
    const { username, region = "US" } = message.payload;
    fetchEntrantHubHistory(username, region.toUpperCase() as LeetCodeRegion)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_entranthub_upcoming") {
    fetchEntrantHubUpcoming()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_contest_questions") {
    fetchContestQuestions(message.payload.contestSlug)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_replay_events") {
    const { username, contestSlug, questionSlug } = message.payload;
    fetchReplayEvents(username, contestSlug, questionSlug)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_user_contest_history") {
    fetchContestHistory(message.payload.username)
      .then((data) => sendResponse({ ok: true, data: data.data || {} }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_leetcode_contest_ranking") {
    const { contestSlug, username } = message.payload;
    fetch(`https://leetcode.com/contest/api/ranking/${contestSlug}/?pagination=1&region=global&username=${username}`)
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "sync_history") {
    runSync(message.username).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }

  if (message.action === "get_zerotrac") {
    getCachedZerotracRatings()
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "session_start") {
    getUserSettings()
      .then(async (settings) => {
        const current = await fetchCurrentSession()
        return current || startSession(message.mode || settings.sessionMode || "PRACTICE")
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "session_end") {
    endSession()
      .then((data) => {
        storage.remove("algovault.currentSession")
        sendResponse({ ok: true, data })
      })
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
    const payload = message.payload;
    sendSubmissionResult(payload)
      .then(async (data) => {
        storage.set("algovault.currentSession", data)

        // Try syncing code and generating structured docs on GitHub if Accepted and credentials exist
        if (payload.statusDisplay === "Accepted" && payload.code) {
          const pat = await getGithubPat();
          const repo = await getGithubRepo();
          if (pat && repo) {
            try {
              // 1. Fetch LeetCode problem metadata
              const metaList = await fetchProblemMetadata([payload.titleSlug]);
              const meta: any = metaList && metaList.length ? metaList[0] : null;

              const ext = getExtensionForLanguage(payload.codeLang || payload.language);
              
              // 2. Commit the solution code file
              const codePath = `problems/${payload.titleSlug}/Solution.${ext}`;
              const commitMessageCode = `Add solution for ${payload.title || payload.titleSlug} [Accepted]`;
              await commitToGithub(pat, repo, codePath, commitMessageCode, payload.code);

              // 3. Construct and commit the README.md file
              const readmePath = `problems/${payload.titleSlug}/README.md`;
              const qId = meta?.frontendQuestionId ? `${meta.frontendQuestionId}. ` : "";
              const qTitle = meta?.title || payload.title || payload.titleSlug;
              const difficulty = meta?.difficulty || "Unknown";
              const tags = meta?.topicTags ? meta.topicTags.map((t: any) => `\`${t.name}\``).join(", ") : "None";

              // Map difficulty to color for shields.io badges
              let difficultyColor = "gray";
              if (difficulty.toLowerCase() === "easy") difficultyColor = "10b981";
              else if (difficulty.toLowerCase() === "medium") difficultyColor = "dfa054";
              else if (difficulty.toLowerCase() === "hard") difficultyColor = "ef4444";

              const langRaw = payload.codeLang || payload.language || "Unknown";
              const langBadge = encodeURIComponent(langRaw);
              const langMarkdown = langRaw.toLowerCase();

              const readmeContent = [
                `# ⚡ LeetCode Solution: ${qId}${qTitle}`,
                "",
                `[![Difficulty](https://img.shields.io/badge/Difficulty-${difficulty}-${difficultyColor}?style=for-the-badge)](#)`,
                `[![Language](https://img.shields.io/badge/Language-${langBadge}-2563eb?style=for-the-badge)](#)`,
                "",
                `## 📝 Problem Metadata`,
                `- **Problem Link**: [LeetCode Link](https://leetcode.com/problems/${payload.titleSlug}/)`,
                `- **Difficulty**: ${difficulty}`,
                `- **Topics**: ${tags}`,
                "",
                `## 📊 Performance Telemetry`,
                `| Metric | Value | Performance Status |`,
                `| :--- | :--- | :--- |`,
                `| **Runtime Speed** | \`${payload.runtimeMs != null ? `${payload.runtimeMs} ms` : "N/A"}\` | Optimized execution |`,
                `| **Memory Allocation** | \`${payload.memoryKb != null ? `${Math.round(payload.memoryKb / 10.24) / 100} MB` : "N/A"}\` | Braced space allocation |`,
                `| **Date Solved** | \`${new Date(payload.submittedAt).toLocaleString()}\` | Completed successfully |`,
                "",
                `## 💻 Implementation Source Code`,
                "```" + (langMarkdown.includes("c++") ? "cpp" : langMarkdown),
                payload.code,
                "```",
                "",
                `---`,
                `*Generated and synchronized automatically by [AlgoVault](https://github.com/Somnath0707/AlgoVault) - Your competitive programming operating system.*`
              ].join("\n");

              const commitMessageReadme = `Generate README for ${payload.title || payload.titleSlug}`;
              await commitToGithub(pat, repo, readmePath, commitMessageReadme, readmeContent);
              console.log(`Successfully synced solution and README for ${payload.titleSlug} to GitHub.`);
            } catch (gitErr) {
              console.error("Error during GitHub sync operation:", gitErr);
            }
          }
        }

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

  if (message.action === "add_to_vault") {
    import("../lib/api/backend").then(m => m.addToVault(message.payload))
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
    updateStatus("RUNNING", "Verifying LeetCode session...")
    const statusRes = await fetchUserStatus()
    const sessionUser = statusRes.data?.userStatus?.username
    if (!sessionUser || sessionUser.toLowerCase() !== normalizedUsername.toLowerCase()) {
      throw new Error(`You can only sync the account currently logged into LeetCode.com (Logged in as: ${sessionUser || 'Guest'})`)
    }

    updateStatus("RUNNING", "Fetching user profile...")
    const profileRes = await fetchUserProfile(normalizedUsername)
    if (!profileRes.data?.matchedUser) throw new Error("User not found on LeetCode")
    const profile = profileRes.data.matchedUser

    updateStatus("RUNNING", "Fetching solved problems...", 0, 0)
    const problems: any[] = []
    let problemOffset = 0
    const problemPageSize = 100
    let totalSolved = Number.POSITIVE_INFINITY
    while (problems.length < totalSolved) {
      const problemsRes = await fetchSolvedProblems(problemOffset, problemPageSize)
      const page = problemsRes.data?.problemsetQuestionList
      if (!page) throw new Error("LeetCode did not return solved-problem data")
      totalSolved = page.totalNum || 0
      const questions = page.questions || []
      if (questions.length === 0) break
      problems.push(...questions)
      problemOffset += questions.length
      updateStatus("RUNNING", "Fetching solved problems...", problems.length, 0)
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    updateStatus("RUNNING", "Fetching submissions...", problems.length, 0)

    const rawSubs: any[] = []
    let offset = 0
    const limit = 100
    let hasNext = true

    while (hasNext) {
      const subsRes = await fetchSubmissionPage(offset, limit)
      const pageSubs = subsRes.submissions_dump || []
      if (pageSubs.length === 0) {
        if (subsRes.has_next) throw new Error("LeetCode returned an empty submission page before history ended")
        break
      }
      rawSubs.push(...pageSubs)
      hasNext = Boolean(subsRes.has_next)
      offset += pageSubs.length
      
      updateStatus("RUNNING", "Fetching submissions...", problems.length, rawSubs.length)
      
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    // Deduplicate submissions by ID to handle any list shifting during pagination
    const uniqueRawSubs = Array.from(new Map(rawSubs.map(s => [s.id, s])).values())

    const submissions = uniqueRawSubs.map((s: any) => ({
      id: String(s.id),
      title: s.title,
      titleSlug: s.title_slug,
      statusDisplay: s.status_display,
      lang: s.lang,
      timestamp: String(s.timestamp),
      runtime: s.runtime,
      memory: s.memory
    }))

    const knownSlugs = new Set(problems.map((problem) => problem.titleSlug))
    const attemptedOnlySlugs = Array.from(new Set(
      submissions
        .map((submission) => submission.titleSlug)
        .filter((slug) => slug && !knownSlugs.has(slug))
    ))
    for (let index = 0; index < attemptedOnlySlugs.length; index += 40) {
      const metadata = await fetchProblemMetadata(attemptedOnlySlugs.slice(index, index + 40))
      problems.push(...metadata)
      updateStatus("RUNNING", "Enriching attempted problems...", problems.length, submissions.length)
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    updateStatus("RUNNING", "Fetching contest history...", problems.length, submissions.length)
    const contestRes = await fetchContestHistory(normalizedUsername)
    const contestHistory = contestRes.data?.userContestRankingHistory || []
    const contestRanking = contestRes.data?.userContestRanking || null

    updateStatus("RUNNING", "Pushing to AlgoVault backend...", problems.length, submissions.length)

    await syncLeetcode({
      username: normalizedUsername,
      profile: profile.profile,
      solvedProblems: problems,
      submissions,
      contestHistory,
      contestRanking
    })

    await setLastSync(Date.now())
    updateStatus("SUCCESS", "Sync completed successfully!", problems.length, submissions.length)
    return { ok: true }
  } catch (e: any) {
    console.error("Sync Error:", e)
    updateStatus("ERROR", e.message || "An unknown error occurred during sync")
    return { ok: false, error: e.message }
  }
}

async function fetchSubmissionPage(offset: number, limit: number) {
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchAllSubmissions(offset, limit)
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))
      }
    }
  }
  throw lastError
}

async function getCachedZerotracRatings() {
  const [cached, fetchedAt] = await Promise.all([
    getZerotracData(),
    getZerotracLastFetched()
  ])
  if (cached && fetchedAt && Date.now() - fetchedAt < 24 * 60 * 60 * 1000) {
    return cached
  }

  const response = await fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json")
  if (!response.ok) throw new Error(`ZeroTrac request failed: ${response.status}`)
  const data = await response.json()
  if (!Array.isArray(data)) throw new Error("ZeroTrac returned an invalid payload")
  await setZerotracData(data)
  return data
}
