import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, Check, Circle, Clock3, Flame, Play, RotateCcw, Sparkles, Square, Target } from "lucide-react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchAllSessions, fetchDashboard, fetchRevisionQueue, fetchWeakness, reviewRevisionCard } from "../../lib/api/backend"
import { getLastSync, getUsername, setCachedDashboard, setCachedWeakness } from "../../lib/storage"
import { normalizeZerotracPayload } from "../../lib/zerotrac"
import { STUDY_LISTS } from "../../lib/study-lists"
import type { DashboardData, SessionData } from "../../lib/types"

type RevisionCard = {
  id: number
  title: string
  titleSlug: string
  confidence?: number
  intervalDays?: number
}

type Recommendation = {
  title: string
  titleSlug: string
  tag?: string
  difficulty?: string
  actualRating?: number
}

type WeaknessData = {
  weakTags?: Array<{ tag: string; masteryScore?: number }>
  recommendations?: Recommendation[]
}

type RatedProblem = {
  title: string
  slug: string
  rating: number
  contest?: string
}

type TodaySnapshot = {
  data: DashboardData
  queue: RevisionCard[]
  weakness: WeaknessData | null
  sessions: SessionData[]
  solved: string[]
  zerotrac: any[] | null
  ranking: any
  savedAt: number
}

function message<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
      else resolve(response)
    })
  })
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value as number[]
    return new Date(year, month - 1, day, hour, minute, second)
  }
  const date = new Date(value as string)
  return Number.isNaN(date.valueOf()) ? null : date
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

function relativeSync(timestamp: number | null) {
  if (!timestamp) return "Sync status unavailable"
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return "Synced just now"
  if (minutes < 60) return `Synced ${minutes}m ago`
  return `Synced ${Math.floor(minutes / 60)}h ago`
}

