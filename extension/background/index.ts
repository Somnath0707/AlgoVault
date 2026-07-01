import { fetchUserProfile, fetchSolvedProblems, fetchAllSubmissions, fetchContestHistory, fetchProblemMetadata, fetchUserStatus, fetchContestQuestions, fetchReplayEvents, fetchUpcomingContests, fetchPastContests } from "../lib/api/leetcode"
import { getUserSettings, getUsername, setLastSync, setUsername, storage, getGithubPat, getGithubRepo, getZerotracData, getZerotracLastFetched, setZerotracData } from "../lib/storage"
import { commitToGithub, getExtensionForLanguage } from "../lib/api/github"
import { fetchEntrantHubHistory, fetchEntrantHubRealtime, fetchEntrantHubUpcoming, fetchEntrantHubPast, fetchEntrantHubRankingPrediction, type LeetCodeRegion } from "../lib/api/entranthub"
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
    const { contestSlug, username } = message.payload;
    console.log("background/index.ts: get_entranthub_prediction called with:", { contestSlug, username })

    fetchEntrantHubRankingPrediction(contestSlug, username)
      .then((data) => {
        console.log("background/index.ts: fetchEntrantHubRankingPrediction resolved with:", data)
        sendResponse({ ok: true, data })
      })
      .catch(async (err) => {
        console.error("background/index.ts: fetchEntrantHubRankingPrediction rejected with error:", err)
        const fallback = await fetchLeetCodeContestRankFallback(contestSlug, username).catch(() => null)
        console.log("background/index.ts: fetchLeetCodeContestRankFallback returned:", fallback)
        sendResponse({ ok: false, error: err.message, fallback })
      })
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
      .catch(async (err) => {
        console.warn("EntrantHub upcoming failed, falling back to LeetCode GraphQL", err)
        try {
          const fallbackData = await fetchUpcomingContests()
          sendResponse({ ok: true, data: fallbackData })
        } catch (fallbackErr: any) {
          sendResponse({ ok: false, error: fallbackErr.message || "Failed to fetch contests" })
        }
      })
    return true
  }

  if (message.action === "get_entranthub_past") {
    fetchEntrantHubPast()
      .then((data) => sendResponse({ ok: true, data }))
      .catch(async (err) => {
        console.warn("EntrantHub past contests failed, falling back to LeetCode GraphQL", err)
        try {
          const fallbackData = await fetchPastContests(1, 20)
          sendResponse({ ok: true, data: fallbackData, warning: err.message })
        } catch (fallbackErr: any) {
          sendResponse({ ok: false, error: fallbackErr.message || err.message })
        }
      })
    return true
  }

  if (message.action === "get_leetcode_past_contests") {
    fetchPastContests(1, 20)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_entranthub_cookies") {
    chrome.cookies.getAll({ domain: "entranthub.com" }, (cookies) => {
      chrome.cookies.getAll({ domain: "api.entranthub.com" }, (cookiesApi) => {
        const formatCookies = (list: chrome.cookies.Cookie[]) =>
          (list || []).map(c => ({
            name: c.name,
            valueLength: c.value ? c.value.length : 0,
            domain: c.domain,
            path: c.path,
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: c.sameSite,
            session: c.session,
            expirationDate: c.expirationDate
          }))

        sendResponse({
          ok: true,
          cookies: formatCookies(cookies),
          cookiesApi: formatCookies(cookiesApi)
        })
      })
    })
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

  if (message.action === "get_user_profile") {
    fetchUserProfile(message.payload.username)
      .then((data) => sendResponse({ ok: true, data: data.data || {} }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_leetcode_contest_ranking") {
    const { contestSlug, username, page = 1 } = message.payload;
    fetch(`https://leetcode.com/contest/api/ranking/${contestSlug}/?pagination=${page}&region=global&username=${username}`)
      .then((res) => res.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "sync_history") {
    runSync(message.username, message.startOffset || 0).then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }

  if (message.action === "get_zerotrac") {
    getCachedZerotracRatings()
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "get_solved_problem_slugs") {
    getSolvedProblemSlugs()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "session_start") {
    getUserSettings()
      .then(async (settings) => {
        const current = await fetchCurrentSession()
        return current || startSession(message.mode || settings.sessionMode || "PRACTICE")
      })
      .then(async (data) => {
        await storage.set("algovault.currentSession", data)
        sendResponse({ ok: true, data })
      })
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

        if (payload.statusDisplay === "Accepted") {
          await syncAcceptedSubmissionToGithub(payload, "PENDING_SELF_REPORT", data).catch((gitErr) => {
            console.error("Error during GitHub sync operation:", gitErr)
          })
        }

        sendResponse({ ok: true, data })
      })
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "post_solve_report") {
    sendSelfReport(message.payload)
      .then(async () => {
        await updateGithubHelpReport(message.payload).catch((err) => console.warn("GitHub help report update failed", err))
        sendResponse({ ok: true })
      })
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

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed
}

function slugPathSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown"
}

function markdownLanguage(language?: string) {
  const raw = (language || "").toLowerCase()
  if (raw.includes("c++") || raw.includes("cpp")) return "cpp"
  if (raw.includes("c#") || raw.includes("csharp")) return "csharp"
  if (raw.includes("javascript")) return "javascript"
  if (raw.includes("typescript")) return "typescript"
  if (raw.includes("python")) return "python"
  if (raw.includes("golang")) return "go"
  return raw.replace(/[^a-z0-9#+-]/g, "") || "text"
}

function formatMb(memoryKb?: number) {
  return memoryKb != null ? `${Math.round(memoryKb / 10.24) / 100} MB` : "N/A"
}

function formatMs(runtimeMs?: number) {
  return runtimeMs != null ? `${runtimeMs} ms` : "N/A"
}

function helpTypeLabel(helpType?: string) {
  switch (helpType) {
    case "NONE":
      return "Solved solo"
    case "HINT":
      return "Needed hint"
    case "EDITORIAL":
      return "Used editorial"
    case "EXTERNAL":
      return "Used external help"
    case "PENDING_SELF_REPORT":
      return "Pending self report"
    default:
      return helpType || "Not recorded"
  }
}

async function fetchLeetCodeContestRankFallback(contestSlug: string, username: string) {
  if (!contestSlug || !username) return null
  const url = `https://leetcode.com/contest/api/ranking/${encodeURIComponent(contestSlug)}/?pagination=1&region=global&username=${encodeURIComponent(username)}`
  const response = await fetch(url, { credentials: "include" })
  if (!response.ok) throw new Error(`LeetCode ranking fallback failed: ${response.status}`)
  const data = await response.json()
  const rows = [
    ...(Array.isArray(data?.total_rank) ? data.total_rank : []),
    ...(Array.isArray(data?.user_rank) ? data.user_rank : [])
  ]
  const row = rows.find((item: any) => {
    const rowName = item?.username || item?.user_slug || item?.user?.username || item?.user?.user_slug
    return rowName && String(rowName).toLowerCase() === username.toLowerCase()
  }) || rows[0]
  if (!row) return null
  return {
    attended: true,
    rank: Number(row.rank ?? row.ranking ?? row.real_rank) || null,
    score: Number(row.score ?? row.total_score) || null,
    finishTimeSeconds: Number(row.finish_time ?? row.finishTimeInSeconds) || null,
    source: "LEETCODE_RANKING"
  }
}

async function buildGithubArtifact(payload: any, helpType: string, sessionData?: any) {
  const metaList = await fetchProblemMetadata([payload.titleSlug]).catch(() => [])
  const meta: any = metaList && metaList.length ? metaList[0] : null
  const qId = meta?.frontendQuestionId ? String(meta.frontendQuestionId) : ""
  const qTitle = meta?.title || payload.title || payload.titleSlug
  const difficulty = meta?.difficulty || "Unknown"
  const difficultyFolder = slugPathSegment(difficulty)
  const idPrefix = qId ? `${qId}-` : ""
  const folder = `leetcode/${difficultyFolder}/${idPrefix}${payload.titleSlug}`
  const language = payload.codeLang || payload.language || "Unknown"
  const ext = payload.code ? getExtensionForLanguage(language) : "missing.txt"
  const codePath = `${folder}/solution.${ext}`
  const tags = Array.isArray(meta?.topicTags) ? meta.topicTags.map((tag: any) => tag.name).filter(Boolean) : []
  const timeSpentSeconds = typeof sessionData?.focusSeconds === "number" ? sessionData.focusSeconds : null

  const metadata = {
    title: qTitle,
    titleSlug: payload.titleSlug,
    frontendQuestionId: qId || null,
    leetcodeUrl: `https://leetcode.com/problems/${payload.titleSlug}/`,
    difficulty,
    topics: tags,
    language,
    verdict: payload.statusDisplay,
    submissionId: payload.submissionId || null,
    submittedAt: payload.submittedAt,
    runtimeMs: payload.runtimeMs ?? null,
    memoryKb: payload.memoryKb ?? null,
    totalCorrect: payload.totalCorrect ?? null,
    totalTestcases: payload.totalTestcases ?? null,
    helpType,
    helpLabel: helpTypeLabel(helpType),
    focusSeconds: timeSpentSeconds,
    syncedAt: new Date().toISOString()
  }

  const topicText = tags.length ? tags.map((tag: string) => `\`${tag}\``).join(", ") : "N/A"
  const codeFence = markdownLanguage(language)
  const solutionBlock = payload.code
    ? ["```" + codeFence, payload.code, "```"].join("\n")
    : "Code was not captured from the LeetCode submit response. The metadata and solve record were still saved."

  const readme = [
    `# ${qId ? `${qId}. ` : ""}${qTitle}`,
    "",
    `- Link: https://leetcode.com/problems/${payload.titleSlug}/`,
    `- Difficulty: ${difficulty}`,
    `- Topics: ${topicText}`,
    `- Language: ${language}`,
    `- Verdict: ${payload.statusDisplay || "Accepted"}`,
    `- Help used: ${helpTypeLabel(helpType)}`,
    `- Runtime: ${formatMs(payload.runtimeMs)}`,
    `- Memory: ${formatMb(payload.memoryKb)}`,
    `- Test cases: ${payload.totalCorrect ?? "?"}/${payload.totalTestcases ?? "?"}`,
    `- Focus time: ${timeSpentSeconds != null ? `${Math.round(timeSpentSeconds / 60)} min` : "N/A"}`,
    `- Solved at: ${payload.submittedAt}`,
    "",
    "## Solution",
    "",
    solutionBlock,
    "",
    "## AlgoVault Notes",
    "",
    "This folder was generated from a real accepted LeetCode submission event. Help-used data is updated after the post-solve self report."
  ].join("\n")

  const codeContent = payload.code || [
    "AlgoVault could not capture source code for this accepted event.",
    "The problem, telemetry, and self-report metadata are still recorded in README.md and metadata.json."
  ].join("\n")

  return {
    folder,
    codePath,
    readmePath: `${folder}/README.md`,
    metadataPath: `${folder}/metadata.json`,
    codeContent,
    readme,
    metadata,
    payload
  }
}

async function syncAcceptedSubmissionToGithub(payload: any, helpType = "PENDING_SELF_REPORT", sessionData?: any) {
  if (!payload?.titleSlug) return
  const artifact = await buildGithubArtifact(payload, helpType, sessionData)
  await storage.set(`algovault.gitSolve.${payload.titleSlug}`, artifact)

  let pat = await getGithubPat()
  let repo = await getGithubRepo()
  if (!pat || !repo) {
    await storage.set("algovault.gitSyncStatus", {
      success: false,
      message: "GitHub credentials are not configured",
      timestamp: Date.now(),
      problem: payload.title || payload.titleSlug
    })
    return
  }

  pat = stripWrappingQuotes(pat)
  repo = stripWrappingQuotes(repo)

  const commitPrefix = `${artifact.metadata.frontendQuestionId ? `${artifact.metadata.frontendQuestionId}. ` : ""}${artifact.metadata.title}`
  const writes = [
    {
      path: artifact.codePath,
      message: `Sync accepted solution for ${commitPrefix}`,
      content: artifact.codeContent
    },
    {
      path: artifact.readmePath,
      message: `Update notes for ${commitPrefix}`,
      content: artifact.readme
    },
    {
      path: artifact.metadataPath,
      message: `Update metadata for ${commitPrefix}`,
      content: JSON.stringify(artifact.metadata, null, 2) + "\n"
    }
  ]

  for (const write of writes) {
    const result = await commitToGithub(pat, repo, write.path, write.message, write.content)
    if (!result.ok) {
      await storage.set("algovault.gitSyncStatus", {
        success: false,
        message: result.message,
        timestamp: Date.now(),
        problem: payload.title || payload.titleSlug,
        path: write.path
      })
      return
    }
  }

  await storage.set("algovault.gitSyncStatus", {
    success: true,
    message: "Success",
    timestamp: Date.now(),
    problem: payload.title || payload.titleSlug,
    path: artifact.folder
  })
}

async function updateGithubHelpReport(report: any) {
  if (!report?.titleSlug || !report.helpType) return
  const artifact = await storage.get<any>(`algovault.gitSolve.${report.titleSlug}`)
  if (!artifact?.payload) return
  await syncAcceptedSubmissionToGithub(artifact.payload, report.helpType, {
    focusSeconds: artifact.metadata?.focusSeconds
  })
}

async function runSync(username: string, startOffset = 0) {
  if (!username || !username.trim()) {
    throw new Error("LeetCode username is required")
  }
  const normalizedUsername = username.trim()
  await setUsername(normalizedUsername)

  const updateStatus = (status: string, msg: string, count = 0, subCount = 0) => {
    chrome.storage.local.set({ syncStatus: { status, message: msg, count, subCount } })
  }

  try {
    updateStatus("RUNNING", startOffset === 0 ? "Verifying LeetCode session..." : "Resuming sync session...")
    const statusRes = await fetchUserStatus()
    const sessionUser = statusRes.data?.userStatus?.username
    if (!sessionUser || sessionUser.toLowerCase() !== normalizedUsername.toLowerCase()) {
      throw new Error(`You can only sync the account currently logged into LeetCode.com (Logged in as: ${sessionUser || 'Guest'})`)
    }

    updateStatus("RUNNING", "Fetching user profile...")
    const profileRes = await fetchUserProfile(normalizedUsername)
    if (!profileRes.data?.matchedUser) throw new Error("User not found on LeetCode")
    const profile = profileRes.data.matchedUser

    const problems: any[] = []
    if (startOffset === 0) {
      updateStatus("RUNNING", "Fetching solved problems...", 0, 0)
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
      await storage.set("algovault.solvedSlugs", {
        fetchedAt: Date.now(),
        slugs: problems.map((problem: any) => problem.titleSlug).filter(Boolean),
        rawProblems: problems
      })
    } else {
      const cached = await storage.get<any>("algovault.solvedSlugs")
      if (cached && Array.isArray(cached.rawProblems)) {
        problems.push(...cached.rawProblems)
      } else {
        updateStatus("RUNNING", "Fetching solved problems...", 0, 0)
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
      }
    }

    updateStatus("RUNNING", "Fetching submissions...", problems.length, 0)

    const rawSubs: any[] = []
    let offset = startOffset
    const limit = 20
    let hasNext = true
    const maxSubmissionsToSync = 400
    while (hasNext && rawSubs.length < maxSubmissionsToSync) {
      const subsRes = await fetchSubmissionPage(offset, limit)
      const pageSubs = subsRes.submissions_dump || []
      if (pageSubs.length === 0) {
        if (subsRes.has_next) throw new Error("LeetCode returned an empty submission page before history ended")
        break
      }
      rawSubs.push(...pageSubs)
      hasNext = Boolean(subsRes.has_next)
      offset += pageSubs.length
      
      updateStatus("RUNNING", "Fetching submissions...", problems.length, startOffset + rawSubs.length)
      
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    // Save status to chrome storage for settings view
    await storage.set("algovault.syncHasMore", {
      hasMore: hasNext,
      nextOffset: offset,
      username: normalizedUsername
    })

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
      updateStatus("RUNNING", "Enriching attempted problems...", problems.length, startOffset + submissions.length)
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    updateStatus("RUNNING", "Fetching contest history...", problems.length, startOffset + submissions.length)
    const contestRes = await fetchContestHistory(normalizedUsername)
    const contestHistory = contestRes.data?.userContestRankingHistory || []
    const contestRanking = contestRes.data?.userContestRanking || null

    updateStatus("RUNNING", "Pushing to AlgoVault backend...", problems.length, startOffset + submissions.length)

    await syncLeetcode({
      username: normalizedUsername,
      profile: profile.profile,
      solvedProblems: problems,
      submissions,
      contestHistory,
      contestRanking
    })

    await setLastSync(Date.now())
    updateStatus("SUCCESS", "Sync completed successfully. This full sync remains valid for long-term dashboard use.", problems.length, startOffset + submissions.length)
    return { ok: true }
  } catch (e: any) {
    console.error("Sync Error:", e)
    updateStatus("ERROR", e.message || "An unknown error occurred during sync")
    return { ok: false, error: e.message }
  }
}

async function getSolvedProblemSlugs(): Promise<string[]> {
  const cached = await storage.get<any>("algovault.solvedSlugs")
  if (cached?.fetchedAt && Date.now() - cached.fetchedAt < 5 * 60 * 1000 && Array.isArray(cached.slugs)) {
    return cached.slugs
  }

  const slugs: string[] = []
  let offset = 0
  const limit = 100
  let total = Number.POSITIVE_INFINITY
  while (slugs.length < total) {
    const response = await fetchSolvedProblems(offset, limit)
    const page = response.data?.problemsetQuestionList
    if (!page) throw new Error("LeetCode did not return accepted problems. Sign in and try again.")
    total = page.totalNum || 0
    const questions = page.questions || []
    if (!questions.length) break
    slugs.push(...questions.map((question: any) => question.titleSlug).filter(Boolean))
    offset += questions.length
  }

  const unique = Array.from(new Set(slugs))
  await storage.set("algovault.solvedSlugs", { fetchedAt: Date.now(), slugs: unique })
  return unique
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
