import React, { useEffect, useMemo, useState } from "react"
import {
  Anchor,
  BookOpen,
  ChevronRight,
  CircleCheck,
  Compass,
  ExternalLink,
  Flag,
  LockKeyhole,
  MapPinned,
  PlayCircle,
  SearchCode,
  ShipWheel,
  Sparkles,
  Swords,
  Waves
} from "lucide-react"
import { Card } from "../ui/Card"
import { motion, AnimatePresence } from "framer-motion"
import { STUDY_LISTS, type StudyProblem } from "../../lib/study-lists"
import { getAchievementAssetUrl } from "../../lib/achievements"

const ROADMAP_TOPICS = [
  { id: "arrays", title: "Arrays & Hashing", description: "Build fast lookup instincts and learn how to preserve information while you scan.", accent: "#f472b6", asset: "first-blood.png", icon: Compass, x: 50, y: 5, requires: [] },
  { id: "two-pointers", title: "Two Pointers", description: "Turn ordered data into a controlled two-sided search instead of nested loops.", accent: "#60a5fa", asset: "focus-mode.png", icon: Swords, x: 27, y: 17, requires: ["arrays"] },
  { id: "stack", title: "Stack", description: "Use last-in-first-out state to parse, undo, and process monotonic structure.", accent: "#60a5fa", asset: "night-owl.png", icon: Anchor, x: 73, y: 17, requires: ["arrays"] },
  { id: "binary-search", title: "Binary Search", description: "Search a monotonic answer space, not only a sorted array.", accent: "#fbbf24", asset: "equal-exchange.png", icon: SearchCode, x: 15, y: 31, requires: ["two-pointers"] },
  { id: "sliding-window", title: "Sliding Window", description: "Keep a moving range valid while extracting the best subarray or substring.", accent: "#fbbf24", asset: "adapt.png", icon: Waves, x: 38, y: 31, requires: ["two-pointers"] },
  { id: "linked-list", title: "Linked List", description: "Manipulate references precisely: reverse, merge, detect cycles, and reorder safely.", accent: "#fbbf24", asset: "problem-slayer.png", icon: ShipWheel, x: 62, y: 31, requires: ["two-pointers"] },
  { id: "trees", title: "Trees", description: "Make recursive structure readable through traversal, depth, and subtree invariants.", accent: "#34d399", asset: "conqueror.png", icon: MapPinned, x: 39, y: 44, requires: ["binary-search", "linked-list"] },
  { id: "tries", title: "Tries", description: "Use prefix structure when a word or binary representation carries the state.", accent: "#38bdf8", asset: "ultra-instincts.png", icon: Flag, x: 16, y: 58, requires: ["trees"] },
  { id: "heap", title: "Heap / Priority Queue", description: "Choose the next best candidate continuously without sorting everything again.", accent: "#38bdf8", asset: "phoenix.png", icon: Sparkles, x: 38, y: 70, requires: ["trees"] },
  { id: "backtracking", title: "Backtracking", description: "Explore decisions systematically, prune bad branches early, and restore state cleanly.", accent: "#38bdf8", asset: "fallen-angle.png", icon: Compass, x: 77, y: 58, requires: ["trees"] },
  { id: "intervals", title: "Intervals", description: "Recognize overlap, merge ranges, and reason about time as boundaries.", accent: "#fbbf24", asset: "first-blood.png", icon: Anchor, x: 9, y: 82, requires: ["heap"] },
  { id: "greedy", title: "Greedy", description: "Prove when the best local move protects the best global outcome.", accent: "#fbbf24", asset: "focus-mode.png", icon: Flag, x: 26, y: 82, requires: ["heap"] },
  { id: "advanced-graphs", title: "Advanced Graphs", description: "Move from connectivity to shortest paths, MSTs, and constraints between nodes.", accent: "#fbbf24", asset: "night-owl.png", icon: MapPinned, x: 45, y: 82, requires: ["heap", "graphs"] },
  { id: "graphs", title: "Graphs", description: "Traverse connected systems and identify the state needed to avoid revisiting work.", accent: "#60a5fa", asset: "adapt.png", icon: ShipWheel, x: 67, y: 70, requires: ["backtracking"] },
  { id: "dp-1d", title: "1-D DP", description: "Compress repeated decisions into one evolving state sequence.", accent: "#f472b6", asset: "problem-slayer.png", icon: Swords, x: 89, y: 70, requires: ["backtracking"] },
  { id: "dp-2d", title: "2-D DP", description: "Track two dimensions of history when one state cannot explain the future.", accent: "#f472b6", asset: "conqueror.png", icon: Sparkles, x: 79, y: 83, requires: ["graphs", "dp-1d"] },
  { id: "bit", title: "Bit Manipulation", description: "Represent state with bits when constraints make raw integers surprisingly expressive.", accent: "#f472b6", asset: "ultra-instincts.png", icon: Swords, x: 95, y: 83, requires: ["dp-1d"] },
  { id: "math", title: "Math & Geometry", description: "Finish with the reasoning-heavy patterns where representation is the solution.", accent: "#a78bfa", asset: "equal-exchange.png", icon: Compass, x: 86, y: 96, requires: ["dp-2d", "bit"] }
] as const

