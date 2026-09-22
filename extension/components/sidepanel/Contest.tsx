import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BarChart3, 
  History, 
  Calendar, 
  RefreshCw, 
  ExternalLink, 
  Trophy, 
  Award, 
  Shield, 
  Search, 
  TrendingUp, 
  Clock, 
  Star, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  X,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Crown,
  Swords,
  Radio,
  Check,
  Zap
} from "lucide-react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"
import { getUsername, setCachedContests, getContestSnapshot, setContestSnapshot } from "../../lib/storage"
import { loadContestLifecycle, type ContestLifecycleItem } from "../../lib/contest-lifecycle"
import { UpcomingContests } from "./UpcomingContests"
import { AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts"

/* ═══════════ TYPE DEFINITIONS ═══════════ */
interface UserProfile { 
  realName?: string 
  userAvatar?: string 
  reputation?: number 
  ranking?: number 
  countryCode?: string 
}

interface RankingInfo { 
  rating?: number 
  attendedContestsCount?: number 
  topPercentage?: number 
  globalRanking?: number 
  badge?: {
    name?: string
    icon?: string
  }
}

interface RankingHistory { 
  attended?: boolean
  rating?: number
  ranking?: number
  problemsSolved?: number
  totalProblems?: number
  finishTimeInSeconds?: number
  contest?: { 
    title?: string
    titleSlug?: string
    startTime?: number 
  } 
}

interface ContestAnalytics { 
  contestSlug?: string
  contest?: { 
    title?: string 
  } 
  rating?: number
  panicIndex?: string
  chokingIndex?: string
  staminaDropoff?: string
}

/* ═══════════ HELPER FUNCTIONS ═══════════ */
function deltaText(contest: ContestLifecycleItem) {
  if (contest.attended === false) return "Unchanged"
  const delta = contest.ratingDelta ?? contest.predictedDelta
  const rating = contest.ratingAfter ?? contest.predictedRating
  if (delta == null) {
    if (contest.status === "FINALIZED" && rating != null) return `${Math.round(rating)} official`
    return "Pending"
  }
  const isPred = contest.status === "PREDICTED" || contest.status === "PREDICTING"
  return `${rating == null ? "" : `${Math.round(rating)} `}(${delta >= 0 ? "+" : ""}${Math.round(delta)})${isPred ? " est" : ""}`
}

function statusText(contest: ContestLifecycleItem) {
  if (contest.attended === false) return "DID NOT ATTEND"
  if (contest.status === "FINALIZED") return "OFFICIAL"
  if (contest.status === "PREDICTED") return "PREDICTED"
  if (contest.status === "PREDICTING") return "CALCULATING"
  return "UNOFFICIAL"
}

function getMetricBadgeColor(val?: string) {
  if (!val) return "bg-zinc-900 border-zinc-800 text-zinc-500"
  const upper = val.toUpperCase()
  if (upper === "HIGH") return "bg-red-500/10 border-red-500/20 text-red-400"
  if (upper === "MEDIUM") return "bg-amber-500/10 border-amber-500/20 text-amber-400"
  if (upper === "LOW") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  return "bg-zinc-900 border-zinc-800 text-zinc-500"
}

import { KnightCrest, GuardianCrest, CrossedBladesEmblem } from "../ui/RankCrests"

const BadgeIcon = ({ name }: { name: string; icon?: string | null }) => {
  const lower = (name || "").toLowerCase()
  if (lower === "guardian") {
    return <GuardianCrest size={15} color="#ef4743" />
  }
  if (lower === "knight") {
    return <KnightCrest size={15} color="#ffc01e" />
  }
  return <Trophy size={14} className="text-sky-400 shrink-0" />
}

function getRealTimeBadge(rankingInfo: RankingInfo | null, currentRating: number) {
  const topPct = rankingInfo?.topPercentage
  const officialName = rankingInfo?.badge?.name?.toLowerCase()

  // Check 1: Guardian status (Top 1% or official Guardian badge)
  if (officialName === "guardian" || (topPct != null && topPct <= 1.0)) {
    return {
      name: "Guardian",
      color: "#ef4743",
      bg: "rgba(239,71,67,0.12)",
      border: "rgba(239,71,67,0.30)",
      detail: topPct != null ? `Top ${topPct.toFixed(2)}% globally (Top 1% Rank)` : "Official Guardian Badge",
      isOfficial: true
    }
  }

  // Check 2: Knight status (Top 5% or official Knight badge)
  if (officialName === "knight" || (topPct != null && topPct <= 5.0)) {
    return {
      name: "Knight",
      color: "#ffc01e",
      bg: "rgba(255,192,30,0.12)",
      border: "rgba(255,192,30,0.30)",
      detail: topPct != null ? `Top ${topPct.toFixed(2)}% globally (Top 5% Rank)` : "Official Knight Badge",
      isOfficial: true
    }
  }

  // Check 3: Contender
  const dist = topPct != null ? (topPct - 5.0).toFixed(2) : null
  return {
    name: "Contender",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.30)",
    detail: dist ? `${dist}% away from Knight (Top 5%)` : "Regular Contest Participant",
    isOfficial: false
  }
}

