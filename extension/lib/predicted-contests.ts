import type { LeetCodeRegion } from "./api/entranthub"
import { fetchEntrantHubHistoryBackend, fetchEntrantHubRankingPredictionBackend } from "./api/backend"
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

function collectionFrom(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  for (const key of ["items", "data", "results", "payload"]) {
    if (Array.isArray(record[key])) return record[key] as any[]
  }
  return []
}

function normalizedSlug(value: unknown): string | null {
  if (typeof value !== "string") return null
  const slug = value.trim().toLowerCase()
  return slug || null
}

function finiteNumber(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

function predictionFromRanking(payload: unknown, username: string) {
  const direct = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
  const candidates = collectionFrom(payload)
  const requestedUser = username.trim().toLowerCase()
  const row = candidates.find((candidate) => {
    const candidateUser = normalizedSlug(candidate?.userSlug ?? candidate?.username ?? candidate?.user?.username)
    return candidateUser === requestedUser
  }) ?? (candidates.length === 1 ? candidates[0] : direct)

  if (!row || typeof row !== "object") return null
  const record = row as Record<string, unknown>
  const oldRating = finiteNumber(record.oldRating ?? record.ratingBefore)
  const predictedRating = finiteNumber(record.newRating ?? record.predictedRating ?? record.expectedRating)
  const predictedRank = finiteNumber(record.rank ?? record.ranking)
  const reportedDelta = finiteNumber(record.deltaRating ?? record.predictedDelta)

  if (oldRating === null || predictedRating === null) return null
  return {
    oldRating,
    predictedRating,
    predictedDelta: reportedDelta ?? predictedRating - oldRating,
    predictedRank
  }
}

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
    // 2. Fetch history from backend and past contests in parallel via background script
    const [history, pastRes] = await Promise.all([
      fetchEntrantHubHistoryBackend(username, normalizedRegion).catch((err) => {
        console.warn("Failed to fetch official history for predictions:", err)
        return []
      }),
      sendMessage<any>({
        action: "get_leetcode_past_contests"
      }).catch((err) => {
        console.warn("Failed to fetch past contests for predictions:", err)
        return null
      })
    ])

    const pastContests = pastRes?.ok && Array.isArray(pastRes.data) ? pastRes.data : []
    const officialSlugs = new Set(
      collectionFrom(history)
        .map((item: any) => normalizedSlug(item?.titleSlug ?? item?.contestTitleSlug))
        .filter((slug): slug is string => slug !== null)
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
      const contestSlug = normalizedSlug(contest.id)
      if (!contestSlug) continue

      // If already official, skip it
      if (officialSlugs.has(contestSlug)) {
        continue
      }

      try {
        // Fetch prediction rankings from our backend proxy, raced against a timeout
        const ranking = await withTimeout(
          fetchEntrantHubRankingPredictionBackend(contest.id, username),
          REQUEST_TIMEOUT_MS
        )

        const prediction = predictionFromRanking(ranking, username)
        if (prediction) {
          const newContest: PredictedContest = {
            titleSlug: contestSlug,
            contestName: contest.name,
            oldRating: prediction.oldRating,
            predictedRating: prediction.predictedRating,
            predictedDelta: prediction.predictedDelta,
            predictedRank: prediction.predictedRank,
            predicted: true,
            platform: "LeetCode"
          }
          predictedContests.push(newContest)
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
