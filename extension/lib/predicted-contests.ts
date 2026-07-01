import {
  fetchEntrantHubHistory,
  fetchEntrantHubRealtime,
  fetchEntrantHubPast,
  summarizeRealtimePrediction,
  type LeetCodeRegion
} from "./api/entranthub"

// Constants
export const MAX_RECENT_CONTESTS = 5
export const CACHE_TTL_MS = 5 * 60 * 1000
export const REQUEST_TIMEOUT_MS = 5000

// Type Definitions
export interface PredictedContest {
  titleSlug: string
  contestName: string
  oldRating: number
  predictedRating: number
  predictedDelta: number
  predictedRank: number | null
  predicted: true
  platform: "LeetCode" | "Codeforces" | "AtCoder" | "CodeChef"
}

export interface PredictedContestResult {
  contests: PredictedContest[]
  fetchedAt: number
  source: "EntrantHub"
}

export interface GetPredictedContestsConfig {
  username: string
  region?: string
  forceRefresh?: boolean
}

// In-memory Cache
let cache: { data: PredictedContestResult; timestamp: number } | null = null

/**
 * Helper to race a promise against a timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
    )
  ])
}

/**
 * Fetches and resolves predicted ratings for unfinalized contests.
 */
export async function getPredictedContests(
  config: GetPredictedContestsConfig
): Promise<PredictedContestResult> {
  const { username, region = "US", forceRefresh = false } = config
  const normalizedRegion = (region.toUpperCase() === "CN" ? "CN" : "US") as LeetCodeRegion

  const now = Date.now()
  
  // 1. Check in-memory cache
  if (!forceRefresh && cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data
  }

  try {
    // 2. Fetch history and past contests in parallel
    const [history, pastContests] = await Promise.all([
      fetchEntrantHubHistory(username, normalizedRegion).catch((err) => {
        console.warn("Failed to fetch official history for predictions:", err)
        return []
      }),
      fetchEntrantHubPast().catch((err) => {
        console.warn("Failed to fetch past contests for predictions:", err)
        return []
      })
    ])

    const officialSlugs = new Set(
      (history || []).map((item) => item.titleSlug.toLowerCase().trim())
    )

    // Filter to LeetCode platform only and sort newest first
    const sortedContests = (pastContests || [])
      .filter((c) => c.platform === "LeetCode")
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

    const predictedContests: PredictedContest[] = []
    const limit = Math.min(sortedContests.length, MAX_RECENT_CONTESTS)

    // 3. Sequential timeout-wrapped prediction checks
    for (let i = 0; i < limit; i++) {
      const contest = sortedContests[i]
      const contestSlug = contest.id.toLowerCase().trim()

      // If already official, skip it
      if (officialSlugs.has(contestSlug)) {
        continue
      }

      try {
        // Fetch prediction with a timeout race
        const realtimeData = await withTimeout(
          fetchEntrantHubRealtime(contest.id, username, normalizedRegion),
          REQUEST_TIMEOUT_MS
        )

        if (realtimeData) {
          const summary = summarizeRealtimePrediction(realtimeData)
          if (summary) {
            predictedContests.push({
              titleSlug: contestSlug,
              contestName: contest.name,
              oldRating: summary.oldRating,
              predictedRating: summary.predictedRating,
              predictedDelta: summary.predictedDelta,
              predictedRank: summary.predictedRank,
              predicted: true,
              platform: "LeetCode"
            })
          }
        }
      } catch (err) {
        console.warn(
          `Skipped prediction query for ${contest.id} due to timeout/error:`,
          err instanceof Error ? err.message : err
        )
      }
    }

    const result: PredictedContestResult = {
      contests: predictedContests,
      fetchedAt: Date.now(),
      source: "EntrantHub"
    }

    // Update in-memory cache
    cache = {
      data: result,
      timestamp: Date.now()
    }

    return result
  } catch (err) {
    console.error("Critical error inside getPredictedContests:", err)
    return {
      contests: [],
      fetchedAt: Date.now(),
      source: "EntrantHub"
    }
  }
}
