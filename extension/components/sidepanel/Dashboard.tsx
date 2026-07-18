import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target, Play, RotateCcw, Square, Compass, Sparkles, TrendingUp, Flame } from "lucide-react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchDashboard, fetchHeatmap, fetchPotd, fetchRevisionQueue, fetchWeakness, fetchAllSessions, reviewRevisionCard } from "../../lib/api/backend"
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
import { normalizeZerotracPayload } from "../../lib/zerotrac"

function message<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (res) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        resolve(res);
      }
    });
  });
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
  const [rankingInfo, setRankingInfo] = useState<any>(null)
  const [reviewingCardId, setReviewingCardId] = useState<number | null>(null)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const handleReviewSubmit = async (cardId: number, quality: number) => {
    setReviewSubmitting(true)
    try {
      await reviewRevisionCard(cardId, quality)
      const username = await getUsername()
      if (username) {
        const [dashboard, daily, reviews, weak, sessionsRes] = await Promise.all([
          fetchDashboard(),
          fetchPotd().catch(() => []),
          fetchRevisionQueue().catch(() => []),
          fetchWeakness(),
          fetchAllSessions().catch(() => [])
        ])
        if (dashboard) {
          setData(dashboard)
          setCachedDashboard(dashboard)
        }
        setPotd(daily)
        setQueue(reviews)
        if (weak) {
          setWeakness(weak)
          setCachedWeakness(weak)
        }
        if (Array.isArray(sessionsRes)) {
          setSessions(sessionsRes)
        }
      }
      setReviewingCardId(null)
    } catch (err) {
      console.error("Failed to submit review:", err)
      alert("Failed to submit review.")
    } finally {
      setReviewSubmitting(false)
    }
  }

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

  const loadFreshData = () => {
    getUsername().then((username) => {
      Promise.all([
        fetchDashboard().catch(() => null),
        fetchHeatmap().catch(() => []),
        fetchPotd().catch(() => []),
        fetchRevisionQueue().catch(() => []),
        fetchWeakness().catch(() => null),
        message<any>({ action: "get_solved_problem_slugs" }).catch(() => null),
        message<any>({ action: "get_user_profile", payload: { username } }).catch(() => null),
        message<any>({ action: "get_zerotrac" }).catch(() => null),
        fetchAllSessions().catch(() => []),
        message<any>({ action: "get_user_contest_history", payload: { username } }).catch(() => null)
      ]).then(([dashboard, buckets, daily, reviews, weak, solvedResponse, profileRes, zerotracRes, sessionsRes, rankingRes]) => {
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
        setZerotrac(normalizeZerotracPayload(zerotracRes))
        if (Array.isArray(sessionsRes)) {
          setSessions(sessionsRes)
        }
        if (rankingRes?.ok) {
          setRankingInfo(rankingRes.data?.userContestRanking || null)
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
    loadFreshData()

    // 3. Listen to dashboard refreshes broadcasted by solve event completion
    const refreshListener = (msg: any) => {
      if (msg.action === "dashboard_refresh") {
        loadFreshData()
      }
    }
    chrome.runtime.onMessage.addListener(refreshListener)
    return () => chrome.runtime.onMessage.removeListener(refreshListener)
  }, [])

  // 3. Keep live session ticking in sync with extension storage and backend logic
  useEffect(() => {
    const syncSession = () => {
      chrome.storage.local.get(["algovault.currentSession", "algovault.problemStartTime", "algovault.sessionState"], (res) => {
        const current = res?.["algovault.currentSession"]
        setLiveSession(current || null)
        
        const state = res?.["algovault.sessionState"]
        if (state?.isSolved) {
          setSessionSeconds(state.finalSeconds || 0)
        } else if (current) {
          setSessionSeconds(current.focusSeconds || 0)
        } else {
          setSessionSeconds(0)
        }
      })
    }
    syncSession()
    const interval = window.setInterval(syncSession, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const range = useMemo(() => {
    let baseRating = 1500
    let source = "default"

    if (rankingInfo?.rating && rankingInfo?.attendedContestsCount > 0) {
      // Use official rating if they have contest history
      baseRating = Math.round(rankingInfo.rating)
      source = "official LeetCode contest rating"
    } else if (data?.virtualRating) {
      // Use the backend's highly accurate solved-rating-based estimated capability
      baseRating = data.virtualRating
      source = "estimated capability rating"
    } else {
      if (!zerotrac || !solved.size) return null
      // Otherwise, use the 85th percentile of their solved problems to gauge capability
      const ratings: number[] = []
      for (const p of zerotrac) {
        const slug = p.TitleSlug || p.title_slug
        const rating = p.Rating || p.rating
        if (slug && solved.has(slug) && typeof rating === "number") {
          ratings.push(rating)
        }
      }
      if (!ratings.length) return null
      
      // Sort ascending to find the 85th percentile
      ratings.sort((a, b) => a - b)
      const index = Math.floor(ratings.length * 0.85)
      baseRating = Math.round(ratings[Math.min(index, ratings.length - 1)])
      source = "85th percentile of your solved problems (local fallback)"
    }

    const low = baseRating
    const high = baseRating + 100
    
    return {
      low,
      high,
      challengeLow: high,
      challengeHigh: high + 200,
      evidence: solved.size,
      source
    }
  }, [zerotrac, solved, rankingInfo, data])

  const achievements = useMemo(() => {
    return getAchievements(buildAchievementStats(data || {}, heatmap))
  }, [data, heatmap])

  // 4. Calculate history stats and daily session calendar days
  const stats = useMemo(() => {
    const dailyMinutes: Record<string, number> = {}
    const dailyTabSwitches: Record<string, number> = {}
    const dailyPasteCount: Record<string, number> = {}

    // Map titleSlug to ZeroTrac rating
    const ratingsMap = new Map<string, number>()
    if (Array.isArray(zerotrac)) {
      for (const p of zerotrac) {
        if (p.TitleSlug && typeof p.Rating === "number") {
          ratingsMap.set(p.TitleSlug, p.Rating)
        }
      }
    }

    // Build the list of solved problems per day
    const dailySolvesList: Record<string, any[]> = {}
    if (data && Array.isArray(data.recentSolves)) {
      for (const p of data.recentSolves) {
        if (p.solvedAt) {
          try {
            let dateObj: Date;
            if (Array.isArray(p.solvedAt)) {
              const [y, m, d, h = 0, min = 0, sec = 0] = p.solvedAt
              dateObj = new Date(Date.UTC(y, m - 1, d, h, min, sec))
            } else {
              dateObj = new Date(p.solvedAt)
            }
            const dateKey = dateObj.toISOString().split("T")[0]
            if (!dailySolvesList[dateKey]) dailySolvesList[dateKey] = []
            
            const rating = ratingsMap.get(p.titleSlug) || (p.difficulty === "Easy" ? 1200 : p.difficulty === "Medium" ? 1600 : 2000)
            dailySolvesList[dateKey].push({
              title: p.title,
              titleSlug: p.titleSlug,
              difficulty: p.difficulty,
              rating
            })
          } catch (err) {
            console.warn("Date parsing error for recent solve", p)
          }
        }
      }
    }

    let totalFocusSeconds = 0
    let validSessionCount = 0

    if (Array.isArray(sessions)) {
      for (const s of sessions) {
        if (s.focusSeconds) {
          totalFocusSeconds += s.focusSeconds
          validSessionCount++
        }
        if (s.startedAt) {
          try {
            let dateObj: Date;
            if (Array.isArray(s.startedAt)) {
              const [y, m, d, h = 0, min = 0, sec = 0] = s.startedAt
              dateObj = new Date(Date.UTC(y, m - 1, d, h, min, sec))
            } else {
              dateObj = new Date(s.startedAt)
            }
            const dateKey = dateObj.toISOString().split("T")[0]
            dailyMinutes[dateKey] = (dailyMinutes[dateKey] || 0) + Math.floor((s.focusSeconds || 0) / 60)
            dailyTabSwitches[dateKey] = (dailyTabSwitches[dateKey] || 0) + (s.tabSwitches || 0)
            dailyPasteCount[dateKey] = (dailyPasteCount[dateKey] || 0) + (s.pasteCount || 0)
          } catch (err) {
            console.warn("Date parsing error for session", s)
          }
        }
      }
    }

    const currentRating = rankingInfo?.rating || data?.virtualRating || 1500

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 27)
    const paddingStart = startDate.getDay()
    
    const daysToGenerate: (Date | null)[] = []
    for (let i = 0; i < paddingStart; i++) {
      daysToGenerate.push(null)
    }
    for (let i = 0; i < 28; i++) {
      const d = new Date()
      d.setDate(d.getDate() - (27 - i))
      daysToGenerate.push(d)
    }

    let adjustedTotalMinutes = 0

    const calendarDays = daysToGenerate.map((d) => {
      if (d === null) return null
      
      const dateStr = d.toISOString().split("T")[0]
      let mins = dailyMinutes[dateStr] || 0
      const solvedProblems = dailySolvesList[dateStr] || []
      const solved = solvedProblems.length
      const tabs = dailyTabSwitches[dateStr] || 0
      const pastes = dailyPasteCount[dateStr] || 0

      // ACCURATE TIME CALCULATION: If they solved problems but didn't run a timer, we estimate their focus time accurately based on difficulty
      let estimatedMins = 0
      for (const prob of solvedProblems) {
        if (prob.difficulty === "Hard") estimatedMins += 45
        else if (prob.difficulty === "Medium") estimatedMins += 25
        else estimatedMins += 10
      }
      
      // We use whichever is higher: their actual session time, or the estimated time it would normally take to solve these problems
      if (estimatedMins > mins) {
        mins = estimatedMins
      }
      
      adjustedTotalMinutes += mins

      let score = 0.0
      if (mins > 0 || solved > 0) {
        let solvePoints = 0
        for (const prob of solvedProblems) {
          if (prob.rating >= currentRating + 100) solvePoints += 5.0
          else if (prob.rating >= currentRating - 50) solvePoints += 3.5
          else solvePoints += 1.5
        }

        // Time gives a base score (e.g. 1 hour = 2.5 pts)
        const timePoints = (mins / 60) * 2.5
        
        // Softened penalty: only heavily penalize extreme distractions
        let penalty = 0
        if (tabs > 20) penalty += 1.0
        if (pastes > 5) penalty += 1.0
        
        score = Math.min(10.0, Math.max(0.0, solvePoints + timePoints - penalty))
        if (solved === 0 && score > 6.0) score = 6.0 // Cap time-only sessions
      }

      return {
        dateStr,
        dateLabel: d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" }),
        minutes: mins,
        solved,
        problems: solvedProblems,
        tabSwitches: tabs,
        pasteCount: pastes,
        score: Number(score.toFixed(1))
      }
    })

    const totalHours = adjustedTotalMinutes / 60
    const activeDaysCount = calendarDays.filter(d => d !== null && (d.minutes > 0 || d.solved > 0)).length
    const avgSessionMin = activeDaysCount > 0 ? Math.round(adjustedTotalMinutes / activeDaysCount) : 0
    const dailyAvgMin = Math.round(adjustedTotalMinutes / 28)

    return {
      totalHours,
      avgSessionMin,
      dailyAvgMin,
      calendarDays
    }
  }, [sessions, data, zerotrac, rankingInfo])

  const todayStats = useMemo(() => {
    if (!stats?.calendarDays || stats.calendarDays.length === 0) {
      return { score: 0, minutes: 0, solved: 0, tabSwitches: 0, pasteCount: 0, badgeText: "Rest Day", badgeColor: "text-zinc-500 bg-zinc-950 border-zinc-900", barColor: "bg-zinc-800" }
    }
    const today = stats.calendarDays[stats.calendarDays.length - 1]
    if (!today) return { score: 0, minutes: 0, solved: 0, tabSwitches: 0, pasteCount: 0, badgeText: "Rest Day", badgeColor: "text-zinc-500 bg-zinc-950 border-zinc-900", barColor: "bg-zinc-800" }
    
    let badgeText = "Rest Day"
    let badgeColor = "text-zinc-500 bg-zinc-950 border-zinc-900"
    let barColor = "bg-zinc-800"
    
    if (today.score >= 8.0) {
      badgeText = "Elite Practice"
      badgeColor = "text-amber-400 bg-amber-950/20 border-amber-500/30"
      barColor = "bg-gradient-to-r from-emerald-500 to-[#dfa054] shadow-[0_0_12px_rgba(223,160,84,0.35)]"
    } else if (today.score >= 4.0) {
      badgeText = "Productive"
      badgeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-500/30"
      barColor = "bg-gradient-to-r from-blue-500 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
    } else if (today.score > 0.0) {
      badgeText = "Active"
      badgeColor = "text-blue-400 bg-blue-950/20 border-blue-500/30"
      barColor = "bg-blue-500"
    }
    
    return {
      ...today,
      badgeText,
      badgeColor,
      barColor
    }
  }, [stats])

  if (loading) return <div className="grid gap-3"><Skeleton className="h-28" /><Skeleton className="h-20" /><Skeleton className="h-48" /></div>

  if (error) {
    return (
      <Card className="py-8 text-center border-red-900/35 bg-red-950/20">
        <div className="text-sm font-semibold text-red-400">Dashboard Failed to Load</div>
        <div className="mt-1.5 text-[10px] text-zinc-400 font-mono px-4 break-all">{error}</div>
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
    queue[0] && { type: "Review", id: queue[0].id, title: queue[0].title || queue[0].problemTitle, slug: queue[0].titleSlug },
    potd[0] && { type: potd[0].type || "Practice", title: potd[0].title, slug: potd[0].titleSlug, reason: potd[0].reason },
    weakest && { type: "Practice signal", title: weakest.tag, reason: "needs more recent evidence" }
  ].filter(Boolean) as any[]

  const allSolvedStat = profile?.submitStats?.acSubmissionNum?.find((item: any) => item.difficulty === "All")
  const officialTotalSolved = allSolvedStat ? allSolvedStat.count : data.totalSolved
  const primaryAction = plan.find((item) => item.slug) || plan[0]
  const practiceRange = range ? `${range.low}–${range.high}` : "Building baseline"
  const syncLabel = lastSync ? `Synced ${new Date(lastSync).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "History not synced"

  return (
    <div className="grid gap-3.5 select-none">
      <Card className="relative overflow-hidden border-amber-500/20 bg-[#15130f] p-0 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
        <div className="absolute inset-y-0 left-0 w-1 bg-[#dfa054]" />
        <div className="p-4 pl-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 panel-label">
              <Compass size={13} className="text-[#dfa054]" /> Today&apos;s next move
            </div>
            <span className="rounded-full border border-zinc-700/80 bg-zinc-950/40 px-2 py-1 text-[9px] font-mono text-zinc-500">{syncLabel}</span>
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-zinc-100">
                {primaryAction?.title || "Choose your first practice track"}
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                {primaryAction?.reason || "Your history becomes a useful daily plan after one full sync."}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="panel-label">Practice range</div>
              <div className="metric-value mt-1 text-sm font-semibold text-[#dfa054]">{practiceRange}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {primaryAction?.slug ? (
              <a
                href={`https://leetcode.com/problems/${primaryAction.slug}/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-[#dfa054] px-3 text-[10px] font-bold text-zinc-950 transition-colors hover:bg-[#efb76e]"
              >
                Open problem <ArrowUpRight size={12} />
              </a>
            ) : (
              <button
                onClick={() => handleStartSession()}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md bg-[#dfa054] px-3 text-[10px] font-bold text-zinc-950 transition-colors hover:bg-[#efb76e]"
              >
                Start a session <Play size={11} fill="currentColor" />
              </button>
            )}
            <a
              href="https://leetcode.com/problemset/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-8 items-center rounded-md border border-zinc-700 bg-zinc-950/30 px-3 text-[10px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              Explore
            </a>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-800/80 border-t border-zinc-800/80 bg-zinc-950/30">
          <div className="px-4 py-2.5"><div className="panel-label">Solved</div><div className="metric-value mt-1 text-lg font-semibold text-zinc-100">{officialTotalSolved}</div></div>
          <div className="px-4 py-2.5"><div className="panel-label">This week</div><div className="metric-value mt-1 text-lg font-semibold text-zinc-100">{data.todaySolves || 0}<span className="ml-1 text-[10px] font-normal text-zinc-500">today</span></div></div>
          <div className="px-4 py-2.5"><div className="panel-label">Streak</div><div className="metric-value mt-1 text-lg font-semibold text-zinc-100">{data.currentStreak || 0}<span className="ml-1 text-[10px] font-normal text-zinc-500">days</span></div></div>
        </div>
      </Card>

      <div className="flex items-center justify-between px-1 pt-1">
        <div className="flex items-center gap-2 panel-label"><TrendingUp size={13} className="text-emerald-400" /> Evidence and momentum</div>
        <span className="text-[10px] font-mono text-zinc-600">{range ? `${range.evidence} solved signals` : "needs rated history"}</span>
      </div>



      {/* Solve range card */}
      <Card className="p-4 bg-zinc-950/20 border border-zinc-900 shadow-inner">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500"><Target size={13} />Practice range</div>
        {range ? (
          <>
            <div className="mt-2 text-3xl font-extrabold font-mono text-zinc-100 tabular-nums tracking-tight">{range.low} <span className="text-zinc-600 font-normal">→</span> {range.high}</div>
            <div className="mt-1 text-[10px] text-zinc-500 leading-snug">Evidence-based estimate from {range.source}.</div>
            <div className="mt-3 border-t border-zinc-900/60 pt-2.5 text-[11px] font-mono text-zinc-400">
              Stretch range: <span className="text-[#dfa054] font-bold bg-[#dfa054]/10 border border-[#dfa054]/20 px-2 py-0.5 rounded ml-1">{range.challengeLow} - {range.challengeHigh}</span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-500">Establish a range by syncing your LeetCode history.</div>
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
            <span className="text-[9px] font-mono text-zinc-600 uppercase">Standby</span>
          )}
        </div>

        {/* Telemetry metrics */}
        <div className="grid grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">Time</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? `${Math.floor(sessionSeconds / 60)}:${String(sessionSeconds % 60).padStart(2, "0")}` : "0:00"}
            </span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">Focus</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? `${liveSession.focusScore}%` : "100%"}
            </span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">Switches</span>
            <span className="font-bold text-zinc-200 mt-0.5 tabular-nums text-xs">
              {liveSession ? liveSession.tabSwitches : 0}
            </span>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-900 py-1.5 rounded-lg flex flex-col">
            <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-semibold">Pastes</span>
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
      <Card className="p-4 flex flex-col gap-3.5 bg-gradient-to-b from-[#141416] to-[#0a0a0b] border border-zinc-850 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <Clock3 size={13} /> Practice Telemetry
          </div>
          <div className="text-[9px] font-mono text-zinc-500">Last 28 Days</div>
        </div>

        {/* History Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-950/80 border border-zinc-900/60 p-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
            <Flame size={13} className="text-orange-400 absolute opacity-20 -right-1 -bottom-1 w-8 h-8" />
            <div className="flex items-center justify-center gap-1.5 mb-0.5"><Flame size={11} className="text-orange-400" /><span className="text-[8px] text-zinc-500 uppercase">Total Hours</span></div>
            <span className="text-xs font-bold text-zinc-200">{stats.totalHours.toFixed(1)}h</span>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-950/80 border border-zinc-900/60 p-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
            <Clock3 size={13} className="text-sky-400 absolute opacity-20 -right-1 -bottom-1 w-8 h-8" />
            <div className="flex items-center justify-center gap-1.5 mb-0.5"><Clock3 size={11} className="text-sky-400" /><span className="text-[8px] text-zinc-500 uppercase">Avg Session</span></div>
            <span className="text-xs font-bold text-zinc-200">{stats.avgSessionMin}m</span>
          </div>
          <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-950/80 border border-zinc-900/60 p-2 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
            <Target size={13} className="text-emerald-400 absolute opacity-20 -right-1 -bottom-1 w-8 h-8" />
            <div className="flex items-center justify-center gap-1.5 mb-0.5"><Target size={11} className="text-emerald-400" /><span className="text-[8px] text-zinc-500 uppercase">Daily Avg</span></div>
            <span className="text-xs font-bold text-zinc-200">{stats.dailyAvgMin}m</span>
          </div>
        </div>

        {/* Daily Performance Score Indicator Card */}
        <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl flex gap-4 items-center">
          <div className="flex-1 flex flex-col gap-2">
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Today&apos;s activity signal</span>
              <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${todayStats.badgeColor}`}>
                {todayStats.badgeText}
              </span>
            </div>

            {/* Breakdown parameters list */}
            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-900/40 text-[9px] font-mono text-zinc-400">
              <div className="flex justify-between">
                <span>Focus Mins:</span>
                <span className="text-zinc-200 font-bold">{todayStats.minutes}m <span className="text-zinc-500 text-[8px] font-normal">(+{((todayStats.minutes / 30) * 1.0).toFixed(1)} pts)</span></span>
              </div>
              <div className="flex justify-between">
                <span>Solved Count:</span>
                <span className="text-zinc-200 font-bold">{todayStats.solved} <span className="text-zinc-500 text-[8px] font-normal">(+{(todayStats.solved * 2.5).toFixed(1)} pts)</span></span>
              </div>
              {todayStats.tabSwitches > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Interrupted:</span>
                  <span className="font-bold">{todayStats.tabSwitches} switches</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="shrink-0 relative w-16 h-16 mr-1">
            <svg className="w-full h-full -rotate-90 drop-shadow-lg" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" 
                stroke={todayStats.score >= 8 ? '#10b981' : todayStats.score >= 4 ? '#dfa054' : '#ef4444'}
                strokeWidth="4" strokeDasharray={`${todayStats.score * 9.42} 94.2`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[13px] leading-none font-black font-mono text-zinc-100">{todayStats.score}</span>
              <span className="text-[7px] leading-none text-zinc-500 font-mono font-bold uppercase mt-0.5">/ 10</span>
            </div>
          </div>
        </div>

        {/* Premium Calendar Heatmap Grid */}
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-900/60 mt-1">
          <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-650 mb-1">
            <span>Activity Map</span>
            <span>28 Days</span>
          </div>
          
          <div className="flex">
            {/* Y-axis days (optional, commonly Mon/Wed/Fri) */}
            <div className="grid grid-rows-7 gap-1.5 text-[7px] font-mono text-zinc-600 pr-2.5 pb-1 uppercase font-bold justify-items-end pt-1">
              <span className="flex items-center text-transparent">Sun</span>
              <span className="flex items-center">Mon</span>
              <span className="flex items-center text-transparent">Tue</span>
              <span className="flex items-center">Wed</span>
              <span className="flex items-center text-transparent">Thu</span>
              <span className="flex items-center">Fri</span>
              <span className="flex items-center text-transparent">Sat</span>
            </div>

            <div className="grid grid-rows-7 grid-flow-col gap-1.5 flex-1">
              {stats.calendarDays.map((day: any, idx: number) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="w-full aspect-square" />
                }

                const score = day.score
                let colorClass = "bg-zinc-900/60 border border-zinc-900 hover:border-zinc-700"
                if (score >= 8.0) {
                  colorClass = "bg-emerald-500/80 border border-emerald-400/30 hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                } else if (score >= 4.0) {
                  colorClass = "bg-emerald-600/60 border border-emerald-500/20 hover:bg-emerald-500"
                } else if (score > 0.0) {
                  colorClass = "bg-emerald-900/50 border border-emerald-800/20 hover:bg-emerald-700/60"
                }

                return (
                  <div
                    key={day.dateStr}
                    className={`w-full aspect-square rounded-sm cursor-help transition-all duration-300 relative group ${colorClass}`}
                  >
                    {/* Glassmorphic Tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 hidden group-hover:block z-50 p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-950/95 backdrop-blur shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] whitespace-nowrap min-w-[150px]">
                      {/* Tooltip triangle pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-solid border-t-zinc-800/80 border-t-8 border-x-transparent border-x-8 border-b-0"></div>
                      
                      <div className="text-[10px] font-bold text-zinc-200 border-b border-zinc-800/60 pb-1 mb-1.5">{day.dateLabel}</div>
                      <div className="flex flex-col gap-1 text-[9px] font-mono">
                        <div className="flex justify-between items-center text-zinc-400 gap-3">
                          <span>Focus Time:</span>
                          <span className="text-emerald-400 font-bold">{day.minutes} min</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-400 gap-3 border-b border-zinc-800/60 pb-1.5 mb-1.5">
                          <span>Solved:</span>
                          <span className="text-[#dfa054] font-bold">{day.solved}</span>
                        </div>
                        {day.problems && day.problems.length > 0 && (
                          <div className="flex flex-col gap-1 mb-1.5 text-[8px] text-zinc-400 leading-snug border-b border-zinc-800/60 pb-1.5">
                            {day.problems.map((prob: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-3">
                                <span className="truncate max-w-[90px]">{prob.title}</span>
                                <span className="text-[#dfa054] shrink-0 font-bold">{Math.round(prob.rating)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {day.tabSwitches > 0 && (
                          <div className="flex justify-between items-center text-red-400 gap-3">
                            <span>Tab Switches:</span>
                            <span className="font-bold">{day.tabSwitches}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-zinc-200 border-t border-zinc-800/60 pt-1.5 mt-0.5 font-bold text-[10px]">
                          <span>Daily Score:</span>
                          <span className="text-emerald-400">{day.score}/10</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend scale */}
          <div className="flex justify-end items-center gap-1.5 mt-2.5 text-[8px] font-mono text-zinc-500 uppercase">
            <span>Rest</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-zinc-900/60 border border-zinc-900" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-900/50 border border-emerald-800/20" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600/60 border border-emerald-500/20" />
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 border border-emerald-400/30 animate-pulse" />
            <span>Elite</span>
          </div>

          {/* Insight */}
          <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50 text-[10px] text-zinc-400 font-mono">
            <span className="text-[#dfa054]">💡</span> {(() => {
              // Current streak calculation
              let streak = 0;
              const validDays = stats.calendarDays.filter((d: any) => d !== null);
              for (let i = validDays.length - 1; i >= 0; i--) {
                if (validDays[i].score > 0) streak++;
                else if (i !== validDays.length - 1) break; // ignore today if 0, but break if yesterday was 0
              }
              
              if (streak >= 3) return `${streak}-day streak! Consistency builds mastery.`;
              
              // Week solved
              let weekSolved = 0;
              for (let i = Math.max(0, validDays.length - 7); i < validDays.length; i++) {
                weekSolved += validDays[i].solved;
              }
              if (weekSolved >= 10) return `Strong week — ${weekSolved} problems solved in the last 7 days.`;

              // Best day
              let bestDay = validDays[0];
              for (const day of validDays) {
                if (day.score > bestDay?.score) bestDay = day;
              }
              if (bestDay && bestDay.score > 5) return `Your most productive day was ${bestDay.dateLabel} (${bestDay.score}/10).`;

              return "Start a session to build your practice momentum.";
            })()}
          </div>
        </div>
      </Card>
      {/* Achievement Showcase */}
      <AchievementShowcase achievements={achievements} variant="compact" />

      {/* Recommendation plan section */}
      <section className="mt-1">
        <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Today's plan</h2>
        <div className="grid gap-2">
          {plan.map((item, index) => {
            const isReview = item.type === "Review";
            const isWeakness = item.type.includes("Practice signal");
            const sideColor = isReview ? "bg-[#dfa054]" : isWeakness ? "bg-teal-500" : "bg-blue-500";
            const iconColor = isReview ? "text-[#dfa054]" : isWeakness ? "text-teal-400" : "text-blue-400";
            
            return (
              <a 
                key={`${item.type}-${index}`} 
                href={item.slug ? `https://leetcode.com/problems/${item.slug}/` : undefined} 
                target={item.slug ? "_blank" : undefined} 
                rel="noreferrer" 
                className="group relative flex items-center justify-between gap-3 rounded-lg border border-zinc-850 bg-zinc-950/20 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/40"
              >
                {/* Left accent indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg ${sideColor}`} />
                
                <div className="flex items-center gap-2.5 min-w-0 pl-1.5">
                  <div className={`p-1.5 rounded bg-zinc-900/50 ${iconColor}`}>
                    {isReview ? <RotateCcw size={12} /> : isWeakness ? <Target size={12} /> : <Compass size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-zinc-200 transition group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="truncate text-[9px] font-mono text-zinc-550 mt-0.5 uppercase tracking-wide">
                      {item.type}{item.reason ? ` · ${item.reason}` : ""}
                    </div>
                  </div>
                </div>
                {item.slug && <ArrowUpRight size={13} className="text-zinc-600 transition group-hover:text-zinc-300 mr-1" />}
              </a>
            );
          })}
          {plan.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/10 px-4 py-6 text-center text-xs text-zinc-500">
              No recommendations are available yet.
            </div>
          )}
        </div>
      </section>

      {/* 🔄 Spaced Repetition Review Queue */}
      {queue.length > 0 && (
        <Card className="p-4 bg-gradient-to-br from-[#1c120c]/40 to-black/80 border border-[#dfa054]/15 shadow-xl flex flex-col gap-3 relative overflow-hidden">
          {/* Subtle orange ambient glow */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#dfa054]/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-0.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <RotateCcw size={13} className="text-[#dfa054] animate-spin-slow" /> Review Queue ({queue.length} Due)
            </div>
            <span className="text-[9px] font-mono text-[#dfa054]/70 bg-[#dfa054]/5 px-1.5 py-0.5 rounded border border-[#dfa054]/15">SM-2 Scheduled</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <a 
                href={`https://leetcode.com/problems/${queue[0].titleSlug}/`} 
                target="_blank" 
                rel="noreferrer"
                className="font-bold text-xs text-zinc-200 hover:text-[#dfa054] transition-colors flex items-center gap-1.5 group/link"
              >
                {queue[0].title || queue[0].problemTitle} 
                <ArrowUpRight size={11} className="text-zinc-650 transition group-hover/link:text-[#dfa054]" />
              </a>
              <p className="text-[9px] text-zinc-500 font-mono mt-1">
                Interval: <span className="text-zinc-300 font-bold">{queue[0].intervalDays?.toFixed(1) || "1.0"}d</span> · Reviews: <span className="text-zinc-300 font-bold">{queue[0].reviewCount || 0}</span>
              </p>
            </div>

            {reviewingCardId === queue[0].id ? (
              <button 
                onClick={() => setReviewingCardId(null)}
                className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[10px] rounded-md transition-all font-mono uppercase cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button 
                onClick={() => setReviewingCardId(queue[0].id)}
                className="px-3 py-1 bg-[#dfa054]/10 hover:bg-[#dfa054]/20 border border-[#dfa054]/30 text-[#dfa054] text-[10px] font-bold rounded-md transition-all font-mono uppercase cursor-pointer shadow-[0_0_10px_rgba(223,160,84,0.05)]"
              >
                Log Review
              </button>
            )}
          </div>

          {reviewingCardId === queue[0].id && (
            <div className="flex flex-col gap-2 bg-zinc-950/80 border border-zinc-900 p-2.5 rounded-lg mt-1">
              <div className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">Rate recall quality:</div>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[9px] font-bold">
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 1)}
                  className="bg-red-550/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Forgot (1)
                </button>
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 3)}
                  className="bg-amber-550/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Hard (3)
                </button>
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 4)}
                  className="bg-blue-550/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Good (4)
                </button>
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 5)}
                  className="bg-emerald-555/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Easy (5)
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Premium Compact Zenith Record */}
      {data?.solvedRankGrid && (
        <Card className="p-3 bg-gradient-to-r from-zinc-950/40 to-zinc-900/20 border-zinc-800/80 flex items-center justify-between mt-1 transition-all duration-300 hover:border-cyan-950/40 hover:shadow-[0_4px_20px_rgba(6,182,212,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-cyan-400">
              <Sparkles size={11} className="animate-pulse" /> Zenith
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex gap-1.5 text-[9px] font-mono font-bold">
              <span className="bg-gradient-to-r from-yellow-500 to-[#dfa054] text-zinc-950 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(245,158,11,0.15)]">S+: {Object.values(data.solvedRankGrid.S_PLUS || {}).reduce((a: any, b: any) => a + Number(b || 0), 0)}</span>
              <span className="bg-cyan-500/10 text-cyan-455 border border-cyan-500/20 px-1.5 py-0.5 rounded">S: {Object.values(data.solvedRankGrid.S || {}).reduce((a: any, b: any) => a + Number(b || 0), 0)}</span>
              <span className="bg-emerald-500/10 text-emerald-455 border border-emerald-500/20 px-1.5 py-0.5 rounded">A: {Object.values(data.solvedRankGrid.A || {}).reduce((a: any, b: any) => a + Number(b || 0), 0)}</span>
              <span className="bg-blue-500/10 text-blue-455 border border-blue-500/20 px-1.5 py-0.5 rounded">B: {Object.values(data.solvedRankGrid.B || {}).reduce((a: any, b: any) => a + Number(b || 0), 0)}</span>
            </div>
          </div>
          <div className="text-[10px] font-black font-mono text-zinc-400 text-right leading-none">
            {Object.values(data.solvedRankGrid || {}).reduce((total: number, row: any) => total + Object.values(row || {}).reduce((sum: number, count: any) => sum + Number(count || 0), 0), 0)} <span className="text-[8px] text-zinc-650 font-normal uppercase block mt-0.5">Sessions</span>
          </div>
        </Card>
      )}
    </div>
  )
}
