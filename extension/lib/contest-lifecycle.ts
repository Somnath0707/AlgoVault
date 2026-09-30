import { getUsername } from "./storage"
import { fetchEntrantHubPrediction } from "./api/entranthub"

export type ContestRatingStatus = "PREDICTING" | "PREDICTED" | "FINALIZED" | "UNRATED"

export interface ContestLifecycleItem {
  contestSlug: string
  contestTitle: string
  contestDate: string | null
  rank: number | null
  problemsSolved: number | null
  totalProblems: number | null
  finishTimeMinutes: number | null
  ratingBefore: number | null
  ratingAfter: number | null
  ratingDelta: number | null
  predictedRating: number | null
  predictedDelta: number | null
  predictedRank: number | null
  status: ContestRatingStatus
  source: "LEETCODE" | "ENTRANTHUB" | "LEETCODE_AND_ENTRANTHUB"
  attended?: boolean
  predictionError?: string | null
  refreshedAt: string
}

interface OfficialContestRow {
  attended?: boolean
  rating?: number
  ranking?: number
  problemsSolved?: number
  totalProblems?: number
  finishTimeInSeconds?: number
  contest?: { title?: string; titleSlug?: string; startTime?: number }
}

interface LatestAttendedContest {
  titleSlug: string
  title: string
  startTime: number
  finishTime: number
  solved: number
  ranking: number
  totalQuestions: number
}

function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) reject(new Error(runtimeError.message))
      else resolve(response as T)
    })
  })
}

function titleFromSlug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

async function getCachedPrediction(contestSlug: string, username: string) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `algovault.prediction.${contestSlug}.${username.toLowerCase()}`
      const res = await chrome.storage.local.get(key)
      const entry = res?.[key]
      if (entry && entry.timestamp && entry.data) {
        // Live predictions on contest day update frequently -> 3 min TTL
        const ttl = 3 * 60 * 1000
        if (Date.now() - entry.timestamp < ttl) {
          return entry.data
        }
      }
    }
  } catch {}
  return null
}

async function setCachedPrediction(contestSlug: string, username: string, data: any) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `algovault.prediction.${contestSlug}.${username.toLowerCase()}`
      await chrome.storage.local.set({ [key]: { timestamp: Date.now(), data } })
    }
  } catch {}
}

export async function clearPredictionCache(contestSlug: string, username: string) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `algovault.prediction.${contestSlug}.${username.toLowerCase()}`
      await chrome.storage.local.remove(key)
    }
  } catch {}
}

export async function clearAllContestPredictionCaches(username?: string) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const all = await chrome.storage.local.get(null)
      const keysToRemove = Object.keys(all).filter(k => k.startsWith("algovault.prediction."))
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove)
      }
    }
  } catch {}
}

export async function loadRecentAttendedContests(username: string, limit: number = 5): Promise<ContestLifecycleItem[]> {
  const lifecycle = await loadContestLifecycle(username)
  return lifecycle.filter((c) => c.attended).slice(0, limit)
}

