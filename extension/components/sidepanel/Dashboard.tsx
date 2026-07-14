import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target, Play, RotateCcw, Square } from "lucide-react"
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
        fetchDashboard(),
        fetchHeatmap(),
        fetchPotd().catch(() => []),
        fetchRevisionQueue().catch(() => []),
        fetchWeakness(),
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
        if (Array.isArray(zerotracRes)) {
          setZerotrac(zerotracRes)
        }
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

    const calendarDays = Array.from({ length: 28 }).map((_, idx) => {
      const d = new Date()
      d.setDate(d.getDate() - (27 - idx))
      const dateStr = d.toISOString().split("T")[0]
      const mins = dailyMinutes[dateStr] || 0
      const solvedProblems = dailySolvesList[dateStr] || []
      const solved = solvedProblems.length
      const tabs = dailyTabSwitches[dateStr] || 0
      const pastes = dailyPasteCount[dateStr] || 0

      let score = 0.0
      if (mins > 0 || solved > 0) {
        let solvePoints = 0
        for (const prob of solvedProblems) {
          if (prob.rating >= currentRating) {
            solvePoints += 4.0
          } else if (prob.rating >= currentRating - 200) {
            solvePoints += 2.5
          } else {
            solvePoints += 1.5
          }
        }

        if (solved === 0 && mins > 0) {
          solvePoints = 0
        }

        const timePoints = (mins / 30) * 1.0
        const penalty = (tabs > 10 || pastes > 3) ? 1.0 : 0.0
        score = Math.min(10.0, Math.max(0.0, solvePoints + timePoints - penalty))
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

    const totalHours = totalFocusSeconds / 3600
    const avgSessionMin = validSessionCount > 0 ? Math.round((totalFocusSeconds / 60) / validSessionCount) : 0
    const dailyAvgMin = Math.round(Object.values(dailyMinutes).reduce((sum, m) => sum + m, 0) / Math.max(1, Object.keys(dailyMinutes).length))

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
    weakest && { type: "Weak topic", title: weakest.tag, reason: `${Math.round(weakest.masteryScore ?? 0)} rating evidence score` }
  ].filter(Boolean) as any[]

  const allSolvedStat = profile?.submitStats?.acSubmissionNum?.find((item: any) => item.difficulty === "All")
  const officialTotalSolved = allSolvedStat ? allSolvedStat.count : data.totalSolved

  return (
    <div className="grid gap-3.5 select-none">
      {/* Zenith Mode Achievements Card */}
      {data?.interviewIndex !== undefined && (
        <Card className="p-4 bg-zinc-950/40 border border-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            <Target size={13} /> Zenith Rank Board
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <div>
              <span className="text-[9px] font-mono text-zinc-500 uppercase block">Interview Index (II)</span>
              <div className="text-3xl font-black font-mono text-cyan-400 tabular-nums tracking-tight drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                {Math.round(data.interviewIndex)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-mono text-zinc-500 uppercase block">Rank Classification</span>
              <span className="text-xs font-bold font-mono text-[#dfa054] bg-[#dfa054]/10 border border-[#dfa054]/20 px-2 py-0.5 rounded">
                {data.interviewIndex >= 2200 ? "S-Tier Hunter" : data.interviewIndex >= 1800 ? "A-Tier Hunter" : data.interviewIndex >= 1400 ? "B-Tier Hunter" : "C-Tier Hunter"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-900/60">
            <div className="text-[9px] font-mono font-bold uppercase text-zinc-500 mb-2">Solved Rank Index</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[10px]">
                <thead>
                  <tr className="text-zinc-600 border-b border-zinc-900/60 pb-1.5 text-[8px] uppercase">
                    <th className="py-1">Grade</th>
                    <th className="py-1 text-center">&lt;1600</th>
                    <th className="py-1 text-center">1600-2000</th>
                    <th className="py-1 text-center">2000+</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 text-zinc-300">
                  {["S_PLUS", "S", "A", "B"].map((grade) => {
                    const diffMap = data.solvedRankGrid?.[grade] || {};
                    const formattedGrade = grade.replace("S_PLUS", "S+");
                    
                    let gradeColor = "text-[#dfa054]";
                    if (grade === "S") gradeColor = "text-cyan-400";
                    else if (grade === "A") gradeColor = "text-emerald-400";
                    else if (grade === "B") gradeColor = "text-blue-400";

                    return (
                      <tr key={grade} className="hover:bg-zinc-900/20">
                        <td className={`py-1.5 font-bold ${gradeColor}`}>{formattedGrade}</td>
                        <td className="py-1.5 text-center font-bold tabular-nums">
                          {diffMap.EASY || <span className="text-zinc-700 font-normal">·</span>}
                        </td>
                        <td className="py-1.5 text-center font-bold tabular-nums">
                          {diffMap.MEDIUM || <span className="text-zinc-700 font-normal">·</span>}
                        </td>
                        <td className="py-1.5 text-center font-bold tabular-nums">
                          {diffMap.HARD || <span className="text-zinc-700 font-normal">·</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Solve range card */}
      <Card className="p-4 bg-zinc-950/20 border border-zinc-900 shadow-inner">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500"><Target size={13} />Target Rating Range</div>
        {range ? (
          <>
            <div className="mt-2 text-3xl font-extrabold font-mono text-zinc-100 tabular-nums tracking-tight">{range.low} <span className="text-zinc-600 font-normal">→</span> {range.high}</div>
            <div className="mt-1 text-[10px] text-zinc-500 leading-snug">Based on {range.source}.</div>
            <div className="mt-3 border-t border-zinc-900/60 pt-2.5 text-[11px] font-mono text-zinc-400">
              Challenge targets: <span className="text-[#dfa054] font-bold bg-[#dfa054]/10 border border-[#dfa054]/20 px-2 py-0.5 rounded ml-1">{range.challengeLow} - {range.challengeHigh}</span>
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
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-2 rounded-lg">
            <span className="text-[8px] text-zinc-500 block uppercase">Total Hours</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{stats.totalHours.toFixed(1)}h</span>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-2 rounded-lg">
            <span className="text-[8px] text-zinc-500 block uppercase">Avg Session</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{stats.avgSessionMin}m</span>
          </div>
          <div className="bg-zinc-950/40 border border-zinc-900/60 p-2 rounded-lg">
            <span className="text-[8px] text-zinc-500 block uppercase">Daily Avg</span>
            <span className="text-xs font-bold text-zinc-200 mt-0.5 block">{stats.dailyAvgMin}m</span>
          </div>
        </div>

        {/* Daily Performance Score Indicator Card */}
        <div className="bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">Today's Daily Rating</span>
              <span className="text-lg font-black font-mono text-zinc-100 tabular-nums">{todayStats.score} <span className="text-xs text-zinc-500 font-normal">/ 10.0</span></span>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider font-mono ${todayStats.badgeColor}`}>
              {todayStats.badgeText}
            </span>
          </div>

          {/* Progress Bar Gauge */}
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${todayStats.barColor}`} style={{ width: `${todayStats.score * 10}%` }} />
          </div>

          {/* Breakdown parameters list */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-zinc-900/40 text-[9px] font-mono text-zinc-400">
            <div className="flex justify-between">
              <span>Focus Mins:</span>
              <span className="text-zinc-200 font-bold">{todayStats.minutes}m <span className="text-zinc-500 text-[8px] font-normal">(+{((todayStats.minutes / 30) * 1.0).toFixed(1)} pts)</span></span>
            </div>
            <div className="flex justify-between">
              <span>Solved Count:</span>
              <span className="text-zinc-200 font-bold">{todayStats.solved} <span className="text-zinc-500 text-[8px] font-normal">(+{(todayStats.solved * 2.5).toFixed(1)} pts)</span></span>
            </div>
            {todayStats.tabSwitches > 0 && (
              <div className="flex justify-between col-span-2 text-red-400">
                <span>Anti-Cheat Penalty (Tab Switches):</span>
                <span className="font-bold">-{todayStats.tabSwitches > 10 ? "1.0" : "0.0"} pts ({todayStats.tabSwitches} switches)</span>
              </div>
            )}
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
            <div className="grid grid-rows-4 gap-1.5 text-[7px] font-mono text-zinc-600 pr-2.5 pb-1 uppercase font-bold justify-items-end pt-1">
              <span className="flex items-center">Sun</span>
              <span className="flex items-center">Mon</span>
              <span className="flex items-center">Tue</span>
              <span className="flex items-center">Wed</span>
            </div>

            <div className="grid grid-cols-7 grid-rows-4 grid-flow-col gap-1.5 flex-1">
              {stats.calendarDays.map((day) => {
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
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 hidden group-hover:block z-50 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/95 backdrop-blur shadow-2xl whitespace-nowrap min-w-[140px]">
                      {/* Tooltip triangle pointer */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-solid border-t-zinc-850 border-t-8 border-x-transparent border-x-8 border-b-0"></div>
                      
                      <div className="text-[10px] font-bold text-zinc-300 border-b border-zinc-900 pb-1 mb-1.5">{day.dateLabel}</div>
                      <div className="flex flex-col gap-1 text-[9px] font-mono">
                        <div className="flex justify-between items-center text-zinc-400 gap-3">
                          <span>Focus Time:</span>
                          <span className="text-zinc-200 font-bold">{day.minutes} min</span>
                        </div>
                        <div className="flex justify-between items-center text-zinc-400 gap-3 border-b border-zinc-900/60 pb-1 mb-1">
                          <span>Solved:</span>
                          <span className="text-zinc-200 font-bold">{day.solved}</span>
                        </div>
                        {day.problems && day.problems.length > 0 && (
                          <div className="flex flex-col gap-1 mb-1 text-[8px] text-zinc-400 leading-snug border-b border-zinc-900/40 pb-1">
                            {day.problems.map((prob: any, idx: number) => (
                              <div key={idx} className="flex justify-between gap-3">
                                <span className="truncate max-w-[80px]">{prob.title}</span>
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
                        <div className="flex justify-between items-center text-[#dfa054] border-t border-zinc-900 pt-1.5 mt-1 font-bold text-[10px]">
                          <span>Daily Score:</span>
                          <span>{day.score}/10</span>
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

      {/* 🔄 Spaced Repetition Review Queue */}
      {queue.length > 0 && (
        <Card className="p-4 bg-zinc-950/20 border border-zinc-900 shadow-inner flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500">
              <RotateCcw size={13} className="text-[#dfa054]" /> Review Queue ({queue.length} Due)
            </div>
            <span className="text-[9px] font-mono text-zinc-500">SM-2 Scheduled</span>
          </div>

          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <a 
                href={`https://leetcode.com/problems/${queue[0].titleSlug}/`} 
                target="_blank" 
                rel="noreferrer"
                className="font-bold text-xs text-zinc-200 hover:text-[#dfa054] transition-colors flex items-center gap-1"
              >
                {queue[0].title || queue[0].problemTitle} <ArrowUpRight size={11} className="text-zinc-600 animate-pulse" />
              </a>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                Interval: {queue[0].intervalDays?.toFixed(1) || "1.0"}d · Reviews: {queue[0].reviewCount || 0}
              </p>
            </div>

            {reviewingCardId === queue[0].id ? (
              <div className="flex gap-1">
                <button 
                  onClick={() => setReviewingCardId(null)}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] rounded-md transition-all font-mono cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setReviewingCardId(queue[0].id)}
                className="px-2.5 py-1 bg-[#dfa054]/10 hover:bg-[#dfa054]/20 border border-[#dfa054]/20 text-[#dfa054] text-[10px] font-bold rounded-md transition-all font-mono uppercase cursor-pointer"
              >
                Log Review
              </button>
            )}
          </div>

          {reviewingCardId === queue[0].id && (
            <div className="flex flex-col gap-2 bg-zinc-900/30 border border-zinc-900/60 p-2.5 rounded-lg mt-1">
              <div className="text-[9px] font-mono text-zinc-400 font-bold uppercase">Rate your recall quality:</div>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[9px] font-bold">
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 1)}
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Forgot (1)
                </button>
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 3)}
                  className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Hard (3)
                </button>
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 4)}
                  className="bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Good (4)
                </button>
                <button 
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewSubmit(queue[0].id, 5)}
                  className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 py-1.5 rounded transition-all cursor-pointer text-center"
                >
                  Easy (5)
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
