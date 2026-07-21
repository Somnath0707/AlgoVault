import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronRight, Circle, LockKeyhole, MapPinned } from "lucide-react"
import { STUDY_LISTS, type StudyProblem } from "../../lib/study-lists"

type Topic = {
  id: string
  title: string
  note: string
  prerequisites?: string[]
}

const PHASES: Array<{ title: string; description: string; topics: Topic[] }> = [
  { title: "01 · Foundations", description: "Build the patterns used everywhere else.", topics: [
    { id: "arrays", title: "Arrays & Hashing", note: "Lookup, counting, and representation." },
    { id: "two-pointers", title: "Two Pointers", note: "Controlled scans over ordered data.", prerequisites: ["arrays"] },
    { id: "stack", title: "Stack", note: "LIFO state and monotonic structure.", prerequisites: ["arrays"] },
    { id: "binary-search", title: "Binary Search", note: "Monotonic answers and boundaries.", prerequisites: ["two-pointers"] },
    { id: "sliding-window", title: "Sliding Window", note: "Maintain a valid moving range.", prerequisites: ["two-pointers"] },
    { id: "linked-list", title: "Linked List", note: "References, cycles, and in-place changes.", prerequisites: ["two-pointers"] }
  ] },
  { title: "02 · Core structures", description: "Recursive state, ordering, and search spaces.", topics: [
    { id: "trees", title: "Trees", note: "Traversals, recursive invariants, and depth.", prerequisites: ["binary-search", "linked-list"] },
    { id: "tries", title: "Tries", note: "Prefix and bitwise search.", prerequisites: ["trees"] },
    { id: "heap", title: "Heap / Priority Queue", note: "Continuously keep the best candidate.", prerequisites: ["trees"] },
    { id: "backtracking", title: "Backtracking", note: "Explore choices and prune early.", prerequisites: ["trees"] }
  ] },
  { title: "03 · Pattern fluency", description: "Combine foundations into interview-level decisions.", topics: [
    { id: "intervals", title: "Intervals", note: "Overlap, ordering, and time boundaries.", prerequisites: ["heap"] },
    { id: "greedy", title: "Greedy", note: "Prove a local choice protects the answer.", prerequisites: ["heap"] },
    { id: "graphs", title: "Graphs", note: "Traversal state and connected systems.", prerequisites: ["backtracking"] },
    { id: "dp-1d", title: "1-D Dynamic Programming", note: "Compress repeated decisions into a state line.", prerequisites: ["backtracking"] }
  ] },
  { title: "04 · Advanced", description: "Layer patterns when one state is not enough.", topics: [
    { id: "advanced-graphs", title: "Advanced Graphs", note: "Shortest paths, MSTs, and constraints.", prerequisites: ["heap", "graphs"] },
    { id: "dp-2d", title: "2-D Dynamic Programming", note: "Two dimensions of history.", prerequisites: ["graphs", "dp-1d"] },
    { id: "bit", title: "Bit Manipulation", note: "Compact representations and bitwise state.", prerequisites: ["dp-1d"] },
    { id: "math", title: "Math & Geometry", note: "Reasoning-heavy representation problems.", prerequisites: ["dp-2d", "bit"] }
  ] }
]

const ALL_TOPICS = PHASES.flatMap((phase) => phase.topics)

const openProblem = (slug: string) => window.open(`https://leetcode.com/problems/${slug}/`, "_blank", "noopener,noreferrer")

