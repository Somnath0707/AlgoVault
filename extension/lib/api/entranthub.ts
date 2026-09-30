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

export const fetchEntrantHubPrediction = async (contestSlug: string, username: string): Promise<EntrantHubRankingItem | null> => {
  const normalizedSlug = contestSlug.trim().toLowerCase()
  const normalizedUsername = username.trim()
  const url = `https://api.entranthub.com/api/v1/contests/leetcode/contests/${encodeURIComponent(normalizedSlug)}/rankings?limit=25&offset=0&userSlug=${encodeURIComponent(normalizedUsername)}`
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://entranthub.com",
        "Referer": "https://entranthub.com/"
      }
    })
    if (!res.ok) return null
    const data: EntrantHubRankingsResponse = await res.json()
    const items = data.items || []
    const match = items.find(
      (i: any) =>
        (typeof i.userSlug === "string" && i.userSlug.toLowerCase() === normalizedUsername.toLowerCase()) ||
        (typeof i.username === "string" && i.username.toLowerCase() === normalizedUsername.toLowerCase())
    )
    return match || null
  } catch (err) {
    console.warn("Direct EntrantHub API lookup failed:", err)
    return null
  }
}
