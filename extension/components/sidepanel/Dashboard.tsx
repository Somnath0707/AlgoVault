import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target, Play, RotateCcw, Square } from "lucide-react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchDashboard, fetchHeatmap, fetchPotd, fetchRevisionQueue, fetchWeakness, fetchAllSessions } from "../../lib/api/backend"
import { 
  getUsername,
  getCachedDashboard,
  setCachedDashboard,
  getCachedHeatmap,
  setCachedHeatmap,
  getCachedWeakness,
  setCachedWeakness,
  getLastSync
} from "../../lib/storage"
import { AchievementShowcase } from "./AchievementShowcase"
import { buildAchievementStats, getAchievements } from "../../lib/achievements"

function message<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve))
}

export const Dashboard = () => {
  const [data, setData] = useState<any>(null)
  const [heatmap, setHeatmap] = useState<any[]>([])
  const [potd, setPotd] = useState<any[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [weakness, setWeakness] = useState<any>(null)
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [profile, setProfile] = useState<any>(null)
  const [zerotrac, setZerotrac] = useState<any[] | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [liveSession, setLiveSession] = useState<any>(null)
  const [sessionSeconds, setSessionSeconds] = useState<number>(0)

  const loadSessionsHistory = () => {
    fetchAllSessions()
      .then((res: any) => {
        if (Array.isArray(res)) {
          setSessions(res)
        }
      })
      .catch(console.error)
  }

  const handleStartSession = (mode = "PRACTICE") => {
    message<any>({ action: "session_start", mode }).then((res) => {
      if (res?.ok) {
        setLiveSession(res.data)
        loadSessionsHistory()
      }
    })
  }

  const handleEndSession = () => {
    message<any>({ action: "session_end" }).then((res) => {
      if (res?.ok) {
        setLiveSession(null)
        // Clear local storage state so the timer stops completely
        chrome.storage.local.remove("algovault.sessionState")
        loadSessionsHistory()
      }
    })
  }

  const handleResetSession = () => {
    message<any>({ action: "session_end" }).then(() => {
      message<any>({ action: "session_start", mode: "PRACTICE" }).then((res) => {
        if (res?.ok) {
          setLiveSession(res.data)
          loadSessionsHistory()
        }
      })
    })
  }

  useEffect(() => {
    // 1. Immediately load from cache to populate UI instantly
    Promise.all([
      getCachedDashboard().catch(() => null),
      getCachedHeatmap().catch(() => []),
      getCachedWeakness().catch(() => null),
      new Promise<any>((resolve) => chrome.storage.local.get("algovault.solvedSlugs", (res) => {
        resolve(res?.["algovault.solvedSlugs"]?.slugs || [])
      })),
      getLastSync().catch(() => null)
    ]).then(([cachedDashboard, cachedHeatmap, cachedWeakness, solvedSlugs, storedLastSync]) => {
      if (cachedDashboard) {
        setData(cachedDashboard)
      }
      if (cachedHeatmap && cachedHeatmap.length) {
        setHeatmap(cachedHeatmap)
      }
      if (cachedWeakness) {
        setWeakness(cachedWeakness)
      }
      setSolved(new Set(solvedSlugs))
      setLastSync(storedLastSync)
      setLoading(false)
    })

    // 2. Fetch fresh data in the background and update caches
    getUsername().then((username) => {
      Promise.all([
        fetchDashboard(),
        fetchHeatmap(),
        fetchPotd().catch(() => []),
        fetchRevisionQueue().catch(() => []),
        fetchWeakness(),
        message<any>({ action: "get_solved_problem_slugs" }).catch(() => null),
        username ? message<any>({ action: "get_user_profile", payload: { username } }).catch(() => null) : null,
        message<any>({ action: "get_zerotrac" }).catch(() => null),
        fetchAllSessions().catch(() => [])
      ]).then(([dashboard, buckets, daily, reviews, weak, solvedResponse, profileRes, zerotracRes, sessionsRes]) => {
        if (dashboard) {
          setData(dashboard)
          setCachedDashboard(dashboard)
        }
        if (buckets && buckets.length) {
          setHeatmap(buckets)
          setCachedHeatmap(buckets)
        }
        if (weak) {
          setWeakness(weak)
          setCachedWeakness(weak)
        }
        setPotd(daily)
        setQueue(reviews)
        setSolved(new Set(solvedResponse?.ok ? solvedResponse.data : []))
        if (profileRes?.ok) {
          setProfile(profileRes.data?.matchedUser || null)
        }
        if (Array.isArray(zerotracRes)) {
          setZerotrac(zerotracRes)
        }
        if (Array.isArray(sessionsRes)) {
          setSessions(sessionsRes)
        }
        setError(null)
      }).catch((err) => {
        console.error("Dashboard background fetch failed:", err)
        setData((prev: any) => {
          if (!prev) {
            setError(err.message || "Failed to fetch dashboard data")
          }
          return prev
        })
      })
    })
  }, [])

  // 3. Keep live session ticking in sync with extension storage
  useEffect(() => {
    const syncSession = () => {
      chrome.storage.local.get(["algovault.currentSession", "algovault.problemStartTime", "algovault.sessionState"], (res) => {
        const current = res?.["algovault.currentSession"]
        setLiveSession(current || null)
        
        const state = res?.["algovault.sessionState"]
        if (state?.isSolved) {
          setSessionSeconds(state.finalSeconds || 0)
        } else {
          const startTime = res?.["algovault.problemStartTime"]
          if (current && startTime) {
            const diff = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
            setSessionSeconds(diff)
          } else {
            setSessionSeconds(0)
          }
        }
      })
    }
    syncSession()
    const interval = window.setInterval(syncSession, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const range = useMemo(() => {
    if (!zerotrac || !solved.size) return null
    const ratings: number[] = []
    for (const p of zerotrac) {
      const slug = p.TitleSlug || p.title_slug
      const rating = p.Rating || p.rating
      if (slug && solved.has(slug) && typeof rating === "number") {
        ratings.push(rating)
      }
    }
    if (!ratings.length) return null
    ratings.sort((a, b) => a - b)
    const mid = Math.floor(ratings.length / 2)
    const median = ratings.length % 2 !== 0 ? ratings[mid] : (ratings[mid - 1] + ratings[mid]) / 2
    const low = Math.round(median)
    const high = low + 100
    return {
      low,
      high,
      challengeLow: high,
      challengeHigh: high + 150,
      evidence: ratings.length
    }
  }, [zerotrac, solved])

  const achievements = useMemo(() => {
    return getAchievements(buildAchievementStats(data || {}, heatmap))
  }, [data, heatmap])

  // 4. Calculate history stats and daily session calendar days
  const stats = useMemo(() => {
    const dailyMinutes: Record<string, number> = {}
    let totalFocusSeconds = 0
    let validSessionCount = 0

    if (Array.isArray(sessions)) {
      for (const s of sessions) {
        if (s.focusSeconds) {
          totalFocusSeconds += s.focusSeconds
          validSessionCount++
        }
        if (s.startedAt) {
          const dateKey = s.startedAt.split("T")[0]
          dailyMinutes[dateKey] = (dailyMinutes[dateKey] || 0) + Math.floor((s.focusSeconds || 0) / 60)
        }
      }
    }

    const calendarDays = Array.from({ length: 28 }).map((_, idx) => {
      const d = new Date()
      d.setDate(d.getDate() - (27 - idx))
      const dateStr = d.toISOString().split("T")[0]
      return {
        dateStr,
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        minutes: dailyMinutes[dateStr] || 0
      }
    })

    const totalHours = totalFocusSeconds / 3600
    const avgSessionMin = validSessionCount > 0 ? Math.round((totalFocusSeconds / 60) / validSessionCount) : 0
    const dailyAvgMin = Math.round(Object.values(dailyMinutes).reduce((sum, m) => sum + m, 0) / Math.max(1, Object.keys(dailyMinutes).length))

    return {
      totalHours,
      avgSessionMin,
      dailyAvgMin,
      calendarDays
    }
  }, [sessions])

  if (loading) return <div className="grid gap-3"><Skeleton className="h-28" /><Skeleton className="h-20" /><Skeleton className="h-48" /></div>

  if (error) {
    return (
      <Card className="py-8 text-center border-red-900/35 bg-red-950/20">
        <div className="text-sm font-semibold text-red-400">Dashboard Failed to Load</div>
        <div className="mt-1.5 text-[10px] text-zinc-405 font-mono px-4 break-all">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-mono border border-zinc-700"
        >
          Retry
        </button>
      </Card>
    )
  }

  if (!data && solved.size > 0) {
    return (
      <Card className="py-8 text-center">
        <div className="text-sm font-semibold text-zinc-200">Local history cache active</div>
        <div className="mt-1 text-xs text-zinc-500">{solved.size} solved problems are available locally{lastSync ? ` · last full sync ${new Date(lastSync).toLocaleDateString()}` : ""}.</div>
      </Card>
    )
  }

  if (!data) return <Card className="py-8 text-center"><div className="text-sm font-semibold text-zinc-200">Sync required</div><div className="mt-1 text-xs text-zinc-500">Run one full LeetCode history sync in Settings to build your dashboard.</div></Card>

  const weakest = weakness?.weakTags?.[0]
  const plan = [
    queue[0] && { type: "Review", title: queue[0].title || queue[0].problemTitle, slug: queue[0].titleSlug },
    potd[0] && { type: potd[0].type || "Practice", title: potd[0].title, slug: potd[0].titleSlug, reason: potd[0].reason },
    weakest && { type: "Weak topic", title: weakest.tag, reason: `${Math.round(weakest.successRate ?? weakest.masteryScore ?? 0)}% current evidence score` }
  ].filter(Boolean) as any[]

  const allSolvedStat = profile?.submitStats?.acSubmissionNum?.find((item: any) => item.difficulty === "All")
  const officialTotalSolved = allSolvedStat ? allSolvedStat.count : data.totalSolved

  return (
    <div className="grid gap-3.5 select-none">
      {/* Solve range card */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"><Target size={13} />Evidence-based solve range</div>
        {range ? (
          <>
            <div className="mt-2 text-3xl font-extrabold font-mono text-zinc-100">{range.low}-{range.high}</div>
            <div className="mt-1 text-[10px] text-zinc-550 font-mono">Based on median rating of {range.evidence} solved problems (+100 offset)</div>
            <div className="mt-3 border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400">
              Challenge next: <span className="font-mono text-[#dfa054]">{range.challengeLow}-{range.challengeHigh}</span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-400">Establish a range by syncing your solved problems history.</div>
        )}
      </Card>

      {/* Dynamic Practice Session Card */}
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
            <Clock3 size={13} /> Current Practice Session
          </div>
          {liveSession ? (
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="text-[9px] font-mono text-zinc-650 uppercase">Standby</span>
          )}
        </div>

        {/* Telemetry metrics */}
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-semibold">Time</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? `${Math.floor(sessionSeconds / 60)}:${String(sessionSeconds % 60).padStart(2, "0")}` : "0:00"}
            </span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-semibold">Focus</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? `${liveSession.focusScore}%` : "100%"}
            </span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-semibold">Switches</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? liveSession.tabSwitches : 0}
            </span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-550 uppercase tracking-wider font-semibold">Pastes</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? liveSession.pasteCount : 0}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-1">
          {liveSession ? (
            <>
              <button
                onClick={handleResetSession}
                className="flex-1 border border-amber-600/35 hover:border-amber-500 hover:bg-amber-950/10 text-amber-400 font-bold text-[10px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider cursor-pointer"
              >
                <RotateCcw size={11} /> Reset
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 border border-red-600/35 hover:border-red-500 hover:bg-red-950/10 text-red-400 font-bold text-[10px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider cursor-pointer"
              >
                <Square size={11} /> Stop & Save
              </button>
            </>
          ) : (
            <button
              onClick={() => handleStartSession()}
              className="w-full bg-[#dfa054] hover:bg-[#eab308] text-zinc-950 font-bold text-[10px] py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider cursor-pointer hover:shadow-[0_0_12px_rgba(223,160,84,0.2)]"
            >
              <Play size={11} fill="currentColor" /> Start Practice Session
            </button>
          )}
        </div>
      </Card>

      {/* 📊 Session Analytics & Calendar Heatmap */}
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
            <Clock3 size={13} /> Practice Telemetry
          </div>
          <div className="text-[9px] font-mono text-zinc-550">Last 28 Days</div>
        </div>

        {/* History Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="bg-zinc-900/10 border border-zinc-900/60 p-2 rounded-lg">
            <span className="text-[8px] text-zinc-550 block uppercase">Total Hours</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{stats.totalHours.toFixed(1)}h</span>
          </div>
          <div className="bg-zinc-900/10 border border-zinc-900/60 p-2 rounded-lg">
            <span className="text-[8px] text-zinc-550 block uppercase">Avg Session</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{stats.avgSessionMin}m</span>
          </div>
          <div className="bg-zinc-900/10 border border-zinc-900/60 p-2 rounded-lg">
            <span className="text-[8px] text-zinc-550 block uppercase">Daily Avg</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{stats.dailyAvgMin}m</span>
          </div>
        </div>

        {/* Compact Heatmap Grid */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="grid grid-cols-7 gap-1.5 justify-center">
            {stats.calendarDays.map((day) => {
              const minutes = day.minutes
              let colorClass = "bg-zinc-900/50 border border-zinc-950/40 hover:border-zinc-800"
              if (minutes > 45) {
                colorClass = "bg-emerald-500/80 border border-emerald-400/20 hover:bg-emerald-400"
              } else if (minutes > 15) {
                colorClass = "bg-emerald-700/60 border border-emerald-600/10 hover:bg-emerald-600/70"
              } else if (minutes > 0) {
                colorClass = "bg-emerald-950/40 border border-emerald-900/10 hover:bg-emerald-900/50"
              }

              return (
                <div
                  key={day.dateStr}
                  className={`aspect-square w-full rounded-md cursor-help transition-all relative group ${colorClass}`}
                  title={`${day.dateLabel}: ${minutes} min spent`}
                >
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-[9px] font-mono text-zinc-300 shadow-xl whitespace-nowrap">
                    <div className="font-bold">{day.dateLabel}</div>
                    <div className="text-emerald-400 mt-0.5">{minutes} min spent</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[8px] font-mono text-zinc-650 px-1 mt-0.5">
            <span>28d ago</span>
            <span>Today</span>
          </div>
        </div>
      </Card>

      {/* Achievement Showcase */}
      <AchievementShowcase achievements={achievements} variant="compact" />

      {/* Recommendation plan section */}
      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase text-zinc-500">Today's plan</h2>
        <div className="overflow-hidden rounded-md border border-zinc-800">
          {plan.map((item, index) => <a key={`${item.type}-${index}`} href={item.slug ? `https://leetcode.com/problems/${item.slug}/` : undefined} target={item.slug ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/30 p-2.5 last:border-0"><CheckCircle2 size={14} className="text-zinc-600" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-zinc-200">{item.title}</div><div className="truncate text-[9px] text-zinc-500">{item.type}{item.reason ? ` · ${item.reason}` : ""}</div></div>{item.slug && <ArrowUpRight size={12} className="text-zinc-600" />}</a>)}
          {plan.length === 0 && <div className="p-3 text-xs text-zinc-500">No recommendations are available yet.</div>}
        </div>
      </section>
    </div>
  )
}
