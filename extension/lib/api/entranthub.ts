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
