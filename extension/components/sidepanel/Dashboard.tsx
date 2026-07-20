import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target, Play, RotateCcw, Square, Compass, Sparkles, TrendingUp, Flame, Info, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react"
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
import { STUDY_LISTS } from "../../lib/study-lists"

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
  const [weekOffset, setWeekOffset] = useState<number>(0)

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

  // 1. Prioritize Review Queue cards from NeetCode 150 & Striver SDE sheet
  const prioritizedReviews = useMemo(() => {
    if (!queue || queue.length === 0) return []
    const isStudyListProblem = (slug: string) => {
      if (!slug) return false
      return STUDY_LISTS.some(list => list.problems.some(p => p.slug === slug))
    }
    const studyListQueue = queue.filter(card => isStudyListProblem(card.titleSlug || card.slug))
    const otherQueue = queue.filter(card => !isStudyListProblem(card.titleSlug || card.slug))
    return [...studyListQueue, ...otherQueue]
  }, [queue])

  // 2. Recommend unsolved problem targeting user's weakest topic
  const weakRecommendation = useMemo(() => {
    if (!weakness?.weakTags || weakness.weakTags.length === 0) return null
    const weakest = weakness.weakTags[0]
    if (!weakest || !weakest.tag) return null

    const getListName = (slug: string) => {
      const found = STUDY_LISTS.find(list => list.problems.some(p => p.slug === slug))
      return found ? found.name.replace("NeetCode ", "NC ").replace("Striver ", "Striver ") : "Curriculum"
    }

    // Try finding an unsolved problem on the study sheets matching this tag
    for (const list of STUDY_LISTS) {
      const matching = list.problems.filter(p => 
        p.topic.toLowerCase() === weakest.tag.toLowerCase() || 
        p.topic.toLowerCase().includes(weakest.tag.toLowerCase())
      )
      const unsolved = matching.find(p => !solved.has(p.slug))
      if (unsolved) {
        return {
          type: "Concept weakness",
          title: unsolved.title,
          slug: unsolved.slug,
          tag: weakest.tag,
          reason: `${getListName(unsolved.slug)} · Unsolved`
        }
      }
    }

    // Fallback: Pick any unsolved problem on the sheets
    for (const list of STUDY_LISTS) {
      const unsolved = list.problems.find(p => !solved.has(p.slug))
      if (unsolved) {
        return {
          type: "Concept weakness",
          title: unsolved.title,
          slug: unsolved.slug,
          tag: weakest.tag,
          reason: `${getListName(unsolved.slug)} · Focus Area`
        }
      }
    }
    return null
  }, [weakness, solved])

  // 3. Recommend unsolved ZeroTrac rated problem in target Glicko rating range
  const ratedChallenge = useMemo(() => {
    if (!zerotrac || !range) return null
    const candidates = zerotrac.filter(p => {
      const slug = p.TitleSlug
      if (!slug || solved.has(slug)) return false
      return p.Rating >= range.low && p.Rating <= range.high
    })
    if (candidates.length === 0) return null

    // Pick candidate closest to range center
    const center = (range.low + range.high) / 2
    candidates.sort((a, b) => Math.abs(a.Rating - center) - Math.abs(b.Rating - center))
    const selected = candidates[0]

    return {
      type: "Target rating challenge",
      title: selected.Title || selected.TitleSlug,
      slug: selected.TitleSlug,
      rating: Math.round(selected.Rating),
      contest: selected.ContestID_en || "LeetCode Contest",
      index: selected.ProblemIndex || "?"
    }
  }, [zerotrac, range, solved])

  // Weekly stats calculator
  const weeklyReport = useMemo(() => {
    // Helper for computing week ranges
    const getWeekRangeLocal = (offset: number) => {
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Mon start
      const monday = new Date(now.setDate(diff))
      monday.setHours(0, 0, 0, 0)
      monday.setDate(monday.getDate() + offset * 7)
      
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      return { start: monday, end: sunday }
    }

    const rangeOfWeeks = getWeekRangeLocal(weekOffset)
    const weekDays = (stats?.calendarDays || []).filter((day: any) => {
      if (!day) return false
      const date = new Date(day.dateStr)
      return date >= rangeOfWeeks.start && date <= rangeOfWeeks.end
    })

    const solvedProblems: any[] = []
    for (const day of weekDays) {
      if (day.problems) {
        solvedProblems.push(...day.problems)
      }
    }

    const solvedCount = solvedProblems.length
    let highestRating = 0
    let totalRating = 0
    let ratedCount = 0
    for (const p of solvedProblems) {
      if (p.rating && typeof p.rating === "number" && p.rating > 0) {
        totalRating += p.rating
        ratedCount += 1
        if (p.rating > highestRating) {
          highestRating = Math.round(p.rating)
        }
      }
    }

    const averageRating = ratedCount > 0 ? Math.round(totalRating / ratedCount) : 0

    // Compare with previous week
    const prevWeekRange = getWeekRangeLocal(weekOffset - 1)
    const prevWeekDays = (stats?.calendarDays || []).filter((day: any) => {
      if (!day) return false
      const date = new Date(day.dateStr)
      return date >= prevWeekRange.start && date <= prevWeekRange.end
    })
    const prevSolvedProblems: any[] = []
    for (const day of prevWeekDays) {
      if (day.problems) {
        prevSolvedProblems.push(...day.problems)
      }
    }
    let prevTotalRating = 0
    let prevRatedCount = 0
    for (const p of prevSolvedProblems) {
      if (p.rating && typeof p.rating === "number" && p.rating > 0) {
        prevTotalRating += p.rating
        prevRatedCount += 1
      }
    }
    const prevAverageRating = prevRatedCount > 0 ? Math.round(prevTotalRating / prevRatedCount) : 0
    const improvement = prevAverageRating > 0 && averageRating > 0 ? averageRating - prevAverageRating : 0

    // Compute streak for this week
    let streak = 0
    const activeDaysThisWeek = weekDays.filter((d: any) => d.solved > 0).length
    if (weekOffset === 0) {
      streak = data?.currentStreak || 0
    } else {
      let maxStreak = 0
      let curStreak = 0
      for (const d of weekDays) {
        if (d.solved > 0) {
          curStreak += 1
          if (curStreak > maxStreak) maxStreak = curStreak
        } else {
          curStreak = 0
        }
      }
      streak = maxStreak
    }

    const weekLabel = `${rangeOfWeeks.start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${rangeOfWeeks.end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`

    return {
      solvedCount,
      highestRating,
      averageRating,
      improvement,
      streak,
      weekLabel
    }
  }, [stats, weekOffset, data])

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

  const allSolvedStat = profile?.submitStats?.acSubmissionNum?.find((item: any) => item.difficulty === "All")
  const officialTotalSolved = allSolvedStat ? allSolvedStat.count : data.totalSolved
  const syncLabel = lastSync ? `Synced ${new Date(lastSync).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "History not synced"
  
  const activeReviewCard = prioritizedReviews[0]
  
  // Quest completion checks
  const isReviewDone = !activeReviewCard || solved.has(activeReviewCard.titleSlug || activeReviewCard.slug || "")
  const isPracticeDone = !weakRecommendation || solved.has(weakRecommendation.slug)
  const isChallengeDone = !ratedChallenge || solved.has(ratedChallenge.slug)

  // Today's Quest progress calculations
  const activeQuestsList = [
    activeReviewCard && { key: "review", done: isReviewDone },
    weakRecommendation && { key: "practice", done: isPracticeDone },
    ratedChallenge && { key: "challenge", done: isChallengeDone }
  ].filter(Boolean) as Array<{ key: string; done: boolean }>

  const totalQuests = activeQuestsList.length
  const completedQuests = activeQuestsList.filter(q => q.done).length
  const remainingTasks = totalQuests - completedQuests

  const getProgressBar = (completed: number, total: number) => {
    if (total === 0) return "█████"
    const filled = Math.round((completed / total) * 5)
    return "█".repeat(filled) + "░".repeat(5 - filled)
  }

  return (
    <div className="grid gap-3.5 select-none font-sans pb-4">
      {/* TODAY'S QUEST HEADER PANEL */}
      <Card className="relative overflow-hidden border-zinc-900 bg-zinc-950 p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#dfa054] font-mono">
            <Target size={12} /> TODAY&apos;S QUEST
          </div>
          <span className="rounded-full border border-zinc-900 bg-zinc-900/50 px-2 py-0.5 text-[8.5px] font-mono text-zinc-500">
            {remainingTasks === 0 ? "All Clear" : `${remainingTasks} tasks remaining`}
          </span>
        </div>

        {liveSession ? (
          // Active practicing timer session
          <div className="mt-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-400 font-mono">Active Focus Session</span>
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-zinc-100 font-mono">
                    {liveSession.mode || "PRACTICE"}
                  </span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-zinc-500 block uppercase font-mono tracking-wider">ELAPSED</span>
                <span className="text-sm font-bold font-mono text-zinc-200 tabular-nums">
                  {Math.floor(sessionSeconds / 60)}:{String(sessionSeconds % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
            {/* Controls */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleResetSession}
                className="flex-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 font-bold text-[9px] py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 uppercase font-mono cursor-pointer"
              >
                <RotateCcw size={10} /> Reset
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 border border-red-900/40 hover:border-red-800 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-bold text-[9px] py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 uppercase font-mono cursor-pointer"
              >
                <Square size={9} /> Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-[11px] leading-relaxed text-zinc-400 max-w-[190px]">
              Ready to log a deliberate practice run? Start a session to track tab switches and focus.
            </p>
            <button
              onClick={() => handleStartSession()}
              className="shrink-0 bg-[#dfa054] hover:bg-[#eab308] text-zinc-950 font-bold text-[10px] px-3.5 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider cursor-pointer hover:shadow-[0_0_12px_rgba(223,160,84,0.2)]"
            >
              <Play size={10} fill="currentColor" /> Start Session
            </button>
          </div>
        )}
      </Card>

      {/* THREE MAIN QUEST CARDS */}
      <div className="space-y-3">
        {/* Card 1: Review Quest */}
        <div className="group relative overflow-hidden bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800/80 transition-all duration-300 rounded-xl p-4 pl-5 shadow-sm min-h-[96px] flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#dfa054]/90 to-amber-600/90" />
          <Lightbulb size={64} className="absolute -right-3 -bottom-3 text-zinc-800 opacity-[0.04] transition-all duration-500 group-hover:opacity-15 group-hover:scale-110 group-hover:text-amber-500 group-hover:drop-shadow-[0_0_18px_rgba(245,158,11,0.3)] pointer-events-none" />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#dfa054]/90 font-mono">
                ① Review
              </span>
              <h3 className="mt-1 text-sm font-semibold text-zinc-100 truncate pr-4">
                {activeReviewCard ? (activeReviewCard.title || activeReviewCard.problemTitle) : "Review Queue Clear"}
              </h3>
              <p className="mt-0.5 text-[10px] text-zinc-500 font-mono">
                {activeReviewCard ? `Interval: ${activeReviewCard.intervalDays?.toFixed(1) || "1.0"}d` : "Recall deck fully updated."}
              </p>
            </div>
            
            {activeReviewCard && (
              <div className="flex items-center gap-2">
                <a 
                  href={`https://leetcode.com/problems/${activeReviewCard.titleSlug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#dfa054] hover:bg-[#eab308] text-zinc-950 text-[10px] font-bold px-3 py-1.5 rounded transition-all shadow-[0_0_10px_rgba(223,160,84,0.1)] cursor-pointer shrink-0"
                >
                  Review
                </a>
              </div>
            )}
          </div>

          {activeReviewCard && (
            <div className="mt-2.5 pt-2 border-t border-zinc-900/60 relative z-10">
              {reviewingCardId === activeReviewCard.id ? (
                <div className="space-y-1.5">
                  <div className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-wider">Rate recall quality:</div>
                  <div className="grid grid-cols-4 gap-1 font-mono text-[8.5px] font-bold">
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 1)}
                      className="bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 py-1 rounded cursor-pointer text-center"
                    >
                      Forgot
                    </button>
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 3)}
                      className="bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 py-1 rounded cursor-pointer text-center"
                    >
                      Hard
                    </button>
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 4)}
                      className="bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 text-blue-400 py-1 rounded cursor-pointer text-center"
                    >
                      Good
                    </button>
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 5)}
                      className="bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 py-1 rounded cursor-pointer text-center"
                    >
                      Easy
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setReviewingCardId(activeReviewCard.id)}
                  className="w-full bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[9px] font-mono py-1 rounded transition-colors uppercase cursor-pointer"
                >
                  Log Recall Quality
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Practice Quest */}
        <div className="group relative overflow-hidden bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800/80 transition-all duration-300 rounded-xl p-4 pl-5 shadow-sm min-h-[96px] flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-500 to-emerald-600" />
          <Lightbulb size={64} className="absolute -right-3 -bottom-3 text-zinc-800 opacity-[0.04] transition-all duration-500 group-hover:opacity-15 group-hover:scale-110 group-hover:text-teal-400 group-hover:drop-shadow-[0_0_18px_rgba(20,184,166,0.3)] pointer-events-none" />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-teal-400 font-mono">
                  ② Practice
                </span>
                
                {weakRecommendation && (
                  <div className="group/tooltip relative cursor-pointer">
                    <Info size={11} className="text-zinc-650 hover:text-zinc-400 transition-colors" />
                    {/* Glassmorphic coach tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 hidden group-hover/tooltip:block z-50 p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md shadow-2xl min-w-[190px] text-[10px] text-zinc-400 font-mono">
                      {/* Tooltip pointer */}
                      <div className="absolute top-full left-2 -mt-[1px] border-solid border-t-zinc-800/80 border-t-6 border-x-transparent border-x-6 border-b-0"></div>
                      <div className="font-bold text-zinc-200 border-b border-zinc-900 pb-1 mb-1.5 uppercase tracking-wider text-[9px] flex items-center gap-1 text-[#dfa054]"><Sparkles size={10} /> Coach Report</div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span>Weak Topic:</span><span className="text-zinc-200 font-bold">{weakRecommendation.tag}</span></div>
                        <div className="flex justify-between"><span>Reason:</span><span className="text-zinc-200 font-semibold">{weakness?.weakTags?.[0]?.score > 0.4 ? "Needs more recent solved signals" : "No solved problems in 14+ days"}</span></div>
                        <div className="flex justify-between"><span>Capability:</span><span className="text-emerald-400 font-bold">{range ? Math.round((range.low + range.high) / 2) : 1500}</span></div>
                        <div className="flex justify-between"><span>Confidence:</span><span className="text-[#dfa054] font-bold">High</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className="mt-1 text-sm font-semibold text-zinc-100 truncate pr-4">
                {weakRecommendation ? weakRecommendation.title : "Practice Target Solved"}
              </h3>
              <p className="mt-0.5 text-[10px] text-zinc-500 font-mono">
                {weakRecommendation ? weakRecommendation.reason : "All practice targets solved!"}
              </p>
            </div>

            {weakRecommendation && (
              <a 
                href={`https://leetcode.com/problems/${weakRecommendation.slug}/`}
                target="_blank"
                rel="noreferrer"
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded transition-all cursor-pointer shrink-0"
              >
                Practice
              </a>
            )}
          </div>
        </div>

        {/* Card 3: Challenge Quest */}
        <div className="group relative overflow-hidden bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800/80 transition-all duration-300 rounded-xl p-4 pl-5 shadow-sm min-h-[96px] flex flex-col justify-between">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600" />
          <Lightbulb size={64} className="absolute -right-3 -bottom-3 text-zinc-800 opacity-[0.04] transition-all duration-500 group-hover:opacity-15 group-hover:scale-110 group-hover:text-blue-400 group-hover:drop-shadow-[0_0_18px_rgba(59,130,246,0.3)] pointer-events-none" />
          
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 font-mono">
                  ③ Challenge
                </span>

                {ratedChallenge && (
                  <div className="group/tooltip relative cursor-pointer">
                    <Info size={11} className="text-zinc-650 hover:text-zinc-400 transition-colors" />
                    {/* Glassmorphic coach tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 hidden group-hover/tooltip:block z-50 p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md shadow-2xl min-w-[190px] text-[10px] text-zinc-400 font-mono">
                      {/* Tooltip pointer */}
                      <div className="absolute top-full left-2 -mt-[1px] border-solid border-t-zinc-800/80 border-t-6 border-x-transparent border-x-6 border-b-0"></div>
                      <div className="font-bold text-zinc-200 border-b border-zinc-900 pb-1 mb-1.5 uppercase tracking-wider text-[9px] flex items-center gap-1 text-[#dfa054]"><Sparkles size={10} /> Coach Report</div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span>Target Rating:</span><span className="text-zinc-200 font-bold">{ratedChallenge.rating}</span></div>
                        <div className="flex justify-between"><span>Match Reason:</span><span className="text-zinc-200 font-semibold">Active Glicko target level</span></div>
                        <div className="flex justify-between"><span>Contest:</span><span className="text-zinc-200 font-semibold truncate max-w-[100px]">{ratedChallenge.contest}</span></div>
                        <div className="flex justify-between"><span>Index:</span><span className="text-blue-400 font-bold">{ratedChallenge.index}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className="mt-1 text-sm font-semibold text-zinc-100 truncate pr-4">
                {ratedChallenge ? ratedChallenge.title : "Challenge Goal Cleared"}
              </h3>
              <p className="mt-0.5 text-[10px] text-zinc-500 font-mono truncate pr-4">
                {ratedChallenge ? `${ratedChallenge.contest} (${ratedChallenge.index}) · ${ratedChallenge.rating} rating` : "All challenges met!"}
              </p>
            </div>

            {ratedChallenge && (
              <a 
                href={`https://leetcode.com/problems/${ratedChallenge.slug}/`}
                target="_blank"
                rel="noreferrer"
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded transition-all cursor-pointer shrink-0"
              >
                Attempt
              </a>
            )}
          </div>
        </div>
      </div>

      {/* QUEST PROGRESS BAR */}
      <div className="flex items-center justify-between border-t border-b border-zinc-900/60 py-3.5 px-1 mt-1 text-[10px] font-mono text-zinc-500">
        <span className="font-bold uppercase tracking-wider">Quest Progress</span>
        <div className="flex items-center gap-3">
          <span className="text-[#dfa054] font-bold tracking-widest text-[12px]">{getProgressBar(completedQuests, totalQuests)}</span>
          <span className="text-zinc-400 font-bold font-mono">{completedQuests}/{totalQuests}</span>
        </div>
      </div>

      {/* WEEKLY PROGRESS REPORT CARD */}
      <Card className="p-4 bg-zinc-950/40 border border-zinc-900 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
            Weekly Progress
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft size={11} />
            </button>
            <span className="text-[9px] font-mono text-zinc-400 px-1 font-semibold">
              {weekOffset === 0 ? "This Week" : weeklyReport.weekLabel}
            </span>
            <button 
              disabled={weekOffset >= 0}
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
              title="Next Week"
            >
              <ChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* This Week indicator */}
        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
          <span>{weekOffset === 0 ? "This Week" : "Week Performance"}</span>
          <span className="text-emerald-400 tracking-wider font-bold">██████████</span>
        </div>

        {/* Weekly Stats Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 pt-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Solved</span>
            <span className="font-bold text-zinc-200 font-mono">{weeklyReport.solvedCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Highest</span>
            <span className="font-bold text-[#dfa054] font-mono">{weeklyReport.highestRating || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Average</span>
            <span className="font-bold text-zinc-200 font-mono">{weeklyReport.averageRating || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 font-mono text-[10px]">Improvement</span>
            <span className={`font-bold font-mono ${weeklyReport.improvement >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {weeklyReport.improvement >= 0 ? `+${weeklyReport.improvement}` : weeklyReport.improvement}
            </span>
          </div>
          <div className="flex items-center justify-between col-span-2 border-t border-zinc-900/60 pt-2">
            <span className="text-zinc-500 font-mono text-[10px]">Active Streak</span>
            <span className="font-bold text-[#dfa054] font-mono">{weeklyReport.streak} days</span>
          </div>
        </div>
      </Card>
      
      {/* Dynamic Sync Info */}
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-[8.5px] text-zinc-650 font-mono">
        <LockKeyhole size={10} /> History synced to {profile ? profile.username : "local metadata"}.
      </div>
    </div>
  )
}
