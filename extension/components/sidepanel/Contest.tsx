import { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"
import { getUsername, getCachedContests, setCachedContests } from "../../lib/storage"
import { summarizeRealtimePrediction, type EntrantHubHistoryItem } from "../../lib/api/entranthub"
import { UpcomingContests } from "./UpcomingContests"

function slugFromContest(contest: any) {
  return contest.contestSlug || contest.contestTitle?.toLowerCase().trim().replace(/\s+/g, "-")
}

export const Contest = () => {
  const [activeTab, setActiveTab] = useState<"history" | "upcoming">("history")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCachedContests().then((cached) => {
      if (cached) {
        setData(cached)
        setLoading(false)
      }
    })

    fetchContests().then(async (backendData) => {
      const username = await getUsername()
      const merged = backendData.map((contest: any) => ({
        ...contest,
        contestSlug: slugFromContest(contest),
        predictedDelta: null,
        predictedRating: null
      }))

      if (username) {
        const historyResponse: any = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "get_entranthub_history",
            payload: { username, region: "US" }
          }, resolve)
        })

        if (historyResponse?.ok && Array.isArray(historyResponse.data)) {
          const historyBySlug = new Map<string, EntrantHubHistoryItem>(
            historyResponse.data.map((item: EntrantHubHistoryItem) => [item.titleSlug, item])
          )
          merged.forEach((contest: any) => {
            const item = historyBySlug.get(contest.contestSlug)
            if (!item) return
            contest.rank ??= item.ranking
            contest.finishTimeMinutes ??= item.finishTimeInSeconds / 60
            contest.ratingBefore ??= item.oldRating
            contest.ratingAfter ??= item.newRating
            contest.ratingDelta ??= item.newRating - item.oldRating
          })
        }

        const missing = merged.filter((contest: any) => contest.ratingDelta == null).slice(0, 3)
        await Promise.all(missing.map(async (contest: any) => {
          const response: any = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
              action: "get_entranthub_prediction",
              payload: { contestSlug: contest.contestSlug, username, region: "US" }
            }, resolve)
          })
          const prediction = response?.ok ? summarizeRealtimePrediction(response.data) : null
          if (prediction) {
            contest.predictedDelta = prediction.predictedDelta
            contest.predictedRating = prediction.predictedRating
          }
        }))
      }

      setData(merged)
      await setCachedContests(merged)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-4 text-center text-av-text-secondary text-sm">Loading contest statistics...</div>

  const timedContests = data.filter((contest) => contest.finishTimeMinutes != null)
  const avgFinish = timedContests.length
    ? Math.round(timedContests.reduce((sum, contest) => sum + contest.finishTimeMinutes, 0) / timedContests.length)
    : null
  const recentPanic = data.find((contest) => contest.panicIndex && contest.panicIndex !== "Unknown")?.panicIndex || "Unknown"
  const recentChoking = data.find((contest) => contest.chokingIndex && contest.chokingIndex !== "Unknown")?.chokingIndex || "Unknown"
  const signalColor = (value: string) => value === "High" ? "text-red-400" : value === "Medium" ? "text-yellow-400" : value === "Low" ? "text-green-400" : "text-zinc-500"

  return (
    <div className="grid gap-3.5">
      <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
        <button onClick={() => setActiveTab("history")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${activeTab === "history" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500"}`}>History</button>
        <button onClick={() => setActiveTab("upcoming")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${activeTab === "upcoming" ? "bg-zinc-800 text-[#10b981]" : "text-zinc-500"}`}>Upcoming</button>
      </div>

      {activeTab === "upcoming" ? <UpcomingContests /> : <>
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Average Finish Time</h3>
          <div className="text-2xl font-extrabold text-zinc-100 font-mono">{avgFinish == null ? "n/a" : `${avgFinish} mins`}</div>
        </Card>
        <div className="grid grid-cols-2 gap-3.5">
          <Card className="p-3"><h3 className="text-[10px] text-zinc-500 uppercase mb-1">Panic Index</h3><div className={`text-sm font-bold ${signalColor(recentPanic)}`}>{recentPanic}</div></Card>
          <Card className="p-3"><h3 className="text-[10px] text-zinc-500 uppercase mb-1">Choking Index</h3><div className={`text-sm font-bold ${signalColor(recentChoking)}`}>{recentChoking}</div></Card>
        </div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-2">Contest History</h3>
        <div className="flex flex-col gap-2">
          {data.map((contest) => {
            const delta = contest.ratingDelta ?? contest.predictedDelta
            const finalRating = contest.ratingAfter ?? contest.predictedRating
            const estimated = contest.ratingDelta == null && contest.predictedDelta != null
            return (
              <Card key={contest.contestSlug || contest.contestTitle} className="py-2.5 px-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-xs text-zinc-200 truncate pr-2">{contest.contestTitle}</span>
                  <span className={`font-bold text-xs font-mono ${delta == null ? "text-zinc-500" : delta >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                    {estimated && <span className="text-zinc-500 text-[10px] mr-1 font-normal">Est:</span>}
                    {delta == null ? "Pending" : `${finalRating != null ? `${Math.round(finalRating)} ` : ""}(${delta >= 0 ? "+" : ""}${Math.round(delta)})`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                  <span>Rank: <span className="text-zinc-300">{contest.rank ?? "n/a"}</span></span>
                  <span>{contest.problemsSolved ?? 0}/{contest.totalProblems ?? "?"} Solved</span>
                  <span>{contest.finishTimeMinutes != null ? `${Math.round(contest.finishTimeMinutes)}m` : "Time n/a"}</span>
                </div>
              </Card>
            )
          })}
        </div>
      </>}
    </div>
  )
}