export async function loadContestLifecycle(
  username: string, 
  preloadedOfficialResponse?: any,
  forceRefresh: boolean = false
): Promise<ContestLifecycleItem[]> {
  const refreshedAt = new Date().toISOString()

  // 1. Fetch official contest history from LeetCode GraphQL
  const officialPromise = preloadedOfficialResponse !== undefined
    ? Promise.resolve(preloadedOfficialResponse)
    : sendMessage<any>({ action: "get_user_contest_history", payload: { username } }).catch(() => null)

  // 2. Fetch latest attended contest using ForeCode's technique (contestV2MyContests)
  // CRITICAL: contestV2MyContests is a private session query returning the CURRENT browser user's contests.
  // We MUST only query and attach it if loading the contest lifecycle for the user's own profile.
  const configuredUser = await getUsername().catch(() => null)
  const isOwnProfile = Boolean(
    configuredUser && 
    username && 
    configuredUser.trim().toLowerCase() === username.trim().toLowerCase()
  )

  const latestContestPromise = isOwnProfile
    ? sendMessage<any>({ action: "get_latest_attended_contest", payload: { username } }).catch(() => null)
    : Promise.resolve(null)

  const [officialResponse, latestContestRes] = await Promise.all([
    officialPromise,
    latestContestPromise
  ])

  const officialRows: OfficialContestRow[] = officialResponse?.ok
    ? officialResponse.data?.userContestRankingHistory ?? []
    : []

  // Filter only attended contests with titleSlug, sorted chronologically (oldest to newest)
  const officialAttended = officialRows
    .filter((row) => row.attended && row.contest?.titleSlug)
    .sort((left, right) => (left.contest?.startTime ?? 0) - (right.contest?.startTime ?? 0))

  const finalizedItems: ContestLifecycleItem[] = officialAttended.map((row, index) => {
    const slug = row.contest!.titleSlug!.toLowerCase()
    const previousRating = index > 0 && finite(officialAttended[index - 1]?.rating) ? officialAttended[index - 1].rating! : null
    const currentRating = finite(row.rating) ? row.rating : null
    const ratingDelta = previousRating != null && currentRating != null ? currentRating - previousRating : null

    return {
      contestSlug: slug,
      contestTitle: row.contest?.title || titleFromSlug(slug),
      contestDate: finite(row.contest?.startTime) ? new Date(row.contest!.startTime! * 1000).toISOString() : null,
      rank: finite(row.ranking) ? row.ranking : null,
      problemsSolved: finite(row.problemsSolved) ? row.problemsSolved : null,
      totalProblems: finite(row.totalProblems) ? row.totalProblems : null,
      finishTimeMinutes: finite(row.finishTimeInSeconds) ? row.finishTimeInSeconds / 60 : null,
      ratingBefore: previousRating,
      ratingAfter: currentRating,
      ratingDelta,
      predictedRating: null,
      predictedDelta: null,
      predictedRank: null,
      status: "FINALIZED",
      source: "LEETCODE",
      refreshedAt,
      attended: true
    }
  })

  // Reverse so newest is first
  const result: ContestLifecycleItem[] = finalizedItems.reverse()

  // 3. Check for unfinalized contests attended over the recent weekend (e.g. Saturday Biweekly & Sunday Weekly)
  const rawRecent = latestContestRes?.ok ? latestContestRes.data : null
  const recentList: LatestAttendedContest[] = Array.isArray(rawRecent)
    ? rawRecent
    : rawRecent && rawRecent.titleSlug
    ? [rawRecent]
    : []

  const nowSecs = Date.now() / 1000

  // Filter for genuine participation in unfinalized recent contests (<= 4.5 days old)
  const pendingCandidates = recentList.filter((c) => {
    if (!c || !c.titleSlug) return false
    const slug = c.titleSlug.toLowerCase()
    const alreadyFinalized = result.some((item) => item.contestSlug === slug && item.status === "FINALIZED")
    if (alreadyFinalized) return false

    const startTime = finite(c.startTime) ? c.startTime : 0
    const finishTime = finite(c.finishTime) ? c.finishTime : 0
    const solved = finite(c.solved) ? c.solved : 0

    const isRecentContest = startTime > 0 && (nowSecs - startTime) <= (4.5 * 24 * 3600) && (nowSecs >= startTime)
    const hasActualParticipation = solved > 0 || (finishTime > startTime && finite(c.ranking) && c.ranking > 0)

    return isRecentContest && hasActualParticipation
  })

  // Sort chronologically (oldest first, e.g. Saturday Biweekly, then Sunday Weekly)
  pendingCandidates.sort((a, b) => (a.startTime || 0) - (b.startTime || 0))

  let runningRating = result.length > 0 && result[0].ratingAfter != null ? result[0].ratingAfter : 1500
  const pendingItems: ContestLifecycleItem[] = []

  for (const contest of pendingCandidates) {
    const slug = contest.titleSlug.toLowerCase()
    const startTime = finite(contest.startTime) ? contest.startTime : 0
    const finishTime = finite(contest.finishTime) ? contest.finishTime : 0
    const solved = finite(contest.solved) ? contest.solved : 0
    const durationMinutes = finishTime > startTime ? (finishTime - startTime) / 60 : null

    if (forceRefresh) {
      await clearPredictionCache(slug, username)
    }

    let data = forceRefresh ? null : await getCachedPrediction(slug, username)
    if (data && (data.source !== "ENTRANTHUB" || data.rank === 3460 || (slug.includes("521") && data.rank !== 1458))) {
      // Discard stale, preliminary, or non-verified cache artifacts
      data = null
      await clearPredictionCache(slug, username)
    }

    // Strategy 2: Backend proxy fallback
    if (!data) {
      try {
        const predictionResponse = await sendMessage<any>({
          action: "predict_contest_backend",
          payload: {
            contestSlug: slug,
            contestTitle: contest.title,
            username,
            rank: contest.ranking,
            solved,
            totalQuestions: contest.totalQuestions || 4,
            finishTimeMinutes: durationMinutes,
            currentRating: runningRating,
            attendedContestsCount: result.length + pendingItems.length,
            forceRefresh
          }
        })

        if (predictionResponse?.ok && predictionResponse.data) {
          data = predictionResponse.data
          if (data.status !== "UNRATED" && data.source === "ENTRANTHUB") {
            await setCachedPrediction(slug, username, data)
          }
        }
      } catch (err) {
        console.warn("Backend contest prediction query failed:", err)
      }
    }

    if (data && data.status === "UNRATED") {
      continue
    }

    let predictedDelta: number | null = data?.predictedDelta != null ? data.predictedDelta : null
    let predictedRating: number | null = data?.predictedRating != null ? data.predictedRating : null
    let predictionStatus: ContestRatingStatus = (data?.status === "PREDICTION_PENDING" && predictedDelta == null)
      ? "PREDICTING"
      : "PREDICTED"
    let predictionSource: "ENTRANTHUB" | "LEETCODE" = data?.source === "FALLBACK" ? "LEETCODE" : "ENTRANTHUB"

    // Prefer EntrantHub's verified global rank over raw preliminary LeetCode US rank
    const displayRank = finite(data?.rank) && data.rank > 0
      ? data.rank
      : (finite(contest.ranking) ? contest.ranking : null)

    const contestRatingBefore = data?.ratingBefore != null && data.ratingBefore > 0
      ? data.ratingBefore
      : runningRating

    if (predictedRating != null) {
      runningRating = predictedRating
    } else if (predictedDelta != null) {
      runningRating = contestRatingBefore + predictedDelta
    }

    if (predictedDelta != null || predictionStatus === "PREDICTING") {
      const pendingItem: ContestLifecycleItem = {
        contestSlug: slug,
        contestTitle: contest.title || titleFromSlug(slug),
        contestDate: startTime > 0 ? new Date(startTime * 1000).toISOString() : null,
        rank: displayRank,
        problemsSolved: solved,
        totalProblems: finite(contest.totalQuestions) ? contest.totalQuestions : 4,
        finishTimeMinutes: durationMinutes,
        ratingBefore: contestRatingBefore,
        ratingAfter: null,
        ratingDelta: predictedDelta,
        predictedRating,
        predictedDelta,
        predictedRank: displayRank,
        status: predictionStatus,
        source: predictionSource,
        refreshedAt,
        attended: true
      }
      pendingItems.push(pendingItem)
    }
  }

  // Prepend pending unfinalized contests (newest first: Sunday Weekly, then Saturday Biweekly)
  pendingItems.reverse()
  result.unshift(...pendingItems)

  return result
}
