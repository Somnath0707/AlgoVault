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
        const ttl = entry.data.source === "ENTRANTHUB" ? 12 * 3600 * 1000 : 15 * 60 * 1000
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

export async function loadRecentAttendedContests(username: string, limit: number = 5): Promise<ContestLifecycleItem[]> {
  const lifecycle = await loadContestLifecycle(username)
  return lifecycle.filter((c) => c.attended).slice(0, limit)
}

export async function loadContestLifecycle(username: string, preloadedOfficialResponse?: any): Promise<ContestLifecycleItem[]> {
  const refreshedAt = new Date().toISOString()

  // 1. Fetch official contest history from LeetCode GraphQL
  const officialPromise = preloadedOfficialResponse !== undefined
    ? Promise.resolve(preloadedOfficialResponse)
    : sendMessage<any>({ action: "get_user_contest_history", payload: { username } }).catch(() => null)

  // 2. Fetch latest attended contest using ForeCode's technique (contestV2MyContests)
  const latestContestPromise = sendMessage<any>({ action: "get_latest_attended_contest" }).catch(() => null)

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

  // 3. Check if there is an unfinalized contest attended over the recent weekend
  const latestAttended: LatestAttendedContest | null = latestContestRes?.ok ? latestContestRes.data : null
  if (latestAttended && latestAttended.titleSlug) {
    const latestSlug = latestAttended.titleSlug.toLowerCase()
    const alreadyFinalized = result.some((c) => c.contestSlug === latestSlug && c.status === "FINALIZED")

    const nowSecs = Date.now() / 1000
    const startTime = finite(latestAttended.startTime) ? latestAttended.startTime : 0
    const finishTime = finite(latestAttended.finishTime) ? latestAttended.finishTime : 0
    const solved = finite(latestAttended.solved) ? latestAttended.solved : 0

    // Strict Contest Pending Validation:
    // 1. Must NOT already be finalized in official history.
    // 2. Must have occurred recently (within the last 4.5 days = 388,800 seconds).
    //    LeetCode contests happen on Saturday/Sunday and finalize by Wednesday.
    //    Any contest that started >4.5 days ago was already finalized by LeetCode. If it is not in
    //    official history, the user did NOT attend it!
    // 3. Must have actual participation:
    //    In LeetCode, registering beforehand gives solved = 0 and finishTime = 0.
    //    LeetCode does NOT rate participants who made 0 submissions (unrated).
    //    Therefore, user must have solved >= 1 problem OR have a verified finishTime > startTime with a valid rank.
    const isRecentContest = startTime > 0 && (nowSecs - startTime) <= (4.5 * 24 * 3600) && (nowSecs >= startTime)
    const hasActualParticipation = solved > 0 || (finishTime > startTime && finite(latestAttended.ranking) && latestAttended.ranking > 0)

    if (!alreadyFinalized && isRecentContest && hasActualParticipation) {
      const latestFinalizedRating = result.length > 0 && result[0].ratingAfter != null ? result[0].ratingAfter : 1500

      let predictedDelta: number | null = null
      let predictedRating: number | null = null
      let predictionStatus: ContestRatingStatus = "PREDICTED"
      let predictionSource: "ENTRANTHUB" | "LEETCODE" = "ENTRANTHUB"

      const durationMinutes = finishTime > startTime ? (finishTime - startTime) / 60 : null

      let data = await getCachedPrediction(latestSlug, username)
      if (!data) {
        try {
          const predictionResponse = await sendMessage<any>({
            action: "predict_contest_backend",
            payload: {
              contestSlug: latestSlug,
              contestTitle: latestAttended.title,
              username,
              rank: latestAttended.ranking,
              solved,
              totalQuestions: latestAttended.totalQuestions || 4,
              finishTimeMinutes: durationMinutes,
              currentRating: latestFinalizedRating,
              attendedContestsCount: result.length
            }
          })

          if (predictionResponse?.ok && predictionResponse.data) {
            data = predictionResponse.data
            if (data.status !== "UNRATED") {
              await setCachedPrediction(latestSlug, username, data)
            }
          }
        } catch (err) {
          console.warn("Failed to query contest prediction:", err)
        }
      }

      if (data) {
        if (data.status === "UNRATED") {
          return result
        }
        predictedDelta = data.predictedDelta != null ? data.predictedDelta : null
        predictedRating = data.predictedRating != null ? data.predictedRating : null
        if (data.source === "FALLBACK") {
          predictionSource = "LEETCODE"
        }
        if (data.status === "PREDICTION_PENDING" && predictedDelta == null) {
          predictionStatus = "PREDICTING"
        }
      }

      if (predictedDelta != null || predictionStatus === "PREDICTING") {
        const pendingItem: ContestLifecycleItem = {
          contestSlug: latestSlug,
          contestTitle: latestAttended.title || titleFromSlug(latestSlug),
          contestDate: startTime > 0 ? new Date(startTime * 1000).toISOString() : null,
          rank: finite(latestAttended.ranking) ? latestAttended.ranking : null,
          problemsSolved: solved,
          totalProblems: finite(latestAttended.totalQuestions) ? latestAttended.totalQuestions : 4,
          finishTimeMinutes: durationMinutes,
          ratingBefore: latestFinalizedRating,
          ratingAfter: null,
          ratingDelta: predictedDelta,
          predictedRating,
          predictedDelta,
          predictedRank: finite(latestAttended.ranking) ? latestAttended.ranking : null,
          status: predictionStatus,
          source: predictionSource,
          refreshedAt,
          attended: true
        }

        result.unshift(pendingItem)
      }
    }
  }

  return result
}