const ActionButton = ({ href, children, tone = "zinc" }: { href: string; children: React.ReactNode; tone?: "zinc" | "amber" | "blue" }) => {
  const tones = {
    zinc: "border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white",
    amber: "border-amber-400/50 bg-amber-400 text-zinc-950 hover:bg-amber-300",
    blue: "border-blue-400/50 bg-blue-400 text-zinc-950 hover:bg-blue-300"
  }
  return <a href={href} target="_blank" rel="noreferrer" className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition-colors ${tones[tone]}`}>{children} <ArrowUpRight size={13} /></a>
}

interface UserContestRanking { rating?: number; attendedContestsCount?: number; globalRanking?: number; topPercentage?: number; }
interface LiveSession { isActive?: boolean; startTime?: number; titleSlug?: string; }
interface ZerotracRecord { titleSlug: string; rating: number; }

export const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [queue, setQueue] = useState<RevisionCard[]>([])
  const [weakness, setWeakness] = useState<WeaknessData | null>(null)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [zerotrac, setZerotrac] = useState<ZerotracRecord[] | null>(null)
  const [ranking, setRanking] = useState<UserContestRanking | null>(null)
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  const applySnapshot = (snapshot: TodaySnapshot) => {
    setData(snapshot.data)
    setQueue(snapshot.queue)
    setWeakness(snapshot.weakness)
    setSessions(snapshot.sessions)
    setSolved(new Set(snapshot.solved))
    setZerotrac(snapshot.zerotrac)
    setRanking(snapshot.ranking)
  }

  const refresh = async () => {
    const username = await getUsername()
    setRefreshing(true)
    try {
      const [dashboard, reviews, weak, allSessions, solvedResponse, zerotracResponse, rankingResponse] = await Promise.all([
        fetchDashboard(),
        fetchRevisionQueue().catch(() => []),
        fetchWeakness().catch(() => null),
        fetchAllSessions().catch(() => []),
        message<any>({ action: "get_solved_problem_slugs" }).catch(() => null),
        message<any>({ action: "get_zerotrac" }).catch(() => null),
        message<any>({ action: "get_user_contest_history", payload: { username } }).catch(() => null)
      ])
      const snapshot: TodaySnapshot = {
        data: dashboard,
        queue: Array.isArray(reviews) ? reviews : [],
        weakness: weak,
        sessions: Array.isArray(allSessions) ? allSessions : [],
        solved: solvedResponse?.ok ? solvedResponse.data : [],
        zerotrac: normalizeZerotracPayload(zerotracResponse),
        ranking: rankingResponse?.ok ? rankingResponse.data?.userContestRanking : null,
        savedAt: Date.now()
      }
      // Apply a complete plan together. This avoids rendering old dashboard
      // numbers next to empty recommendations while independent calls finish.
      applySnapshot(snapshot)
      chrome.storage.local.set({ "algovault.todaySnapshot": snapshot })
      setCachedDashboard(dashboard)
      if (weak) setCachedWeakness(weak)
      setError(null)
    } catch (refreshError: any) {
      console.error("Dashboard refresh failed", refreshError)
      if (!data) setError(refreshError?.message || "Could not load your dashboard")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    Promise.all([
      new Promise<TodaySnapshot | null>((resolve) => chrome.storage.local.get("algovault.todaySnapshot", (stored) => resolve(stored?.["algovault.todaySnapshot"] || null))),
      getLastSync()
    ]).then(([snapshot, cachedSync]) => {
      if (snapshot?.data) {
        applySnapshot(snapshot)
        setLoading(false)
      }
      setLastSync(cachedSync)
    }).finally(refresh)

    const listener = (event: any) => event.action === "dashboard_refresh" && refresh()
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  useEffect(() => {
    const syncSession = () => chrome.storage.local.get(["algovault.currentSession", "algovault.sessionState"], (stored) => {
      const current = stored?.["algovault.currentSession"]
      const state = stored?.["algovault.sessionState"]
      setLiveSession(current || null)
      setSessionSeconds(state?.isSolved ? state.finalSeconds || 0 : current?.focusSeconds || 0)
    })
    syncSession()
    const interval = window.setInterval(syncSession, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const today = dateKey(new Date())
  const activity = useMemo(() => {
    const minutesByDay: Record<string, number> = {}
    for (const session of sessions) {
      const started = parseDate(session.startedAt)
      if (!started) continue
      const key = dateKey(started)
      minutesByDay[key] = (minutesByDay[key] || 0) + Math.round((session.focusSeconds || 0) / 60)
    }
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - (6 - index))
      const key = dateKey(day)
      return { key, label: day.toLocaleDateString(undefined, { weekday: "narrow" }), minutes: minutesByDay[key] || 0 }
    })
    return { days, todayMinutes: minutesByDay[today] || 0 }
  }, [sessions, today])

  const planningRange = useMemo(() => {
    if (ranking?.rating && ranking?.attendedContestsCount > 0) {
      const rating = Math.round(ranking.rating)
      return { low: rating + 150, high: rating + 250, source: "official contest rating" }
    }
    if (data?.virtualRating) {
      return { low: data.virtualRating + 150, high: data.virtualRating + 250, source: "planning estimate — not an official rating" }
    }
    return null
  }, [data?.virtualRating, ranking])

  const recommendedPractice = useMemo(() => {
    const backendRecommendation = weakness?.recommendations?.find((problem) => !solved.has(problem.titleSlug))
    if (backendRecommendation) return backendRecommendation
    return null
  }, [solved, weakness])

  const stretchProblem = useMemo<RatedProblem | null>(() => {
    if (!planningRange || !zerotrac) return null
    const candidate = zerotrac.find((problem) => {
      const rating = Number(problem.Rating ?? problem.rating)
      const slug = problem.TitleSlug ?? problem.title_slug
      return slug && !solved.has(slug) && rating >= planningRange.low && rating <= planningRange.high
    })
    if (!candidate) return null
    return {
      title: candidate.Title ?? candidate.title ?? candidate.TitleSlug,
      slug: candidate.TitleSlug ?? candidate.title_slug,
      rating: Number(candidate.Rating ?? candidate.rating),
      contest: candidate.ContestSlug ?? candidate.contestSlug
    }
  }, [planningRange, solved, zerotrac])

  const curatedReview = useMemo(() => {
    for (const list of STUDY_LISTS) {
      const listSlugs = new Set(list.problems.map((problem) => problem.slug))
      const card = queue.find((review) => listSlugs.has(review.titleSlug))
      if (card) return { card, listName: list.name }
    }
    return null
  }, [queue])
  const activeReview = curatedReview?.card
  const hasPracticeSignal = (data?.todaySolves || 0) > 0
  const actions = [Boolean(activeReview), Boolean(recommendedPractice), Boolean(stretchProblem)]
  const completedActions = actions.filter((available, index) => available && (index === 1 ? hasPracticeSignal : false)).length
  const openActions = actions.filter(Boolean).length - completedActions
  const maxMinutes = Math.max(1, ...activity.days.map((day) => day.minutes))

  const startSession = () => message<any>({ action: "session_start", mode: "PRACTICE" }).then((result) => result?.ok && setLiveSession(result.data))
  const endSession = () => message<any>({ action: "session_end" }).then((result) => {
    if (result?.ok) {
      setLiveSession(null)
      chrome.storage.local.remove("algovault.sessionState")
      refresh()
    }
  })
  const resetSession = () => message<any>({ action: "session_end" }).then(() => startSession())

  const submitReview = async (quality: number) => {
    if (!activeReview) return
    setReviewSubmitting(true)
    try {
      await reviewRevisionCard(activeReview.id, quality)
      setReviewing(false)
      await refresh()
    } catch (submitError) {
      console.error("Review submit failed", submitError)
      setError("Your review was not saved. Please try again.")
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (loading && !data) {
    return <div className="space-y-3 p-3"><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" /></div>
  }

  if (!data) {
    return <div className="p-4"><Card className="border-red-500/30"><p className="text-sm font-semibold text-red-300">Dashboard unavailable</p><p className="mt-1 text-xs text-zinc-400">{error || "Connect your account and sync a submission to start."}</p></Card></div>
  }

  const headline = liveSession
    ? `You are in a practice session. Keep the next step small and deliberate.`
    : openActions > 0
      ? `${openActions} useful ${openActions === 1 ? "action" : "actions"} are ready for today.`
      : "Your review queue is clear. A short, focused practice session is enough."

  return <main className="mx-auto max-w-2xl space-y-4 px-3 pb-6 pt-2">
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-[#1b1a17] via-[#121214] to-[#101114] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
      <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="panel-label text-amber-300/80">Today · {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">A calm plan, based on your actual data.</h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-zinc-400">{headline}</p>
          </div>
          <div className="rounded-xl border border-zinc-700/80 bg-zinc-950/50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Today</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-100">{data.todaySolves || 0} <span className="text-xs font-medium text-zinc-500">solved</span></p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><Clock3 size={13} className="text-amber-300" /> {formatDuration(activity.todayMinutes)} tracked</span>
          <span className="inline-flex items-center gap-1.5"><Flame size={13} className="text-orange-300" /> {data.currentStreak || 0}-day solve streak</span>
          <span className="text-zinc-600">{refreshing ? "Updating plan…" : relativeSync(lastSync)}</span>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-zinc-800 bg-[#101012] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="panel-label">Focus session</p>
          <p className="mt-1 text-sm text-zinc-300">{liveSession ? "Session is running — work one problem at a time." : "Use this only when you want your focus time recorded."}</p>
        </div>
        {liveSession ? <span className="font-mono text-lg font-semibold tabular-nums text-emerald-300">{formatDuration(sessionSeconds)}</span> : <button onClick={startSession} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-100 px-3 py-2 text-[11px] font-bold text-zinc-950 hover:bg-white"><Play size={12} fill="currentColor" /> Start</button>}
      </div>
      {liveSession && <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3"><button onClick={resetSession} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-2 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800"><RotateCcw size={12} /> Restart</button><button onClick={endSession} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-900/50 py-2 text-[11px] font-semibold text-red-300 hover:bg-red-950/30"><Square size={11} fill="currentColor" /> End session</button></div>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#121214]">
      <div className="flex items-end justify-between border-b border-zinc-800 px-4 py-3.5"><div><p className="panel-label">Today’s quest</p><p className="mt-1 text-xs text-zinc-500">Review, reinforce one topic, then stretch.</p></div><span className="text-xs font-medium text-zinc-500">{completedActions}/{actions.filter(Boolean).length || 0} complete</span></div>
      <div className="divide-y divide-zinc-800">
        <article className="bg-amber-500/[0.045] p-4">
          <div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-amber-400/15 p-2 text-amber-300"><Sparkles size={15} /></div><div className="min-w-0 flex-1"><p className="panel-label text-amber-300/80">Curated review {activeReview ? `· ${curatedReview?.listName}` : ""}</p><h2 className="mt-1 truncate text-sm font-semibold text-zinc-100">{activeReview?.title || "No curated review is due"}</h2><p className="mt-1 text-xs text-zinc-400">{activeReview ? `Due for recall after ${Math.round(activeReview.intervalDays || 1)} day${Math.round(activeReview.intervalDays || 1) === 1 ? "" : "s"}. Curated sheets always take priority.` : "Your due cards are either complete or outside your curated sheets."}</p></div>{activeReview && <ActionButton href={`https://leetcode.com/problems/${activeReview.titleSlug}/`} tone="amber">Review</ActionButton>}</div>
          {activeReview && <div className="mt-3 border-t border-amber-500/15 pt-3">{reviewing ? <><p className="mb-2 text-[11px] text-zinc-400">How well did you recall the approach?</p><div className="grid grid-cols-4 gap-2">{[[1, "Forgot"], [3, "Hard"], [4, "Good"], [5, "Easy"]].map(([quality, label]) => <button key={label as string} disabled={reviewSubmitting} onClick={() => submitReview(quality as number)} className="rounded-md border border-zinc-700 bg-zinc-950/60 py-1.5 text-[11px] font-medium text-zinc-300 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50">{label as string}</button>)}</div></> : <button onClick={() => setReviewing(true)} className="text-[11px] font-semibold text-amber-300 hover:text-amber-200">Log recall quality after reviewing <ArrowUpRight className="inline" size={12} /></button>}</div>}
        </article>

        <article className={`p-4 ${hasPracticeSignal ? "bg-emerald-500/[0.04]" : "bg-[#121214]"}`}>
          <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-lg p-2 ${hasPracticeSignal ? "bg-emerald-400/15 text-emerald-300" : "bg-blue-400/15 text-blue-300"}`}>{hasPracticeSignal ? <Check size={15} /> : <Target size={15} />}</div><div className="min-w-0 flex-1"><p className="panel-label">{hasPracticeSignal ? "Practice logged" : "Recommended practice"}</p><h2 className={`mt-1 truncate text-sm font-semibold ${hasPracticeSignal ? "text-emerald-200" : "text-zinc-100"}`}>{hasPracticeSignal ? "You solved a problem today" : recommendedPractice?.title || "Choose one problem you can explain afterward"}</h2><p className="mt-1 text-xs text-zinc-400">{hasPracticeSignal ? "Your sync recorded at least one accepted problem today." : recommendedPractice ? `${recommendedPractice.tag || "Practice target"}${recommendedPractice.difficulty ? ` · ${recommendedPractice.difficulty}` : ""}. This is selected from your weakness profile.` : "Sync more solve history to receive a tailored recommendation."}</p></div>{!hasPracticeSignal && recommendedPractice && <ActionButton href={`https://leetcode.com/problems/${recommendedPractice.titleSlug}/`} tone="blue">Practice</ActionButton>}</div>
        </article>

        <article className="bg-[#121214] p-4"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-violet-400/15 p-2 text-violet-300"><Circle size={15} /></div><div className="min-w-0 flex-1"><p className="panel-label">Optional stretch</p><h2 className="mt-1 truncate text-sm font-semibold text-zinc-100">{stretchProblem?.title || "Set a stretch problem when you are ready"}</h2><p className="mt-1 text-xs text-zinc-400">{stretchProblem && planningRange ? `${stretchProblem.rating} ZeroTrac rating · ${planningRange.source}. Treat this as a planning aid, not a prediction.` : planningRange ? `Your current practice band is ${planningRange.low}–${planningRange.high} (${planningRange.source}).` : "Add contest history or solve data to surface a well-matched stretch problem."}</p></div>{stretchProblem && <ActionButton href={`https://leetcode.com/problems/${stretchProblem.slug}/`}>Attempt</ActionButton>}</div></article>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-[1.35fr_1fr]">
      <Card className="rounded-2xl p-4"><div className="flex items-center justify-between"><div><p className="panel-label">Tracked practice · last 7 days</p><p className="mt-1 text-xs text-zinc-500">Minutes are shown only when a session recorded them.</p></div><span className="text-xs font-medium text-zinc-400">{formatDuration(activity.days.reduce((total, day) => total + day.minutes, 0) * 60)}</span></div><div className="mt-4 flex h-20 items-end justify-between gap-2">{activity.days.map((day) => <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"><span className="text-[10px] tabular-nums text-zinc-500">{day.minutes || ""}</span><div title={`${day.minutes} tracked minutes`} className={`w-full max-w-7 rounded-t-sm ${day.key === today ? "bg-amber-400" : "bg-zinc-700"}`} style={{ height: `${day.minutes ? Math.max(10, (day.minutes / maxMinutes) * 100) : 3}%` }} /><span className="text-[10px] text-zinc-500">{day.label}</span></div>)}</div></Card>
      <Card className="rounded-2xl p-4"><p className="panel-label">At a glance</p><div className="mt-3 space-y-3"><div className="flex items-baseline justify-between border-b border-zinc-800 pb-2"><span className="text-xs text-zinc-500">Total solved</span><span className="text-lg font-semibold tabular-nums text-zinc-100">{data.totalSolved || 0}</span></div><div className="flex items-baseline justify-between border-b border-zinc-800 pb-2"><span className="text-xs text-zinc-500">Today’s submissions</span><span className="text-lg font-semibold tabular-nums text-zinc-100">{data.todaySubmissions || 0}</span></div><div className="flex items-baseline justify-between"><span className="text-xs text-zinc-500">Current streak</span><span className="text-lg font-semibold tabular-nums text-zinc-100">{data.currentStreak || 0}<span className="ml-1 text-[10px] font-medium text-zinc-500">days</span></span></div></div></Card>
    </section>

    {error && <p className="px-1 text-xs text-red-300">{error}</p>}
  </main>
}
