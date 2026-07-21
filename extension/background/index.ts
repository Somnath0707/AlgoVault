import { fetchUserProfile, fetchSolvedProblems, fetchAllSubmissions, fetchContestHistory, fetchProblemMetadata, fetchUserStatus, fetchContestQuestions, fetchReplayEvents, fetchUpcomingContests, fetchPastContests } from "../lib/api/leetcode"
import { getUserSettings, getUsername, setLastSync, setUsername, storage, getGithubPat, getGithubRepo, getZerotracData, getZerotracLastFetched, setZerotracData } from "../lib/storage"
import { commitToGithub, getExtensionForLanguage } from "../lib/api/github"
import { type LeetCodeRegion } from "../lib/api/entranthub"
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
  syncLeetcode,
  fetchEntrantHubRankingPredictionBackend,
  fetchZerotracRatingsBackend,
  addToVault
} from "../lib/api/backend"

export {}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error))

let isSyncing = false;

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

    fetchEntrantHubRankingPredictionBackend(contestSlug, username)
      .then((data) => {
        console.log("background/index.ts: fetchEntrantHubRankingPredictionBackend resolved with:", data)
        sendResponse({ ok: true, data })
      })
      .catch(async (err) => {
        console.error("background/index.ts: fetchEntrantHubRankingPredictionBackend rejected with error:", err)
        const fallback = await fetchLeetCodeContestRankFallback(contestSlug, username).catch(() => null)
        console.log("background/index.ts: fetchLeetCodeContestRankFallback returned:", fallback)
        sendResponse({ ok: false, error: err.message, fallback })
      })
    return true
  }

  if (message.action === "get_leetcode_past_contests") {
    fetchPastContests(1, 20)
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
    if (isSyncing) {
      sendResponse({ ok: false, error: "A sync operation is already in progress." })
      return true
    }
    isSyncing = true
    runSync(message.username, message.startOffset || 0)
      .then((res) => {
        isSyncing = false
        sendResponse(res)
      })
      .catch((error) => {
        isSyncing = false
        sendResponse({ ok: false, error: error.message })
      })
    return true
  }

  if (message.action === "get_zerotrac") {
    getCachedZerotracRatings()
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (message.action === "get_problem_rating") {
    getSingleProblemRating(message.slug || "")
      .then((rating) => sendResponse(rating))
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
    
    chrome.storage.local.get([
      "algovault.isZenith",
      "algovault.zenithGrade",
      "algovault.zenithReason",
      "algovault.zenithFocusScore",
      "algovault.problemStartTime"
    ], (res) => {
      const isZenith = !!res["algovault.isZenith"];
      let helpType: "NONE" | "PENDING_SELF_REPORT" = "PENDING_SELF_REPORT";

      if (isZenith) {
        payload.isZenith = true;
        payload.grade = res["algovault.zenithGrade"] || "S_PLUS";
        payload.reason = res["algovault.zenithReason"] || "Pure Solve";
        payload.focusScore = res["algovault.zenithFocusScore"] ?? 100.0;
        
        const startTime = res["algovault.problemStartTime"];
        payload.timeSpentSeconds = startTime 
          ? Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
          : 0;
        payload.codeSubmitted = payload.code || "";

        // Reset Zenith state since solve is done
        chrome.storage.local.set({ "algovault.isZenith": false });
        helpType = "NONE";
      }

      // Trigger GitHub sync independently in the background so backend failures don't block it
      if (payload.statusDisplay === "Accepted") {
        syncAcceptedSubmissionToGithub(payload, helpType).catch((gitErr) => {
          console.error("Error during GitHub sync operation:", gitErr)
        })
      }

      sendSubmissionResult(payload)
        .then((data) => {
          storage.set("algovault.currentSession", data)
          sendResponse({ ok: true, data })
          // Broadcast to any open sidepanel dashboard to refresh fresh data
          chrome.runtime.sendMessage({ action: "dashboard_refresh" })
        })
        .catch((err) => {
          console.error("Backend submission report failed:", err)
          sendResponse({ ok: false, error: err.message })
        })
    });
    return true
  }

  if (message.action === "post_solve_report") {
    // Sync post-solve report to GitHub independently
    updateGithubHelpReport(message.payload).catch((err) => {
      console.warn("GitHub help report update failed", err)
    })

    sendSelfReport(message.payload)
      .then(() => {
        sendResponse({ ok: true })
      })
      .catch((err) => {
        console.error("Backend self report failed:", err)
        sendResponse({ ok: false, error: err.message })
      })
    return true
  }

  if (message.action === "add_to_vault") {
    addToVault(message.payload)
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

  const readme = `<h2><a href="https://leetcode.com/problems/${payload.titleSlug}/">${qId ? `${qId}. ` : ""}${qTitle}</a></h2><h3>${difficulty}</h3><hr>${meta?.content || "Problem description not found."}`;

  const codeContent = payload.code || [
    "AlgoVault could not capture source code for this accepted event.",
    "The problem, telemetry, and self-report metadata are still recorded in README.md and metadata.json."
  ].join("\n");

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
  const timeStr = payload.runtimeMs != null ? `${payload.runtimeMs} ms` : "N/A"
  const spaceStr = payload.memoryKb != null ? `${Math.round(payload.memoryKb / 10.24) / 100} MB` : "N/A"
  
  const writes = [
    {
      path: artifact.codePath,
      message: `Time: ${timeStr}, Space: ${spaceStr} - AlgoVault`,
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
    const isHistoryBackfill = startOffset > 0
    updateStatus("RUNNING", isHistoryBackfill ? `Syncing older history from submission ${startOffset + 1}...` : "Verifying LeetCode session...")
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
    const cachedSolved = await storage.get<any>("algovault.solvedSlugs")
    const isCacheValid = cachedSolved && cachedSolved.fetchedAt && (Date.now() - cachedSolved.fetchedAt < 15 * 60 * 1000) && Array.isArray(cachedSolved.rawProblems)

    if (isCacheValid) {
      problems.push(...cachedSolved.rawProblems)
    } else if (startOffset === 0) {
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
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
      await storage.set("algovault.solvedSlugs", {
        fetchedAt: Date.now(),
        slugs: problems.map((problem: any) => problem.titleSlug).filter(Boolean),
        rawProblems: problems
      })
    } else {
      if (cachedSolved && Array.isArray(cachedSolved.rawProblems)) {
        problems.push(...cachedSolved.rawProblems)
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
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      }
    }

    updateStatus("RUNNING", "Fetching submissions...", problems.length, 0)

    const rawSubs: any[] = []
    let offset = startOffset
    const limit = 20
    let hasNext = true
    // LeetCode exposes submission pages in small chunks. We deliberately
    // collect at most 400 records before one backend upload so history syncs
    // are rate-friendly and resumable without losing the pagination cursor.
    const maxSubmissionsToSync = 400

    // Read the timestamp of the last successfully synced submission
    const latestSyncedTs = await storage.get<number>("algovault.latestSyncedSubmissionTimestamp") || 0
    let foundAlreadySynced = false

    while (hasNext && rawSubs.length < maxSubmissionsToSync && !foundAlreadySynced) {
      const subsRes = await fetchSubmissionPage(offset, limit)
      const pageSubs = subsRes.submissions_dump || []
      if (pageSubs.length === 0) {
        if (subsRes.has_next) throw new Error("LeetCode returned an empty submission page before history ended")
        break
      }
      
      for (const sub of pageSubs) {
        const subTs = Number(sub.timestamp) || 0
        // The timestamp checkpoint belongs only to a normal incremental
        // refresh. Applying it when resuming older pages makes every older
        // submission look "already synced" and stops a full history backfill
        // after its first 400-record batch.
        if (!isHistoryBackfill && latestSyncedTs > 0 && subTs <= latestSyncedTs) {
          foundAlreadySynced = true
          break
        }
        rawSubs.push(sub)
      }

      if (foundAlreadySynced) {
        hasNext = false
        break
      }

      hasNext = Boolean(subsRes.has_next)
      offset += pageSubs.length
      
      updateStatus("RUNNING", "Fetching submissions...", problems.length, startOffset + rawSubs.length)
      
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    // Save status to chrome storage for settings view
    const hasMoreHistory = hasNext && !foundAlreadySynced
    await storage.set("algovault.syncHasMore", {
      hasMore: hasMoreHistory,
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

    // Save the timestamp of the newest submission in this sync
    if (!isHistoryBackfill && submissions.length > 0) {
      let maxTimestamp = 0
      submissions.forEach((s: any) => {
        const ts = Number(s.timestamp) || 0
        if (ts > maxTimestamp) {
          maxTimestamp = ts
        }
      })
      if (maxTimestamp > 0) {
        await storage.set("algovault.latestSyncedSubmissionTimestamp", maxTimestamp)
      }
    }

    const completionMessage = hasMoreHistory
      ? `Synced ${submissions.length} submissions. Older history is ready for the next 400-record batch.`
      : `Sync completed successfully. Your history is up to date.`
    if (hasMoreHistory) {
      updateStatus("RUNNING", `${completionMessage} Continuing automatically…`, problems.length, startOffset + submissions.length)
      // Keep a deliberate pause between 400-record uploads. The cursor is
      // persisted above, so an interrupted extension can still resume safely.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return runSync(normalizedUsername, offset)
    }
    updateStatus("SUCCESS", completionMessage, problems.length, startOffset + submissions.length)
    return { ok: true, hasMore: hasMoreHistory, nextOffset: offset }
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
  await storage.set("algovault.solvedSlugs", { ...cached, fetchedAt: Date.now(), slugs: unique })
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
    if (cached.length === 0 || (cached[0].Title && cached[0].Title !== cached[0].TitleSlug)) {
      return cached
    }
  }

  const mapData = await fetchZerotracRatingsBackend()
  if (!mapData || typeof mapData !== "object" || Array.isArray(mapData)) throw new Error("ZeroTrac returned an invalid payload")
  
  const data = Object.entries(mapData).map(([slug, details]: [string, any]) => {
    // Handle both legacy (details is just a number rating) and new (details is ZerotracInfo object)
    const isObject = details && typeof details === "object";
    const rating = isObject ? (details.rating ?? 1500) : (typeof details === "number" ? details : 1500);
    const title = isObject ? (details.title ?? slug) : slug;
    const contestId = isObject ? (details.contestId ?? "") : "";
    
    return {
      TitleSlug: slug,
      Rating: rating,
      Title: title,
      ContestID_en: contestId,
      ContestSlug: contestId ? contestId.toLowerCase().replace(/\s+/g, '-') : "",
      ProblemIndex: isObject ? (details.problemIndex ?? "?") : "?"
    };
  })
  
  await setZerotracData(data)
  
  // Re-build memory cache map on fetch
  const tempMap = new Map()
  for (const item of data) {
    if (item && item.TitleSlug) {
      tempMap.set(item.TitleSlug.toLowerCase(), item)
    }
  }
  zerotracInMemoryMap = tempMap

  return data
}

let zerotracInMemoryMap: Map<string, any> | null = null

async function getSingleProblemRating(slug: string) {
  if (!slug) return null
  if (!zerotracInMemoryMap) {
    try {
      const cached = await getCachedZerotracRatings()
      if (cached && Array.isArray(cached)) {
        const tempMap = new Map()
        for (const item of cached) {
          if (item && item.TitleSlug) {
            tempMap.set(item.TitleSlug.toLowerCase(), item)
          }
        }
        zerotracInMemoryMap = tempMap
      }
    } catch (e) {
      console.error("AlgoVault: Error loading ZeroTrac cache into memory Map", e)
    }
  }
  return zerotracInMemoryMap ? zerotracInMemoryMap.get(slug.toLowerCase()) || null : null
}
