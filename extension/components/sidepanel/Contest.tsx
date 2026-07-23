import { useEffect, useState, useMemo } from "react"
import { RefreshCw, ExternalLink } from "lucide-react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"
import { getUsername, setCachedContests, getContestSnapshot, setContestSnapshot } from "../../lib/storage"
import { loadContestLifecycle, type ContestLifecycleItem } from "../../lib/contest-lifecycle"

import { UpcomingContests } from "./UpcomingContests"
import { AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts"

function deltaText(contest: ContestLifecycleItem) {
  if (contest.attended === false) return "Unchanged"
  const delta = contest.ratingDelta;
  const rating = contest.ratingAfter;
  if (delta == null) {
    if (contest.status === "FINALIZED" && rating != null) return `${Math.round(rating)} official`
    return "Pending"
  }
  return `${rating == null ? "" : `${Math.round(rating)} `}(${delta >= 0 ? "+" : ""}${Math.round(delta)})`
}

function statusText(contest: ContestLifecycleItem) {
  if (contest.attended === false) return "DID NOT ATTEND"
  if (contest.status === "FINALIZED") return "OFFICIAL"
  return "UNOFFICIAL"
}

function getMetricBadgeColor(val: string) {
  if (val === "High") return "bg-red-500/10 border-red-500/20 text-red-400"
  if (val === "Medium") return "bg-amber-500/10 border-amber-500/20 text-amber-400"
  if (val === "Low") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  return "bg-zinc-900 border-zinc-800 text-zinc-500"
}

interface UserProfile { realName?: string; userAvatar?: string; reputation?: number; ranking?: number; }
interface RankingInfo { rating?: number; attendedContestsCount?: number; topPercentage?: number; globalRanking?: number; }
interface RankingHistory { contest?: { title?: string; startTime?: number; }; rating?: number; }
interface ContestAnalytics { contest?: { title?: string; }; rating?: number; }

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

  const refresh = async (forcePredictRefresh = false) => {
    setLoading(true)
    setError("")
    try {
      const username = await getUsername()
      if (!username) throw new Error("Set your LeetCode username in Settings")
      setUsernameState(username)

      const [lifecycle, profileRes, rankingRes, localAnalytics] = await Promise.all([
        loadContestLifecycle(username),
        new Promise<any>((resolve) => chrome.runtime.sendMessage({ action: "get_user_profile", payload: { username } }, (res) => {
          if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
          resolve(res);
        })),
        new Promise<any>((resolve) => chrome.runtime.sendMessage({ action: "get_user_contest_history", payload: { username } }, (res) => {
          if (chrome.runtime.lastError) console.error(chrome.runtime.lastError);
          resolve(res);
        })),
        fetchContests().catch(() => [])
      ])

      setData(lifecycle)
      let resolvedProfile = null
      if (profileRes?.ok) {
        resolvedProfile = profileRes.data?.matchedUser?.profile || null
        setProfile(resolvedProfile)
      }
      let resolvedRankingInfo = null
      let resolvedRankingHistory: any[] = []
      if (rankingRes?.ok) {
        resolvedRankingInfo = rankingRes.data?.userContestRanking || null
        resolvedRankingHistory = rankingRes.data?.userContestRankingHistory || []
        setRankingInfo(resolvedRankingInfo)
        setRankingHistory(resolvedRankingHistory)
      }
      setAnalytics(localAnalytics)
      await setCachedContests(lifecycle as any)

      // Save snapshot of all loaded data
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
    // Load snapshot immediately
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
    const interval = window.setInterval(() => void refresh(false), 2 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  const timed = data.filter((contest) => contest.finishTimeMinutes != null)
  const avgFinish = timed.length
    ? Math.round(timed.reduce((sum, contest) => sum + contest.finishTimeMinutes!, 0) / timed.length)
    : null

  const latestAnalytics = analytics[0]

  // Statistics & chart memoized calculations
  const peakRating = useMemo(() => {
    if (!data.length) return 1500
    const ratings = data.map((c) => c.ratingAfter || 0).filter(Boolean)
    return ratings.length ? Math.max(...ratings) : 1500
  }, [data])

  const avgDelta = useMemo(() => {
    if (!rankingInfo || !rankingInfo.attendedContestsCount) return 0
    return (rankingInfo.rating - 1500) / rankingInfo.attendedContestsCount
  }, [rankingInfo])

  const contestStats = useMemo(() => {
    const attended = rankingHistory.filter(c => c.attended);
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
      };
    }

    let totalSolved = 0;
    let maxRating = 1500;
    let highestRank = Infinity;
    let lowestRank = -Infinity;
    let allKilled = 0;
    let threeSolved = 0;
    let twoSolved = 0;
    let oneSolved = 0;
    let noneSolved = 0;

    const monthCounts: Record<string, number> = {};

    attended.forEach(c => {
      totalSolved += c.problemsSolved || 0;
      if (c.rating > maxRating) maxRating = c.rating;
      if (c.ranking && c.ranking > 0) {
        if (c.ranking < highestRank) highestRank = c.ranking;
        if (c.ranking > lowestRank) lowestRank = c.ranking;
      }
      
      const solved = c.problemsSolved || 0;
      const total = c.totalProblems || 4; // default LeetCode total is 4
      if (solved === total && total > 0) allKilled++;
      else if (solved === 3) threeSolved++;
      else if (solved === 2) twoSolved++;
      else if (solved === 1) oneSolved++;
      else if (solved === 0) noneSolved++;

      if (c.contest?.startTime) {
        const date = new Date(c.contest.startTime * 1000);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthLabel = `${months[date.getMonth()]}, ${String(date.getFullYear()).substring(2)}`;
        monthCounts[monthLabel] = (monthCounts[monthLabel] || 0) + 1;
      }
    });

    let mostActiveMonth = "n/a";
    let maxMonthCount = 0;
    Object.entries(monthCounts).forEach(([month, count]) => {
      if (count > maxMonthCount) {
        maxMonthCount = count;
        mostActiveMonth = month;
      }
    });

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
    };
  }, [rankingHistory]);

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

  const chartData = useMemo(() => {
    return data
      .filter((c) => c.status === "FINALIZED" && c.ratingAfter != null && c.attended === true)
      .map((c) => ({
        name: c.contestTitle.replace("Weekly Contest ", "W").replace("Biweekly Contest ", "B"),
        fullName: c.contestTitle,
        rating: Math.round(c.ratingAfter!),
        rank: c.rank,
        delta: c.ratingDelta,
        solved: `${c.problemsSolved ?? "?"}/${c.totalProblems ?? 4}`
      }))
      .reverse() // Chronological order
  }, [data])

  const [showBadgeInfo, setShowBadgeInfo] = useState(false)

  // Compute contest milestones (chronological order)
  const milestoneMap = useMemo(() => {
    const map: Record<string, { type: "knight" | "guardian" | "first" | "peak" | "sweep"; label: string }> = {}
    const finalized = data.filter((c) => c.status === "FINALIZED" && c.attended === true && c.ratingAfter != null)
    if (!finalized.length) return map

    // Oldest to newest
    const chron = [...finalized].reverse()
    
    let passedKnight = false
    let passedGuardian = false
    let maxRatingSoFar = 0

    chron.forEach((c, idx) => {
      const slug = c.contestSlug
      const rating = Math.round(c.ratingAfter || 0)

      if (idx === 0) {
        map[slug] = { type: "first", label: "First Contest Attended" }
      }

      // Accurate LeetCode thresholds: Knight = Top 25% (~1850+), Guardian = Top 5% (~2180+)
      if (!passedKnight && rating >= 1850) {
        passedKnight = true
        map[slug] = { type: "knight", label: "Knight Title Unlocked (Top 25% · 1850+ Rating)" }
      }

      if (!passedGuardian && rating >= 2180) {
        passedGuardian = true
        map[slug] = { type: "guardian", label: "Guardian Title Unlocked (Top 5% · 2180+ Rating)" }
      }

      if (rating > maxRatingSoFar && idx > 0) {
        maxRatingSoFar = rating
        if (!map[slug]) {
          map[slug] = { type: "peak", label: `Personal Best Rating (${rating})` }
        }
      }

      if (c.problemsSolved === (c.totalProblems || 4) && c.problemsSolved > 0) {
        if (!map[slug]) {
          map[slug] = { type: "sweep", label: "Full Sweep (4/4 Solved)" }
        }
      }
    })

    return map
  }, [data])

  // Filter display list
  const filteredContests = useMemo(() => {
    if (activeTab === "history") {
      return data.filter((contest) => contest.status === "FINALIZED" && contest.attended === true)
    }
    return []
  }, [data, activeTab])

  return (
    <div className="grid gap-3.5">
      <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
        <button onClick={() => setActiveTab("stats")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${activeTab === "stats" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>Stats</button>
        <button onClick={() => setActiveTab("history")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${activeTab === "history" ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>History</button>
        <button onClick={() => setActiveTab("upcoming")} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all ${activeTab === "upcoming" ? "bg-zinc-800 text-emerald-400 shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}>Upcoming</button>
      </div>

      {activeTab === "upcoming" ? <UpcomingContests /> : <>
        <div className="flex justify-end -mb-2">
          <button onClick={() => void refresh(true)} disabled={loading} title="Refresh contest data" className="p-1.5 text-zinc-500 hover:text-zinc-200 disabled:opacity-40">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {error && <div className="text-xs text-red-400 border border-red-900/50 bg-red-950/20 p-3 rounded-md">{error}</div>}

        {activeTab === "stats" && (
          <div className="grid gap-3.5 animate-fadeIn">
            {/* ═══════════ HERO PROFILE CARD WITH ACCURATE BADGES ═══════════ */}
            {(() => {
              const currentRating = Math.round(rankingInfo?.rating || 1500)
              
              // Accurate LeetCode Badge Thresholds: Guardian >= 2180, Knight >= 1850
              const badge = currentRating >= 2180
                ? { name: "Guardian", color: "#f43f5e", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.25)" }
                : currentRating >= 1850 
                  ? { name: "Knight", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" }
                  : { name: "Contender", color: "#38bdf8", bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.25)" }

              return (
                <section className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 shadow-lg">
                  <div className="relative flex items-center gap-3.5">
                    <img 
                      src={profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg"} 
                      className="w-12 h-12 rounded-xl border border-zinc-800 bg-zinc-950 object-cover shadow-sm shrink-0" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://assets.leetcode.com/users/default_avatar.jpg"
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-100 truncate">{profile?.realName || username || "LeetCode Coder"}</span>
                        <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">{profile?.countryCode || "US"}</span>
                        {username && (
                          <a href={`https://leetcode.com/${username}/`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-200 transition">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-zinc-400 font-mono">@{username || "username"}</span>
                        <span className="rounded-md px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider" style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {badge.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )
            })()}

            {/* ═══════════ PRIMARY HERO METRICS ═══════════ */}
            <div className="grid grid-cols-2 gap-2.5">
              <Card className="p-3.5 bg-zinc-950/50 border-zinc-800/80">
                <div className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Rating</div>
                <div className="text-2xl font-bold text-blue-400 font-mono mt-1 tabular-nums">
                  {Math.round(rankingInfo?.rating || 1500)}
                </div>
                <div className="mt-1 text-[9px] font-mono text-zinc-400">
                  {rankingInfo?.topPercentage != null ? `Top ${rankingInfo.topPercentage.toFixed(2)}% globally` : "Unrated"}
                </div>
              </Card>

              <Card className="p-3.5 bg-zinc-950/50 border-zinc-800/80">
                <div className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Global Rank</div>
                <div className="text-2xl font-bold text-zinc-100 font-mono mt-1 tabular-nums">
                  {rankingInfo?.globalRanking ? `#${rankingInfo.globalRanking.toLocaleString()}` : "n/a"}
                </div>
                <div className="mt-1 text-[9px] font-mono text-zinc-400">
                  Across {rankingInfo?.attendedContestsCount || 0} contests
                </div>
              </Card>

              <Card className="p-3.5 bg-zinc-950/50 border-zinc-800/80">
                <div className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Peak Rating</div>
                <div className="text-2xl font-bold text-amber-400 font-mono mt-1 tabular-nums">
                  {Math.round(peakRating)}
                </div>
                <div className="mt-1 text-[9px] font-mono text-zinc-400">
                  Max rating achieved
                </div>
              </Card>

              <Card className="p-3.5 bg-zinc-950/50 border-zinc-800/80">
                <div className="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-wider">Avg Rating Delta</div>
                <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${avgDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {avgDelta >= 0 ? "+" : ""}{avgDelta.toFixed(1)}
                </div>
                <div className="mt-1 text-[9px] font-mono text-zinc-400">
                  Per attended contest
                </div>
              </Card>
            </div>

            {/* ═══════════ SOLVE DISTRIBUTION WITH SLEEK HOVER TOOLTIPS ═══════════ */}
            <section className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">Solve Breakdown</span>
                <span className="text-[9px] font-mono text-zinc-500">{rankingInfo?.attendedContestsCount || 0} Contests</span>
              </div>

              {(() => {
                const total = rankingHistory.filter(c => c.attended).length || 1
                const pAll = Math.round((contestStats.allKilled / total) * 100)
                const p3 = Math.round((contestStats.threeSolved / total) * 100)
                const p2 = Math.round((contestStats.twoSolved / total) * 100)
                const p1 = Math.round((contestStats.oneSolved / total) * 100)
                const p0 = Math.max(0, 100 - (pAll + p3 + p2 + p1))

                return (
                  <div className="space-y-2.5">
                    {/* Stacked Progress Bar with Interactive Hover Tooltips */}
                    <div className="h-2 w-full flex overflow-hidden rounded-full bg-zinc-900 border border-zinc-800">
                      {pAll > 0 && (
                        <div 
                          style={{ width: `${pAll}%` }} 
                          className="group relative bg-emerald-400 cursor-help"
                        >
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold text-emerald-300 font-mono">Full Sweep (4/4 Solved)</p>
                              <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                                Solved all 4 problems in {contestStats.allKilled} contest{contestStats.allKilled !== 1 ? "s" : ""} ({pAll}% of total).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {p3 > 0 && (
                        <div 
                          style={{ width: `${p3}%` }} 
                          className="group relative bg-sky-400 cursor-help"
                        >
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold text-sky-300 font-mono">3/4 Problems Solved</p>
                              <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                                Solved Q1, Q2 & Q3 in {contestStats.threeSolved} contest{contestStats.threeSolved !== 1 ? "s" : ""} ({p3}% of total).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {p2 > 0 && (
                        <div 
                          style={{ width: `${p2}%` }} 
                          className="group relative bg-amber-400 cursor-help"
                        >
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold text-amber-300 font-mono">Half Solved (2/4)</p>
                              <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                                Solved Q1 & Q2 in {contestStats.twoSolved} contest{contestStats.twoSolved !== 1 ? "s" : ""} ({p2}% of total).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {p1 > 0 && (
                        <div 
                          style={{ width: `${p1}%` }} 
                          className="group relative bg-zinc-500 cursor-help"
                        >
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold text-zinc-300 font-mono">1/4 Problem Solved</p>
                              <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                                Solved Q1 in {contestStats.oneSolved} contest{contestStats.oneSolved !== 1 ? "s" : ""} ({p1}% of total).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {p0 > 0 && (
                        <div 
                          style={{ width: `${p0}%` }} 
                          className="group relative bg-rose-500/80 cursor-help"
                        >
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                            <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                              <p className="text-[10px] font-bold text-rose-300 font-mono">0 Problems Solved</p>
                              <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                                Contests with no accepted submissions ({p0}% of total).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5 Interactive Solve-Rate Chips */}
                    <div className="grid grid-cols-5 gap-1 pt-1 text-center font-mono">
                      
                      <div className="group relative rounded bg-zinc-900/60 border border-zinc-800 p-1 hover:border-emerald-500/40 transition cursor-help">
                        <div className="text-[7.5px] uppercase font-bold text-emerald-400">4 Solved</div>
                        <div className="text-xs font-bold text-zinc-100">{contestStats.allKilled}x</div>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                          <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold text-emerald-300 font-mono">Full Sweep (4/4 Solved)</p>
                            <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                              Achieved in {contestStats.allKilled} contest{contestStats.allKilled !== 1 ? "s" : ""} ({pAll}% rate).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative rounded bg-zinc-900/60 border border-zinc-800 p-1 hover:border-sky-500/40 transition cursor-help">
                        <div className="text-[7.5px] uppercase font-bold text-sky-400">3 Solved</div>
                        <div className="text-xs font-bold text-zinc-100">{contestStats.threeSolved}x</div>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                          <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold text-sky-300 font-mono">3/4 Problems Solved</p>
                            <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                              Achieved in {contestStats.threeSolved} contest{contestStats.threeSolved !== 1 ? "s" : ""} ({p3}% rate).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative rounded bg-zinc-900/60 border border-zinc-800 p-1 hover:border-amber-500/40 transition cursor-help">
                        <div className="text-[7.5px] uppercase font-bold text-amber-400">2 Solved</div>
                        <div className="text-xs font-bold text-zinc-100">{contestStats.twoSolved}x</div>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                          <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold text-amber-300 font-mono">Half Solved (2/4)</p>
                            <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                              Achieved in {contestStats.twoSolved} contest{contestStats.twoSolved !== 1 ? "s" : ""} ({p2}% rate).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative rounded bg-zinc-900/60 border border-zinc-800 p-1 hover:border-zinc-500/40 transition cursor-help">
                        <div className="text-[7.5px] uppercase font-bold text-zinc-400">1 Solved</div>
                        <div className="text-xs font-bold text-zinc-100">{contestStats.oneSolved}x</div>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                          <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold text-zinc-300 font-mono">1/4 Problem Solved</p>
                            <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                              Achieved in {contestStats.oneSolved} contest{contestStats.oneSolved !== 1 ? "s" : ""} ({p1}% rate).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="group relative rounded bg-zinc-900/60 border border-zinc-800 p-1 hover:border-rose-500/40 transition cursor-help">
                        <div className="text-[7.5px] uppercase font-bold text-rose-400">0 Solved</div>
                        <div className="text-xs font-bold text-zinc-100">{contestStats.noneSolved}x</div>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                          <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                            <p className="text-[10px] font-bold text-rose-300 font-mono">0 Problems Solved</p>
                            <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                              Occurred in {contestStats.noneSolved} contest{contestStats.noneSolved !== 1 ? "s" : ""} ({p0}% rate).
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })()}

              {/* 3 Secondary Milestone Cards with Tooltips */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 font-mono">
                
                <div className="group relative rounded-lg bg-zinc-900/40 border border-zinc-800/60 p-2 text-center hover:border-amber-500/40 transition cursor-help">
                  <div className="text-[8px] uppercase text-zinc-500 font-bold">Highest Rank</div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">{contestStats.highestRank !== "n/a" ? `#${contestStats.highestRank.toLocaleString()}` : "n/a"}</div>
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                    <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-amber-300 font-mono">Best Global Rank</p>
                      <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                        Your highest finish in an official LeetCode contest to date.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group relative rounded-lg bg-zinc-900/40 border border-zinc-800/60 p-2 text-center hover:border-zinc-600 transition cursor-help">
                  <div className="text-[8px] uppercase text-zinc-500 font-bold">Median Time</div>
                  <div className="text-xs font-bold text-zinc-200 mt-0.5">{medianDisplay}</div>
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                    <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-zinc-200 font-mono">Median Completion Time</p>
                      <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                        The median time you take to finish your submissions in a contest.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group relative rounded-lg bg-zinc-900/40 border border-zinc-800/60 p-2 text-center hover:border-zinc-600 transition cursor-help">
                  <div className="text-[8px] uppercase text-zinc-500 font-bold">Active Month</div>
                  <div className="text-xs font-bold text-zinc-200 mt-0.5">{contestStats.mostActiveMonth}</div>
                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                    <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2 text-left shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-zinc-200 font-mono">Peak Activity Month</p>
                      <p className="mt-0.5 text-[9px] text-zinc-400 font-sans leading-tight">
                        The calendar month in which you attended the most official contests.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* ═══════════ AREA CHART WITH INTERACTIVE HOVER & TOOLTIP ═══════════ */}
            <Card className="p-4 bg-zinc-950/40 border-zinc-800/80">
              <div className="flex items-center justify-between mb-1">
                <div className="group relative flex items-center gap-1.5 cursor-help">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">Rating Trajectory</span>
                  <span className="text-[9px] font-mono text-zinc-500 border border-zinc-800 rounded px-1 hover:border-zinc-600 transition">ⓘ</span>
                  
                  {/* Header Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1 z-30">
                    <div className="rounded-lg border border-zinc-700/80 bg-zinc-950/95 p-2.5 text-left shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-blue-400 font-mono">Rating Trajectory Graph</p>
                      <p className="mt-1 text-[9px] text-zinc-400 font-sans leading-tight">
                        Tracks your official rating progression over time across all attended contests. Upward slopes reflect rating gains from strong finishes.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-zinc-500">{chartData.length} Contests Tracked</div>
              </div>
              
              <div className="h-[145px] w-full mt-2">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#3f3f46" fontSize={8} tickLine={false} />
                      <YAxis domain={['dataMin - 40', 'dataMax + 40']} stroke="#3f3f46" fontSize={8} tickLine={false} />
                      <ChartTooltip 
                        cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "3 3" }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const point = payload[0].payload
                            return (
                              <div className="rounded-lg border border-zinc-700/90 bg-zinc-950/95 p-2.5 text-left shadow-2xl backdrop-blur-md font-mono min-w-[150px]">
                                <p className="text-[10px] font-bold text-zinc-100">{point.fullName || point.name}</p>
                                <div className="mt-1.5 pt-1 border-t border-zinc-800 space-y-0.5">
                                  <div className="flex items-center justify-between gap-3 text-[10px]">
                                    <span className="text-zinc-400">Rating</span>
                                    <span className="font-bold text-blue-400">{point.rating}</span>
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
                                  {point.solved && (
                                    <div className="flex items-center justify-between gap-3 text-[9px]">
                                      <span className="text-zinc-400">Solved</span>
                                      <span className="font-bold text-zinc-300">{point.solved}</span>
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
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        fillOpacity={1} 
                        fill="url(#colorRating)"
                        activeDot={{ r: 5, stroke: "#3b82f6", strokeWidth: 2, fill: "#09090b" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">No historical contest rating data available.</div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ═══════════ HISTORY TAB ═══════════ */}
        {activeTab === "history" && (
          <div className="grid gap-3.5 animate-fadeIn">
            
            {/* Clean Accordion Guide */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowBadgeInfo(!showBadgeInfo)}>
                <div className="text-xs font-semibold text-zinc-200">How are LeetCode Contest Badges awarded?</div>
                <button type="button" className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200">
                  {showBadgeInfo ? "Hide ▲" : "Details ▼"}
                </button>
              </div>

              {showBadgeInfo && (
                <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 text-[11px] text-zinc-400 leading-relaxed font-sans">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-mono font-bold shrink-0">Knight:</span>
                    <span>Top <strong>25%</strong> of active contest participants (~<strong>1850+ rating</strong>).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-400 font-mono font-bold shrink-0">Guardian:</span>
                    <span>Top <strong>5%</strong> of active contest participants (~<strong>2180+ rating</strong>).</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 pt-1 font-mono">LeetCode updates official badge records 3–4 days after rating calculation.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-wider">Contest Timeline</h3>
              <span className="text-[9px] font-mono text-zinc-500">{filteredContests.length} Contests</span>
            </div>

            <div className="flex flex-col gap-2">
              {filteredContests.length === 0 && <div className="text-xs text-zinc-500 py-6 text-center border border-dashed border-zinc-800 rounded-xl">No finalized contest history found.</div>}
              
              {filteredContests.map((contest) => {
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

                return (
                  <Card 
                    key={contest.contestSlug} 
                    className={`py-3 px-3.5 border transition-all duration-200 ${
                      milestone 
                        ? "border-amber-500/30 bg-zinc-950" 
                        : "border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700/80"
                    }`}
                  >
                    {milestone && (
                      <div className="mb-2 flex items-center gap-1.5 text-[9px] font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded w-fit">
                        <span>{milestone.label}</span>
                      </div>
                    )}

                    <div className="flex justify-between gap-3 items-start">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-zinc-100 truncate">{contest.contestTitle}</div>
                        
                        <div className="text-[10px] text-zinc-400 font-mono mt-1 flex items-center gap-2">
                          {attended ? (
                            <>
                              <span className="text-zinc-300">Rank #{contest.rank?.toLocaleString() ?? "n/a"}</span>
                              <span className="text-zinc-600">•</span>
                              <span>{contest.problemsSolved ?? "?"}/{contest.totalProblems ?? "?"} Solved</span>
                            </>
                          ) : (
                            <span className="text-zinc-500">Did Not Attend</span>
                          )}
                        </div>

                        {hasValidSignals && (
                          <div className="flex gap-1.5 mt-2 flex-wrap font-mono text-[8px] font-bold">
                            {validPanic && (
                              <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.panicIndex!)}`}>
                                PANIC: {localAnalysis.panicIndex!.toUpperCase()}
                              </span>
                            )}
                            {validChoke && (
                              <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.chokingIndex!)}`}>
                                CHOKE: {localAnalysis.chokingIndex!.toUpperCase()}
                              </span>
                            )}
                            {validStamina && (
                              <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.staminaDropoff!)}`}>
                                STAMINA: {localAnalysis.staminaDropoff!.toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-bold text-xs font-mono tabular-nums ${!attended ? "text-zinc-500" : delta == null ? "text-zinc-500" : delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {attended ? deltaText(contest) : "0 (Unchanged)"}
                        </div>
                        <div className={`text-[9px] mt-1 font-semibold font-mono ${!attended ? "text-zinc-500" : contest.status === "FINALIZED" ? "text-emerald-500/90" : "text-zinc-500"}`}>
                          {statusText(contest)}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        {data[0]?.refreshedAt && <div className="text-[9px] text-zinc-600 text-right mt-1.5">Refreshed {new Date(data[0].refreshedAt).toLocaleString()}</div>}
      </>}
    </div>
  )
}
