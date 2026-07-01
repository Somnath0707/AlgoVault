import type { EntrantHubHistoryItem } from "./api/entranthub"
import { summarizeRealtimePrediction } from "./api/entranthub"

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

export async function loadContestLifecycle(username: string): Promise<ContestLifecycleItem[]> {
  const refreshedAt = new Date().toISOString()
  const [officialResponse, entrantHubResponse, pastResponse] = await Promise.all([
    sendMessage<any>({ action: "get_user_contest_history", payload: { username } }).catch(() => null),
    sendMessage<any>({ action: "get_entranthub_history", payload: { username, region: "US" } }).catch(() => null),
    sendMessage<any>({ action: "get_entranthub_past" }).catch(() => null)
  ])

  const officialRows: OfficialContestRow[] = officialResponse?.ok
    ? officialResponse.data?.userContestRankingHistory ?? []
    : []
  const official = officialRows
    .filter((row) => row.attended && row.contest?.titleSlug)
    .sort((left, right) => (left.contest?.startTime ?? 0) - (right.contest?.startTime ?? 0))
  const entrantHub: EntrantHubHistoryItem[] = entrantHubResponse?.ok && Array.isArray(entrantHubResponse.data)
    ? entrantHubResponse.data
    : []
  const entrantHubBySlug = new Map(entrantHub.map((item) => [item.titleSlug.toLowerCase(), item]))
  const result = new Map<string, ContestLifecycleItem>()

  official.forEach((row, index) => {
    const slug = row.contest!.titleSlug!.toLowerCase()
    const previousRating = index > 0 && finite(official[index - 1]?.rating) ? official[index - 1].rating! : null
    const currentRating = finite(row.rating) ? row.rating : null
    const history = entrantHubBySlug.get(slug)
    const ratingBefore = finite(history?.oldRating) ? history!.oldRating : previousRating
    const ratingAfter = finite(history?.newRating) ? history!.newRating : currentRating
    const ratingDelta = ratingBefore != null && ratingAfter != null ? ratingAfter - ratingBefore : null

    result.set(slug, {
      contestSlug: slug,
      contestTitle: row.contest?.title || titleFromSlug(slug),
      contestDate: finite(row.contest?.startTime) ? new Date(row.contest!.startTime! * 1000).toISOString() : null,
      rank: finite(row.ranking) ? row.ranking : finite(history?.ranking) ? history!.ranking : null,
      problemsSolved: finite(row.problemsSolved) ? row.problemsSolved : null,
      totalProblems: finite(row.totalProblems) ? row.totalProblems : null,
      finishTimeMinutes: finite(row.finishTimeInSeconds)
        ? row.finishTimeInSeconds! / 60
        : finite(history?.finishTimeInSeconds) ? history!.finishTimeInSeconds / 60 : null,
      ratingBefore,
      ratingAfter,
      ratingDelta,
      predictedRating: null,
      predictedDelta: null,
      predictedRank: null,
      status: "FINALIZED", // If it's in LeetCode's official ranking history, it's finalized
      source: history ? "LEETCODE_AND_ENTRANTHUB" : "LEETCODE",
      refreshedAt,
      attended: true
    })
  })

  entrantHub.forEach((history) => {
    const slug = history.titleSlug.toLowerCase()
    if (result.has(slug)) return
    const hasRating = finite(history.oldRating) && finite(history.newRating)
    result.set(slug, {
      contestSlug: slug,
      contestTitle: titleFromSlug(slug),
      contestDate: null,
      rank: finite(history.ranking) ? history.ranking : null,
      problemsSolved: null,
      totalProblems: null,
      finishTimeMinutes: finite(history.finishTimeInSeconds) ? history.finishTimeInSeconds / 60 : null,
      ratingBefore: hasRating ? history.oldRating : null,
      ratingAfter: null,
      ratingDelta: null,
      predictedRating: hasRating ? history.newRating : null,
      predictedDelta: hasRating ? history.newRating - history.oldRating : null,
      predictedRank: finite(history.ranking) ? history.ranking : null,
      status: hasRating ? "PREDICTED" : "PREDICTING", // Stays in prediction until LeetCode officials update it
      source: "ENTRANTHUB",
      refreshedAt,
      attended: true
    })
  })

  // Append past unfinalized/unattended contests from EntrantHub
  const pastContests = pastResponse?.ok && Array.isArray(pastResponse.data) ? pastResponse.data : []
  pastContests.forEach((c: any) => {
    if (c.platform !== "LeetCode") return
    const slug = c.id.toLowerCase()
    if (result.has(slug)) return
    
    result.set(slug, {
      contestSlug: slug,
      contestTitle: c.name,
      contestDate: c.startTime,
      rank: null,
      problemsSolved: null,
      totalProblems: null,
      finishTimeMinutes: null,
      ratingBefore: null,
      ratingAfter: null,
      ratingDelta: null,
      predictedRating: null,
      predictedDelta: null,
      predictedRank: null,
      status: "UNRATED",
      source: "ENTRANTHUB",
      refreshedAt,
      attended: false
    })
  })

  const ordered = Array.from(result.values()).sort((left, right) => {
    if (left.contestDate && right.contestDate) return right.contestDate.localeCompare(left.contestDate)
    return right.contestSlug.localeCompare(left.contestSlug, undefined, { numeric: true })
  })

  // Query EntrantHub predictions for the most recent unfinalized contests to check if user attended
  const recentUnfinalized = ordered.filter((c) => c.status === "UNRATED" || c.status === "PREDICTING").slice(0, 3)
  await Promise.all(
    recentUnfinalized.map(async (contest) => {
      try {
        const response = await sendMessage<any>({
          action: "get_entranthub_prediction",
          payload: { contestSlug: contest.contestSlug, username, region: "US" }
        })
        if (response?.ok && response.data) {
          const prediction = summarizeRealtimePrediction(response.data)
          if (prediction && prediction.predictedRank != null) {
            contest.attended = true
            contest.ratingBefore = prediction.oldRating
            contest.predictedRating = prediction.predictedRating
            contest.predictedDelta = prediction.predictedDelta
            contest.predictedRank = prediction.predictedRank
            contest.status = "PREDICTED"
            contest.source = "ENTRANTHUB"
          }
        }
      } catch (err) {
        console.warn(`Failed to check prediction for ${contest.contestSlug}:`, err)
      }
    })
  )

  return ordered
}
