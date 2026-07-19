import { useEffect, useState, useMemo } from "react"
import { RefreshCw, ExternalLink } from "lucide-react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"
import { getUsername, setCachedContests, getContestSnapshot, setContestSnapshot } from "../../lib/storage"
import { loadContestLifecycle, type ContestLifecycleItem } from "../../lib/contest-lifecycle"
import { getPredictedContests, type PredictedContest, type PredictedContestResult } from "../../lib/predicted-contests"
import { UpcomingContests } from "./UpcomingContests"
import { AreaChart, Area, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from "recharts"

function deltaText(contest: ContestLifecycleItem) {
  if (contest.attended === false) return "Unchanged"
  const delta = contest.status === "FINALIZED" ? contest.ratingDelta : contest.predictedDelta
  const rating = contest.status === "FINALIZED" ? contest.ratingAfter : contest.predictedRating
  if (delta == null) {
    if (contest.status === "FINALIZED" && rating != null) return `${Math.round(rating)} official`
    return contest.predictionError ? "Source blocked" : "Pending"
  }
  return `${rating == null ? "" : `${Math.round(rating)} `}(${delta >= 0 ? "+" : ""}${Math.round(delta)})`
}

function statusText(contest: ContestLifecycleItem) {
  if (contest.attended === false) return "DID NOT ATTEND"
  if (contest.status === "FINALIZED") return "OFFICIAL"
  if (contest.status === "PREDICTED") return "ENTRANTHUB PREDICTION"
  if (contest.predictionError) return "ENTRANTHUB UNAVAILABLE"
  return "PREDICTION PENDING"
}

function getMetricBadgeColor(val: string) {
  if (val === "High") return "bg-red-500/10 border-red-500/20 text-red-400"
  if (val === "Medium") return "bg-amber-500/10 border-amber-500/20 text-amber-400"
  if (val === "Low") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  return "bg-zinc-900 border-zinc-800 text-zinc-500"
}

export const Contest = () => {
  const [activeTab, setActiveTab] = useState<"stats" | "history" | "upcoming">("stats")
  const [data, setData] = useState<ContestLifecycleItem[]>([])
  const [predictedResult, setPredictedResult] = useState<PredictedContestResult | null>(null)
  const [loadingPredicted, setLoadingPredicted] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [rankingInfo, setRankingInfo] = useState<any>(null)
  const [rankingHistory, setRankingHistory] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any[]>([])
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

      // Stage 1 Log
      console.log("Contest.tsx: getPredictedContests input details:", { username, region: "US", forceRefresh: forcePredictRefresh })

      setLoadingPredicted(true)
      getPredictedContests({ username, region: "US", forceRefresh: forcePredictRefresh })
        .then(async (result) => {
          // Stage 1 Log (result)
          console.log("Contest.tsx: getPredictedContests result returned:", result)

          setPredictedResult(result)
          
          // Save to snapshot
          const currentSnapshot = await getContestSnapshot() || {}
          await setContestSnapshot({
            ...currentSnapshot,
            predictedResult: result
          })

          // Stage 5 Log
          console.log("Contest.tsx: setPredictedResult complete:", { result, length: result?.contests?.length })
        })
        .catch((err) => {
          console.warn("Predicted contests query failed:", err)
        })
        .finally(() => {
          setLoadingPredicted(false)
        })

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
        analytics: localAnalytics,
        predictedResult: predictedResult
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
        if (snapshot.predictedResult) setPredictedResult(snapshot.predictedResult)
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
  const pendingCount = predictedResult?.contests?.length || 0
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
        rating: Math.round(c.ratingAfter!)
      }))
      .reverse() // Chronological order
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
            {/* Avatar / Profile Info header */}
            <div className="flex items-center gap-3.5 bg-zinc-900/40 p-4 border border-zinc-800 rounded-lg">
              <img 
                src={profile?.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg"} 
                className="w-12 h-12 rounded-lg border border-zinc-800 bg-zinc-950" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://assets.leetcode.com/users/default_avatar.jpg"
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-zinc-200 truncate">{profile?.realName || username || "LeetCode Coder"}</span>
                  <span className="text-[8px] bg-emerald-950/30 text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded font-mono font-bold uppercase">{profile?.countryCode || "US"}</span>
                  {username && (
                    <a href={`https://leetcode.com/${username}/`} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300">
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">@{username || "username"}</div>
              </div>
            </div>

            {/* Custom LeetCode Profile Statistics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3 bg-zinc-950/25 border-zinc-900">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Rating</div>
                <div className="text-lg font-extrabold text-blue-400 font-mono mt-1">{Math.round(rankingInfo?.rating || 1500)}</div>
              </Card>
              <Card className="p-3 bg-zinc-950/25 border-zinc-900">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Rank</div>
                <div className="text-lg font-extrabold text-zinc-200 font-mono mt-1">#{rankingInfo?.globalRanking?.toLocaleString() || "n/a"}</div>
              </Card>
              <Card className="p-3 bg-zinc-950/25 border-zinc-900">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Contests</div>
                <div className="text-lg font-extrabold text-zinc-200 font-mono mt-1">{rankingInfo?.attendedContestsCount || 0}</div>
              </Card>
              <Card className="p-3 bg-zinc-950/25 border-zinc-900">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Peak Rating</div>
                <div className="text-lg font-extrabold text-blue-400 font-mono mt-1">{peakRating}</div>
              </Card>
              <Card className="p-3 bg-zinc-950/25 border-zinc-900">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Avg Δ</div>
                <div className={`text-lg font-extrabold font-mono mt-1 ${avgDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {avgDelta >= 0 ? "+" : ""}{avgDelta.toFixed(1)}
                </div>
              </Card>
              <Card className="p-3 bg-zinc-950/25 border-zinc-900">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Median Time</div>
                <div className="text-lg font-extrabold text-zinc-200 font-mono mt-1">{medianDisplay}</div>
              </Card>
              <Card className="p-3 bg-zinc-950/25 border-zinc-900 col-span-2">
                <div className="text-[9px] uppercase text-zinc-500 font-bold font-mono">Top Percentage</div>
                <div className="text-lg font-extrabold text-amber-400 font-mono mt-1">{rankingInfo?.topPercentage != null ? `${rankingInfo.topPercentage.toFixed(2)}%` : "n/a"}</div>
              </Card>
            </div>

            {/* Extended Analytics Grid */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold">Avg Solved</div>
                <div className="text-xs font-extrabold text-zinc-200 mt-0.5">{contestStats.avgSolved.toFixed(2)}</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold">Highest Rank</div>
                <div className="text-xs font-extrabold text-[#dfa054] mt-0.5">{contestStats.highestRank !== "n/a" ? `#${contestStats.highestRank.toLocaleString()}` : "n/a"}</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold">Lowest Rank</div>
                <div className="text-xs font-extrabold text-zinc-400 mt-0.5">{contestStats.lowestRank !== "n/a" ? `#${contestStats.lowestRank.toLocaleString()}` : "n/a"}</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold">Active Month</div>
                <div className="text-xs font-extrabold text-zinc-200 mt-0.5">{contestStats.mostActiveMonth}</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold">All Killed</div>
                <div className="text-xs font-extrabold text-emerald-400 mt-0.5">{contestStats.allKilled}x</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold">3 Solved</div>
                <div className="text-xs font-extrabold text-blue-400 mt-0.5">{contestStats.threeSolved}x</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold font-mono">Half Solved</div>
                <div className="text-xs font-extrabold text-amber-500 mt-0.5">{contestStats.twoSolved}x</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold font-mono">1 Solved</div>
                <div className="text-xs font-extrabold text-zinc-400 mt-0.5">{contestStats.oneSolved}x</div>
              </Card>
              <Card className="p-2 bg-zinc-950/25 border-zinc-900 text-center font-mono">
                <div className="text-[7.5px] uppercase text-zinc-500 font-bold font-mono">0 Solved</div>
                <div className="text-xs font-extrabold text-red-400 mt-0.5">{contestStats.noneSolved}x</div>
              </Card>
            </div>

            {/* Area Chart: Rating History */}
            <Card className="p-4 bg-zinc-950/15 border-zinc-900">
              <div className="text-[9px] uppercase font-bold text-zinc-400 font-mono mb-2">Rating History</div>
              <div className="text-[9px] text-zinc-600 font-sans mb-3 -mt-1">Rating progression across contests. Hover for details.</div>
              <div className="h-[150px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#27272a" fontSize={7} tickLine={false} />
                      <YAxis domain={['dataMin - 100', 'dataMax + 100']} stroke="#27272a" fontSize={7} tickLine={false} />
                      <ChartTooltip 
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#18181b", fontSize: "9px", fontFamily: "monospace", color: "#d4d4d8" }}
                        labelStyle={{ color: "#71717a" }}
                      />
                      <Area type="monotone" dataKey="rating" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRating)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">No historical contest rating data available.</div>
                )}
              </div>
            </Card>

            {/* Predicted Contests */}
            <div className="grid gap-3">
              <Card className="p-3.5 flex justify-between items-center bg-[#dfa054]/5 border border-[#dfa054]/25">
                <div>
                  <div className="text-xs font-semibold text-[#dfa054] uppercase tracking-wider">Predicted Contests</div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Only contests with EntrantHub realtime ratings that are not official yet.</div>
                </div>
                <div className="text-xl font-bold font-mono text-[#dfa054] tabular-nums shrink-0">{pendingCount}</div>
              </Card>

              {loadingPredicted && (
                <div className="rounded-md border border-zinc-800 bg-zinc-900/25 px-3 py-10 text-center text-xs text-zinc-500">
                  <RefreshCw size={20} className="animate-spin text-zinc-500 mx-auto mb-2.5" />
                  Calculating realtime predictions...
                </div>
              )}

              {!loadingPredicted && (!predictedResult || predictedResult.contests.length === 0) && (
                <div className="rounded-md border border-zinc-800 bg-zinc-900/25 px-3 py-8 text-center text-xs text-zinc-500">
                  No predicted ratings available.
                </div>
              )}

              {!loadingPredicted && predictedResult && predictedResult.contests.map((contest) => (
                <Card key={contest.titleSlug} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-zinc-100">{contest.contestName}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-[#dfa054]">
                        <span className="rounded-full border border-[#dfa054]/30 bg-[#dfa054]/10 px-2 py-0.5 font-bold uppercase tracking-wider">⭐ Predicted</span>
                        <span className="font-mono text-zinc-500">Rank {contest.predictedRank ?? "n/a"}</span>
                      </div>
                    </div>
                    <div className={`shrink-0 text-right font-mono text-sm font-bold ${contest.predictedDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {contest.predictedDelta >= 0 ? "+" : ""}{Math.round(contest.predictedDelta)}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950/35 p-3">
                    <div>
                      <div className="text-[9px] uppercase text-zinc-600 font-bold font-mono">Old Rating</div>
                      <div className="mt-1 font-mono text-lg font-bold text-zinc-300">{Math.round(contest.oldRating)}</div>
                    </div>
                    <div className="text-zinc-600 font-bold">↓</div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase text-[#dfa054] font-bold font-mono">Predicted Rating</div>
                      <div className="mt-1 font-mono text-lg font-bold text-[#dfa054]">{Math.round(contest.predictedRating)}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="grid gap-3.5 animate-fadeIn">
            <h3 className="text-[10px] uppercase font-bold text-zinc-500 font-mono tracking-wider">All Finalized Contests</h3>
            
            {latestAnalytics && (
              <div className="text-[10px] text-zinc-500 font-mono -mt-1 border-b border-zinc-900 pb-2 mb-1">
                Latest behavioral signals: panic {latestAnalytics.panicIndex || "n/a"}, choking {latestAnalytics.chokingIndex || "n/a"}, stamina {latestAnalytics.staminaDropoff || "n/a"}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {filteredContests.length === 0 && <div className="text-xs text-zinc-500 py-4 text-center">No contests found for this view.</div>}
              {filteredContests.map((contest) => {
                const delta = contest.status === "FINALIZED" ? contest.ratingDelta : contest.predictedDelta
                const attended = contest.attended !== false
                const localAnalysis = analytics.find(
                  (a) => a.contestSlug?.toLowerCase() === contest.contestSlug?.toLowerCase()
                )

                return (
                  <Card key={contest.contestSlug} className="py-2.5 px-3">
                    <div className="flex justify-between gap-3 items-start">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-zinc-200 truncate">{contest.contestTitle}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-1">
                          {attended ? (
                            `Rank ${contest.rank ?? contest.predictedRank ?? "n/a"} · ${contest.problemsSolved ?? "?"}/${contest.totalProblems ?? "?"} solved`
                          ) : (
                            "Rank n/a · 0/4 solved"
                          )}
                        </div>
                        {localAnalysis && (localAnalysis.panicIndex || localAnalysis.chokingIndex || localAnalysis.staminaDropoff) && (
                          <div className="flex gap-1.5 mt-2 flex-wrap font-mono text-[8px] font-bold">
                            {localAnalysis.panicIndex && (
                              <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.panicIndex)}`}>
                                PANIC: {localAnalysis.panicIndex.toUpperCase()}
                              </span>
                            )}
                            {localAnalysis.chokingIndex && (
                              <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.chokingIndex)}`}>
                                CHOKE: {localAnalysis.chokingIndex.toUpperCase()}
                              </span>
                            )}
                            {localAnalysis.staminaDropoff && (
                              <span className={`px-1.5 py-0.5 rounded border ${getMetricBadgeColor(localAnalysis.staminaDropoff)}`}>
                                STAMINA: {localAnalysis.staminaDropoff.toUpperCase()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-bold text-xs font-mono ${!attended ? "text-zinc-500" : delta == null ? "text-zinc-500" : delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {attended ? deltaText(contest) : "0 (Unchanged)"}
                        </div>
                        <div className={`text-[9px] mt-1 font-semibold ${!attended ? "text-zinc-500" : contest.status === "FINALIZED" ? "text-emerald-500" : contest.status === "PREDICTED" ? "text-amber-400" : "text-zinc-500"}`}>
                          {statusText(contest)}
                        </div>
                        {contest.predictionError && <div className="mt-1 max-w-[130px] truncate text-[8px] text-zinc-600" title={contest.predictionError}>{contest.predictionError}</div>}
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
