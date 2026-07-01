import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target } from "lucide-react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchDashboard, fetchHeatmap, fetchPotd, fetchRevisionQueue, fetchWeakness } from "../../lib/api/backend"
import { STUDY_LISTS } from "../../lib/study-lists"
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
  const [manual, setManual] = useState<Record<string, boolean>>({})
  const [profile, setProfile] = useState<any>(null)
  const [zerotrac, setZerotrac] = useState<any[] | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. Immediately load from cache to populate UI instantly
    Promise.all([
      getCachedDashboard().catch(() => null),
      getCachedHeatmap().catch(() => []),
      getCachedWeakness().catch(() => null),
      new Promise<any>((resolve) => chrome.storage.local.get("algovault.solvedSlugs", (res) => {
        resolve(res?.["algovault.solvedSlugs"]?.slugs || [])
      })),
      new Promise<any>((resolve) => chrome.storage.local.get("algovault.study.manual.v1", resolve)),
      getLastSync().catch(() => null)
    ]).then(([cachedDashboard, cachedHeatmap, cachedWeakness, solvedSlugs, manualResult, storedLastSync]) => {
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
      setManual(manualResult?.["algovault.study.manual.v1"] || {})
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
        message<any>({ action: "get_zerotrac" }).catch(() => null)
      ]).then(([dashboard, buckets, daily, reviews, weak, solvedResponse, profileRes, zerotracRes]) => {
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
  const listProgress = STUDY_LISTS.map((list) => {
    const done = list.problems.filter((problem) => solved.has(problem.slug) || manual[`${list.id}:${problem.slug}`]).length
    return { ...list, done }
  })
  const plan = [
    queue[0] && { type: "Review", title: queue[0].title || queue[0].problemTitle, slug: queue[0].titleSlug },
    potd[0] && { type: potd[0].type || "Practice", title: potd[0].title, slug: potd[0].titleSlug, reason: potd[0].reason },
    weakest && { type: "Weak topic", title: weakest.tag, reason: `${Math.round(weakest.successRate ?? weakest.masteryScore ?? 0)}% current evidence score` }
  ].filter(Boolean) as any[]

  const allSolvedStat = profile?.submitStats?.acSubmissionNum?.find((item: any) => item.difficulty === "All")
  const officialTotalSolved = allSolvedStat ? allSolvedStat.count : data.totalSolved

  return (
    <div className="grid gap-3.5">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"><Target size={13} />Evidence-based solve range</div>
        {range ? (
          <>
            <div className="mt-2 text-3xl font-extrabold font-mono text-zinc-100">{range.low}-{range.high}</div>
            <div className="mt-1 text-[10px] text-zinc-500">Based on median rating of {range.evidence} solved problems (+100 offset)</div>
            <div className="mt-3 border-t border-zinc-800 pt-2 text-[11px] text-zinc-400">
              Challenge next: <span className="font-mono text-[#dfa054]">{range.challengeLow}-{range.challengeHigh}</span>
            </div>
          </>
        ) : (
          <div className="mt-3 text-xs text-zinc-400">Establish a range by syncing your solved problems history.</div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5"><div className="text-[9px] uppercase text-zinc-500">Solved</div><div className="mt-1 text-lg font-bold font-mono">{officialTotalSolved}</div></Card>
        <Card className="p-2.5"><div className="text-[9px] uppercase text-zinc-500">Reviews</div><div className="mt-1 text-lg font-bold font-mono text-amber-400">{queue.length}</div></Card>
        <Card className="p-2.5"><div className="text-[9px] uppercase text-zinc-500">Streak</div><div className="mt-1 text-lg font-bold font-mono">{data.currentStreak}d</div></Card>
      </div>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase text-zinc-500">Today's plan</h2>
        <div className="overflow-hidden rounded-md border border-zinc-800">
          {plan.map((item, index) => <a key={`${item.type}-${index}`} href={item.slug ? `https://leetcode.com/problems/${item.slug}/` : undefined} target={item.slug ? "_blank" : undefined} rel="noreferrer" className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/30 p-2.5 last:border-0"><CheckCircle2 size={14} className="text-zinc-600" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-zinc-200">{item.title}</div><div className="truncate text-[9px] text-zinc-500">{item.type}{item.reason ? ` · ${item.reason}` : ""}</div></div>{item.slug && <ArrowUpRight size={12} className="text-zinc-600" />}</a>)}
          {plan.length === 0 && <div className="p-3 text-xs text-zinc-500">No recommendations are available yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] font-bold uppercase text-zinc-500">Study lists</h2>
        <div className="grid gap-2">{listProgress.map((list) => <div key={list.id} className="rounded-md border border-zinc-800 bg-zinc-900/30 p-2.5"><div className="flex justify-between text-[11px]"><span className="font-semibold text-zinc-300">{list.name}</span><span className="font-mono text-zinc-500">{list.done}/{list.problems.length}</span></div><div className="mt-2 h-1 overflow-hidden rounded bg-zinc-800"><div className="h-full bg-emerald-500" style={{ width: `${list.done / list.problems.length * 100}%` }} /></div></div>)}</div>
      </section>

      <Card className="p-3">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"><Clock3 size={13} />Current session</div>
        <div className="mt-2 grid grid-cols-4 text-center"><div><b className="block font-mono text-sm">{Math.floor((data.sessionTimeSeconds || 0) / 60)}m</b><span className="text-[8px] text-zinc-600">TIME</span></div><div><b className="block font-mono text-sm">{data.focusScore ?? "n/a"}</b><span className="text-[8px] text-zinc-600">FOCUS</span></div><div><b className="block font-mono text-sm">{data.tabSwitches ?? 0}</b><span className="text-[8px] text-zinc-600">SWITCHES</span></div><div><b className="block font-mono text-sm">{data.pasteCount ?? 0}</b><span className="text-[8px] text-zinc-600">PASTES</span></div></div>
      </Card>
    </div>
  )
}