type RoadmapTopic = (typeof ROADMAP_TOPICS)[number]

interface TopicProgress {
  topic: RoadmapTopic
  problems: StudyProblem[]
  solved: number
  total: number
  percent: number
  nextProblem?: StudyProblem
}

const openProblem = (slug: string) => window.open(`https://leetcode.com/problems/${slug}/`, "_blank", "noopener,noreferrer")

const RoadmapTree = () => {
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set())
  const [selectedTopicId, setSelectedTopicId] = useState<string>(ROADMAP_TOPICS[0].id)
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const nodeRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [svgLines, setSvgLines] = useState<{ id: string, d: string, isDone: boolean, color: string }[]>([]);

  useEffect(() => {
    let live = true
    chrome.runtime.sendMessage({ action: "get_solved_problem_slugs" }, (response) => {
      if (!live) return
      const slugs = response?.ok && Array.isArray(response.data) ? response.data : []
      setSolvedSlugs(new Set(slugs))
    })
    return () => { live = false }
  }, [])

  const topicProgress = useMemo<TopicProgress[]>(() => {
    const list = STUDY_LISTS.find((studyList) => studyList.id === "neetcode-150")
    if (!list) return []
    return ROADMAP_TOPICS.map((topic) => {
      const problems = list.problems.filter((problem) => problem.topic === topic.title)
      const solved = problems.filter((problem) => solvedSlugs.has(problem.slug)).length
      const total = problems.length
      return {
        topic,
        problems,
        solved,
        total,
        percent: total ? Math.round((solved / total) * 100) : 0,
        nextProblem: problems.find((problem) => !solvedSlugs.has(problem.slug))
      }
    })
  }, [solvedSlugs])

  const progressById = useMemo(() => new Map(topicProgress.map((item) => [item.topic.id, item])), [topicProgress])

  useEffect(() => {
    const updateLines = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLines: typeof svgLines = [];

      topicProgress.forEach(({ topic }) => {
        topic.requires.forEach(reqId => {
          const parentEl = nodeRefs.current[reqId];
          const childEl = nodeRefs.current[topic.id];
          if (parentEl && childEl) {
            const pRect = parentEl.getBoundingClientRect();
            const cRect = childEl.getBoundingClientRect();

            const pX = pRect.left - containerRect.left + pRect.width / 2;
            const pY = pRect.bottom - containerRect.top;
            const cX = cRect.left - containerRect.left + cRect.width / 2;
            const cY = cRect.top - containerRect.top;

            const d = `M ${pX} ${pY} C ${pX} ${pY + 30}, ${cX} ${cY - 30}, ${cX} ${cY}`;
            
            const parentDone = progressById.get(reqId)?.percent === 100;
            const parentAccent = progressById.get(reqId)?.topic.accent || "#3f3f46";
            
            newLines.push({ 
              id: `${reqId}-${topic.id}`, 
              d, 
              isDone: parentDone, 
              color: parentDone ? parentAccent : "#3f3f46" 
            });
          }
        });
      });
      setSvgLines(newLines);
    };

    const timer = setTimeout(updateLines, 50);
    window.addEventListener("resize", updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateLines);
    };
  }, [topicProgress, progressById]);

  const selected = topicProgress.find((item) => item.topic.id === selectedTopicId) || topicProgress[0]
  const completedTopics = topicProgress.filter((item) => item.percent === 100).length
  const totalSolved = topicProgress.reduce((sum, item) => sum + item.solved, 0)
  const totalProblems = topicProgress.reduce((sum, item) => sum + item.total, 0)

  if (!selected) return null

  return (
    <section className="overflow-hidden rounded-lg border border-[#d9a441]/25 bg-[#071219] text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.32)]">
      <div className="relative overflow-hidden border-b border-[#d9a441]/20 bg-[#0b1d29] px-4 py-4">
        <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_22%_18%,rgba(45,212,191,.15),transparent_24%),radial-gradient(circle_at_78%_0%,rgba(251,191,36,.14),transparent_28%),linear-gradient(115deg,transparent_20%,rgba(255,255,255,.04)_20.5%,transparent_21%)]" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#e7ba68]"><Waves size={14} /> Grand Line curriculum</div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-50">NeetCode 150 Voyage</h2>
            <p className="mt-1 max-w-md text-[11px] leading-relaxed text-zinc-400">A prerequisite map of every NeetCode topic. Open a node to inspect its path and launch the next challenge.</p>
          </div>
          <div className="shrink-0 rounded-md border border-[#d9a441]/35 bg-black/20 px-2.5 py-2 text-right">
            <div className="font-mono text-sm font-semibold text-[#f8d791]">{totalSolved}<span className="text-zinc-500">/{totalProblems}</span></div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-zinc-500">charted</div>
          </div>
        </div>
        <div className="relative mt-4 flex items-center gap-2 text-[10px] text-zinc-500"><CircleCheck size={13} className="text-emerald-400" /> {completedTopics} of {topicProgress.length} topics cleared <span className="h-px flex-1 bg-[#d9a441]/15" /> <span className="font-mono text-[#e7ba68]">{totalProblems ? Math.round((totalSolved / totalProblems) * 100) : 0}%</span></div>
      </div>

      <div className="overflow-x-auto bg-[#061014] p-3.5 flex justify-center">
        <div ref={containerRef} className="relative w-full rounded-md border border-white/[0.06] bg-[radial-gradient(circle_at_18%_8%,rgba(45,212,191,.08),transparent_24%),radial-gradient(circle_at_86%_90%,rgba(217,164,65,.07),transparent_25%),linear-gradient(rgba(255,255,255,.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.022)_1px,transparent_1px)] bg-[size:auto,auto,24px_24px,24px_24px] p-6 flex flex-col items-center gap-10 min-h-[600px]">
          <div className="absolute left-4 top-4 flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.15em] text-[#d9a441]/75 z-20"><ShipWheel size={13} /> Prerequisite route</div>
          
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {svgLines.map(line => (
              <path 
                key={line.id}
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={line.isDone ? 2.5 : 1.5}
                strokeDasharray={line.isDone ? "none" : "4 4"}
                opacity={line.isDone ? 0.7 : 0.3}
              />
            ))}
          </svg>

          {(() => {
            const tiers = [
              ["arrays"],
              ["two-pointers", "stack"],
              ["binary-search", "sliding-window", "linked-list"],
              ["trees"],
              ["tries", "heap", "backtracking"],
              ["intervals", "greedy", "graphs", "dp-1d"],
              ["advanced-graphs", "dp-2d", "bit"],
              ["math"]
            ];
            
            return tiers.map((tierList, tierIdx) => (
              <div key={tierIdx} className="flex flex-col items-center w-full relative z-10">
                <div className="flex justify-center gap-3 w-full">
                  {tierList.map((id, index) => {
                    const item = topicProgress.find(p => p.topic.id === id)!;
                    const { topic } = item;
                    const Icon = topic.icon;
                    const isSelected = selected.topic.id === topic.id;
                    const isDone = item.percent === 100;
                    const prerequisitesCleared = topic.requires.every((reqId) => progressById.get(reqId)?.percent === 100);
                    const isLocked = !prerequisitesCleared && topic.requires.length > 0;
                    
                    return (
                      <motion.button 
                        key={topic.id} 
                        ref={(el) => { nodeRefs.current[topic.id] = el; }}
                        type="button" 
                        onClick={() => setSelectedTopicId(topic.id)} 
                        className={`group w-[105px] text-left focus:outline-none ${isLocked ? 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0' : ''}`}
                        initial={{ opacity: 0, y: 8 }} 
                        animate={{ opacity: isLocked ? 0.6 : 1, y: 0 }} 
                        transition={{ delay: 0.1 + tierIdx * 0.05 + index * 0.02, type: "spring", stiffness: 220, damping: 22 }} 
                        whileHover={{ y: -2 }} 
                        whileTap={{ scale: 0.96 }} 
                        aria-pressed={isSelected}
                      >
                        <div className={`relative overflow-hidden rounded-md border px-2 py-1.5 transition ${isSelected ? "border-[#d9a441]/80 bg-[#10242c] shadow-[0_4px_12px_rgba(0,0,0,.32)]" : isDone ? "border-emerald-500/40 bg-[#0a171c]/95" : "border-white/[0.11] bg-[#0a171c]/95 hover:border-[#d9a441]/45"}`}>
                          <div className="flex items-center gap-1 mb-1.5"><Icon size={10} style={{ color: isDone ? "#34d399" : topic.accent, minWidth: '10px' }} /><span className="truncate text-[9px] font-semibold text-zinc-100">{topic.title}</span></div>
                          <div className="h-[3px] overflow-hidden rounded-full bg-black/45"><div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: isDone ? "#34d399" : topic.accent }} /></div>
                          <div className="mt-1 flex items-center justify-between text-[7px] text-zinc-500 font-mono"><span>{item.solved}/{item.total}</span>{isDone && <CircleCheck size={8} className="text-emerald-400" />}</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selected.topic.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="border-t border-[#d9a441]/15 bg-[#0a171c] p-3.5">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#d9a441]/35 bg-[#111f24]">
              <img src={getAchievementAssetUrl(selected.topic.asset)} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[#0a171c]/20" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: selected.topic.accent }}>Pattern route</div>
              <h3 className="mt-1 text-sm font-semibold text-zinc-100">{selected.topic.title}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{selected.topic.description}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{selected.topic.requires.length === 0 ? <span className="rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] text-emerald-300">Starting route</span> : selected.topic.requires.map((id) => { const dependency = progressById.get(id)!; return <span key={id} className={`rounded border px-2 py-1 text-[9px] ${dependency.percent === 100 ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-[#d9a441]/20 bg-[#d9a441]/10 text-[#e7ba68]"}`}>{dependency.percent === 100 ? "Cleared" : "Route through"}: {dependency.topic.title}</span> })}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/35"><motion.div className="h-full rounded-full" style={{ backgroundColor: selected.topic.accent }} initial={{ width: 0 }} animate={{ width: `${selected.percent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} /></div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Next challenge</div><div className="mt-0.5 truncate text-xs font-medium text-zinc-200">{selected.nextProblem ? selected.nextProblem.title : "Island cleared. Pick a new route."}</div></div>
            {selected.nextProblem ? <button type="button" onClick={() => openProblem(selected.nextProblem!.slug)} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-[#d9a441]/40 bg-[#d9a441]/10 px-3 py-2 text-[10px] font-semibold text-[#f8d791] transition hover:bg-[#d9a441]/20"><span>Set sail</span><ChevronRight size={13} /></button> : <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[10px] font-semibold text-emerald-300"><CircleCheck size={13} /> Cleared</div>}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center gap-2 border-t border-[#d9a441]/10 bg-black/15 px-3.5 py-2 text-[9px] text-zinc-600"><LockKeyhole size={11} /> Progress comes from your synced LeetCode accepted submissions.</div>
    </section>
  )
}


type ResourceKind = "video" | "reference" | "practice"

const RESOURCES: Array<{ name: string; description: string; url: string; kind: ResourceKind; focus: string }> = [
  {
    name: "NeetCode 150",
    description: "Pattern-first problem track with a solution library for the exact list you are practicing.",
    url: "https://neetcode.io/practice",
    kind: "practice",
    focus: "Interview patterns"
  },
  {
    name: "NeetCode videos",
    description: "Clear problem walk-throughs when you have already made a serious attempt and need a second explanation.",
    url: "https://www.youtube.com/@NeetCode/playlists",
    kind: "video",
    focus: "Problem explanations"
  },
  {
    name: "Striver A2Z DSA",
    description: "A broad DSA route with topic ordering, sheet progress, and linked lessons.",
    url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/",
    kind: "practice",
    focus: "Structured curriculum"
  },
  {
    name: "takeUforward videos",
    description: "Long-form explanations and implementation-oriented playlists for core interview topics.",
    url: "https://www.youtube.com/@takeUforward/playlists",
    kind: "video",
    focus: "DSA deep dives"
  },
  {
    name: "William Fiset",
    description: "Especially strong for graph algorithms, data structures, and understanding why an approach works.",
    url: "https://www.youtube.com/@WilliamFiset-videos/playlists",
    kind: "video",
    focus: "Algorithms fundamentals"
  },
  {
    name: "CP-Algorithms",
    description: "Precise reference material for algorithms, proofs, and implementation details after you understand the pattern.",
    url: "https://cp-algorithms.com/",
    kind: "reference",
    focus: "Reference"
  },
  {
    name: "USACO Guide",
    description: "A curated progression of concepts and practice problems with strong topic coverage.",
    url: "https://usaco.guide/",
    kind: "practice",
    focus: "Guided practice"
  },
  {
    name: "CSES Problem Set",
    description: "Focused canonical practice once a pattern has clicked and you want to prove the idea transfers.",
    url: "https://cses.fi/problemset/",
    kind: "practice",
    focus: "Pattern transfer"
  }
]

const KIND_META: Record<ResourceKind, { label: string; icon: React.ElementType; className: string }> = {
  video: { label: "Watch", icon: PlayCircle, className: "text-rose-300 border-rose-400/20 bg-rose-400/10" },
  reference: { label: "Reference", icon: BookOpen, className: "text-sky-300 border-sky-400/20 bg-sky-400/10" },
  practice: { label: "Practice", icon: SearchCode, className: "text-emerald-300 border-emerald-400/20 bg-emerald-400/10" }
}

export const Resources = () => {
  const [activeTab, setActiveTab] = useState<"roadmap" | "resources">("roadmap")
  const [filter, setFilter] = useState<"all" | ResourceKind>("all")
  const visible = useMemo(() => filter === "all" ? RESOURCES : RESOURCES.filter((resource) => resource.kind === filter), [filter])

  return (
    <div className="grid gap-3.5 pb-6">
      {/* Top Level Nav Tab */}
      <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 shadow-inner">
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-semibold py-2 rounded-md transition-all font-mono uppercase tracking-wider ${
            activeTab === "roadmap"
              ? "bg-zinc-900 text-[#dfa054] border border-zinc-800/80 shadow"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <SearchCode size={13} /> Curriculum Map
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-semibold py-2 rounded-md transition-all font-mono uppercase tracking-wider ${
            activeTab === "resources"
              ? "bg-zinc-900 text-[#dfa054] border border-zinc-800/80 shadow"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <BookOpen size={13} /> External Resources
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "roadmap" ? (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            <RoadmapTree />
          </motion.div>
        ) : (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="grid gap-3.5"
          >
            <Card className="relative overflow-hidden border-emerald-500/15 bg-emerald-500/[0.035] p-0">
              <div className="p-4">
                <div className="flex items-center gap-2 panel-label"><BookOpen size={13} className="text-emerald-400" /> Learn with intent</div>
                <h2 className="mt-2 text-base font-semibold text-zinc-100">A useful explanation, at the right moment.</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Attempt first. Then choose a walkthrough, reference, or transfer problem based on what you need next.</p>
              </div>
              <div className="flex gap-1 border-t border-emerald-500/10 bg-zinc-950/25 p-2">
                {(["all", "practice", "video", "reference"] as const).map((kind) => (
                  <button
                    key={kind}
                    onClick={() => setFilter(kind)}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors ${filter === kind ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"}`}
                  >
                    {kind === "all" ? "All" : KIND_META[kind].label}
                  </button>
                ))}
              </div>
            </Card>

            <div className="grid gap-2.5">
              {visible.map((resource) => {
                const meta = KIND_META[resource.kind]
                const Icon = meta.icon
                return (
                  <a key={resource.name} href={resource.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <Card className="p-3.5 hover:border-zinc-700 hover:bg-zinc-900/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Icon size={14} className="text-zinc-500 transition-colors group-hover:text-[#dfa054]" />
                            <span className="truncate text-xs font-semibold text-zinc-200 transition-colors group-hover:text-zinc-100">{resource.name}</span>
                          </div>
                          <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">{resource.description}</p>
                        </div>
                        <ExternalLink size={13} className="mt-0.5 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300" />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600">{resource.focus}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-mono ${meta.className}`}>{meta.label}</span>
                      </div>
                    </Card>
                  </a>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
