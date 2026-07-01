const ENTRANTHUB_BASE_URL = "https://api.entranthub.com/api/v1"

export type LeetCodeRegion = "US" | "CN"

export interface EntrantHubRealtimeData {
  contestTitleSlug: string
  dataRegion: LeetCodeRegion
  userSlug: string
  ranks: number[]
  ratings: number[]
}

export interface EntrantHubHistoryItem {
  titleSlug: string
  finishTimeInSeconds: number
  ranking: number
  newRating: number
  oldRating: number
  attendedContestsCount: number
}

export interface EntrantHubContest {
  platform: "LeetCode" | "Codeforces" | "AtCoder" | "CodeChef"
  id: string
  name: string
  startTime: string
  durationSeconds: number
  url: string
}

async function entrantHubFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${ENTRANTHUB_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  })
  if (!response.ok) {
    const body = await response.text().catch(() => "")
    const isCloudflareChallenge = response.status === 403 && body.includes("cf-mitigated")
    throw new Error(
      isCloudflareChallenge
        ? "EntrantHub API is blocked by Cloudflare challenge right now"
        : `EntrantHub request failed: ${response.status}`
    )
  }
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    throw new Error("EntrantHub returned a non-JSON response")
  }
  return response.json()
}

export interface EntrantHubRankingItem {
  userSlug: string
  rank: number
  oldRating: number
  newRating: number
  deltaRating: number
  expectedRating: number
}

export interface EntrantHubRankingsResponse {
  items: EntrantHubRankingItem[]
}

export async function fetchEntrantHubRankingPrediction(
  contestSlug: string,
  username: string
): Promise<EntrantHubRankingItem | null> {
  const cleanUsername = username.trim().toLowerCase()
  const path = `/contests/leetcode/contests/${encodeURIComponent(contestSlug)}/rankings?limit=25&offset=0&userSlug=${encodeURIComponent(cleanUsername)}`
  const url = `${ENTRANTHUB_BASE_URL}${path}`

  console.log("entranthub.ts: fetchEntrantHubRankingPrediction requesting URL:", url)

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json"
    }
  })

  console.log("entranthub.ts: fetchEntrantHubRankingPrediction response status:", response.status)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    console.warn("entranthub.ts: fetchEntrantHubRankingPrediction query failed with body:", errorBody)
    throw new Error(`EntrantHub request failed: ${response.status}`)
  }

  const payload = await response.json()

  console.log("entranthub.ts: fetchEntrantHubRankingPrediction raw JSON payload:", payload)

  if (payload && Array.isArray(payload.items)) {
    const match = payload.items.find(
      (item: any) => item.userSlug?.toLowerCase() === cleanUsername
    )

    if (match) {
      console.log("entranthub.ts: fetchEntrantHubRankingPrediction matched item:", match)
    } else {
      const returnedSlugs = payload.items.map((item: any) => item.userSlug)
      console.log("entranthub.ts: fetchEntrantHubRankingPrediction no userSlug match. Returned userSlugs in items:", returnedSlugs)
    }

    return match || null
  }

  console.log("entranthub.ts: fetchEntrantHubRankingPrediction payload has no items list or is invalid")
  return null
}

/**
 * @deprecated Use fetchEntrantHubRankingPrediction instead for rankings-based prediction details.
 */
export function fetchEntrantHubRealtime(
  contestSlug: string,
  username: string,
  region: LeetCodeRegion = "US"
): Promise<EntrantHubRealtimeData> {
  const cleanUsername = username.trim().toLowerCase();
  return entrantHubFetch(
    `/contests/leetcode/contests/${encodeURIComponent(contestSlug)}/users/${region}/${encodeURIComponent(cleanUsername)}/realtime`
  )
}

export function fetchEntrantHubHistory(
  username: string,
  region: LeetCodeRegion = "US"
): Promise<EntrantHubHistoryItem[]> {
  const cleanUsername = username.trim().toLowerCase();
  return entrantHubFetch(`/contests/leetcode/users/${region}/${encodeURIComponent(cleanUsername)}/history`)
}

export function fetchEntrantHubUpcoming(): Promise<EntrantHubContest[]> {
  return entrantHubFetch("/contests?status=upcoming")
}

export function fetchEntrantHubPast(): Promise<EntrantHubContest[]> {
  return entrantHubFetch("/contests?status=past")
}

export function summarizeRealtimePrediction(data: EntrantHubRealtimeData | null | undefined) {
  const ratings = data?.ratings?.filter(Number.isFinite) ?? []
  const ranks = data?.ranks?.filter(Number.isFinite) ?? []
  if (!ratings.length) return null

  const oldRating = ratings[0]
  const predictedRating = ratings[ratings.length - 1]
  return {
    oldRating,
    predictedRating,
    predictedDelta: predictedRating - oldRating,
    predictedRank: ranks.length ? ranks[ranks.length - 1] : null
  }
}
