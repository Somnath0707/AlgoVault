import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CheckCircle2, Clock3, Target } from "lucide-react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchDashboard, fetchHeatmap, fetchPotd, fetchRevisionQueue, fetchWeakness } from "../../lib/api/backend"
import { STUDY_LISTS } from "../../lib/study-lists"

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchDashboard().catch(() => null),
      fetchHeatmap().catch(() => []),
      fetchPotd().catch(() => []),
      fetchRevisionQueue().catch(() => []),
      fetchWeakness().catch(() => null),
      message<any>({ action: "get_solved_problem_slugs" }).catch(() => null),
      new Promise<any>((resolve) => chrome.storage.local.get("algovault.study.manual.v1", resolve))
    ]).then(([dashboard, buckets, daily, reviews, weak, solvedResponse, manualResult]) => {
      setData(dashboard)
      setHeatmap(buckets)
      setPotd(daily)
      setQueue(reviews)
      setWeakness(weak)
      setSolved(new Set(solvedResponse?.ok ? solvedResponse.data : []))
      setManual(manualResult?.["algovault.study.manual.v1"] || {})
    }).finally(() => setLoading(false))
  }, [])

  const range = useMemo(() => {
    const qualified = heatmap
      .filter((bucket) => bucket.attempted >= 3 && bucket.solved / bucket.attempted >= 0.6)
      .sort((left, right) => left.bucketRating - right.bucketRating)
    if (!qualified.length) return null
    const comfort = qualified[qualified.length - 1]
    return { low: comfort.bucketRating, high: comfort.bucketRating + 99, challengeLow: comfort.bucketRating + 100, challengeHigh: comfort.bucketRating + 249, evidence: comfort.attempted, solveRate: Math.round(comfort.solved / comfort.attempted * 100), attempts: comfort.avgAttempts }
  }, [heatmap])

  if (loading) return <div className="grid gap-3"><Skeleton className="h-28" /><Skeleton className="h-20" /><Skeleton className="h-48" /></div>
  if (!data) return <Card className="py-8 text-center"><div className="text-sm font-semibold text-zinc-200">Sync required</div><div className="mt-1 text-xs text-zinc-500">Run LeetCode history sync in Settings to build your dashboard.</div></Card>

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

  return (
    <div className="grid gap-3.5">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-zinc-500"><Target size={13} />Evidence-based solve range</div>
        {range ? <><div className="mt-2 text-3xl font-extrabold font-mono text-zinc-100">{range.low}-{range.high}</div><div className="mt-1 text-[10px] text-zinc-500">{range.solveRate}% solve rate across {range.evidence} attempted problems in this band</div><div className="mt-3 border-t border-zinc-800 pt-2 text-[11px] text-zinc-400">Challenge next: <span className="font-mono text-[#dfa054]">{range.challengeLow}-{range.challengeHigh}</span>{range.attempts ? ` · ${Number(range.attempts).toFixed(1)} average attempts` : ""}</div></> : <div className="mt-3 text-xs text-zinc-400">Solve at least three rated problems in a band to establish a reliable range.</div>}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2.5"><div className="text-[9px] uppercase text-zinc-500">Solved</div><div className="mt-1 text-lg font-bold font-mono">{data.totalSolved}</div></Card>
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
