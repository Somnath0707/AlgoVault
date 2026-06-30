const ENTRANTHUB_BASE_URL = "https://api.entranthub.com/api/v1/contests"

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
  const response = await fetch(`${ENTRANTHUB_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`EntrantHub request failed: ${response.status}`)
  return response.json()
}

export function fetchEntrantHubRealtime(
  contestSlug: string,
  username: string,
  region: LeetCodeRegion = "US"
): Promise<EntrantHubRealtimeData> {
  return entrantHubFetch(
    `/leetcode/contests/${encodeURIComponent(contestSlug)}/users/${region}/${encodeURIComponent(username)}/realtime`
  )
}

export function fetchEntrantHubHistory(
  username: string,
  region: LeetCodeRegion = "US"
): Promise<EntrantHubHistoryItem[]> {
  return entrantHubFetch(`/leetcode/users/${region}/${encodeURIComponent(username)}/history`)
}

export function fetchEntrantHubUpcoming(): Promise<EntrantHubContest[]> {
  return entrantHubFetch("?status=upcoming")
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