export function CurriculumBoard() {
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState("arrays")

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "get_solved_problem_slugs" }, (response) => {
      if (response?.ok && Array.isArray(response.data)) setSolvedSlugs(new Set(response.data))
    })
  }, [])

  const progress = useMemo(() => {
    const list = STUDY_LISTS.find((item) => item.id === "neetcode-150")
    return ALL_TOPICS.map((topic) => {
      const problems = list?.problems.filter((problem) => problem.topic === topic.title) || []
      const solved = problems.filter((problem) => solvedSlugs.has(problem.slug)).length
      return { topic, problems, solved, total: problems.length, percent: problems.length ? Math.round((solved / problems.length) * 100) : 0, next: problems.find((problem) => !solvedSlugs.has(problem.slug)) }
    })
  }, [solvedSlugs])

  const byId = useMemo(() => new Map(progress.map((item) => [item.topic.id, item])), [progress])
  const nextUp = progress.find((item) => item.percent < 100 && (item.topic.prerequisites || []).every((id) => byId.get(id)?.percent === 100)) || progress.find((item) => item.percent < 100)
  const selected = byId.get(selectedId) || nextUp || progress[0]
  const totalSolved = progress.reduce((total, item) => total + item.solved, 0)
  const totalProblems = progress.reduce((total, item) => total + item.total, 0)

  if (!selected) return null

  return <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#101012] text-zinc-100">
    <header className="border-b border-zinc-800 px-4 py-4">
      <div className="flex items-start justify-between gap-3"><div><p className="panel-label flex items-center gap-1.5"><MapPinned size={13} /> Curriculum</p><h2 className="mt-1 text-lg font-semibold tracking-tight">NeetCode 150 roadmap</h2><p className="mt-1 text-xs leading-relaxed text-zinc-500">A practical sequence of patterns—not a dependency maze.</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-right"><p className="text-base font-semibold tabular-nums text-zinc-100">{totalSolved}<span className="text-zinc-600">/{totalProblems}</span></p><p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">solved</p></div></div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${totalProblems ? (totalSolved / totalProblems) * 100 : 0}%` }} /></div>
    </header>

    {nextUp && <div className="border-b border-zinc-800 bg-amber-400/[0.045] px-4 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="panel-label text-amber-300">Continue here</p><p className="mt-1 truncate text-sm font-semibold text-zinc-100">{nextUp.topic.title}</p><p className="mt-0.5 text-[11px] text-zinc-400">{nextUp.next ? `Next: ${nextUp.next.title}` : "Finish the remaining problems in this topic."}</p></div>{nextUp.next && <button onClick={() => openProblem(nextUp.next!.slug)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-[11px] font-bold text-zinc-950 hover:bg-amber-300">Open <ChevronRight size={13} /></button>}</div></div>}

    <div className="space-y-5 p-4">
      {PHASES.map((phase) => <section key={phase.title}><div className="mb-2 flex items-baseline justify-between"><div><h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">{phase.title}</h3><p className="mt-0.5 text-[10px] text-zinc-600">{phase.description}</p></div></div><div className="grid grid-cols-2 gap-2">{phase.topics.map((topic) => {
        const item = byId.get(topic.id)!
        const locked = (topic.prerequisites || []).some((id) => byId.get(id)?.percent !== 100)
        const active = selected.topic.id === topic.id
        const complete = item.percent === 100
        return <button key={topic.id} onClick={() => setSelectedId(topic.id)} className={`rounded-lg border p-2.5 text-left transition-colors ${active ? "border-amber-400 bg-amber-400/[0.07]" : complete ? "border-emerald-500/30 bg-emerald-500/[0.035] hover:border-emerald-400/50" : locked ? "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700" : "border-zinc-700 bg-[#17171a] hover:border-zinc-500"}`}><div className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-[11px] font-semibold leading-snug text-zinc-200">{topic.title}</span>{complete ? <CheckCircle2 size={14} className="shrink-0 text-emerald-400" /> : locked ? <LockKeyhole size={13} className="shrink-0 text-zinc-600" /> : <Circle size={13} className="shrink-0 text-amber-300" />}</div><div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${complete ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${item.percent}%` }} /></div><p className="mt-1.5 text-[10px] tabular-nums text-zinc-500">{item.solved}/{item.total} solved</p></button>
      })}</div></section>)}
    </div>

    <div className="border-t border-zinc-800 bg-zinc-950/60 p-4"><p className="panel-label">Selected topic</p><div className="mt-1 flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-zinc-100">{selected.topic.title}</h3><p className="mt-1 text-xs leading-relaxed text-zinc-400">{selected.topic.note}</p>{selected.topic.prerequisites?.length ? <p className="mt-2 text-[10px] text-zinc-600">Prerequisites: {selected.topic.prerequisites.map((id) => byId.get(id)?.topic.title).join(" · ")}</p> : null}</div>{selected.next && <button onClick={() => openProblem(selected.next!.slug)} className="shrink-0 rounded-lg border border-zinc-700 px-3 py-2 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800">Next problem</button>}</div></div>
  </section>
}