function renderMilestoneHeader(milestone: { type: string; label: string }) {
  const configs: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    guardian: {
      bg: "bg-red-950/60 text-red-300 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.35)]",
      border: "border-red-500/40 bg-gradient-to-r from-red-950/35 via-[#251518] to-red-950/20 shadow-[0_0_25px_rgba(239,68,68,0.18)] hover:border-red-500/60",
      text: "GUARDIAN TITLE UNLOCKED · TOP 1% GLOBALLY",
      icon: <BadgeIcon name="Guardian" />
    },
    knight: {
      bg: "bg-amber-950/60 text-amber-300 border-amber-500/60 shadow-[0_0_15px_rgba(251,146,60,0.35)]",
      border: "border-amber-500/40 bg-gradient-to-r from-amber-950/35 via-[#261c14] to-amber-950/20 shadow-[0_0_25px_rgba(251,146,60,0.18)] hover:border-amber-500/60",
      text: "KNIGHT TITLE UNLOCKED · TOP 5% GLOBALLY",
      icon: <BadgeIcon name="Knight" />
    },
    peak: {
      bg: "bg-emerald-950/50 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
      border: "border-emerald-500/35 bg-gradient-to-r from-emerald-950/25 via-[#15231c] to-emerald-950/15 shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-500/50",
      text: milestone.label.toUpperCase(),
      icon: <Zap size={11} className="text-emerald-400" />
    },
    first: {
      bg: "bg-amber-950/50 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
      border: "border-amber-500/35 bg-gradient-to-r from-amber-950/25 via-[#231e16] to-amber-950/15 shadow-[0_0_20px_rgba(245,158,11,0.12)] hover:border-amber-500/50",
      text: "FIRST CONTEST ATTENDED · JOURNEY BEGUN",
      icon: <Trophy size={11} className="text-amber-400" />
    },
    count_10: {
      bg: "bg-sky-950/50 text-sky-300 border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.25)]",
      border: "border-sky-500/35 bg-gradient-to-r from-sky-950/25 via-[#14202b] to-sky-950/15 shadow-[0_0_20px_rgba(56,189,248,0.12)] hover:border-sky-500/50",
      text: "10TH CONTEST MILESTONE · VETERAN",
      icon: <Trophy size={11} className="text-sky-400" />
    },
    count_25: {
      bg: "bg-indigo-950/50 text-indigo-300 border-indigo-500/50 shadow-[0_0_12px_rgba(99,102,241,0.25)]",
      border: "border-indigo-500/35 bg-gradient-to-r from-indigo-950/25 via-[#19182b] to-indigo-950/15 shadow-[0_0_20px_rgba(99,102,241,0.12)] hover:border-indigo-500/50",
      text: "25TH CONTEST MILESTONE · EXPERT",
      icon: <Award size={11} className="text-indigo-400" />
    },
    count_50: {
      bg: "bg-amber-950/50 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
      border: "border-amber-500/35 bg-gradient-to-r from-amber-950/25 via-[#231e16] to-amber-950/15 shadow-[0_0_20px_rgba(245,158,11,0.12)] hover:border-amber-500/50",
      text: "50TH CONTEST MILESTONE · MASTER",
      icon: <Shield size={11} className="text-amber-400" />
    },
    count_100: {
      bg: "bg-rose-950/50 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.25)]",
      border: "border-rose-500/35 bg-gradient-to-r from-rose-950/25 via-[#231518] to-rose-950/15 shadow-[0_0_20px_rgba(244,63,94,0.12)] hover:border-rose-500/50",
      text: "100TH CONTEST MILESTONE · LEGEND",
      icon: <Trophy size={11} className="text-rose-400" />
    },
    sweep: {
      bg: "bg-rose-950/50 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)] font-mono font-bold tracking-wider",
      border: "border-rose-500/35 bg-gradient-to-r from-rose-950/30 via-[#231518] to-rose-950/15 shadow-[0_0_20px_rgba(244,63,94,0.14)] hover:border-rose-500/55",
      text: milestone.label.toUpperCase(),
      icon: <CrossedBladesEmblem size={12} color="#fb7185" />
    }
  }

  const cfg = configs[milestone.type] || {
    bg: "bg-amber-950/40 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]",
    border: "border-white/10 bg-[#282828]",
    text: milestone.label,
    icon: <Trophy size={12} className="text-amber-400" />
  }

  return {
    cardStyle: cfg.border,
    badge: (
      <div className={`mb-2.5 flex items-center gap-1.5 text-[9.5px] font-mono font-bold border px-2.5 py-1 rounded-md w-fit uppercase tracking-wider ${cfg.bg}`}>
        {cfg.icon}
        <span>{cfg.text}</span>
      </div>
    )
  }
}

