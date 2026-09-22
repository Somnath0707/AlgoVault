import React, { useMemo, useState } from "react"
import {
  BookOpen,
  Code2,
  ExternalLink,
  PlayCircle,
  SearchCode
} from "lucide-react"
import { Card } from "../ui/Card"
import { motion, AnimatePresence } from "framer-motion"
import { CurriculumBoard } from "./CurriculumBoard"
import { TemplateVault } from "./TemplateVault"


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
    description: "Comprehensive competitive programming syllabus with clear prerequisites, editorial depth, and module problems.",
    url: "https://usaco.guide/",
    kind: "reference",
    focus: "Olympiad and contest theory"
  },
  {
    name: "Algorithms by Jeff Erickson",
    description: "A deep, proof-grounded algorithms text that makes recursion, graphs, and dynamic programming crystal clear.",
    url: "https://jeffe.cs.illinois.edu/teaching/algorithms/",
    kind: "reference",
    focus: "Theoretical rigor"
  },
  {
    name: "LeetCode Explore Cards",
    description: "Official interactive modules for targeted practice on specific data structures and paradigms.",
    url: "https://leetcode.com/explore/",
    kind: "practice",
    focus: "Interactive cards"
  }
]

export const Resources = () => {
  const [activeTab, setActiveTab] = useState<"roadmap" | "resources" | "templates">("templates")
  const [filter, setFilter] = useState<"all" | ResourceKind>("all")
  const visible = useMemo(() => filter === "all" ? RESOURCES : RESOURCES.filter((resource) => resource.kind === filter), [filter])

  return (
    <div className="space-y-3 pb-6 font-sans animate-fadeIn min-w-0 w-full max-w-full overflow-x-hidden">
      <header className="flex items-end justify-between border-b border-white/[0.08] pb-3 px-1">
        <div className="flex items-start gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/25 bg-violet-400/10 text-violet-400"><BookOpen size={16} /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-400">Reference desk</p><h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-100">Learn</h1><p className="mt-0.5 text-[10px] text-zinc-500">Curriculum, reusable code, and sources worth returning to.</p></div></div>
      </header>
      {/* Top Level 3-Tab Segmented Navigation - 3 Equal Columns */}
      <div className="grid grid-cols-3 gap-1 bg-[#282828] p-1 rounded-lg border border-white/[0.08] w-full min-w-0">
        <button
          onClick={() => setActiveTab("roadmap")}
          className={`flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all font-mono uppercase tracking-wider truncate ${
            activeTab === "roadmap"
              ? "bg-[#333333] text-white border border-white/[0.12] shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#333333]/40 border border-transparent"
          }`}
          title="Curriculum Roadmap"
        >
          <SearchCode size={12} className={activeTab === "roadmap" ? "text-[#ffa116] shrink-0" : "text-zinc-400 shrink-0"} />
          <span>Curriculum</span>
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all font-mono uppercase tracking-wider truncate ${
            activeTab === "templates"
              ? "bg-[#333333] text-white border border-white/[0.12] shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#333333]/40 border border-transparent"
          }`}
          title="Code Templates"
        >
          <Code2 size={12} className={activeTab === "templates" ? "text-[#ffa116] shrink-0" : "text-zinc-400 shrink-0"} />
          <span>Templates</span>
        </button>
        <button
          onClick={() => setActiveTab("resources")}
          className={`flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-md transition-all font-mono uppercase tracking-wider truncate ${
            activeTab === "resources"
              ? "bg-[#333333] text-white border border-white/[0.12] shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-[#333333]/40 border border-transparent"
          }`}
          title="Learning Resources"
        >
          <BookOpen size={12} className={activeTab === "resources" ? "text-[#ffa116] shrink-0" : "text-zinc-400 shrink-0"} />
          <span>Resources</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "roadmap" ? (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="w-full min-w-0 max-w-full overflow-hidden"
          >
            <CurriculumBoard />
          </motion.div>
        ) : activeTab === "templates" ? (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="w-full min-w-0 max-w-full overflow-hidden"
          >
            <TemplateVault />
          </motion.div>
        ) : (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-3 w-full min-w-0 max-w-full"
          >
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
              {(["all", "video", "practice", "reference"] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setFilter(kind)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-mono capitalize transition-colors ${
                    filter === kind
                      ? "bg-[#333333] text-zinc-100 border border-white/[0.12]"
                      : "text-zinc-400 hover:text-zinc-200 bg-[#282828] border border-transparent"
                  }`}
                >
                  {kind}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {visible.map((resource) => (
                <Card
                  key={resource.name}
                  className="p-3 border border-white/[0.08] bg-[#282828] hover:border-white/[0.15] transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-zinc-100">{resource.name}</h3>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-mono text-[#ffa116] bg-[#ffa116]/10 border border-[#ffa116]/20 uppercase">
                        {resource.kind}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 font-sans">
                      {resource.description}
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2">
                    <span className="text-[10px] text-zinc-500 font-mono">{resource.focus}</span>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-[#ffa116] hover:underline"
                    >
                      Open <ExternalLink size={10} />
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
