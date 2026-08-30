import { fetchUserProfile, fetchSolvedProblems, fetchAllSubmissions, fetchContestHistory, fetchProblemMetadata, fetchUserStatus, fetchContestQuestions, fetchReplayEvents, fetchUpcomingContests, fetchPastContests, fetchSubmissionDetails, fetchQuestionSubmissions } from "../lib/api/leetcode"
import { getUserSettings, getUsername, setLastSync, setUsername, storage, getGithubPat, getGithubRepo, getGithubBranch, getGithubAutoSync, setGithubAutoSync, getZerotracData, getZerotracLastFetched, setZerotracData, clearGithubAuth, clearJwtToken } from "../lib/storage"
import { commitToGithub, batchCommitToGithub, getExtensionForLanguage, fetchRepoFileTree } from "../lib/api/github"
import { type LeetCodeRegion } from "../lib/api/entranthub"
import {
  fetchPrediction,
  sendSelfReport,
  sendSubmissionResult,
  fetchContests,
  syncLeetcode,

  fetchZerotracRatingsBackend,
  addToVault
} from "../lib/api/backend"
import { createSession, transitionSession } from "../lib/session-engine/EngineKernel"
import { normalizeZerotracPayload } from "../lib/zerotrac"
import { PROBLEM_SLUG_TO_COMPANIES } from "../lib/company-data"

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error))

let isSyncing = false;
let syncAbortController: AbortController | null = null;

let isBackfilling = false;
let backfillAbortController: AbortController | null = null;

const ACTIVE_SESSION_KEY = "algovault.session.active"
const LOGS_INDEX_KEY = "algovault.logs.index"

// ─── APSE v2 BACKGROUND COORDINATOR ─────────────────────────────────

/**
 * Archive completed or paused session to monthly log bucket and index
 */
