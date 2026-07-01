import { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchEntrantHubUpcomingBackend } from "../../lib/api/backend"
import type { EntrantHubContest } from "../../lib/api/entranthub"


export const UpcomingContests = () => {
  const [contests, setContests] = useState<EntrantHubContest[]>([])
  const [registered, setRegistered] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    // Fetch upcoming contests
    fetchEntrantHubUpcomingBackend()
      .then((data) => {
        if (Array.isArray(data)) setContests(data)
        else setError("Upcoming contests are temporarily unavailable")
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Upcoming contests are temporarily unavailable")
        setLoading(false)
      })


    // Load registered contests
    chrome.storage.local.get(["algovault.registeredContests"], (res) => {
      let regList = res["algovault.registeredContests"]
      if (typeof regList === "string") {
        try { regList = JSON.parse(regList) } catch (e) {}
      }
      if (Array.isArray(regList)) setRegistered(regList)
    })
  }, [])

  const toggleRegistered = (contestId: string) => {
    const next = registered.includes(contestId)
      ? registered.filter((id) => id !== contestId)
      : [...registered, contestId]
    setRegistered(next)
    chrome.storage.local.set({ "algovault.registeredContests": next })
  }

  if (loading) return <div className="p-4 text-center text-zinc-500 font-mono text-[10px]">Loading upcoming contests...</div>
  if (error) return <div className="p-4 text-center text-red-400 font-mono text-[10px]">{error}</div>

  return (
    <div className="flex flex-col gap-2.5">
      {contests.length === 0 ? (
        <div className="text-center text-zinc-500 font-mono text-[10px] py-4">No upcoming contests found.</div>
      ) : contests.map((contest) => {
        const date = new Date(contest.startTime)
        const isToday = date.toDateString() === new Date().toDateString()
        const isReg = registered.includes(contest.id)
        return (
          <Card key={`${contest.platform}:${contest.id}`} className={`p-3 border-l-2 transition-all ${isReg ? "border-l-[#10b981] bg-[#10b981]/5" : "border-l-zinc-700 bg-zinc-950/20"}`}>
            <div className="flex justify-between items-start mb-1">
              <a href={contest.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-zinc-200 hover:text-[#10b981] transition-colors line-clamp-1 pr-2">
                {contest.name}
              </a>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{contest.platform}</span>
                <button
                  onClick={() => toggleRegistered(contest.id)}
                  className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded border transition-all ${
                    isReg 
                      ? "bg-emerald-950/30 text-[#10b981] border-[#10b981]/30 hover:bg-emerald-950/50" 
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                >
                  {isReg ? "Registered ✓" : "Register"}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
              <span className={isToday ? "text-[#10b981] font-bold animate-pulse" : ""}>
                {isToday ? "Today, " : ""}{date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span>{Math.max(1, Math.round(contest.durationSeconds / 3600))}h</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
