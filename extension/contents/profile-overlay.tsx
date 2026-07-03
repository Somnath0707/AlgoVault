import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useEffect, useMemo, useState } from "react"
import { BarChart3, ExternalLink, RefreshCw, Search, ShieldCheck, X } from "lucide-react"
import { analyzeEvents, type CheatReport } from "../lib/api/leetcode"
import { loadContestLifecycle, type ContestLifecycleItem } from "../lib/contest-lifecycle"

export const config: PlasmoCSConfig = { matches: ["https://leetcode.com/u/*"] }
export const getInlineAnchor: PlasmoGetInlineAnchor = async () => document.body
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

interface ReplaySummary {
  loading: boolean
  reports: Array<{ title: string; report: CheatReport }>
  error?: string
}

function message<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      const error = chrome.runtime.lastError
      if (error) reject(new Error(error.message))
      else resolve(response as T)
    })
  })
}

function displayDelta(contest?: ContestLifecycleItem) {
  if (!contest) return "Contest analytics"
  const delta = contest.status === "FINALIZED" ? contest.ratingDelta : contest.predictedDelta
  const rating = contest.status === "FINALIZED" ? contest.ratingAfter : contest.predictedRating
  if (delta == null) {
    if (contest.status === "FINALIZED" && rating != null) return `${Math.round(rating)} official`
    return contest.predictionError ? "Prediction unavailable" : "Prediction pending"
  }
  return `${delta >= 0 ? "+" : ""}${Math.round(delta)} ${contest.status === "FINALIZED" ? "official" : "predicted"}`
}

