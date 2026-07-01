import { useEffect, useState, useMemo } from "react"
import { RefreshCw } from "lucide-react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"
import { getUsername, setCachedContests } from "../../lib/storage"
import { loadContestLifecycle, type ContestLifecycleItem } from "../../lib/contest-lifecycle"
import { UpcomingContests } from "./UpcomingContests"

function deltaText(contest: ContestLifecycleItem) {
  const delta = contest.status === "FINALIZED" ? contest.ratingDelta : contest.predictedDelta
  const rating = contest.status === "FINALIZED" ? contest.ratingAfter : contest.predictedRating
  if (delta == null) return contest.status === "FINALIZED" && rating != null ? `${Math.round(rating)} official` : "Pending"
  return `${rating == null ? "" : `${Math.round(rating)} `}(${delta >= 0 ? "+" : ""}${Math.round(delta)})`
}

export const Contest = () => {
  const [activeTab, setActiveTab] = useState<"history" | "predicted" | "upcoming">("history")
  const [data, setData] = useState<ContestLifecycleItem[]>([])
  const [analytics, setAnalytics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = async () => {
    setLoading(true)
    setError("")
    try {
      const username = await getUsername()
      if (!username) throw new Error("Set your LeetCode username in Settings")
      const [lifecycle, localAnalytics] = await Promise.all([
        loadContestLifecycle(username),
        fetchContests().catch(() => [])
      ])
      setData(lifecycle)
      setAnalytics(localAnalytics)
      await setCachedContests(lifecycle as any)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load contest history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 2 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  const timed = data.filter((contest) => contest.finishTimeMinutes != null)
  const avgFinish = timed.length
    ? Math.round(timed.reduce((sum, contest) => sum + contest.finishTimeMinutes!, 0) / timed.length)
    : null
  const pendingCount = data.filter((contest) => contest.status === "PREDICTED" || contest.status === "PREDICTING").length
  const latestAnalytics = analytics[0]

  // Filter display list
  const filteredContests = useMemo(() => {
    if (activeTab === "history") {
      return data.filter((contest) => contest.status === "FINALIZED")
    }
    if (activeTab === "predicted") {
      return data.filter((contest) => contest.status !== "FINALIZED")
    }
    return []
  }, [data, activeTab])

  return (
    <div className="grid gap-3.5">
      <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
        <button onClick={() => setActiveTab("history")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md ${activeTab === "history" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>History</button>
        <button onClick={() => setActiveTab("predicted")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md ${activeTab === "predicted" ? "bg-zinc-800 text-[#dfa054]" : "text-zinc-500 hover:text-zinc-300"}`}>Predicted</button>
        <button onClick={() => setActiveTab("upcoming")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md ${activeTab === "upcoming" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}>Upcoming</button>
      </div>

      {activeTab === "upcoming" ? <UpcomingContests /> : <>
        <div className="flex justify-end">
          <button onClick={() => void refresh()} disabled={loading} title="Refresh contest data" className="p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-40">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {error && <div className="text-xs text-red-400 border border-red-900/50 bg-red-950/20 p-3 rounded-md">{error}</div>}
        
        {activeTab === "history" ? (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3"><div className="text-[10px] text-zinc-500 uppercase">Average finish</div><div className="text-lg font-bold font-mono text-zinc-100">{avgFinish == null ? "n/a" : `${avgFinish}m`}</div></Card>
            <Card className="p-3"><div className="text-[10px] text-zinc-500 uppercase">Awaiting official</div><div className="text-lg font-bold font-mono text-amber-400">{pendingCount}</div></Card>
          </div>
        ) : (
          <div className="grid grid-cols-1">
            <Card className="p-3.5 flex justify-between items-center bg-[#dfa054]/5 border border-[#dfa054]/25">
              <div>
                <div className="text-xs font-semibold text-[#dfa054] uppercase tracking-wider">Unfinalized Contests</div>
                <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Displays estimated ranking delta. Solved items move to history upon official update.</div>
              </div>
              <div className="text-xl font-bold font-mono text-[#dfa054] tabular-nums shrink-0">{pendingCount}</div>
            </Card>
          </div>
        )}

        {activeTab === "history" && latestAnalytics && (
          <div className="text-[10px] text-zinc-500 font-mono">
            Latest behavioral signals: panic {latestAnalytics.panicIndex || "n/a"}, choking {latestAnalytics.chokingIndex || "n/a"}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {!loading && filteredContests.length === 0 && <div className="text-xs text-zinc-500 py-4 text-center">No contests found for this view.</div>}
          {filteredContests.map((contest) => {
            const delta = contest.status === "FINALIZED" ? contest.ratingDelta : contest.predictedDelta
            return (
              <Card key={contest.contestSlug} className="py-2.5 px-3">
                <div className="flex justify-between gap-3 items-start">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-zinc-200 truncate">{contest.contestTitle}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">
                      Rank {contest.rank ?? contest.predictedRank ?? "n/a"} · {contest.problemsSolved ?? "?"}/{contest.totalProblems ?? "?"} solved
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold text-xs font-mono ${delta == null ? "text-zinc-500" : delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>{deltaText(contest)}</div>
                    <div className={`text-[9px] mt-1 font-semibold ${contest.status === "FINALIZED" ? "text-emerald-500" : contest.status === "PREDICTED" ? "text-amber-400" : "text-zinc-500"}`}>
                      {contest.status === "FINALIZED" ? "OFFICIAL" : contest.status === "PREDICTED" ? "ENTRANTHUB PREDICTION" : "PREDICTION PENDING"}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
        {data[0]?.refreshedAt && <div className="text-[9px] text-zinc-600 text-right">Refreshed {new Date(data[0].refreshedAt).toLocaleString()}</div>}
      </>}
    </div>
  )
}
