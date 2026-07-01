import type { LeetCodeRegion } from "./api/entranthub"
import { withTimeout } from "./utils/network"

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
  region?: LeetCodeRegion
  forceRefresh?: boolean
}

// In-memory Cache Structure (stores user-specific context to prevent cross-leakage)
let cache: {
  username: string
  region: LeetCodeRegion
  data: PredictedContestResult
  timestamp: number
} | null = null

/**
 * Message sending helper to delegate fetches to background script to bypass CORS.
 */
function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) reject(new Error(runtimeError.message))
      else resolve(response as T)
    })
  })
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
  
  // 1. Verify User-Specific cache validation to avoid returning cached predictions from another account
  if (
    !forceRefresh &&
    cache &&
    cache.username === username &&
    cache.region === normalizedRegion &&
    now - cache.timestamp < CACHE_TTL_MS
  ) {
    return cache.data
  }

  try {
    // 2. Fetch history and past contests in parallel via background script
    const [historyRes, pastRes] = await Promise.all([
      sendMessage<any>({
        action: "get_entranthub_history",
        payload: { username, region: normalizedRegion }
      }).catch((err) => {
        console.warn("Failed to fetch official history for predictions:", err)
        return null
      }),
      sendMessage<any>({
        action: "get_leetcode_past_contests"
      }).catch((err) => {
        console.warn("Failed to fetch past contests for predictions:", err)
        return null
      })
    ])

    const history = historyRes?.ok && Array.isArray(historyRes.data) ? historyRes.data : []
    const pastContests = pastRes?.ok && Array.isArray(pastRes.data) ? pastRes.data : []

    const officialSlugs = new Set(
      (history || []).map((item: any) => item.titleSlug.toLowerCase().trim())
    )

    // Filter to LeetCode platform only and sort newest first
    const sortedContests = (pastContests || [])
      .filter((c: any) => c.platform === "LeetCode")
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())

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
        // Fetch prediction rankings via background script message, raced against a timeout
        const response = await withTimeout(
          sendMessage<any>({
            action: "get_entranthub_prediction",
            payload: { contestSlug: contest.id, username }
          }),
          REQUEST_TIMEOUT_MS
        )

        const ranking = response?.ok ? response.data : null

        if (ranking) {
          // Debug Logging Groups for Development diagnostics
          console.group(`AlgoVault EntrantHub Rankings Prediction: ${contest.id}`)
          console.log("Contest ID/Slug:", contest.id)
          console.log("Ranking Details:", ranking)
          console.groupEnd()

          predictedContests.push({
            titleSlug: contestSlug,
            contestName: contest.name,
            oldRating: ranking.oldRating,
            predictedRating: ranking.newRating,
            predictedDelta: ranking.deltaRating,
            predictedRank: ranking.rank,
            predicted: true,
            platform: "LeetCode"
          })
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

    // Update in-memory cache with context key parameters
    cache = {
      username,
      region: normalizedRegion,
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
