import React, { useState } from "react"
import {
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
  Code2,
  Terminal,
  PlayCircle,
  Dna,
  GitCommit,
  Layers,
  Search,
  BookOpen,
  ArrowRight,
  Eye,
  Target,
  ExternalLink,
  Shield
} from "lucide-react"
import { motion } from "framer-motion"
import { type AlgorithmicPattern, getPatternExhibit } from "../../lib/patterns-data"
import { PatternSimulator, hasSimulation, generateDynamicSimulation } from "./PatternSimulator"

interface ExhibitModalProps {
  pattern: AlgorithmicPattern
  onClose: () => void
  onMarkLearned?: () => void
  isLearned?: boolean
}

// Lightweight syntax highlighter for code readability
function SyntaxHighlightedCode({ code, lang }: { code: string; lang: string }) {
  const lines = code.split("\n")

  return (
    <div className="font-mono text-xs leading-relaxed space-y-0.5">
      {lines.map((line, lineIdx) => {
        const words = line.split(/(\s+|[(){}[\];,.<>:=+\-*/])/g)
        return (
          <div key={lineIdx} className="table-row">
            <span className="table-cell pr-4 text-zinc-600 text-[10px] select-none text-right">
              {lineIdx + 1}
            </span>
            <span className="table-cell">
              {words.map((word, wordIdx) => {
                if (!word) return null

                // Keywords
                if (
                  [
                    "class", "def", "public", "private", "return", "for", "while", "if", "else",
                    "fn", "let", "mut", "const", "function", "var", "in", "import", "from",
                    "vector", "int", "size_t", "void", "struct", "impl", "new", "number"
                  ].includes(word.trim())
                ) {
                  return (
                    <span key={wordIdx} className="text-[#c678dd] font-bold">
                      {word}
                    </span>
                  )
                }

                // Types & Class Names
                if (
                  [
                    "PrefixSum", "SlidingWindow", "TwoPointers", "MonotonicStack", "Solution",
                    "Vec", "Math", "Array", "List"
                  ].includes(word.trim())
                ) {
                  return (
                    <span key={wordIdx} className="text-[#e5c07b] font-bold">
                      {word}
                    </span>
                  )
                }

                // Numbers
                if (/^\d+$/.test(word.trim())) {
                  return (
                    <span key={wordIdx} className="text-[#d19a66] font-bold">
                      {word}
                    </span>
                  )
                }

                // Comments
                if (word.startsWith("#") || word.startsWith("//")) {
                  return (
                    <span key={wordIdx} className="text-[#5c6370] italic">
                      {word}
                    </span>
                  )
                }

                // Default text
                return (
                  <span key={wordIdx} className="text-zinc-200">
                    {word}
                  </span>
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function PatternExhibitModal({ pattern, onClose, onMarkLearned, isLearned }: ExhibitModalProps) {
  const [lang, setLang] = useState<"python" | "java" | "cpp" | "rust" | "typescript">("python")
  const [copied, setCopied] = useState(false)

  const exhibit = getPatternExhibit(pattern.id)
  const showSimulator = hasSimulation(pattern.id)
  const simData = generateDynamicSimulation(pattern.id, {
    inputArray: [3, 1, 4, 2, 5],
    targetVal: 10,
    kVal: 7,
    hasCycle: true,
    gridMatrix: [[1, 1, 0], [0, 1, 0], [1, 0, 1]]
  })

  const copyCode = () => {
    const code = exhibit.templates[lang] || exhibit.templates.python
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 font-sans"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 20 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="relative flex flex-col w-full max-w-4xl h-[92vh] rounded-2xl border border-white/[0.08] bg-[#1a1a1a] text-zinc-100 shadow-2xl overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#282828] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ffa116]/30 bg-[#ffa116]/10 text-[#ffa116]">
              <Layers size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-[#ffa116]">
                  Pattern Academy Exhibit
                </span>
                <span className="text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {pattern.difficulty}
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-50">{pattern.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onMarkLearned && (
              <button
                onClick={onMarkLearned}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                  isLearned
                    ? "border border-[#00b8a3]/40 bg-[#00b8a3]/10 text-[#00b8a3]"
                    : "bg-[#00b8a3] text-zinc-950 hover:bg-[#00b8a3]/90"
                }`}
              >
                <CheckCircle2 size={13} />
                {isLearned ? "Mastered" : "Mark Mastered"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] bg-[#282828] p-1.5 text-zinc-400 hover:bg-[#333333] hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Quick-Jump Section Bar */}
        <div className="sticky top-0 z-20 flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.08] bg-[#1a1a1a] px-6 py-2 font-mono text-[10px] scrollbar-none">
          <span className="text-zinc-500 font-bold uppercase mr-1 shrink-0">Jump To:</span>
          <button onClick={() => document.getElementById("sec-trigger")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-[#ffa116] hover:border-[#ffa116]/40 shrink-0 cursor-pointer">
            <Zap size={11} /> Trigger
          </button>
          {showSimulator && (
            <button onClick={() => document.getElementById("sec-simulator")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-[#00b8a3] hover:border-[#00b8a3]/40 shrink-0 cursor-pointer">
              <PlayCircle size={11} /> Visualizer
            </button>
          )}
          <button onClick={() => document.getElementById("sec-templates")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-sky-400 hover:border-sky-500/40 shrink-0 cursor-pointer">
            <Code2 size={11} /> Templates & Trace
          </button>
          <button onClick={() => document.getElementById("sec-breakthrough")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-amber-400 hover:border-amber-500/40 shrink-0 cursor-pointer">
            <Search size={11} /> Breakthrough
          </button>
          <button onClick={() => document.getElementById("sec-pitfalls")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-rose-400 hover:border-rose-500/40 shrink-0 cursor-pointer">
            <Shield size={11} /> Pitfalls
          </button>
          <button onClick={() => document.getElementById("sec-memory")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-purple-400 hover:border-purple-500/40 shrink-0 cursor-pointer">
            <BookOpen size={11} /> Cheat Sheet
          </button>
          {exhibit.practiceProblems && exhibit.practiceProblems.length > 0 && (
            <button onClick={() => document.getElementById("sec-practice")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-1 rounded bg-[#282828] border border-white/[0.08] px-2 py-1 text-zinc-300 hover:text-[#00b8a3] hover:border-[#00b8a3]/40 shrink-0 cursor-pointer">
              <Target size={11} /> Practice ({exhibit.practiceProblems.length})
            </button>
          )}
        </div>

        {/* 18-Section Content Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-10 scrollbar-thin scrollbar-thumb-zinc-800">

          {/* SECTION 1: MENTAL TRIGGER */}
          <section id="sec-trigger" className="rounded-xl border border-white/[0.08] bg-[#282828] p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#ffa116] mb-3">
              <Zap size={14} className="text-[#ffa116]" /> 01. Mental Trigger (The Recognition Signal)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-50 leading-tight tracking-tight">
              "{exhibit.mentalTrigger}"
            </h1>
            <p className="mt-3 text-xs text-zinc-400 font-sans leading-relaxed">
              When reading an interview problem, this exact thought must surface immediately in your mind.
            </p>
          </section>

          {/* SECTION 2: LIVE INTERACTIVE SIMULATOR (BEFORE CODE & CONCEPT) */}
          {showSimulator && (
            <section id="sec-simulator" className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-emerald-400">
                <PlayCircle size={14} /> 02. Live Interactive Visual Simulator (Editable Input Array)
              </div>
              <PatternSimulator patternId={pattern.id} />
            </section>
          )}

          {/* SECTION 3: WHY BRUTE FORCE FAILS */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
              <AlertTriangle size={14} className="text-rose-400" /> 03. Why Brute Force Fails
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 block">
                  <AlertTriangle size={11} className="inline mr-1" />{exhibit.bruteForceVsPattern.bruteLabel} ({exhibit.bruteForceVsPattern.bruteTime})
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {exhibit.bruteForceVsPattern.bruteDesc}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 block">
                  <Zap size={11} className="inline mr-1" />{exhibit.bruteForceVsPattern.patternLabel} ({exhibit.bruteForceVsPattern.patternTime})
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {exhibit.bruteForceVsPattern.patternDesc}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-[#222224] border border-white/10 px-4 py-2.5 text-center text-xs font-mono text-amber-300/90">
              Operation scale: {exhibit.bruteForceVsPattern.opComparison}
            </div>
          </section>

          {/* SECTION 4: CORE INSIGHT */}
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-emerald-400 mb-2">
              <Lightbulb size={14} /> 04. Core Insight
            </div>
            <p className="text-lg font-bold text-zinc-100 italic leading-snug">
              "{exhibit.coreInsight}"
            </p>
          </section>

          {/* SECTION 5: MENTAL MODEL (METAPHOR) */}
          <section className="rounded-xl border border-white/10 bg-[#1e1e20] p-5 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-purple-400">
              <BookOpen size={14} /> 05. Mental Model Metaphor: "{exhibit.mentalModel.name}"
            </div>
            <p className="text-sm font-semibold text-zinc-200 leading-relaxed">
              {exhibit.mentalModel.metaphor}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {exhibit.mentalModel.explanation}
            </p>
          </section>

          {/* SECTION 6: VISUAL INVARIANT */}
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-5 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-amber-400">
              <Shield size={14} /> 06. The Visual Invariant
            </div>
            <p className="text-sm font-bold text-zinc-100 font-mono">
              "{exhibit.visualInvariant}"
            </p>
          </section>

          {/* SECTION 7: UNIVERSAL PSEUDOCODE */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
              <Terminal size={14} className="text-[#ffa116]" /> 07. Universal Pseudocode (Language Independent)
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#060608] p-4 font-mono text-xs text-zinc-200 space-y-1 overflow-x-auto shadow-inner">
              {exhibit.universalPseudocode.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-zinc-600 mr-3 select-none">{idx + 1}</span>
                  {line}
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 8: IMPLEMENTATION TEMPLATES WITH SYNTAX COLORING & DRY RUN TRACE */}
          <section id="sec-templates" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
                <Code2 size={14} className="text-sky-400" /> 08. Production Templates & Dry Run Trace
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-white/10 bg-[#222224] p-0.5 font-mono text-[10px]">
                  {(["python", "java", "cpp", "rust", "typescript"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-2.5 py-1 rounded-md uppercase font-bold transition-all ${
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
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#282828] px-3 py-1.5 text-xs font-mono font-semibold text-zinc-300 hover:bg-[#333333] transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Syntax Colored Code Box */}
            <div className="rounded-xl border border-white/10 bg-[#1c1d20] p-4 overflow-x-auto shadow-inner">
              <SyntaxHighlightedCode
                code={exhibit.templates[lang] || exhibit.templates.python}
                lang={lang}
              />
            </div>

            {/* Dry Run Example Trace Block */}
            <div className="rounded-xl border border-white/10 bg-[#1e1e20] p-4 font-mono text-xs space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <ArrowRight size={13} /> Dry Run Example Execution Trace ({simData.title})
              </div>
              <p className="text-zinc-400 text-[11px]">
                {simData.subtitle}
              </p>
              <div className="rounded-lg bg-[#252528] border border-white/10 p-3 text-[10.5px] text-zinc-300 space-y-1.5 max-h-48 overflow-y-auto font-mono">
                {simData.steps.map((st, idx) => (
                  <div key={idx} className="leading-relaxed flex items-start gap-2">
                    <span className="text-[#ffa116] font-bold shrink-0">Step {st.stepIndex}:</span>
                    <span className="text-zinc-200">{st.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 11: PATTERN DNA */}
          <section className="rounded-xl border border-white/[0.08] bg-[#282828] p-6 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#ffa116]">
              <Dna size={16} /> 11. Pattern DNA Collectible Card
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-zinc-800/80 bg-black/40 p-3">
                <span className="text-[9px] text-zinc-500 uppercase block">Time Complexity</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">{exhibit.dnaCard.timeComplexity}</span>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-black/40 p-3">
                <span className="text-[9px] text-zinc-500 uppercase block">Space Complexity</span>
                <span className="text-sm font-bold text-sky-400 mt-1 block">{exhibit.dnaCard.spaceComplexity}</span>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-black/40 p-3">
                <span className="text-[9px] text-zinc-500 uppercase block">Constraints</span>
                <span className="text-sm font-bold text-amber-400 mt-1 block">{exhibit.dnaCard.typicalConstraints}</span>
              </div>
              <div className="rounded-xl border border-zinc-800/80 bg-black/40 p-3">
                <span className="text-[9px] text-zinc-500 uppercase block">Interview Freq</span>
                <span className="text-sm font-bold text-purple-400 mt-1 block">{exhibit.dnaCard.interviewFrequency}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#1a1a1a] p-3.5 text-center text-xs font-mono">
              <span className="text-zinc-400">Golden Formula: </span>
              <strong className="text-[#ffa116]">{exhibit.dnaCard.goldenFormula}</strong>
            </div>
          </section>

          {/* REPLACED QUIZ WITH: DEEP PATTERN BREAKTHROUGH WALKTHROUGH */}
          <section id="sec-breakthrough" className="rounded-xl border border-white/10 bg-[#1e1e20] p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#ffa116]">
              <Lightbulb size={14} className="text-[#ffa116]" /> Real Interview Problem Breakthrough
            </div>
            
            <div className="space-y-3">
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-3.5 text-xs space-y-1">
                <span className="text-[9.5px] font-mono font-bold uppercase text-sky-400 block">
                  <Search size={11} className="inline mr-1" />Problem clue recognition{exhibit.problemBreakthrough?.title ? `: ${exhibit.problemBreakthrough.title}` : ""}
                </span>
                <p className="text-zinc-200 font-semibold leading-relaxed">
                  "{exhibit.problemBreakthrough?.problemStatement || exhibit.mentalTrigger}"
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3 space-y-1">
                  <span className="text-[9px] font-mono uppercase text-rose-400 font-bold block">
                    <AlertTriangle size={11} className="inline mr-1" />Naive approach
                  </span>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    {exhibit.problemBreakthrough?.naiveApproach || exhibit.bruteForceVsPattern?.bruteDesc}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-1">
                  <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold block">
                    <Zap size={11} className="inline mr-1" />Pattern approach
                  </span>
                  <p className="text-zinc-300 leading-relaxed text-[11px]">
                    {exhibit.problemBreakthrough?.patternRevelation || exhibit.coreInsight}
                  </p>
                </div>
              </div>

              {exhibit.problemBreakthrough?.keyEquation && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-center text-xs font-mono text-amber-300">
                  Key Equation / Invariant: <strong>{exhibit.problemBreakthrough.keyEquation}</strong>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 13: COMMON ILLUSIONS */}
          {exhibit.illusions.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-[#1e1e20] p-5 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
                <Eye size={14} /> 13. Common Illusions & Disambiguation
              </div>
              {exhibit.illusions.map((ill, idx) => (
                <div key={idx} className="rounded-lg border border-white/10 bg-[#252528] p-3.5 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <span>Looks like {ill.looksLike}</span>
                    <span>→</span>
                    <span className="text-emerald-400">Actually {ill.actuallyIs}</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">{ill.keyDifference}</p>
                </div>
              ))}
            </section>
          )}

          {/* SECTION 14: PATTERN EVOLUTION */}
          <section className="rounded-xl border border-white/10 bg-[#1e1e20] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
              <GitCommit size={14} className="text-[#ffa116]" /> 14. Pattern Evolutionary Path
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {exhibit.evolution.map((evo, idx) => (
                <React.Fragment key={idx}>
                  <div className="rounded-lg border border-white/10 bg-[#252528] px-3 py-2 text-xs font-mono">
                    <span className="text-[9px] text-[#ffa116] block">{evo.stage}</span>
                    <strong className="text-zinc-100">{evo.name}</strong>
                  </div>
                  {idx < exhibit.evolution.length - 1 && <span className="text-zinc-600">→</span>}
                </React.Fragment>
              ))}
            </div>
          </section>

          {/* SECTION 15: PATTERN FAMILY TREE */}
          <section className="rounded-xl border border-white/10 bg-[#1e1e20] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
              <Layers size={14} className="text-purple-400" /> 15. Ecosystem Family Connections
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-lg border border-white/10 bg-[#252528] p-3">
                <span className="text-[9px] text-zinc-500 block uppercase">Evolves Into</span>
                <span className="text-zinc-200 font-bold">{exhibit.familyTree.children.join(", ") || "End of Chain"}</span>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#252528] p-3">
                <span className="text-[9px] text-zinc-500 block uppercase">Confused With</span>
                <span className="text-amber-300 font-bold">{exhibit.familyTree.confusedWith.join(", ") || "None"}</span>
              </div>
            </div>
          </section>

          {/* SECTION 16: INTERVIEW RECOGNITION SIGNALS */}
          <section className="rounded-xl border border-white/10 bg-[#1e1e20] p-5 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-zinc-400">
              <Search size={14} className="text-sky-400" /> 16. Interview Keyword Clue Signals
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {exhibit.interviewSignals.map((sig, idx) => (
                <span key={idx} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-sky-300">
                  "{sig}"
                </span>
              ))}
            </div>
          </section>

          {/* SECTION 17: COMMON PITFALLS */}
          <section id="sec-pitfalls" className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-5 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-rose-400">
              <AlertTriangle size={14} /> 17. Real Interview Pitfalls & Bug Prevention
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside leading-relaxed">
              {exhibit.pitfalls.map((pit, idx) => (
                <li key={idx}>
                  <span>{pit}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* SECTION 18: VISUAL MEMORY CARD */}
          <section id="sec-memory" className="rounded-xl border border-white/[0.08] bg-[#282828] p-6 space-y-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#ffa116]">
              <BookOpen size={14} /> 18. Memory Card
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                <span className="text-[9px] text-zinc-500 block uppercase">Trigger</span>
                <span className="font-bold text-zinc-200 mt-1 block truncate">{exhibit.memoryCard.trigger}</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                <span className="text-[9px] text-zinc-500 block uppercase">Mental Image</span>
                <span className="font-bold text-purple-300 mt-1 block truncate">{exhibit.memoryCard.mentalImage}</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                <span className="text-[9px] text-zinc-500 block uppercase">Formula</span>
                <span className="font-bold text-[#ffa116] mt-1 block truncate">{exhibit.memoryCard.formula}</span>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
                <span className="text-[9px] text-zinc-500 block uppercase">Golden Rule</span>
                <span className="font-bold text-emerald-400 mt-1 block truncate">{exhibit.memoryCard.goldenRule}</span>
              </div>
            </div>
          </section>

          {/* SECTION 19: CURATED LEETCODE PRACTICE PROBLEMS */}
          {exhibit.practiceProblems && exhibit.practiceProblems.length > 0 && (
            <section id="sec-practice" className="rounded-xl border border-[#00b8a3]/30 bg-[#282828] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#00b8a3]">
                  <Target size={15} /> 19. Curated LeetCode Practice Track ({exhibit.practiceProblems.length} Problems)
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-[#00b8a3]/10 border border-[#00b8a3]/30 px-2 py-0.5 rounded-full font-semibold">
                  Handpicked for {pattern.title}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {exhibit.practiceProblems.map((prob, idx) => {
                  let diffColor = "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  if (prob.difficulty === "Medium") diffColor = "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  if (prob.difficulty === "Hard") diffColor = "border-rose-500/40 bg-rose-500/10 text-rose-400"

                  return (
                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${diffColor}`}>
                            {prob.difficulty}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">LeetCode #{idx + 1}</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-100">
                          {prob.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                          <strong>Pattern clue:</strong> {prob.clue}
                        </p>
                      </div>

                      <a
                        href={`https://leetcode.com/problems/${prob.slug}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                      >
                        <span>Solve on LeetCode</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-white/10 bg-[#1e1e20] px-6 py-3.5 flex items-center justify-between text-xs font-mono text-zinc-400">
          <span>AlgoVault Pattern Academy · Master Exhibit</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#282828] border border-white/10 px-4 py-1.5 font-bold text-zinc-200 hover:bg-[#333333] transition-colors"
          >
            Close Exhibit
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