async function archivePracticeLog(sessionInput: any, isSolved: boolean, language?: string) {
  if (!sessionInput) return
  let session: any = sessionInput
  if (typeof sessionInput === "string") {
    try {
      session = JSON.parse(sessionInput)
    } catch {
      return
    }
  }
  if (!session || !session.slug) return

  const now = Date.now()
  const tElapsedStart = typeof session.tElapsedStart === "number" && !isNaN(session.tElapsedStart) ? session.tElapsedStart : now
  const elapsedSecs = Math.floor(Math.max(0, now - tElapsedStart - (session.accPausedMs || 0)) / 1000)

  const accActiveMs = typeof session.accActiveMs === "number" && !isNaN(session.accActiveMs) ? session.accActiveMs : 0
  const activeOrigin = (typeof session.tActiveStart === "number" && !isNaN(session.tActiveStart))
    ? session.tActiveStart
    : tElapsedStart
  const currentSegmentMs = session.st === "RUNNING" ? Math.max(0, now - activeOrigin) : 0
  
  let activeSecs = Math.max(0, Math.floor((accActiveMs + currentSegmentMs) / 1000))
  if (activeSecs <= 0) {
    if (elapsedSecs > 0) {
      activeSecs = Math.max(1, elapsedSecs)
    } else if (isSolved || session.st === "SOLVED") {
      activeSecs = 1
    } else {
      return
    }
  }

  const focusScore = elapsedSecs > 0 ? Math.min(100, Math.round((activeSecs / Math.max(1, elapsedSecs)) * 100)) : 100

  const logId = session.id || String(tElapsedStart)
  const logItem = {
    v: 2,
    logId,
    sessionId: session.id,
    slug: session.slug,
    startedAt: tElapsedStart,
    completedAt: now,
    activeSecs,
    elapsedSecs,
    focusScore,
    tabs: session.tabs || 0,
    pastes: session.pastes || 0,
    isSolved: Boolean(isSolved || session.st === "SOLVED"),
    language
  }

  // 1. Upsert into Monthly Bucket `algovault.logs.YYYY_MM`
  const dateObj = new Date(tElapsedStart)
  const yyyyMm = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, "0")}`
  const bucketKey = `algovault.logs.${yyyyMm}`
  const existingBucket = (await storage.get<any[]>(bucketKey)) || []
  const bucketIndex = existingBucket.findIndex(
    (item: any) => (session.id && item.sessionId === session.id) || (item.slug === session.slug && item.startedAt === tElapsedStart)
  )
  if (bucketIndex >= 0) {
    existingBucket[bucketIndex] = {
      ...existingBucket[bucketIndex],
      ...logItem,
      isSolved: isSolved || existingBucket[bucketIndex].isSolved
    }
  } else {
    existingBucket.push(logItem)
  }
  await storage.set(bucketKey, existingBucket)

  // 2. Upsert into Ultra-Fast Summary Index
  const indexItem = {
    sessionId: session.id,
    slug: session.slug,
    ts: tElapsedStart,
    actSecs: activeSecs,
    elSecs: elapsedSecs,
    score: focusScore,
    solved: Boolean(isSolved || session.st === "SOLVED")
  }
  const existingIndex = (await storage.get<any[]>(LOGS_INDEX_KEY)) || []
  const summaryIndex = existingIndex.findIndex(
    (item: any) => (session.id && item.sessionId === session.id) || (item.slug === session.slug && item.ts === tElapsedStart)
  )
  if (summaryIndex >= 0) {
    existingIndex[summaryIndex] = {
      ...existingIndex[summaryIndex],
      ...indexItem,
      solved: Boolean(isSolved || existingIndex[summaryIndex].solved)
    }
  } else {
    existingIndex.push(indexItem)
  }
  await storage.set(LOGS_INDEX_KEY, existingIndex)
}

// Tab Removal Listener for Tab Ownership Safety
chrome.tabs.onRemoved.addListener(async (closedTabId) => {
  const active = await storage.get<any>(ACTIVE_SESSION_KEY)
  if (active && active.ownerTabId === closedTabId && active.st === "RUNNING") {
    const updated = transitionSession(active, "PAUSED", "TAB", Date.now())
    await storage.set(ACTIVE_SESSION_KEY, { ...updated, ownerTabId: null })
    await archivePracticeLog(updated, updated.st === "SOLVED")
  }
})

// Chrome Tab Activation Listener for 100% Accurate Tab Switch Detection
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const active = await storage.get<any>(ACTIVE_SESSION_KEY)
  if (active && active.st === "RUNNING" && active.ownerTabId && active.ownerTabId !== activeInfo.tabId) {
    const updatedSession = { ...active, tabs: (active.tabs || 0) + 1 }
    const updated = transitionSession(updatedSession, "PAUSED", "TAB", Date.now())
    await storage.set(ACTIVE_SESSION_KEY, updated)
    await archivePracticeLog(updated, updated.st === "SOLVED")
    chrome.runtime.sendMessage({ action: "session_updated_v2", session: updated })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_side_panel" && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId })
  }

  // The company dataset is intentionally held by the service worker rather
  // than injected into every LeetCode problem page.
  if (message.action === "get_companies_for_problem") {
    const slug = typeof message.slug === "string" ? message.slug.trim().toLowerCase() : ""
    if (!slug || slug.length > 200 || !/^[a-z0-9-]+$/.test(slug)) {
      sendResponse({ evidences: [] })
      return false
    }

    const evidences = (PROBLEM_SLUG_TO_COMPANIES.get(slug) || []).map((entry) => ({
      companyName: entry.companyName,
      frequencyScore: entry.frequencyScore,
      timeframeLabel: entry.timeframeLabel
    }))
    sendResponse({ evidences })
    return false
  }

  // APSE v2 State Machine Message Interceptors
  if (message.action === "claim_tab_ownership") {
    const tabId = sender.tab?.id || null
    storage.get<any>(ACTIVE_SESSION_KEY).then(async (session) => {
      if (!session) {
        sendResponse({ ok: false })
        return
      }
      if (tabId && session.ownerTabId === tabId && session.st === "RUNNING") {
        sendResponse({ ok: true, session })
        return
      }
      if ((session.st === "PAUSED" && session.pr === "MANUAL") || session.st === "SOLVED") {
        const updated = { ...session, ownerTabId: tabId || session.ownerTabId }
        await storage.set(ACTIVE_SESSION_KEY, updated)
        sendResponse({ ok: true, session: updated })
        return
      }

      const isTabSwitch = session.pr === "TAB" || (session.ownerTabId !== null && tabId !== null && session.ownerTabId !== tabId)
      const transitioned = transitionSession(session, "RUNNING", null, Date.now())
      const updated = {
        ...transitioned,
        ownerTabId: tabId || session.ownerTabId,
        tabs: isTabSwitch ? (session.tabs || 0) + 1 : (session.tabs || 0)
      }
      await storage.set(ACTIVE_SESSION_KEY, updated)
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: updated })
      sendResponse({ ok: true, session: updated })
    })
    return true
  }

  if (message.action === "session_start_v2") {
    const slug = message.slug
    if (!slug) {
      sendResponse({ ok: false })
      return true
    }
    const tabId = sender.tab?.id || null
    const now = Date.now()
    const storeKey = "algovault.session.store"

    storage.get<any>(ACTIVE_SESSION_KEY).then(async (existingSession) => {
      // 1. If active session is for the exact same slug, preserve it (DO NOT auto-restart if SOLVED or MANUAL PAUSE)!
      if (existingSession && existingSession.slug === slug) {
        if (existingSession.st === "RUNNING" || (existingSession.st === "PAUSED" && existingSession.pr === "MANUAL") || existingSession.st === "SOLVED") {
          const finalSession = { ...existingSession, ownerTabId: tabId || existingSession.ownerTabId }
          await storage.set(ACTIVE_SESSION_KEY, finalSession)
          sendResponse({ ok: true, session: finalSession })
          return
        }
        const updated = transitionSession(existingSession, "RUNNING", null, now)
        const finalSession = { ...updated, ownerTabId: tabId || existingSession.ownerTabId }
        await storage.set(ACTIVE_SESSION_KEY, finalSession)
        chrome.runtime.sendMessage({ action: "session_updated_v2", session: finalSession })
        sendResponse({ ok: true, session: finalSession })
        return
      }

      // 2. Manage multi-problem switching using per-slug store
      const store = (await storage.get<Record<string, any>>(storeKey)) || {}

      if (existingSession && existingSession.slug) {
        let pausedSession: any
        if ((existingSession.st === "PAUSED" && existingSession.pr === "MANUAL") || existingSession.st === "SOLVED") {
          pausedSession = existingSession
        } else {
          pausedSession = transitionSession(existingSession, "PAUSED", "TAB", now)
        }
        store[existingSession.slug] = pausedSession
        await archivePracticeLog(pausedSession, existingSession.st === "SOLVED")
      }

      let sessionForSlug = store[slug]
      if (sessionForSlug) {
        if ((sessionForSlug.st === "PAUSED" && sessionForSlug.pr === "MANUAL") || sessionForSlug.st === "SOLVED") {
          sessionForSlug = { ...sessionForSlug, ownerTabId: tabId }
        } else {
          sessionForSlug = {
            ...transitionSession(sessionForSlug, "RUNNING", null, now),
            ownerTabId: tabId
          }
        }
        delete store[slug]
      } else {
        sessionForSlug = createSession(slug, tabId, now)
      }

      await Promise.all([
        storage.set(ACTIVE_SESSION_KEY, sessionForSlug),
        storage.set(storeKey, store)
      ])
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: sessionForSlug })
      sendResponse({ ok: true, session: sessionForSlug })
    })
    return true
  }

  if (message.action === "session_pause_v2") {
    const reason = message.reason || "MANUAL"
    storage.get<any>(ACTIVE_SESSION_KEY).then(async (session) => {
      if (!session) {
        sendResponse({ ok: false })
        return
      }
      const isTabSwitch = reason === "TAB"
      const sessionWithTabs = isTabSwitch ? { ...session, tabs: (session.tabs || 0) + 1 } : session
      const updated = transitionSession(sessionWithTabs, "PAUSED", reason, Date.now())
      await storage.set(ACTIVE_SESSION_KEY, updated)
      await archivePracticeLog(updated, updated.st === "SOLVED")
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: updated })
      sendResponse({ ok: true, session: updated })
    })
    return true
  }

  if (message.action === "session_resume_v2") {
    const tabId = sender.tab?.id || null
    storage.get<any>(ACTIVE_SESSION_KEY).then(async (session) => {
      if (!session) {
        sendResponse({ ok: false })
        return
      }
      const transitioned = transitionSession(session, "RUNNING", null, Date.now())
      const updated = {
        ...transitioned,
        ownerTabId: tabId || session.ownerTabId
      }
      await storage.set(ACTIVE_SESSION_KEY, updated)
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: updated })
      sendResponse({ ok: true, session: updated })
    })
    return true
  }

  if (message.action === "session_reset_v2") {
    const storeKey = "algovault.session.store"
    storage.get<any>(ACTIVE_SESSION_KEY).then(async (active) => {
      const slug = active?.slug
      await storage.remove(ACTIVE_SESSION_KEY)
      if (slug) {
        const store = (await storage.get<Record<string, any>>(storeKey)) || {}
        delete store[slug]
        await storage.set(storeKey, store)
      }
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: null })
      sendResponse({ ok: true, session: null })
    })
    return true
  }

  if (message.action === "session_finish_v2") {
    storage.get<any>(ACTIVE_SESSION_KEY).then(async (session) => {
      if (!session) {
        sendResponse({ ok: false })
        return
      }
      // If submission_result already transitioned this to SOLVED, skip duplicate work
      if (session.st === "SOLVED") {
        sendResponse({ ok: true, session })
        return
      }
      const updated = transitionSession(session, "SOLVED", null, Date.now())
      await archivePracticeLog(updated, true, message.language)
      await storage.set(ACTIVE_SESSION_KEY, updated)
      
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: updated })
      sendResponse({ ok: true, session: updated })
    })
    return true
  }

  if (message.action === "session_log_time_v2") {
    storage.get<any>(ACTIVE_SESSION_KEY).then(async (session) => {
      if (!session) {
        sendResponse({ ok: false })
        return
      }
      const updated = transitionSession(session, session.st === "SOLVED" ? "SOLVED" : (session.st === "RUNNING" ? "RUNNING" : "PAUSED"), session.pr, Date.now())
      await storage.set(ACTIVE_SESSION_KEY, updated)
      await archivePracticeLog(updated, session.st === "SOLVED", message.language)
      chrome.runtime.sendMessage({ action: "session_updated_v2", session: updated })
      chrome.runtime.sendMessage({ action: "dashboard_refresh" })
      sendResponse({ ok: true, session: updated })
    })
    return true
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
    const uname = typeof message.payload?.username === "string" ? message.payload.username.trim() : ""
    if (!uname) {
      sendResponse({ ok: false, error: "LeetCode username is not configured in Settings." })
      return true
    }
    fetchContestHistory(uname)
      .then((data) => sendResponse({ ok: true, data: data.data || {} }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "get_user_profile") {
    const uname = typeof message.payload?.username === "string" ? message.payload.username.trim() : ""
    if (!uname) {
      sendResponse({ ok: false, error: "LeetCode username is not configured in Settings." })
      return true
    }
    fetchUserProfile(uname)
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
    syncAbortController = new AbortController()
    runSync(message.username, message.startOffset || 0, syncAbortController.signal, Boolean(message.forceFullSync))
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

  if (message.action === "reset_sync_state") {
    Promise.all([
      storage.remove("algovault.latestSyncedSubmissionTimestamp"),
      storage.remove("algovault.solvedSlugs"),
      storage.remove("algovault.syncHasMore"),
      storage.remove("algovault.lastSync")
    ]).then(() => {
      chrome.storage.local.set({ syncStatus: { status: "INFO", message: "Sync cache reset. Ready for clean full sync.", count: 0, subCount: 0 } })
      sendResponse({ ok: true })
    }).catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "stop_sync") {
    if (syncAbortController) {
      syncAbortController.abort()
      syncAbortController = null
    }
    isSyncing = false
    chrome.storage.local.set({ syncStatus: { status: "INFO", message: "Sync stopped by user", count: 0, subCount: 0 } })
    sendResponse({ ok: true })
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

  if (message.action === "get_problem_metadata_batch") {
    const slugs = Array.isArray(message.slugs) ? message.slugs : []
    fetchProblemMetadata(slugs)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true
  }

  if (message.action === "submission_result") {
    const payload = message.payload || {};
    
    chrome.storage.local.get([
      "algovault.isZenith",
      "algovault.zenithGrade",
      "algovault.zenithReason",
      "algovault.zenithFocusScore",
      "algovault.problemStartTime",
      ACTIVE_SESSION_KEY
    ], async (res) => {
      const isZenith = !!res["algovault.isZenith"];
      let helpType: "NONE" | "PENDING_SELF_REPORT" = "PENDING_SELF_REPORT";

      // 1. Extract APSE v2 Practice Telemetry
      const activeSession = res[ACTIVE_SESSION_KEY];
      if (activeSession && activeSession.slug === payload.titleSlug) {
        const now = Date.now();
        const accActiveMs = typeof activeSession.accActiveMs === "number" ? activeSession.accActiveMs : 0;
        const currentSegmentMs = activeSession.st === "RUNNING" && activeSession.tActiveStart 
          ? Math.max(0, now - activeSession.tActiveStart) 
          : 0;
        const totalActiveSecs = Math.max(1, Math.floor((accActiveMs + currentSegmentMs) / 1000));
        
        payload.focusSeconds = totalActiveSecs;
        payload.tabSwitches = activeSession.tabs || 0;
        payload.pasteCount = activeSession.pastes || 0;
        
        const tElapsedStart = typeof activeSession.tElapsedStart === "number" ? activeSession.tElapsedStart : now;
        const totalElapsedSecs = Math.max(1, Math.floor((now - tElapsedStart) / 1000));
        payload.focusScore = Math.min(100, Math.round((totalActiveSecs / totalElapsedSecs) * 100));
        payload.startedAt = new Date(tElapsedStart).toISOString();
      }

      // 2. Extract Zenith Focus Mode Telemetry if active
      if (isZenith) {
        payload.isZenith = true;
        payload.grade = res["algovault.zenithGrade"] || "S_PLUS";
        payload.reason = res["algovault.zenithReason"] || "Pure Solve";
        payload.focusScore = res["algovault.zenithFocusScore"] ?? 100.0;
        
        const startTime = res["algovault.problemStartTime"];
        payload.timeSpentSeconds = startTime 
          ? Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
          : (payload.focusSeconds || 0);
        payload.codeSubmitted = payload.code || "";

        // Reset Zenith state since solve is done
        chrome.storage.local.set({ "algovault.isZenith": false });
        helpType = "NONE";
      }

      // 3. Trigger GitHub sync and archive practice log if Accepted
      if (payload.statusDisplay === "Accepted") {
        if (activeSession && activeSession.slug === payload.titleSlug) {
          const updated = transitionSession(activeSession, "SOLVED", null, Date.now());
          await archivePracticeLog(updated, true, payload.codeLang || payload.language);
          await storage.set(ACTIVE_SESSION_KEY, updated);
        }

        getGithubAutoSync().then((isAutoSync) => {
          if (isAutoSync) {
            syncAcceptedSubmissionToGithub(payload, helpType).catch((gitErr) => {
              console.error("Error during GitHub sync operation:", gitErr);
            });
          } else {
            console.log("[AlgoVault] GitHub Auto-Sync is disabled; skipping automatic solution commit.");
          }
        });
      }

      // 4. Send enriched payload to backend
      sendSubmissionResult(payload)
        .then(async (data) => {
          sendResponse({ ok: true, data });
          // Defer dashboard refresh to avoid competing with celebration overlay
          // rendering and GitHub sync during the critical post-AC moment
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: "dashboard_refresh" });
          }, 2000);
        })
        .catch((err) => {
          console.error("Backend submission report failed:", err);
          sendResponse({ ok: false, error: err.message });
        });
    });
    return true;
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

  if (message.action === "set_github_auto_sync") {
    setGithubAutoSync(message.enabled).then(() => {
      sendResponse({ ok: true, enabled: message.enabled })
    })
    return true
  }

  if (message.action === "get_github_auto_sync") {
    getGithubAutoSync().then((val) => {
      sendResponse({ ok: true, enabled: val })
    })
    return true
  }

  if (message.action === "backfill_github") {
    if (isBackfilling) {
      sendResponse({ ok: false, error: "A backfill operation is already in progress." })
      return true
    }
    isBackfilling = true
    backfillAbortController = new AbortController()
    runBackfill(backfillAbortController.signal)
      .then(() => {
        isBackfilling = false
        sendResponse({ ok: true })
      })
      .catch((err) => {
        isBackfilling = false
        sendResponse({ ok: false, error: err.message })
      })
    return true
  }

  if (message.action === "stop_backfill_github") {
    if (backfillAbortController) {
      backfillAbortController.abort()
      backfillAbortController = null
    }
    isBackfilling = false
    chrome.runtime.sendMessage({
      action: "backfill_github_progress",
      done: 0, total: 0, current: "", aborted: true
    }).catch(() => {})
    sendResponse({ ok: true })
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
  const isAutoSyncEnabled = await getGithubAutoSync()
  if (!isAutoSyncEnabled) return

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

  const branch = await getGithubBranch() || undefined
  const commitPrefix = `${artifact.metadata.frontendQuestionId ? `${artifact.metadata.frontendQuestionId}. ` : ""}${artifact.metadata.title}`
  const timeStr = payload.runtimeMs != null ? `${payload.runtimeMs} ms` : "N/A"
  const spaceStr = payload.memoryKb != null ? `${Math.round(payload.memoryKb / 10.24) / 100} MB` : "N/A"
  
  const writes = [
    {
      path: artifact.codePath,
      message: `${commitPrefix}: Time: ${timeStr}, Space: ${spaceStr} - AlgoVault`,
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

  // Single atomic commit for all 3 files (code + README + metadata)
  const result = await batchCommitToGithub(pat, repo, writes, branch)
  if (!result.ok) {
    if (result.revoked) {
      await clearGithubAuth()
      await clearJwtToken()
    }
    await storage.set("algovault.gitSyncStatus", {
      success: false,
      message: result.message,
      timestamp: Date.now(),
      problem: payload.title || payload.titleSlug,
      path: artifact.folder
    })
    return
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
  const isAutoSyncEnabled = await getGithubAutoSync()
  if (!isAutoSyncEnabled) {
    console.log("[AlgoVault] GitHub Auto-Sync is disabled; skipping updateGithubHelpReport.")
    return
  }
  const artifact = await storage.get<any>(`algovault.gitSolve.${report.titleSlug}`)
  if (!artifact?.payload) return
  await syncAcceptedSubmissionToGithub(artifact.payload, report.helpType, {
    focusSeconds: artifact.metadata?.focusSeconds
  })
}

async function runSync(username: string, startOffset = 0, signal?: AbortSignal, forceFullSync = false) {
  if (!username || !username.trim()) {
    throw new Error("LeetCode username is required")
  }
  const normalizedUsername = username.trim()
  await setUsername(normalizedUsername)

  if (forceFullSync) {
    await storage.remove("algovault.latestSyncedSubmissionTimestamp")
    await storage.remove("algovault.solvedSlugs")
    await storage.remove("algovault.syncHasMore")
    startOffset = 0
  }

  const updateStatus = (status: string, msg: string, count = 0, subCount = 0) => {
    chrome.storage.local.set({ syncStatus: { status, message: msg, count, subCount } })
  }

  try {
    if (signal?.aborted) throw new Error("Sync stopped by user");
    const isHistoryBackfill = startOffset > 0 && !forceFullSync
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
    const cachedSolved = forceFullSync ? null : await storage.get<any>("algovault.solvedSlugs")
    const isCacheValid = cachedSolved && cachedSolved.fetchedAt && (Date.now() - cachedSolved.fetchedAt < 15 * 60 * 1000) && Array.isArray(cachedSolved.rawProblems)

    if (isCacheValid) {
      problems.push(...cachedSolved.rawProblems)
    } else if (startOffset === 0) {
      updateStatus("RUNNING", "Fetching solved problems...", 0, 0)
      let problemOffset = 0
      const problemPageSize = 100
      let totalSolved = Number.POSITIVE_INFINITY
      while (problems.length < totalSolved) {
        if (signal?.aborted) throw new Error("Sync stopped by user");
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
          if (signal?.aborted) throw new Error("Sync stopped by user");
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
    const latestSyncedTs = forceFullSync ? 0 : ((await storage.get<number>("algovault.latestSyncedSubmissionTimestamp")) || 0)
    let foundAlreadySynced = false

    while (hasNext && rawSubs.length < maxSubmissionsToSync && !foundAlreadySynced) {
      if (signal?.aborted) throw new Error("Sync stopped by user");
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
      if (signal?.aborted) throw new Error("Sync stopped by user");
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
      if (signal?.aborted) throw new Error("Sync stopped by user");
      return runSync(normalizedUsername, offset, signal)
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

  let data: any[] = []

  try {
    const mapData = await fetchZerotracRatingsBackend()
    if (mapData && typeof mapData === "object" && !Array.isArray(mapData)) {
      data = Object.entries(mapData).map(([slug, details]: [string, any]) => {
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
    }
  } catch (err) {
    console.warn("Backend zerotrac fetch failed, falling back to GitHub raw data.json", err)
  }

  if (data.length === 0) {
    try {
      const res = await fetch("https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json")
      if (res.ok) {
        const rawJson = await res.json()
        data = normalizeZerotracPayload(rawJson)
      }
    } catch (ghErr) {
      console.error("Direct GitHub ZeroTrac fetch also failed:", ghErr)
    }
  }

  if (data.length > 0) {
    await setZerotracData(data)
    
    // Re-build memory cache map on fetch
    const tempMap = new Map()
    for (const item of data) {
      if (item && item.TitleSlug) {
        tempMap.set(item.TitleSlug.toLowerCase(), item)
      }
    }
    zerotracInMemoryMap = tempMap
  }

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

// ─── GITHUB BACKFILL ENGINE ──────────────────────────────────────────────────

/**
 * Fetches submission details with up to 3 retries and exponential backoff.
 * The submissionDetails GraphQL query can occasionally rate-limit or fail transiently.
 */
async function fetchSubmissionDetailsWithRetry(submissionId: string | number): Promise<any> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchSubmissionDetails(submissionId)
      return res?.data?.submissionDetails || null
    } catch (err) {
      lastError = err
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }
  console.warn(`[AlgoVault Backfill] Failed to fetch details for submission ${submissionId}:`, lastError)
  return null
}

/**
 * Determines whether a given problem slug already has at least one solution file
 * committed to GitHub, by checking against the flat file path set from fetchRepoFileTree.
 *
 * Checks for any file matching the pattern:
 *   leetcode/<any-difficulty>/<any-prefix><slug>/solution.*
 */
function isSlugOnGithub(slug: string, repoPaths: Set<string>): boolean {
  const slugLower = slug.trim().toLowerCase()
  if (!slugLower) return false

  for (const path of repoPaths) {
    const pathLower = path.toLowerCase()
    const segments = pathLower.split("/")
    for (const segment of segments) {
      const cleanSegment = segment.replace(/^\d+-/, "").replace(/\.[^.]+$/, "")
      if (cleanSegment === slugLower) {
        return true
      }
    }
  }
  return false
}

/**
 * Core backfill pipeline:
 *
 * 1. Fetch all AC'd problem slugs from LeetCode (GraphQL problemsetQuestionList)
 * 2. Fetch the full GitHub repo file tree (Trees API, 2 calls total)
 * 3. Diff: find slugs with no solution.* file on GitHub
 * 4. Paginate LeetCode's submission list to find the most recent Accepted
 *    submission ID for each missing slug
 * 5. Call submissionDetails GraphQL per missing slug to get code + language
 * 6. Build artifact and batch-commit 5 problems per atomic GitHub commit
 *
 * Emits "backfill_github_progress" messages for the UI to display live state.
 */
async function runBackfill(signal: AbortSignal): Promise<void> {
  const broadcastProgress = (done: number, total: number, current: string, phase?: string) => {
    chrome.runtime.sendMessage({
      action: "backfill_github_progress",
      done,
      total,
      current,
      phase: phase || "committing"
    }).catch(() => {})
  }

  const broadcastError = (error: string) => {
    chrome.runtime.sendMessage({
      action: "backfill_github_done",
      ok: false,
      error
    }).catch(() => {})
  }

  const broadcastDone = (pushed: number, skipped: number, errors: number) => {
    chrome.runtime.sendMessage({
      action: "backfill_github_done",
      ok: true,
      pushed,
      skipped,
      errors
    }).catch(() => {})
  }

  // ── Step 1: Validate GitHub credentials ─────────────────────────────────
  let pat = await getGithubPat()
  let repo = await getGithubRepo()
  const branch = (await getGithubBranch()) || "main"

  if (!pat || !repo) {
    broadcastError("GitHub credentials are not configured. Connect GitHub in Settings first.")
    return
  }
  pat = stripWrappingQuotes(pat)
  repo = stripWrappingQuotes(repo)

  if (signal.aborted) return

  // ── Step 2: Fetch all AC'd solved problems from LeetCode ─────────────────
  broadcastProgress(0, 0, "", "scanning")

  const solvedProblems: any[] = []
  try {
    let problemOffset = 0
    const pageSize = 100
    let totalSolved = Number.POSITIVE_INFINITY
    while (solvedProblems.length < totalSolved) {
      if (signal.aborted) return
      const res = await fetchSolvedProblems(problemOffset, pageSize)
      const page = res.data?.problemsetQuestionList
      if (!page) throw new Error("LeetCode did not return solved-problem data. Make sure you are logged in.")
      totalSolved = page.totalNum || 0
      const questions = page.questions || []
      if (questions.length === 0) break
      solvedProblems.push(...questions)
      problemOffset += questions.length
      broadcastProgress(0, 0, `Fetched ${solvedProblems.length} / ${totalSolved} solved problems from LeetCode…`, "scanning")
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  } catch (err: any) {
    broadcastError(`Failed to fetch solved problems from LeetCode: ${err.message}`)
    return
  }

  if (solvedProblems.length === 0) {
    broadcastDone(0, 0, 0)
    return
  }

  if (signal.aborted) return

  // ── Step 3: Fetch GitHub repo file tree ──────────────────────────────────
  broadcastProgress(0, 0, "Scanning GitHub repository for existing files…", "scanning")

  const treeResult = await fetchRepoFileTree(pat, repo, branch)
  if (!treeResult.ok) {
    if (treeResult.revoked) {
      await clearGithubAuth()
      await clearJwtToken()
    }
    broadcastError(treeResult.error || "Failed to scan GitHub repository.")
    return
  }

  const repoPaths = treeResult.paths

  if (signal.aborted) return

  // ── Step 4: Diff — find slugs not yet on GitHub ──────────────────────────
  const missingSlugs: string[] = []
  for (const problem of solvedProblems) {
    const slug = problem.titleSlug
    if (slug && !isSlugOnGithub(slug, repoPaths)) {
      missingSlugs.push(slug)
    }
  }

  if (missingSlugs.length === 0) {
    broadcastDone(0, solvedProblems.length, 0)
    return
  }

  broadcastProgress(0, missingSlugs.length, `Found ${missingSlugs.length} problems not yet on GitHub. Fetching submissions…`, "fetching")

  // ── Step 5: Build a Map<slug → submissionId> by paginating LeetCode subs ─
  // We paginate until we have found an AC submission ID for every missing slug,
  // or until history ends / rate limit is encountered.
  const slugToSubmissionId = new Map<string, string>()
  const missingSlugSet = new Set(missingSlugs)

  let offset = 0
  const limit = 20
  let hasNext = true
  const maxPages = 500 // safety cap: 500 * 20 = 10,000 submissions scanned

  while (hasNext && slugToSubmissionId.size < missingSlugSet.size && offset < maxPages * limit) {
    if (signal.aborted) return
    try {
      const subsRes = await fetchSubmissionPage(offset, limit)
      const pageSubs: any[] = subsRes.submissions_dump || []
      if (pageSubs.length === 0) break

      for (const sub of pageSubs) {
        const slug = sub.title_slug
        if (
          slug &&
          missingSlugSet.has(slug) &&
          !slugToSubmissionId.has(slug) &&
          sub.status_display === "Accepted"
        ) {
          slugToSubmissionId.set(slug, String(sub.id))
        }
      }

      hasNext = Boolean(subsRes.has_next)
      offset += pageSubs.length
      broadcastProgress(
        0,
        missingSlugs.length,
        `Scanning submissions: found ${slugToSubmissionId.size} / ${missingSlugs.length} so far…`,
        "fetching"
      )
      await new Promise((resolve) => setTimeout(resolve, 350))
    } catch (err: any) {
      console.warn(`[AlgoVault Backfill] Global submissions scan stopped at offset ${offset}:`, err)
      break
    }
  }

  // Fallback for any missing slugs not found via global pagination:
  // Query individual question submission histories via GraphQL
  const stillMissing = missingSlugs.filter(s => !slugToSubmissionId.has(s))
  if (stillMissing.length > 0 && !signal.aborted) {
    broadcastProgress(0, missingSlugs.length, `Checking individual question histories (${stillMissing.length} remaining)…`, "fetching")
    for (let i = 0; i < stillMissing.length; i++) {
      if (signal.aborted) return
      const s = stillMissing[i]
      try {
        const questionSubs = await fetchQuestionSubmissions(s)
        const acSub = questionSubs.find((sub: any) => sub.statusDisplay === "Accepted" || sub.status_display === "Accepted")
        if (acSub && acSub.id) {
          slugToSubmissionId.set(s, String(acSub.id))
        }
      } catch (err) {
        console.warn(`[AlgoVault Backfill] Could not fetch question submissions for ${s}:`, err)
      }
      broadcastProgress(
        0,
        missingSlugs.length,
        `Matched ${slugToSubmissionId.size} / ${missingSlugs.length} problem submissions…`,
        "fetching"
      )
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  if (signal.aborted) return

  // ── Step 6: Batch-commit missing solutions to GitHub ─────────────────────
  const BATCH_SIZE = 3
  let pushed = 0
  let skipped = 0
  let errors = 0

  // Build a lookup map from slug → problem metadata (title, difficulty, tags)
  const slugToMeta = new Map<string, any>()
  for (const p of solvedProblems) {
    if (p.titleSlug) slugToMeta.set(p.titleSlug, p)
  }

  for (let batchStart = 0; batchStart < missingSlugs.length; batchStart += BATCH_SIZE) {
    if (signal.aborted) return

    const batchSlugs = missingSlugs.slice(batchStart, batchStart + BATCH_SIZE)
    const writes: Array<{ path: string; message: string; content: string }> = []

    for (const slug of batchSlugs) {
      if (signal.aborted) return

      broadcastProgress(pushed, missingSlugs.length, slug, "committing")

      let submissionId = slugToSubmissionId.get(slug)
      let detail: any = null

      if (submissionId) {
        detail = await fetchSubmissionDetailsWithRetry(submissionId)
        await new Promise((resolve) => setTimeout(resolve, 150))
      }

      // If submissionId was not in the map, try on-demand fetchQuestionSubmissions
      if (!detail) {
        try {
          const qSubs = await fetchQuestionSubmissions(slug)
          const ac = qSubs.find((s: any) => s.statusDisplay === "Accepted" || s.status_display === "Accepted")
          if (ac && ac.id) {
            submissionId = String(ac.id)
            slugToSubmissionId.set(slug, submissionId)
            detail = await fetchSubmissionDetailsWithRetry(submissionId)
            await new Promise((resolve) => setTimeout(resolve, 150))
          }
        } catch {}
      }

      // If we don't have problem metadata (e.g. content), fetch it
      let meta = slugToMeta.get(slug)
      if (!meta?.content) {
        const metaList = await fetchProblemMetadata([slug]).catch(() => [])
        if (metaList && metaList.length > 0) {
          meta = metaList[0]
        }
      }

      const code = detail?.code || null
      const langName: string = detail?.lang?.name || "unknown"
      const qId: string = detail?.question?.questionId || meta?.frontendQuestionId || ""
      const title: string = detail?.question?.title || meta?.title || slug
      const difficulty: string = detail?.question?.difficulty || meta?.difficulty || "Unknown"
      const topics: string[] = (detail?.question?.topicTags || meta?.topicTags || [])
        .map((t: any) => (typeof t === "string" ? t : t.name)).filter(Boolean)

      const difficultyFolder = slugPathSegment(difficulty)
      const idPrefix = qId ? `${qId}-` : ""
      const folder = `leetcode/${difficultyFolder}/${idPrefix}${slug}`
      const ext = code ? getExtensionForLanguage(langName) : "txt"
      const codePath = `${folder}/solution.${ext}`
      const readmePath = `${folder}/README.md`
      const metadataPath = `${folder}/metadata.json`

      const codeContent = code || [
        `// AlgoVault: Problem marked as Solved on LeetCode.`,
        `// LeetCode Problem: https://leetcode.com/problems/${slug}/`,
        submissionId ? `// Submission ID: ${submissionId}` : `// Historical submission code was not returned by LeetCode API.`,
        `// Full problem description and metadata are recorded in README.md and metadata.json.`
      ].join("\n")

      const readme = `<h2><a href="https://leetcode.com/problems/${slug}/">${qId ? `${qId}. ` : ""}${title}</a></h2><h3>${difficulty}</h3><hr>${meta?.content || "<p>Problem description not found.</p>"}`

      const metadata = {
        title,
        titleSlug: slug,
        frontendQuestionId: qId || null,
        leetcodeUrl: `https://leetcode.com/problems/${slug}/`,
        difficulty,
        topics,
        language: langName,
        verdict: "Accepted",
        submissionId: submissionId || null,
        helpType: "NONE",
        helpLabel: "Solved solo",
        syncedAt: new Date().toISOString(),
        backfilledAt: new Date().toISOString()
      }

      const commitMsg = `${qId ? `${qId}. ` : ""}${title} - AlgoVault Backfill`

      writes.push({ path: codePath, message: commitMsg, content: codeContent })
      writes.push({ path: readmePath, message: commitMsg, content: readme })
      writes.push({ path: metadataPath, message: commitMsg, content: JSON.stringify(metadata, null, 2) + "\n" })
    }

    if (writes.length === 0) continue

    if (signal.aborted) return

    // Atomic batch commit for all files in this batch
    const result = await batchCommitToGithub(pat, repo, writes, branch)
    if (!result.ok) {
      if (result.revoked) {
        await clearGithubAuth()
        await clearJwtToken()
        broadcastError("GitHub token was revoked or expired. Please reconnect in Settings.")
        return
      }
      // Non-fatal: count errors but continue with next batch
      errors += batchSlugs.length
      console.error("[AlgoVault Backfill] Batch commit failed:", result.message)
    } else {
      pushed += Math.floor(writes.length / 3) // 3 files per problem
    }

    broadcastProgress(pushed, missingSlugs.length, batchSlugs[batchSlugs.length - 1] || "", "committing")

    // Respectful delay between batch commits (GitHub API rate limit & ref stability)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  broadcastDone(pushed, skipped, errors)
}