export default function ProfileOverlay() {
  const username = useMemo(() => decodeURIComponent(location.pathname.match(/\/u\/([^/]+)/)?.[1] || ""), [])
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"contests" | "replay">("contests")
  const [contests, setContests] = useState<ContestLifecycleItem[]>([])
  const [replays, setReplays] = useState<Record<string, ReplaySummary>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const refresh = async () => {
    if (!username) return
    setLoading(true)
    setError("")
    try {
      setContests(await loadContestLifecycle(username))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Contest data unavailable")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 2 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [username])

  const scanReplay = async (contest: ContestLifecycleItem) => {
    setReplays((current) => ({ ...current, [contest.contestSlug]: { loading: true, reports: [] } }))
    try {
      const questionResponse = await message<any>({ action: "get_contest_questions", payload: { contestSlug: contest.contestSlug } })
      const questions = questionResponse?.ok && Array.isArray(questionResponse.data) ? questionResponse.data : []
      const reports = await Promise.all(questions.map(async (question: any) => {
        const replayResponse = await message<any>({
          action: "get_replay_events",
          payload: { username, contestSlug: contest.contestSlug, questionSlug: question.titleSlug }
        }).catch(() => null)
        const events = replayResponse?.ok && Array.isArray(replayResponse.data) ? replayResponse.data : []
        return { title: question.title, report: analyzeEvents(events) }
      }))
      setReplays((current) => ({ ...current, [contest.contestSlug]: { loading: false, reports } }))
    } catch (cause) {
      setReplays((current) => ({
        ...current,
        [contest.contestSlug]: { loading: false, reports: [], error: cause instanceof Error ? cause.message : "Replay unavailable" }
      }))
    }
  }

  const filteredContests = useMemo(() => {
    return contests.filter((c) => c.attended === true)
  }, [contests])

  const latest = filteredContests[0]
  const evidenceCount = Object.values(replays).reduce((count, summary) => count + summary.reports.filter(({ report }) => report.focusLoss > 10 || report.pasteCount > 0).length, 0)

  return (
    <div className="fixed right-5 top-24 z-[2147483646] font-sans text-zinc-200">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold shadow-lg hover:border-zinc-500"
        title="Open AlgoVault profile analytics"
      >
        <BarChart3 size={14} className="text-[#dfa054]" />
        <span>{loading ? "Loading contests" : displayDelta(latest)}</span>
        {evidenceCount > 0 && <span className="rounded-full bg-amber-500/15 px-1.5 text-amber-400">{evidenceCount}</span>}
      </button>

      {open && (
        <section className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
          <header className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
            <div><div className="text-sm font-bold">AlgoVault</div><div className="text-[10px] text-zinc-500">@{username}</div></div>
            <div className="flex gap-1">
              <button onClick={() => void refresh()} title="Refresh" className="p-1.5 text-zinc-500 hover:text-zinc-200"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button>
              <button onClick={() => setOpen(false)} title="Close" className="p-1.5 text-zinc-500 hover:text-zinc-200"><X size={15} /></button>
            </div>
          </header>
          <div className="grid grid-cols-2 border-b border-zinc-800 p-1">
            <button onClick={() => setTab("contests")} className={`rounded py-1.5 text-[11px] font-semibold ${tab === "contests" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>Contests</button>
            <button onClick={() => setTab("replay")} className={`rounded py-1.5 text-[11px] font-semibold ${tab === "replay" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}>Replay evidence</button>
          </div>

          <div className="max-h-[480px] overflow-y-auto p-3">
            {error && <div className="rounded border border-red-900/60 bg-red-950/20 p-2 text-xs text-red-400">{error}</div>}
            {tab === "contests" && (
              <div className="grid gap-2">
                {filteredContests
                  .filter((c) => c.status === "FINALIZED")
                  .slice(0, 12)
                  .map((contest) => {
                    const delta = contest.status === "FINALIZED" ? contest.ratingDelta : contest.predictedDelta
                    const rating = contest.status === "FINALIZED" ? contest.ratingAfter : contest.predictedRating
                    return (
                      <div key={contest.contestSlug} className="rounded-md border border-zinc-800 bg-zinc-900/60 p-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><div className="truncate text-xs font-semibold">{contest.contestTitle}</div><div className="mt-1 text-[10px] text-zinc-500">Rank {contest.rank ?? contest.predictedRank ?? "n/a"} · {contest.problemsSolved ?? "?"}/{contest.totalProblems ?? "?"}</div></div>
                          <div className="shrink-0 text-right"><div className={`text-xs font-bold ${delta == null ? "text-zinc-500" : delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>{delta == null ? (contest.status === "FINALIZED" && rating != null ? `${Math.round(rating)} official` : contest.predictionError ? "Unavailable" : "Pending") : `${rating == null ? "" : `${Math.round(rating)} `}${delta >= 0 ? "+" : ""}${Math.round(delta)}`}</div><div className={`text-[9px] ${contest.status === "FINALIZED" ? "text-emerald-500" : contest.predictionError ? "text-zinc-500" : "text-amber-400"}`}>{contest.status === "FINALIZED" ? "OFFICIAL" : contest.predictionError ? "SOURCE BLOCKED" : contest.status}</div></div>
                        </div>
                      </div>
                    )
                  })}
                {!loading && filteredContests.filter((c) => c.status === "FINALIZED").length === 0 && <div className="py-6 text-center text-xs text-zinc-500">No attended contests returned.</div>}
              </div>
            )}

            {tab === "replay" && (
              <div className="grid gap-2">
                <div className="mb-1 flex gap-2 rounded-md border border-amber-900/40 bg-amber-950/15 p-2 text-[10px] leading-relaxed text-amber-200/80"><ShieldCheck size={14} className="shrink-0" />Replay events are behavioral evidence, not proof of cheating.</div>
                {filteredContests.slice(0, 5).map((contest) => {
                  const summary = replays[contest.contestSlug]
                  const replayPage = contest.rank ? Math.max(1, Math.ceil(contest.rank / 25)) : 1
                  return (
                    <div key={contest.contestSlug} className="rounded-md border border-zinc-800 p-2.5">
                      <div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold">{contest.contestTitle}</span><div className="flex shrink-0 gap-1"><a href={`https://leetcode.com/contest/${contest.contestSlug}/ranking/${replayPage}/?region=global`} target="_blank" rel="noreferrer" title="Open official replay ranking" className="p-1 text-zinc-500 hover:text-zinc-200"><ExternalLink size={13} /></a><button onClick={() => void scanReplay(contest)} disabled={summary?.loading} title="Analyze replay events" className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-300 disabled:opacity-50"><Search size={11} />{summary?.loading ? "Scanning" : "Scan"}</button></div></div>
                      {summary?.error && <div className="mt-2 text-[10px] text-red-400">{summary.error}</div>}
                      {summary?.reports.map(({ title, report }) => {
                        const isManual = report.status === 'CLEAN';
                        const badgeColor = report.status === 'HEAVY_PASTE' 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                          : report.status === 'MILD_PASTE' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                        const labelText = report.status === 'CLEAN' ? 'No external paste' : report.label;
                        return (
                          <div key={title} className="mt-3 border-t border-zinc-900 pt-2.5 first:border-t-0">
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-[11px] font-semibold text-zinc-300 truncate" title={title}>{title}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>{labelText}</span>
                            </div>
                            <ul className="mt-1 ml-2 space-y-0.5 text-[10px] text-zinc-500 font-mono">
                              {report.details.map((detail: string, idx: number) => {
                                let displayDetail = detail;
                                if (detail.includes("Large Ext. Paste:")) {
                                  displayDetail = detail.replace("Large Ext. Paste:", "Large Ext. Paste!:");
                                }
                                return (
                                  <li key={idx}>• {displayDetail}</li>
                                )
                              })}
                              {isManual && <li>• No external paste event recorded</li>}
                              {!isManual && report.focusLoss > 0 && !report.details.some(d => d.includes("Tab Switch")) && (
                                <li>• Tab Switch: {report.focusLoss}x</li>
                              )}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {latest?.refreshedAt && <footer className="border-t border-zinc-800 px-3 py-2 text-right text-[9px] text-zinc-600">Updated {new Date(latest.refreshedAt).toLocaleString()}</footer>}
        </section>
      )}
    </div>
  )
}