export const Contest = () => {
  const [activeTab, setActiveTab] = useState<"stats" | "history" | "upcoming">("stats")
  const [data, setData] = useState<ContestLifecycleItem[]>([])

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [rankingInfo, setRankingInfo] = useState<RankingInfo | null>(null)
  const [rankingHistory, setRankingHistory] = useState<RankingHistory[]>([])
  const [analytics, setAnalytics] = useState<ContestAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [username, setUsernameState] = useState("")

  // History Tab Filter & Search State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "gains" | "sweeps" | "milestones" | "weekly" | "biweekly">("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest_delta" | "highest_rank">("newest")
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // Chart range state: "all" | "20" | "10"
  const [chartRange, setChartRange] = useState<"all" | "20" | "10">("all")

  // Badge guide accordion state
  const [showBadgeInfo, setShowBadgeInfo] = useState(false)

  const refresh = async (_forcePredictRefresh = false) => {
    // Only show full loading skeleton on fresh load with no existing data
    if (!data || data.length === 0) {
      setLoading(true)
    }
    setError("")
    try {
      const uname = await getUsername()
      if (!uname) throw new Error("Set your LeetCode username in Settings")
      setUsernameState(uname)

      const profilePromise = new Promise<any>((resolve) =>
        chrome.runtime.sendMessage({ action: "get_user_profile", payload: { username: uname } }, (res) => resolve(res))
      )
      const rankingPromise = new Promise<any>((resolve) =>
        chrome.runtime.sendMessage({ action: "get_user_contest_history", payload: { username: uname } }, (res) => resolve(res))
      )
      const localAnalyticsPromise = Promise.race([
        fetchContests().catch(() => []),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 600))
      ])

      const [profileRes, rankingRes, localAnalytics] = await Promise.all([
        profilePromise,
        rankingPromise,
        localAnalyticsPromise
      ])

      const lifecycle = await loadContestLifecycle(uname, rankingRes)

      setData(lifecycle)
      let resolvedProfile = null
      if (profileRes?.ok) {
        resolvedProfile = profileRes.data?.matchedUser?.profile || null
        setProfile(resolvedProfile)
      }
      let resolvedRankingInfo = null
      let resolvedRankingHistory: RankingHistory[] = []
      if (rankingRes?.ok) {
        resolvedRankingInfo = rankingRes.data?.userContestRanking || null
        resolvedRankingHistory = rankingRes.data?.userContestRankingHistory || []
        setRankingInfo(resolvedRankingInfo)
        setRankingHistory(resolvedRankingHistory)
      }
      setAnalytics(localAnalytics)
      await setCachedContests(lifecycle as any)

      await setContestSnapshot({
        data: lifecycle,
        profile: resolvedProfile,
        rankingInfo: resolvedRankingInfo,
        rankingHistory: resolvedRankingHistory,
        analytics: localAnalytics
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load contest history")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getContestSnapshot().then((snapshot) => {
      if (snapshot) {
        if (snapshot.data) setData(snapshot.data)
        if (snapshot.profile) setProfile(snapshot.profile)
        if (snapshot.rankingInfo) setRankingInfo(snapshot.rankingInfo)
        if (snapshot.rankingHistory) setRankingHistory(snapshot.rankingHistory)
        if (snapshot.analytics) setAnalytics(snapshot.analytics)
        setLoading(false)
      }
    })

    void refresh(false)
    const interval = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return
      void refresh(false)
    }, 3 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  // Memoized Statistics
  const peakRating = useMemo(() => {
    if (!data.length) return 1500
    const ratings = data.map((c) => c.ratingAfter || 0).filter(Boolean)
    return ratings.length ? Math.max(...ratings) : 1500
  }, [data])

  const avgDelta = useMemo(() => {
    if (!rankingInfo || !rankingInfo.rating || !rankingInfo.attendedContestsCount) return 0
    return (rankingInfo.rating - 1500) / rankingInfo.attendedContestsCount
  }, [rankingInfo])

  const contestStats = useMemo(() => {
    const attended = rankingHistory.filter(c => c.attended === true)
    if (!attended.length) {
      return {
        avgSolved: 0,
        maxRating: 1500,
        highestRank: "n/a",
        lowestRank: "n/a",
        mostActiveMonth: "n/a",
        allKilled: 0,
        threeSolved: 0,
        twoSolved: 0,
        oneSolved: 0,
        noneSolved: 0
      }
    }

    let totalSolved = 0
    let maxRating = 1500
    let highestRank = Infinity
    let lowestRank = -Infinity
    let allKilled = 0
    let threeSolved = 0
    let twoSolved = 0
    let oneSolved = 0
    let noneSolved = 0

    const monthCounts: Record<string, number> = {}

    attended.forEach(c => {
      totalSolved += c.problemsSolved || 0
      if (c.rating && c.rating > maxRating) maxRating = c.rating
      if (c.ranking && c.ranking > 0) {
        if (c.ranking < highestRank) highestRank = c.ranking
        if (c.ranking > lowestRank) lowestRank = c.ranking
      }
      
      const solved = c.problemsSolved || 0
      const total = c.totalProblems || 4
      if (solved === total && total > 0) allKilled++
      else if (solved === 3) threeSolved++
      else if (solved === 2) twoSolved++
      else if (solved === 1) oneSolved++
      else if (solved === 0) noneSolved++

      if (c.contest?.startTime) {
        const date = new Date(c.contest.startTime * 1000)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const monthLabel = `${months[date.getMonth()]}, ${String(date.getFullYear()).substring(2)}`
        monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1
      }
    })

    let mostActiveMonth = "n/a"
    let maxMonthCount = 0
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > maxMonthCount) {
        maxMonthCount = count
        mostActiveMonth = month
      }
    })

    return {
      avgSolved: attended.length ? (totalSolved / attended.length) : 0,
      maxRating: Math.round(maxRating),
      highestRank: highestRank === Infinity ? "n/a" : highestRank,
      lowestRank: lowestRank === -Infinity ? "n/a" : lowestRank,
      mostActiveMonth,
      allKilled,
      threeSolved,
      twoSolved,
      oneSolved,
      noneSolved
    }
  }, [rankingHistory])

  const medianDisplay = useMemo(() => {
    const times = data
      .map((c) => c.finishTimeMinutes)
      .filter((t): t is number => typeof t === "number")
      .sort((a, b) => a - b)
    if (!times.length) return "n/a"
    const mid = Math.floor(times.length / 2)
    const medianMinutes = times.length % 2 !== 0 ? times[mid] : (times[mid - 1] + times[mid]) / 2
    const totalSecs = Math.round(medianMinutes * 60)
    return `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`
  }, [data])

  // Chart data calculation
  const chartData = useMemo(() => {
    let list = data
      .filter((c) => c.status === "FINALIZED" && c.ratingAfter != null && c.attended === true)
      .map((c) => ({
        name: c.contestTitle.replace("Weekly Contest ", "W").replace("Biweekly Contest ", "B"),
        fullName: c.contestTitle,
        rating: Math.round(c.ratingAfter!),
        rank: c.rank,
        delta: c.ratingDelta,
        solved: `${c.problemsSolved ?? "?"}/${c.totalProblems ?? 4}`,
        date: c.contestDate ? new Date(c.contestDate).toLocaleDateString([], { month: "short", day: "numeric" }) : ""
      }))
      .reverse()

    if (chartRange === "10") list = list.slice(-10)
    else if (chartRange === "20") list = list.slice(-20)

    return list
  }, [data, chartRange])

  // Compute contest milestones (chronological order)
  const milestoneMap = useMemo(() => {
    const map: Record<string, { type: "knight" | "guardian" | "first" | "peak" | "sweep" | "count_10" | "count_25" | "count_50" | "count_100"; label: string }> = {}
    const finalized = data.filter((c) => c.status === "FINALIZED" && c.attended === true && c.ratingAfter != null)
    if (!finalized.length) return map

    const chron = [...finalized].reverse()
    
    let passedKnight = false
    let passedGuardian = false
    let maxRatingSoFar = 0

    chron.forEach((c, idx) => {
      const slug = c.contestSlug
      const rating = Math.round(c.ratingAfter || 0)
      const isSweep = c.problemsSolved === (c.totalProblems || 4) && (c.problemsSolved || 0) > 0
      const isPB = rating > maxRatingSoFar && idx > 0
      if (rating > maxRatingSoFar) maxRatingSoFar = rating

      if (idx === 0) {
        map[slug] = { type: "first", label: "First Contest Attended · Journey Begun" }
      } else if (idx + 1 === 10) {
        map[slug] = { type: "count_10", label: "10th Contest Milestone · Veteran" }
      } else if (idx + 1 === 25) {
        map[slug] = { type: "count_25", label: "25th Contest Milestone · Expert" }
      } else if (idx + 1 === 50) {
        map[slug] = { type: "count_50", label: "50th Contest Milestone · Master" }
      } else if (idx + 1 === 100) {
        map[slug] = { type: "count_100", label: "100th Contest Milestone · Legend" }
      }

      if (!passedKnight && rating >= 1850) {
        passedKnight = true
        map[slug] = { type: "knight", label: "Knight Title Unlocked (1850+)" }
      }

      if (!passedGuardian && rating >= 2180) {
        passedGuardian = true
        map[slug] = { type: "guardian", label: "Guardian Title Unlocked (2180+)" }
      }

      // ALL KILL > Personal Best (RED CARD)
      if (isSweep) {
        map[slug] = { 
          type: "sweep", 
          label: isPB ? `ALL KILL · PERFECT 4/4 DOMINATION (PB ${rating})` : "ALL KILL · PERFECT 4/4 DOMINATION" 
        }
      } else if (isPB && (!map[slug] || map[slug].type.startsWith("count_"))) {
        map[slug] = { type: "peak", label: `Personal Best (${rating})` }
      }
    })

    return map
  }, [data])

  // Attended contests list (both finalized official and pending predictions)
  const attendedContests = useMemo(() => {
    return data.filter((contest) => 
      (contest.status === "FINALIZED" || contest.status === "PREDICTED" || contest.status === "PREDICTING") 
      && contest.attended === true
    )
  }, [data])

  // Active unfinalized contest with live prediction (if any)
  const pendingContest = useMemo(() => {
    return data.find((c) => 
      (c.status === "PREDICTED" || c.status === "PREDICTING") && 
      c.attended === true && 
      c.predictedDelta != null
    ) || null
  }, [data])

  // Filtered & sorted contests for History tab
  const filteredContests = useMemo(() => {
    let list = [...attendedContests]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter((c) => 
        c.contestTitle.toLowerCase().includes(q) || 
        c.contestSlug.toLowerCase().includes(q) ||
        (c.rank && String(c.rank).includes(q))
      )
    }

    if (filterMode === "gains") {
      list = list.filter((c) => (c.ratingDelta || 0) > 0)
    } else if (filterMode === "sweeps") {
      list = list.filter((c) => c.problemsSolved === (c.totalProblems || 4) && (c.problemsSolved || 0) > 0)
    } else if (filterMode === "milestones") {
      list = list.filter((c) => !!milestoneMap[c.contestSlug])
    } else if (filterMode === "weekly") {
      list = list.filter((c) => c.contestTitle.toLowerCase().includes("weekly") && !c.contestTitle.toLowerCase().includes("biweekly"))
    } else if (filterMode === "biweekly") {
      list = list.filter((c) => c.contestTitle.toLowerCase().includes("biweekly"))
    }

    if (sortBy === "oldest") {
      list.reverse()
    } else if (sortBy === "highest_delta") {
      list.sort((a, b) => (b.ratingDelta || -999) - (a.ratingDelta || -999))
    } else if (sortBy === "highest_rank") {
      list.sort((a, b) => (a.rank || 999999) - (b.rank || 999999))
    }

    return list
  }, [attendedContests, searchQuery, filterMode, sortBy, milestoneMap])

  const netRatingGain = useMemo(() => {
    return attendedContests.reduce((sum, c) => sum + (c.ratingDelta || 0), 0)
  }, [attendedContests])

  return (
    <div className="grid gap-3.5">
      <header className="flex items-end justify-between border-b border-white/[0.08] pb-3 px-1">
        <div className="flex items-start gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-400"><Trophy size={16} /></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">Competition</p><h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-100">Contest arena</h1><p className="mt-0.5 text-[10px] text-zinc-500">Official results, live estimates, and upcoming rooms.</p></div>
        </div>
        <span className="mb-0.5 inline-flex items-center gap-1 text-[9px] font-mono text-zinc-500"><Radio size={10} className="text-emerald-400" /> Sync</span>
      </header>
      {/* Tab Switcher */}
      <div className="flex bg-zinc-900/60 p-1 rounded-lg border border-zinc-800">
        <button 
          onClick={() => setActiveTab("stats")} 
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${
            activeTab === "stats" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Stats
        </button>

        <button 
          onClick={() => setActiveTab("history")} 
          className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${
            activeTab === "history" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <span>History</span>
          {attendedContests.length > 0 && (
            <span className="text-[9px] font-mono text-zinc-400">({attendedContests.length})</span>
          )}
        </button>

        <button 
          onClick={() => setActiveTab("upcoming")} 
          className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${
            activeTab === "upcoming" ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Upcoming
        </button>
      </div>

      {activeTab === "upcoming" ? <UpcomingContests /> : <>
        <div className="flex justify-between items-center px-1 -mb-2 text-[10px] font-mono text-zinc-500">
          <span>{data[0]?.refreshedAt ? `Synced ${new Date(data[0].refreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Contest Data"}</span>
          <button 
            onClick={() => void refresh(true)} 
            disabled={loading} 
            title="Refresh contest data" 
            className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-amber-400" : ""} />
          </button>
        </div>

        {/* PURPOSE BANNER: WHY CONTEST TRACKING EXISTS */}
        <section className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3.5 space-y-1.5 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-[11px] uppercase tracking-wider">
              <Trophy size={13} /> The Official Performance Ledger
            </div>
            <span className="text-[9px] font-mono text-amber-400/60 uppercase">Why this exists</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
            Practice mode measures how well you code when relaxed. <strong className="text-zinc-200">Contest History measures performance under real-time competitive pressure.</strong> It tracks your true rating volatility, 4/4 sweeps, and global percentile growth.
          </p>
        </section>

        {/* ═══════════ STATS TAB (Clean & Aligned UI) ═══════════ */}
        {activeTab === "stats" && (
          <div className="grid gap-3.5 animate-fadeIn">
            {/* LIVE CONTEST RATING PREDICTION BANNER */}
            {pendingContest && (
              <section className="relative overflow-hidden rounded-xl border border-[#ffa116]/30 bg-[#282828] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffa116]"></span>
                    </span>
                    <span className="font-mono font-bold text-[11px] uppercase tracking-wider text-[#ffa116] flex items-center gap-1.5">
                      <Zap size={13} className="text-[#ffa116]" /> Live Contest Prediction
                    </span>
                  </div>
                  <span className="text-[8px] font-mono uppercase bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30 px-2 py-0.5 rounded font-bold tracking-wider">
                    {pendingContest.source === "ENTRANTHUB" ? "ENTRANTHUB LIVE" : "ESTIMATED"}
                  </span>
                </div>

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://leetcode.com/contest/${pendingContest.contestSlug}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-zinc-100 hover:text-amber-400 transition truncate flex items-center gap-1"
                      >
                        <span>{pendingContest.contestTitle}</span>
                        <ExternalLink size={11} className="text-zinc-500" />
                      </a>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                      <span className="text-zinc-300 font-semibold">Rank #{pendingContest.rank?.toLocaleString() ?? "n/a"}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-300">{pendingContest.problemsSolved ?? "?"}/{pendingContest.totalProblems || 4} Solved</span>
                      {typeof pendingContest.finishTimeMinutes === "number" && !isNaN(pendingContest.finishTimeMinutes) && pendingContest.finishTimeMinutes > 0 && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-400">{Math.round(pendingContest.finishTimeMinutes)}m</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-xl font-bold font-mono tabular-nums ${
                      pendingContest.predictedDelta == null
                        ? "text-zinc-400"
                        : pendingContest.predictedDelta >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }`}>
                      {pendingContest.predictedDelta != null
                        ? `${pendingContest.predictedDelta >= 0 ? "+" : ""}${Math.round(pendingContest.predictedDelta)}`
                        : "Calculating..."}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-400 mt-0.5">
                      Est. Rating: <span className="text-sky-300 font-bold">{pendingContest.predictedRating ? Math.round(pendingContest.predictedRating) : "Pending"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span className="text-zinc-400">Official rating updates Wednesday on LeetCode</span>
                  <span className="text-amber-400/80 font-bold">UNOFFICIAL PREVIEW</span>
                </div>
              </section>
            )}

            {/* HERO PROFILE CARD */}
            {(() => {
              const currentRating = Math.round(rankingInfo?.rating || 1500)
              const badge = getRealTimeBadge(rankingInfo, currentRating)

              return (
                <section className="relative overflow-hidden rounded-xl border border-white/10 bg-[#222222] p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <img 
                        src={profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg"} 
                        className="w-12 h-12 rounded-xl border border-white/10 bg-[#181818] object-cover shrink-0" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://assets.leetcode.com/users/default_avatar.jpg"
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white truncate">{profile?.realName || username || "Som 07"}</span>
                          <span className="text-[9px] bg-white/10 text-zinc-300 border border-white/10 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">{profile?.countryCode || "US"}</span>
                          {username && (
                            <a href={`https://leetcode.com/${username}/`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-zinc-400 font-mono">@{username || "username"}</span>
                          <div className="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-mono font-bold uppercase" style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                            <BadgeIcon name={badge.name} />
                            <span>{badge.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase font-bold tracking-wider">Badge Status</span>
                      <span className="text-xs font-mono text-zinc-300 block mt-0.5 max-w-[150px] leading-tight">{badge.detail}</span>
                    </div>
                  </div>
                </section>
              )
            })()}

            {/* UNRATED / INITIAL BASELINE BANNER */}
            {(!rankingInfo || !rankingInfo.attendedContestsCount) && (
              <div className="rounded-xl border border-sky-400/20 bg-sky-950/20 p-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-sky-400 font-mono text-[11px]">
                  <Info size={13} /> Initial Rating Baseline (1500)
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 leading-relaxed">
                  LeetCode assigns all new accounts a default starting rating of <span className="text-sky-300 font-mono">1500</span>.
                  {!username ? " Ensure your LeetCode handle is set in Settings." : ` No official contest participations recorded yet for @${username}. Participate in an upcoming contest to earn an official contest rating!`}
                </p>
              </div>
            )}

            {/* PRIMARY METRICS GRID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#222222] p-4 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Rating</div>
                <div className="text-3xl font-bold text-[#38bdf8] font-mono mt-1 tabular-nums">
                  {Math.round(rankingInfo?.rating || 1500)}
                </div>
                <div className="mt-1 text-xs font-mono text-zinc-400">
                  {rankingInfo?.topPercentage != null ? `Top ${rankingInfo.topPercentage.toFixed(2)}% globally` : "Unrated"}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#222222] p-4 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Global Rank</div>
                <div className="text-3xl font-bold text-white font-mono mt-1 tabular-nums">
                  {rankingInfo?.globalRanking ? `#${rankingInfo.globalRanking.toLocaleString()}` : "n/a"}
                </div>
                <div className="mt-1 text-xs font-mono text-zinc-400">
                  Across {rankingInfo?.attendedContestsCount || 0} contests
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#222222] p-4 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Peak Rating</div>
                <div className="text-3xl font-bold text-[#ffc01e] font-mono mt-1 tabular-nums">
                  {Math.round(peakRating)}
                </div>
                <div className="mt-1 text-xs font-mono text-zinc-400">
                  Max rating achieved
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#222222] p-4 shadow-sm">
                <div className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Avg Rating Delta</div>
                <div className={`text-3xl font-bold font-mono mt-1 tabular-nums ${avgDelta >= 0 ? "text-[#00b8a3]" : "text-red-400"}`}>
                  {avgDelta >= 0 ? "+" : ""}{avgDelta.toFixed(1)}
                </div>
                <div className="mt-1 text-xs font-mono text-zinc-400">
                  Per attended contest
                </div>
              </div>
            </div>

            {/* SOLVE BREAKDOWN */}
            <section className="rounded-xl border border-white/10 bg-[#222222] p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-zinc-400 font-mono tracking-wider">Solve Breakdown</span>
                <span className="text-xs font-mono text-zinc-500">{rankingInfo?.attendedContestsCount || 0} Contests</span>
              </div>

              {(() => {
                const total = rankingHistory.filter(c => c.attended === true).length || 1
                const pAll = Math.round((contestStats.allKilled / total) * 100)
                const p3 = Math.round((contestStats.threeSolved / total) * 100)
                const p2 = Math.round((contestStats.twoSolved / total) * 100)
                const p1 = Math.round((contestStats.oneSolved / total) * 100)
                const p0 = Math.max(0, 100 - (pAll + p3 + p2 + p1))

                return (
                  <div className="space-y-3">
                    <div className="h-2 w-full flex overflow-hidden rounded-full bg-[#181818] border border-white/5">
                      {pAll > 0 && <div style={{ width: `${pAll}%` }} className="bg-[#00b8a3]" title={`4/4 Solved: ${contestStats.allKilled}`} />}
                      {p3 > 0 && <div style={{ width: `${p3}%` }} className="bg-[#38bdf8]" title={`3/4 Solved: ${contestStats.threeSolved}`} />}
                      {p2 > 0 && <div style={{ width: `${p2}%` }} className="bg-[#ffc01e]" title={`2/4 Solved: ${contestStats.twoSolved}`} />}
                      {p1 > 0 && <div style={{ width: `${p1}%` }} className="bg-zinc-500" title={`1/4 Solved: ${contestStats.oneSolved}`} />}
                      {p0 > 0 && <div style={{ width: `${p0}%` }} className="bg-rose-500/80" title={`0 Solved: ${contestStats.noneSolved}`} />}
                    </div>

                    <div className="grid grid-cols-5 gap-2 pt-1 text-center font-mono">
                      <button onClick={() => { setFilterMode("sweeps"); setActiveTab("history"); }} className="rounded-lg bg-[#181818] border border-white/10 p-2 hover:border-rose-500/40 transition cursor-pointer">
                        <div className="text-[9px] uppercase font-bold text-rose-400 flex items-center justify-center gap-1">
                          <CrossedBladesEmblem size={11} color="#fb7185" />
                          <span>ALL KILL</span>
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">{contestStats.allKilled}x</div>
                      </button>

                      <button onClick={() => { setFilterMode("all"); setActiveTab("history"); }} className="rounded-lg bg-[#181818] border border-white/10 p-2 hover:border-sky-500/40 transition cursor-pointer">
                        <div className="text-[9px] uppercase font-bold text-[#38bdf8]">3 Solved</div>
                        <div className="text-sm font-bold text-white mt-0.5">{contestStats.threeSolved}x</div>
                      </button>

                      <button onClick={() => { setFilterMode("all"); setActiveTab("history"); }} className="rounded-lg bg-[#181818] border border-white/10 p-2 hover:border-amber-500/40 transition cursor-pointer">
                        <div className="text-[9px] uppercase font-bold text-[#ffc01e]">2 Solved</div>
                        <div className="text-sm font-bold text-white mt-0.5">{contestStats.twoSolved}x</div>
                      </button>

                      <button onClick={() => { setFilterMode("all"); setActiveTab("history"); }} className="rounded-lg bg-[#181818] border border-white/10 p-2 hover:border-zinc-500/40 transition cursor-pointer">
                        <div className="text-[9px] uppercase font-bold text-zinc-400">1 Solved</div>
                        <div className="text-sm font-bold text-white mt-0.5">{contestStats.oneSolved}x</div>
                      </button>

                      <button onClick={() => { setFilterMode("all"); setActiveTab("history"); }} className="rounded-lg bg-[#181818] border border-white/10 p-2 hover:border-rose-500/40 transition cursor-pointer">
                        <div className="text-[9px] uppercase font-bold text-rose-400">0 Solved</div>
                        <div className="text-sm font-bold text-white mt-0.5">{contestStats.noneSolved}x</div>
                      </button>
                    </div>
                  </div>
                )
              })()}

              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-white/10 font-mono">
                <div className="rounded-lg bg-[#181818] border border-white/10 p-2.5 text-center">
                  <div className="text-[9px] uppercase text-zinc-500 font-bold">Highest Rank</div>
                  <div className="text-sm font-bold text-[#ffc01e] mt-0.5">{contestStats.highestRank !== "n/a" ? `#${contestStats.highestRank.toLocaleString()}` : "n/a"}</div>
                </div>

                <div className="rounded-lg bg-[#181818] border border-white/10 p-2.5 text-center">
                  <div className="text-[9px] uppercase text-zinc-500 font-bold">Median Time</div>
                  <div className="text-sm font-bold text-white mt-0.5">{medianDisplay}</div>
                </div>

                <div className="rounded-lg bg-[#181818] border border-white/10 p-2.5 text-center">
                  <div className="text-[9px] uppercase text-zinc-500 font-bold">Active Month</div>
                  <div className="text-sm font-bold text-white mt-0.5">{contestStats.mostActiveMonth}</div>
                </div>
              </div>
            </section>

            {/* AREA CHART */}
            <div className="rounded-xl border border-white/10 bg-[#222222] p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2 font-mono">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Rating Trajectory</span>
                
                <div className="flex items-center gap-1 bg-[#181818] p-1 rounded-lg border border-white/10">
                  <button onClick={() => setChartRange("all")} className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${chartRange === "all" ? "bg-[#333333] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"}`}>All</button>
                  <button onClick={() => setChartRange("20")} className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${chartRange === "20" ? "bg-[#333333] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"}`}>20</button>
                  <button onClick={() => setChartRange("10")} className={`px-2.5 py-1 rounded text-xs font-mono transition cursor-pointer ${chartRange === "10" ? "bg-[#333333] text-white font-bold" : "text-zinc-400 hover:text-zinc-200"}`}>10</button>
                </div>
              </div>
              
              <div className="h-[145px] w-full mt-2">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#3f3f46" fontSize={8} tickLine={false} />
                      <YAxis domain={['dataMin - 40', 'dataMax + 40']} stroke="#3f3f46" fontSize={8} tickLine={false} />
                      <ChartTooltip 
                        cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeDasharray: "3 3" }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const point = payload[0].payload
                            return (
                              <div className="rounded-lg border border-zinc-700/90 bg-zinc-950/95 p-2.5 text-left shadow-xl backdrop-blur-md font-mono min-w-[150px]">
                                <p className="text-[10px] font-bold text-zinc-100">{point.fullName || point.name}</p>
                                <div className="mt-1.5 pt-1 border-t border-zinc-800 space-y-0.5">
                                  <div className="flex items-center justify-between gap-3 text-[10px]">
                                    <span className="text-zinc-400">Rating</span>
                                    <span className="font-bold text-sky-400">{point.rating}</span>
                                  </div>
                                  {point.delta != null && (
                                    <div className="flex items-center justify-between gap-3 text-[9px]">
                                      <span className="text-zinc-400">Delta</span>
                                      <span className={`font-bold ${point.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                        {point.delta >= 0 ? "+" : ""}{Math.round(point.delta)}
                                      </span>
                                    </div>
                                  )}
                                  {point.rank && (
                                    <div className="flex items-center justify-between gap-3 text-[9px]">
                                      <span className="text-zinc-400">Rank</span>
                                      <span className="font-bold text-zinc-300">#{point.rank.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="rating" 
                        stroke="#38bdf8" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorRating)"
                        activeDot={{ r: 5, stroke: "#38bdf8", strokeWidth: 2, fill: "#09090b" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">No historical contest rating data available.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {activeTab === "history" && (
          <div className="grid gap-3 animate-fadeIn">
            {/* LEETCODE BADGE GUIDE */}
            <div className="rounded-xl border border-white/10 bg-[#222222] p-3 shadow-sm">
              <div 
                className="flex items-center justify-between cursor-pointer select-none" 
                onClick={() => setShowBadgeInfo(!showBadgeInfo)}
              >
                <div className="text-xs font-semibold text-zinc-200">How are LeetCode Contest Badges awarded?</div>
                <button type="button" className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200">
                  {showBadgeInfo ? "Hide ▲" : "Details ▼"}
                </button>
              </div>

              {showBadgeInfo && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2.5 text-[11px] text-zinc-400 leading-relaxed font-sans">
                  {/* REAL KNIGHT BADGE ROW */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30">
                    <div className="flex items-center gap-2.5">
                      <BadgeIcon name="Knight" icon="https://assets.leetcode.com/static_assets/public/images/badges/knight.png" />
                      <div>
                        <div className="font-mono font-bold text-amber-400 text-xs flex items-center gap-1.5">
                          <span>Knight Badge</span>
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">Top 5%</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">Awarded to top 5.0% active contest competitors.</p>
                      </div>
                    </div>

                    {rankingInfo?.topPercentage != null && (
                      <div className="text-right shrink-0 font-mono text-[9.5px]">
                        {rankingInfo.topPercentage <= 5.0 ? (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">UNLOCKED</span>
                        ) : (
                          <span className="text-amber-300 font-bold">{(rankingInfo.topPercentage - 5.0).toFixed(2)}% away</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* REAL GUARDIAN BADGE ROW */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30">
                    <div className="flex items-center gap-2.5">
                      <BadgeIcon name="Guardian" icon="https://assets.leetcode.com/static_assets/public/images/badges/guardian.png" />
                      <div>
                        <div className="font-mono font-bold text-rose-400 text-xs flex items-center gap-1.5">
                          <span>Guardian Badge</span>
                          <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.2 rounded">Top 1%</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">Awarded to top 1.0% elite contest competitors.</p>
                      </div>
                    </div>

                    {rankingInfo?.topPercentage != null && (
                      <div className="text-right shrink-0 font-mono text-[9.5px]">
                        {rankingInfo.topPercentage <= 1.0 ? (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">UNLOCKED</span>
                        ) : (
                          <span className="text-rose-300 font-bold">{(rankingInfo.topPercentage - 1.0).toFixed(2)}% away</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[9.5px] text-zinc-500 pt-1 font-mono">
                    <span>Official LeetCode GraphQL metrics</span>
                    <span>Updated 3–4 days post-contest</span>
                  </div>
                </div>
              )}
            </div>

            {/* SEARCH & FILTER CONTROLS */}
            <div className="grid gap-2 bg-[#222222] p-3 rounded-xl border border-white/10 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search contest name or rank..."
                    className="w-full bg-[#282828] border border-white/10 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/20 font-mono transition"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                      <X size={12} />
                    </button>
                  )}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#282828] border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-white/20 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest_delta">Highest Rating Gain</option>
                  <option value="highest_rank">Best Rank</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono text-xs">
                <button
                  onClick={() => setFilterMode("all")}
                  className={`px-3 py-1 rounded-full border transition cursor-pointer ${
                    filterMode === "all" 
                      ? "bg-[#333333] text-white border-white/20 font-bold shadow-sm" 
                      : "bg-[#181818] text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  All ({attendedContests.length})
                </button>

                <button
                  onClick={() => setFilterMode("gains")}
                  className={`px-3 py-1 rounded-full border transition cursor-pointer ${
                    filterMode === "gains" 
                      ? "bg-emerald-500/20 text-[#00b8a3] border-emerald-500/40 font-bold" 
                      : "bg-[#181818] text-zinc-400 border-white/10 hover:text-[#00b8a3]"
                  }`}
                >
                  Rating Gains (+)
                </button>

                <button
                  onClick={() => setFilterMode("sweeps")}
                  className={`px-3 py-1 rounded-full border transition flex items-center gap-1.5 cursor-pointer ${
                    filterMode === "sweeps" 
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold" 
                      : "bg-[#181818] text-zinc-400 border-white/10 hover:text-rose-400"
                  }`}
                >
                  <CrossedBladesEmblem size={12} color="#fb7185" />
                  <span>ALL KILL (4/4)</span>
                </button>

                <button
                  onClick={() => setFilterMode("milestones")}
                  className={`px-3 py-1 rounded-full border transition cursor-pointer ${
                    filterMode === "milestones" 
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold" 
                      : "bg-[#181818] text-zinc-400 border-white/10 hover:text-purple-400"
                  }`}
                >
                  Milestones
                </button>

                <button
                  onClick={() => setFilterMode("weekly")}
                  className={`px-3 py-1 rounded-full border transition cursor-pointer ${
                    filterMode === "weekly" 
                      ? "bg-sky-500/20 text-[#38bdf8] border-sky-500/40 font-bold" 
                      : "bg-[#181818] text-zinc-400 border-white/10 hover:text-[#38bdf8]"
                  }`}
                >
                  Weekly
                </button>

                <button
                  onClick={() => setFilterMode("biweekly")}
                  className={`px-3 py-1 rounded-full border transition cursor-pointer ${
                    filterMode === "biweekly" 
                      ? "bg-amber-500/20 text-[#ffc01e] border-amber-500/40 font-bold" 
                      : "bg-[#181818] text-zinc-400 border-white/10 hover:text-[#ffc01e]"
                  }`}
                >
                  Biweekly
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
              <span>Showing {filteredContests.length} of {attendedContests.length} Contests</span>
              <span className={`font-semibold ${netRatingGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                Net Rating: {netRatingGain >= 0 ? "+" : ""}{Math.round(netRatingGain)}
              </span>
            </div>

            {/* CONTEST TIMELINE CARDS */}
            <div className="flex flex-col gap-2">
              {filteredContests.length === 0 ? (
                <div className="text-xs text-zinc-500 py-8 text-center border border-dashed border-zinc-800 rounded-xl">
                  No contest history found matching criteria.
                </div>
              ) : (
                filteredContests.map((contest) => {
                  const delta = contest.ratingDelta
                  const attended = contest.attended !== false
                  const milestone = milestoneMap[contest.contestSlug]
                  const localAnalysis = analytics.find(
                    (a) => a.contestSlug?.toLowerCase() === contest.contestSlug?.toLowerCase()
                  )

                  const validPanic = localAnalysis?.panicIndex && localAnalysis.panicIndex.toLowerCase() !== "unknown"
                  const validChoke = localAnalysis?.chokingIndex && localAnalysis.chokingIndex.toLowerCase() !== "unknown"
                  const validStamina = localAnalysis?.staminaDropoff && localAnalysis.staminaDropoff.toLowerCase() !== "unknown"
                  const hasValidSignals = validPanic || validChoke || validStamina

                  const isExpanded = expandedCard === contest.contestSlug
                  const isSweep = contest.problemsSolved === (contest.totalProblems || 4) && (contest.problemsSolved || 0) > 0

                  const mInfo = milestone ? renderMilestoneHeader(milestone) : null
                  const isPredicted = contest.status === "PREDICTED" || contest.status === "PREDICTING"

                    return (
                    <Card 
                      key={contest.contestSlug} 
                      className={`py-3 px-3.5 border transition-all duration-200 ${
                        mInfo 
                          ? mInfo.cardStyle 
                          : isPredicted 
                          ? "border-[#ffa116]/40 bg-[#282828] hover:border-[#ffa116]/70" 
                          : "border-white/[0.08] bg-[#282828] hover:border-white/[0.16] hover:bg-[#303030]"
                      }`}
                    >
                      {mInfo && mInfo.badge}

                      <div className="flex justify-between gap-3 items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <a 
                              href={`https://leetcode.com/contest/${contest.contestSlug}/`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-bold text-xs text-zinc-100 hover:text-[#ffa116] transition truncate flex items-center gap-1"
                            >
                              <span>{contest.contestTitle}</span>
                              <ExternalLink size={10} className="text-zinc-500 opacity-60" />
                            </a>

                            {isPredicted && (
                              <span className="text-[8px] font-mono font-bold uppercase bg-[#ffa116]/15 text-[#ffa116] border border-[#ffa116]/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <span>PREDICTED</span>
                              </span>
                            )}

                            {isSweep && (
                              <span className="text-[9px] font-mono font-bold uppercase bg-rose-950/60 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(244,63,94,0.25)]">
                                <CrossedBladesEmblem size={10} color="#fb7185" />
                                <span>ALL KILL</span>
                              </span>
                            )}

                            {!isSweep && milestone?.type === "peak" && (
                              <span className="text-[9px] font-mono font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                                <Zap size={10} className="text-emerald-400" />
                                <span>PERSONAL BEST</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[10px] text-zinc-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                            {attended ? (
                              <>
                                <span className="text-zinc-300">Rank #{contest.rank?.toLocaleString() ?? "n/a"}</span>
                                <span className="text-zinc-600">•</span>
                                <span className={isSweep ? "text-rose-400 font-semibold" : "text-zinc-300"}>
                                  {contest.problemsSolved ?? "?"}/{contest.totalProblems ?? 4} Solved
                                </span>
                                {contest.finishTimeMinutes != null && (
                                  <>
                                    <span className="text-zinc-600">•</span>
                                    <span className="text-zinc-400">
                                      {Math.floor(contest.finishTimeMinutes)}m
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-zinc-500">Did Not Attend</span>
                            )}
                          </div>

                          {hasValidSignals && (
                            <div className="flex gap-1.5 mt-2 flex-wrap font-mono text-[8px] font-bold">
                              {validPanic && (
                                <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.panicIndex)}`}>
                                  PANIC: {localAnalysis.panicIndex!.toUpperCase()}
                                </span>
                              )}
                              {validChoke && (
                                <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.chokingIndex)}`}>
                                  CHOKE: {localAnalysis.chokingIndex!.toUpperCase()}
                                </span>
                              )}
                              {validStamina && (
                                <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.staminaDropoff)}`}>
                                  STAMINA: {localAnalysis.staminaDropoff!.toUpperCase()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`font-bold text-xs font-mono tabular-nums ${
                            !attended ? "text-zinc-500" : delta == null ? "text-zinc-500" : delta >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {attended ? deltaText(contest) : "0 (Unchanged)"}
                          </div>
                          
                          <div className={`text-[9px] mt-1 font-semibold font-mono ${
                            !attended ? "text-zinc-500" : contest.status === "FINALIZED" ? "text-emerald-500/90" : isPredicted ? "text-amber-400 font-bold" : "text-zinc-500"
                          }`}>
                            {statusText(contest)}
                          </div>

                          <button
                            onClick={() => setExpandedCard(isExpanded ? null : contest.contestSlug)}
                            className="mt-1 text-[9px] font-mono text-zinc-500 hover:text-zinc-300 transition flex items-center justify-end gap-0.5"
                          >
                            <span>{isExpanded ? "Less ▲" : "Details ▼"}</span>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 grid gap-2 text-[10px] font-mono text-zinc-400">
                          <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                            <div>
                              <span className="text-zinc-500 block text-[8px] uppercase">Rating Before</span>
                              <span className="text-zinc-200 font-bold">{contest.ratingBefore ? Math.round(contest.ratingBefore) : "1500"}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[8px] uppercase">{isPredicted ? "Est. Rating After" : "Rating After"}</span>
                              <span className={`font-bold ${isPredicted ? "text-sky-300" : "text-zinc-200"}`}>
                                {contest.ratingAfter ? Math.round(contest.ratingAfter) : contest.predictedRating ? `${Math.round(contest.predictedRating)} (Est.)` : "n/a"}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[8px] uppercase">Contest Date</span>
                              <span className="text-zinc-300">
                                {contest.contestDate ? new Date(contest.contestDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "n/a"}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block text-[8px] uppercase">{isPredicted ? "Prediction Source" : "Finish Time"}</span>
                              <span className="text-zinc-300">
                                {isPredicted 
                                  ? (contest.source === "ENTRANTHUB" ? "EntrantHub Live API" : "Elo Engine") 
                                  : (contest.finishTimeMinutes != null ? `${Math.round(contest.finishTimeMinutes)} mins` : "n/a")}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        )}

        {data[0]?.refreshedAt && (
          <div className="text-[9px] text-zinc-600 text-right mt-1 font-mono">
            Refreshed {new Date(data[0].refreshedAt).toLocaleString()}
          </div>
        )}
      </>}
    </div>
  )
}
