import React, { useState } from "react"
import {
  X,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Code2,
  Terminal,
  PlayCircle,
  Lightbulb,
  Target,
  ExternalLink
} from "lucide-react"
import { motion } from "framer-motion"
import { type AlgorithmicPattern, getPatternExhibit } from "../../lib/patterns-data"
import { PatternSimulator, hasSimulation } from "./PatternSimulator"

interface LessonModalProps {
  pattern: AlgorithmicPattern
  onClose: () => void
  onMarkCompleted?: () => void
  isCompleted?: boolean
}

export function PatternLessonModal({ pattern, onClose, onMarkCompleted, isCompleted }: LessonModalProps) {
  const [lang, setLang] = useState<"python" | "java" | "cpp" | "rust" | "typescript">("python")
  const [copied, setCopied] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  const exhibit = getPatternExhibit(pattern.id)
  const showSimulation = hasSimulation(pattern.id)

  const copyCode = () => {
    const codeToCopy = exhibit.templates[lang] || exhibit.templates.python
    navigator.clipboard.writeText(codeToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checklistScore = Object.values(checkedItems).filter(Boolean).length

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative flex flex-col w-full max-w-3xl h-[90vh] rounded-xl border border-white/[0.08] bg-[#282828] text-zinc-100 shadow-2xl overflow-hidden font-sans"
      >
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#282828] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#ffa116]/30 bg-[#ffa116]/10 text-[#ffa116]">
              <Lightbulb size={14} />
            </span>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#ffa116]">
                Pattern Academy Handbook
              </span>
              <h2 className="text-sm font-bold text-zinc-100">{pattern.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onMarkCompleted && (
              <button
                onClick={onMarkCompleted}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                  isCompleted
                    ? "border border-[#00b8a3]/30 bg-[#00b8a3]/10 text-[#00b8a3]"
                    : "bg-[#00b8a3] text-[#1a1a1a] hover:bg-[#00b8a3]/90"
                }`}
              >
                <CheckCircle2 size={12} />
                {isCompleted ? "Completed" : "Mark Learned"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-1.5 text-zinc-400 hover:bg-[#333333] hover:text-zinc-200 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Handbook Reader Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          
          {/* 1. Header Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4">
            <div>
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Pattern Matrix
              </span>
              <h1 className="text-xl font-bold text-zinc-50 mt-0.5">{pattern.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded px-2.5 py-1 text-[10px] font-bold text-[#ffc01e] bg-[#ffc01e]/10 border border-[#ffc01e]/20">
                {pattern.difficulty}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-[#282828] px-2.5 py-1 rounded border border-white/[0.08]">
                <Clock size={11} /> {pattern.minutes} mins
              </span>
            </div>
          </div>

          {/* 2. One Sentence Mental Trigger */}
          <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-[#ffa116]">
              <Zap size={13} /> Mental Trigger (When to think of this pattern)
            </div>
            <p className="mt-2 text-sm font-semibold text-zinc-100 leading-relaxed italic">
              "{exhibit.mentalTrigger || pattern.trigger}"
            </p>
          </div>

          {/* 3. VisuAlgo Live Interactive Visual Simulator */}
          {showSimulation && (
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400 mb-2.5">
                <PlayCircle size={14} /> VisuAlgo Live Interactive Simulation
              </div>
              <PatternSimulator patternId={pattern.id} />
            </div>
          )}

          {/* 4. Recognition Checklist */}
          {exhibit.interviewSignals && exhibit.interviewSignals.length > 0 && (
            <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  Interview Recognition Signals
                </div>
                <span className="text-[10px] font-mono text-[#ffa116] font-bold">
                  {checklistScore} / {exhibit.interviewSignals.length} Signals
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {exhibit.interviewSignals.map((q: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 text-xs transition-colors cursor-pointer ${
                      checkedItems[idx]
                        ? "border-[#00b8a3]/40 bg-[#00b8a3]/10 text-[#00b8a3]"
                        : "border-white/[0.08] bg-[#282828] text-zinc-400 hover:border-white/[0.15]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[idx]}
                      onChange={(e) => {
                        e.stopPropagation()
                        setCheckedItems((prev) => ({ ...prev, [idx]: e.target.checked }))
                      }}
                      className="h-3.5 w-3.5 rounded border-zinc-700 bg-[#1a1a1a] text-[#ffa116] focus:ring-0 cursor-pointer"
                    />
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Visual Intuition & Mental Model */}
          <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4 font-mono text-xs">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500 mb-3">
              Visual Intuition: {exhibit.mentalModel.name} ({exhibit.mentalModel.metaphor})
            </div>
            <div className="rounded-lg border border-white/[0.08] bg-[#282828] p-4 text-[#ffa116] leading-relaxed overflow-x-auto">
              <pre className="text-[11px] font-mono whitespace-pre-wrap">{exhibit.visualIntuition}</pre>
            </div>
          </div>

          {/* 6. Why It Works & Core Insight */}
          <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ffa116]">
              <Lightbulb size={13} /> Core Insight & Why It Works
            </div>
            <p className="text-xs leading-relaxed text-zinc-300 font-sans">
              {exhibit.coreInsight}
            </p>
            <p className="text-xs leading-relaxed text-zinc-400 font-sans italic border-t border-white/[0.06] pt-2 mt-2">
              Mental Model: {exhibit.mentalModel.explanation}
            </p>
          </div>

          {/* 7. Complexity Animation & Comparison */}
          {exhibit.bruteForceVsPattern && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#ef4743]/20 bg-[#ef4743]/5 p-3.5">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#ef4743]">
                  Naive / Brute Force ({exhibit.bruteForceVsPattern.bruteLabel})
                </span>
                <p className="mt-1 text-xs font-mono text-zinc-300">Time: {exhibit.bruteForceVsPattern.bruteTime}</p>
                <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                  {exhibit.bruteForceVsPattern.bruteDesc}
                </p>
              </div>
              <div className="rounded-lg border border-[#00b8a3]/20 bg-[#00b8a3]/5 p-3.5">
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#00b8a3]">
                  Pattern Approach ({exhibit.bruteForceVsPattern.patternLabel})
                </span>
                <p className="mt-1 text-xs font-mono text-[#00b8a3]">Time: {exhibit.bruteForceVsPattern.patternTime}</p>
                <p className="mt-1 text-[11px] text-zinc-300 leading-relaxed">
                  {exhibit.bruteForceVsPattern.patternDesc}
                </p>
              </div>
            </div>
          )}

          {/* 8. Universal Pseudocode */}
          <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-2.5">
              <Terminal size={12} className="text-[#ffa116]" /> Universal Pseudocode (Language Independent)
            </div>
            <div className="rounded-lg bg-[#282828] border border-white/[0.08] p-3.5 font-mono text-[11px] text-zinc-300 space-y-1 overflow-x-auto">
              {exhibit.universalPseudocode.map((line: string, idx: number) => (
                <div key={idx} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* 9. Generic Implementation Templates */}
          <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                <Code2 size={13} className="text-sky-400" /> Production Templates
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-white/[0.08] bg-[#282828] p-0.5">
                  {(["python", "java", "cpp", "rust", "typescript"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-md uppercase transition-all cursor-pointer ${
                        lang === l
                          ? "bg-[#ffa116] text-[#1a1a1a] shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#282828] px-2.5 py-1 text-[10px] font-mono font-semibold text-zinc-300 hover:bg-[#333333] cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-[#00b8a3]" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.08] bg-[#282828] p-3.5 font-mono text-[11px] text-zinc-300 overflow-x-auto">
              <pre>{exhibit.templates[lang] || exhibit.templates.python}</pre>
            </div>
          </div>

          {/* 10. Common Mistakes & Pitfalls */}
          {exhibit.pitfalls && exhibit.pitfalls.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400">
                <AlertTriangle size={13} /> Common Pitfalls & Edge Cases
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside leading-relaxed font-sans">
                {exhibit.pitfalls.map((m: string, idx: number) => (
                  <li key={idx}>
                    <span className="text-zinc-200">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 11. Visual Memory Card */}
          {exhibit.memoryCard && (
            <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#ffa116] mb-2">
                Visual Memory Card (Cheat Sheet)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-[#282828] border border-white/[0.08] p-2.5">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase block">Trigger</span>
                  <span className="text-[11px] font-bold text-zinc-200 mt-1 block truncate">
                    {exhibit.memoryCard.trigger}
                  </span>
                </div>
                <div className="rounded-lg bg-[#282828] border border-white/[0.08] p-2.5">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase block">Invariant</span>
                  <span className="text-[11px] font-bold text-zinc-200 mt-1 block truncate">
                    {exhibit.memoryCard.invariant}
                  </span>
                </div>
                <div className="rounded-lg bg-[#282828] border border-white/[0.08] p-2.5">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase block">Complexity</span>
                  <span className="text-[11px] font-bold text-[#00b8a3] mt-1 block truncate">
                    {exhibit.memoryCard.complexity}
                  </span>
                </div>
                <div className="rounded-lg bg-[#282828] border border-white/[0.08] p-2.5">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase block">Golden Rule</span>
                  <span className="text-[11px] font-bold text-[#ffa116] mt-1 block truncate">
                    {exhibit.memoryCard.goldenRule}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 12. Curated LeetCode Practice Track */}
          {exhibit.practiceProblems && exhibit.practiceProblems.length > 0 && (
            <div className="rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00b8a3]">
                  <Target size={14} /> Curated LeetCode Practice Track ({exhibit.practiceProblems.length} Problems)
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                {exhibit.practiceProblems.map((prob, idx) => {
                  let diffColor = "border-[#00b8a3]/20 bg-[#00b8a3]/10 text-[#00b8a3]"
                  if (prob.difficulty === "Medium") diffColor = "border-[#ffc01e]/20 bg-[#ffc01e]/10 text-[#ffc01e]"
                  if (prob.difficulty === "Hard") diffColor = "border-[#ef4743]/20 bg-[#ef4743]/10 text-[#ef4743]"

                  return (
                    <div key={idx} className="rounded-lg border border-white/[0.08] bg-[#282828] p-3 space-y-1.5 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${diffColor}`}>
                            {prob.difficulty}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">#{idx + 1}</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-100">{prob.title}</h4>
                        <p className="text-[10.5px] text-zinc-400 leading-snug">{prob.clue}</p>
                      </div>

                      <a
                        href={`https://leetcode.com/problems/${prob.slug}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-1.5 rounded bg-[#00b8a3]/15 border border-[#00b8a3]/30 py-1 text-[10.5px] font-mono font-bold text-[#00b8a3] hover:bg-[#00b8a3]/25 transition-colors"
                      >
                        <span>Solve Problem</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  )
}
