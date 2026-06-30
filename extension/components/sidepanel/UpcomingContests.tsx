import { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import type { EntrantHubContest } from "../../lib/api/entranthub"

export const UpcomingContests = () => {
  const [contests, setContests] = useState<EntrantHubContest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "get_entranthub_upcoming" }, (response) => {
      if (response?.ok && Array.isArray(response.data)) setContests(response.data)
      else setError(response?.error || "Upcoming contests are temporarily unavailable")
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-4 text-center text-zinc-500 font-mono text-[10px]">Loading upcoming contests...</div>
  if (error) return <div className="p-4 text-center text-red-400 font-mono text-[10px]">{error}</div>

  return (
    <div className="flex flex-col gap-2.5">
      {contests.length === 0 ? (
        <div className="text-center text-zinc-500 font-mono text-[10px] py-4">No upcoming contests found.</div>
      ) : contests.map((contest) => {
        const date = new Date(contest.startTime)
        const isToday = date.toDateString() === new Date().toDateString()
        return (
          <Card key={`${contest.platform}:${contest.id}`} className="p-3 border-l-2 border-l-[#10b981]">
            <div className="flex justify-between items-start mb-1">
              <a href={contest.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-zinc-200 hover:text-[#10b981] transition-colors line-clamp-1 pr-2">
                {contest.name}
              </a>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{contest.platform}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
              <span className={isToday ? "text-[#10b981] font-bold" : ""}>
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
