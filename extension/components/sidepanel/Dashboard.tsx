import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target, Play, RotateCcw, Square, Compass, Sparkles, TrendingUp, Flame, Info, Lightbulb, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react"
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

const parseLocalDate = (timeVal: any): Date | null => {
  if (!timeVal) return null
  try {
    if (Array.isArray(timeVal)) {
      const [y, m, d, h = 0, min = 0, sec = 0] = timeVal
      return new Date(y, m - 1, d, h, min, sec)
    }
    return new Date(timeVal)
  } catch (e) {
    return null
  }
}

const getLocalDateKey = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
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
            const dateObj = parseLocalDate(p.solvedAt)
            if (!dateObj) continue
            const dateKey = getLocalDateKey(dateObj)
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
            const dateObj = parseLocalDate(s.startedAt)
            if (!dateObj) continue
            const dateKey = getLocalDateKey(dateObj)
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
    // Helper for computing week ranges (without mutation bug)
    const getWeekRangeLocal = (offset: number) => {
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Mon start
      const monday = new Date(now.getFullYear(), now.getMonth(), diff)
      monday.setHours(0, 0, 0, 0)
      monday.setDate(monday.getDate() + offset * 7)
      
      const sunday = new Date(monday.getTime())
      sunday.setDate(sunday.getDate() + 6)
      sunday.setHours(23, 59, 59, 999)
      return { start: monday, end: sunday }
    }

    const rangeOfWeeks = getWeekRangeLocal(weekOffset)

    // Build map for rating lookup
    const ratingsMap = new Map<string, number>()
    if (Array.isArray(zerotrac)) {
      for (const p of zerotrac) {
        if (p.TitleSlug && typeof p.Rating === "number") {
          ratingsMap.set(p.TitleSlug, p.Rating)
        }
      }
    }

    // Get all solves in rangeOfWeeks from data.recentSolves
    const solvesInWeek: any[] = []
    if (data && Array.isArray(data.recentSolves)) {
      for (const p of data.recentSolves) {
        const solvedDate = parseLocalDate(p.solvedAt)
        if (solvedDate && solvedDate >= rangeOfWeeks.start && solvedDate <= rangeOfWeeks.end) {
          const rating = ratingsMap.get(p.titleSlug) || (p.difficulty === "Easy" ? 1200 : p.difficulty === "Medium" ? 1600 : 2000)
          solvesInWeek.push({
            ...p,
            rating,
            dateKey: getLocalDateKey(solvedDate)
          })
        }
      }
    }

    const solvedCount = solvesInWeek.length
    let highestRating = 0
    let totalRating = 0
    let ratedCount = 0
    for (const p of solvesInWeek) {
      if (p.rating && p.rating > 0) {
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
    const prevSolves: any[] = []
    if (data && Array.isArray(data.recentSolves)) {
      for (const p of data.recentSolves) {
        const solvedDate = parseLocalDate(p.solvedAt)
        if (solvedDate && solvedDate >= prevWeekRange.start && solvedDate <= prevWeekRange.end) {
          const rating = ratingsMap.get(p.titleSlug) || (p.difficulty === "Easy" ? 1200 : p.difficulty === "Medium" ? 1600 : 2000)
          prevSolves.push({ ...p, rating })
        }
      }
    }
    let prevTotalRating = 0
    let prevRatedCount = 0
    for (const p of prevSolves) {
      if (p.rating && p.rating > 0) {
        prevTotalRating += p.rating
        prevRatedCount += 1
      }
    }
    const prevAverageRating = prevRatedCount > 0 ? Math.round(prevTotalRating / prevRatedCount) : 0
    const improvement = prevAverageRating > 0 && averageRating > 0 ? averageRating - prevAverageRating : 0

    // Compute streak for this week
    let streak = 0
    if (weekOffset === 0) {
      streak = data?.currentStreak || 0
    } else {
      // Find longest consecutive days solved in that week
      const uniqueDays = Array.from(new Set(solvesInWeek.map(p => p.dateKey))).sort()
      let maxStreak = 0
      let curStreak = 0
      let prevTime = 0
      for (const dayStr of uniqueDays) {
        const t = new Date(dayStr).getTime()
        if (prevTime === 0) {
          curStreak = 1
        } else if (t - prevTime <= 24 * 60 * 60 * 1000 + 60 * 1000) { // check if consecutive day
          curStreak += 1
        } else {
          curStreak = 1
        }
        prevTime = t
        if (curStreak > maxStreak) maxStreak = curStreak
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
  }, [data, weekOffset, zerotrac])

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
            <div className="flex gap-2 pt-1.5">
              <button
                onClick={handleResetSession}
                className="flex-1 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 font-semibold text-[10px] py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 uppercase font-mono cursor-pointer"
              >
                <RotateCcw size={10} /> Reset
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 border border-red-900/40 hover:border-red-800 bg-red-950/20 hover:bg-red-950/40 text-red-400/80 hover:text-red-400 font-semibold text-[10px] py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 uppercase font-mono cursor-pointer"
              >
                <Square size={9} /> Stop
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-[11px] leading-relaxed text-zinc-400">
              Ready to log a deliberate practice run? Start a session to track tab switches and focus.
            </p>
            <button
              onClick={() => handleStartSession()}
              className="w-full sm:w-auto shrink-0 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-200 font-semibold text-[10px] px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider cursor-pointer"
            >
              <Play size={10} fill="currentColor" /> Start Session
            </button>
          </div>
        )}
      </Card>

      {/* THREE MAIN QUEST CARDS */}
      <div className="space-y-3">
        {/* Card 1: Review Quest */}
        <div className={`relative bg-[#09090b] border rounded-xl p-4 transition-colors ${
          isReviewDone 
            ? "border-emerald-500/20" 
            : "border-zinc-800/80 hover:border-zinc-700"
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isReviewDone ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                  isReviewDone ? "text-emerald-500" : "text-amber-500"
                }`}>
                  Review
                </span>
              </div>
              <h3 className={`text-sm font-medium truncate ${
                isReviewDone ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}>
                {activeReviewCard ? (activeReviewCard.title || activeReviewCard.problemTitle) : "Review Queue Clear"}
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {activeReviewCard ? `Interval: ${activeReviewCard.intervalDays?.toFixed(1) || "1.0"}d` : "Recall deck fully updated."}
              </p>
            </div>
            
            {activeReviewCard && (
              <div className="shrink-0">
                {isReviewDone ? (
                  <span className="inline-flex items-center text-emerald-500 text-xs font-medium px-3 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10">
                    Done
                  </span>
                ) : (
                  <a 
                    href={`https://leetcode.com/problems/${activeReviewCard.titleSlug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center text-amber-500 hover:text-amber-400 text-xs font-medium px-4 py-1.5 rounded-md border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10 transition-colors cursor-pointer"
                  >
                    Review
                  </a>
                )}
              </div>
            )}
          </div>

          {activeReviewCard && !isReviewDone && (
            <div className="mt-3.5 pt-3.5 border-t border-zinc-800/60">
              {reviewingCardId === activeReviewCard.id ? (
                <div className="space-y-2 animate-fadeIn">
                  <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Rate recall quality</div>
                  <div className="grid grid-cols-4 gap-2">
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 1)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-[11px] font-medium py-1.5 rounded-md cursor-pointer transition-colors"
                    >
                      Forgot
                    </button>
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 3)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-400 text-[11px] font-medium py-1.5 rounded-md cursor-pointer transition-colors"
                    >
                      Hard
                    </button>
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 4)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/10 text-zinc-400 hover:text-blue-400 text-[11px] font-medium py-1.5 rounded-md cursor-pointer transition-colors"
                    >
                      Good
                    </button>
                    <button 
                      disabled={reviewSubmitting}
                      onClick={() => handleReviewSubmit(activeReviewCard.id, 5)}
                      className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 text-zinc-400 hover:text-emerald-400 text-[11px] font-medium py-1.5 rounded-md cursor-pointer transition-colors"
                    >
                      Easy
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setReviewingCardId(activeReviewCard.id)}
                  className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium py-2 rounded-md transition-colors cursor-pointer"
                >
                  Log Recall Quality
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Practice Quest */}
        <div className={`relative bg-[#09090b] border rounded-xl p-4 transition-colors ${
          isPracticeDone 
            ? "border-emerald-500/20" 
            : "border-zinc-800/80 hover:border-zinc-700"
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isPracticeDone ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                  isPracticeDone ? "text-emerald-500" : "text-teal-500"
                }`}>
                  Practice
                </span>
                
                {weakRecommendation && !isPracticeDone && (
                  <div className="group/tooltip relative cursor-pointer">
                    <Info size={12} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 hidden group-hover/tooltip:block z-50 p-3 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl min-w-[200px] text-[11px] text-zinc-300">
                      <div className="font-semibold text-zinc-100 border-b border-zinc-800 pb-1 mb-2 uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Sparkles size={11} className="text-amber-500" /> Coach Report</div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Weak Topic</span>
                          <span className="font-medium">{weakRecommendation.tag}</span>
                        </div>
                        <div className="flex flex-col mt-1 pt-1 border-t border-zinc-800/50">
                          <span className="text-zinc-500 text-[10px]">Reason</span>
                          <span className="text-zinc-300">{weakness?.weakTags?.[0]?.score > 0.4 ? "Needs solved signals" : "No solves in 14+ days"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className={`text-sm font-medium truncate ${
                isPracticeDone ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}>
                {weakRecommendation ? weakRecommendation.title : "Practice Target Solved"}
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {weakRecommendation ? weakRecommendation.reason : "All practice targets solved!"}
              </p>
            </div>

            {weakRecommendation && (
              <div className="shrink-0">
                {isPracticeDone ? (
                  <span className="inline-flex items-center text-emerald-500 text-xs font-medium px-3 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10">
                    Done
                  </span>
                ) : (
                  <a 
                    href={`https://leetcode.com/problems/${weakRecommendation.slug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center text-teal-400 hover:text-teal-300 text-xs font-medium px-4 py-1.5 rounded-md border border-teal-500/30 hover:border-teal-500/50 bg-teal-500/10 transition-colors cursor-pointer"
                  >
                    Practice
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Challenge Quest */}
        <div className={`relative bg-[#09090b] border rounded-xl p-4 transition-colors ${
          isChallengeDone 
            ? "border-emerald-500/20" 
            : "border-zinc-800/80 hover:border-zinc-700"
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isChallengeDone ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                  isChallengeDone ? "text-emerald-500" : "text-blue-500"
                }`}>
                  Challenge
                </span>

                {ratedChallenge && !isChallengeDone && (
                  <div className="group/tooltip relative cursor-pointer">
                    <Info size={12} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 hidden group-hover/tooltip:block z-50 p-3 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl min-w-[200px] text-[11px] text-zinc-300">
                      <div className="font-semibold text-zinc-100 border-b border-zinc-800 pb-1 mb-2 uppercase tracking-wider text-[10px] flex items-center gap-1.5"><Sparkles size={11} className="text-amber-500" /> Coach Report</div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Target Rating</span>
                          <span className="font-medium">{ratedChallenge.rating}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Contest</span>
                          <span className="font-medium truncate max-w-[100px]" title={ratedChallenge.contest}>{ratedChallenge.contest}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className={`text-sm font-medium truncate ${
                isChallengeDone ? "text-zinc-500 line-through" : "text-zinc-100"
              }`}>
                {ratedChallenge ? ratedChallenge.title : "Challenge Goal Cleared"}
              </h3>
              <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
                {ratedChallenge ? `${ratedChallenge.contest} (${ratedChallenge.index}) · ${ratedChallenge.rating} rating` : "All challenges met!"}
              </p>
            </div>

            {ratedChallenge && (
              <div className="shrink-0">
                {isChallengeDone ? (
                  <span className="inline-flex items-center text-emerald-500 text-xs font-medium px-3 py-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10">
                    Done
                  </span>
                ) : (
                  <a 
                    href={`https://leetcode.com/problems/${ratedChallenge.slug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center text-blue-400 hover:text-blue-300 text-xs font-medium px-4 py-1.5 rounded-md border border-blue-500/30 hover:border-blue-500/50 bg-blue-500/10 transition-colors cursor-pointer"
                  >
                    Attempt
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUEST PROGRESS BAR */}
      <div className="flex items-center justify-between mt-5 mb-1 px-1">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Quest Progress</span>
        <div className="flex items-center gap-3">
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-zinc-400 transition-all duration-500 ease-out" 
              style={{ width: `${totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[11px] text-zinc-400 font-medium tabular-nums">{completedQuests}/{totalQuests}</span>
        </div>
      </div>

      <div className="h-px w-full bg-zinc-800/60 my-5" />

      {/* WEEKLY PROGRESS REPORT CARD */}
      <div className="flex flex-col gap-4 mb-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Weekly Progress
          </span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setWeekOffset(prev => prev - 1)}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors cursor-pointer"
              title="Previous Week"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] text-zinc-300 font-medium min-w-[70px] text-center">
              {weekOffset === 0 ? "This Week" : weeklyReport.weekLabel}
            </span>
            <button 
              disabled={weekOffset >= 0}
              onClick={() => setWeekOffset(prev => prev + 1)}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
              title="Next Week"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Weekly Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#09090b] border border-zinc-800/60 rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-zinc-700 transition-colors">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Solved</span>
            <span className="text-lg font-semibold text-zinc-100">{weeklyReport.solvedCount}</span>
          </div>
          <div className="bg-[#09090b] border border-zinc-800/60 rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-zinc-700 transition-colors">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Highest</span>
            <span className="text-lg font-semibold text-amber-500">{weeklyReport.highestRating || "—"}</span>
          </div>
          <div className="bg-[#09090b] border border-zinc-800/60 rounded-xl p-3 flex flex-col items-center justify-center text-center hover:border-zinc-700 transition-colors">
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Average</span>
            <span className="text-lg font-semibold text-zinc-100">{weeklyReport.averageRating || "—"}</span>
          </div>
          
          <div className="col-span-3 grid grid-cols-2 gap-3">
            <div className="bg-[#09090b] border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between hover:border-zinc-700 transition-colors">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Improvement</span>
              <span className={`text-sm font-semibold ${weeklyReport.improvement > 0 ? "text-emerald-500" : weeklyReport.improvement < 0 ? "text-red-500" : "text-zinc-400"}`}>
                {weeklyReport.improvement > 0 ? `+${weeklyReport.improvement}` : weeklyReport.improvement}
              </span>
            </div>
            <div className="bg-[#09090b] border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between hover:border-zinc-700 transition-colors">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Streak</span>
              <span className="text-sm font-semibold text-zinc-100">{weeklyReport.streak} <span className="text-[10px] text-zinc-500 font-normal">days</span></span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Sync Info */}
      <div className="flex items-center gap-1.5 px-1 py-0.5 text-[8.5px] text-zinc-650 font-mono">
        <LockKeyhole size={10} /> History synced to {profile ? profile.username : "local metadata"}.
      </div>
    </div>
  )
}
