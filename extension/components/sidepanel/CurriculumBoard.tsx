import React, { useState, useEffect } from "react"
import {
  Search,
  Brain,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  BookOpen,
  Filter,
  Dna
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  PATTERN_TIERS,
  ALL_PATTERNS,
  type AlgorithmicPattern,
  getPatternExhibit
} from "../../lib/patterns-data"
import { PatternExhibitModal } from "./PatternExhibitModal"

const STORAGE_KEY_LEARNED = "algovault.masteredPatterns"

export function CurriculumBoard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTier, setSelectedTier] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [showOnlyMastered, setShowOnlyMastered] = useState(false)
  const [masteredPatterns, setMasteredPatterns] = useState<Record<string, boolean>>({})
  const [activePattern, setActivePattern] = useState<AlgorithmicPattern | null>(null)

  // Load mastered state from chrome.storage.local
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get([STORAGE_KEY_LEARNED], (result) => {
        if (result[STORAGE_KEY_LEARNED]) {
          setMasteredPatterns(result[STORAGE_KEY_LEARNED])
        }
      })
    }
  }, [])

  const toggleMastered = (patternId: string) => {
    const updated = { ...masteredPatterns, [patternId]: !masteredPatterns[patternId] }
    setMasteredPatterns(updated)
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ [STORAGE_KEY_LEARNED]: updated })
    }
  }

  // Filtering Logic
  const filteredTiers = PATTERN_TIERS.map((tier) => {
    const patterns = tier.patterns.filter((p) => {
      if (selectedTier !== "all" && tier.id !== selectedTier) return false
      if (selectedDifficulty !== "all" && p.difficulty !== selectedDifficulty) return false
      if (showOnlyMastered && !masteredPatterns[p.id]) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = p.title.toLowerCase().includes(query)
        const matchesTrigger = p.trigger.toLowerCase().includes(query)
        const matchesTags = p.tags.some((t) => t.toLowerCase().includes(query))
        return matchesTitle || matchesTrigger || matchesTags
      }
      return true
    })
    return { ...tier, patterns }
  }).filter((t) => t.patterns.length > 0)

  const totalPatterns = ALL_PATTERNS.length
  const totalMastered = Object.values(masteredPatterns).filter(Boolean).length

  // Intuition Trainer State
  const [showTrainer, setShowTrainer] = useState(false)
  const [trainerIndex, setTrainerIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [trainerScore, setTrainerScore] = useState(0)

  const quizPattern = ALL_PATTERNS[trainerIndex % ALL_PATTERNS.length]
  const quizExhibit = getPatternExhibit(quizPattern.id)

  const quizOptions = React.useMemo(() => {
    const wrong = ALL_PATTERNS.filter((p) => p.id !== quizPattern.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)
    const options = [quizPattern, ...wrong].sort(() => 0.5 - Math.random())
    return options
  }, [trainerIndex, quizPattern.id])

  const handleOptionSelect = (pId: string) => {
    if (selectedOption) return
    setSelectedOption(pId)
    if (pId === quizPattern.id) {
      setTrainerScore((prev) => prev + 1)
    }
  }

  const nextQuestion = () => {
    setSelectedOption(null)
    setTrainerIndex((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a1a] text-zinc-100 font-sans p-4 sm:p-6 space-y-6">
      
      {/* ─── Header: Product Vision & Identity ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#ffa116]/30 bg-[#ffa116]/10 text-[#ffa116]">
              <Brain size={13} />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#ffa116]">
              Pattern Academy · Algorithmic Intuition Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Learn Patterns, Not Solutions
          </h1>
          <p className="mt-1 text-xs text-zinc-400 max-w-xl leading-relaxed">
            Master the mental models, invariants, and trigger signals that solve hundreds of competitive programming and interview problems.
          </p>
        </div>

        {/* Mastered Matrix Counter Pill & Trainer Toggle */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowTrainer(!showTrainer)}
            className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-all text-left font-mono cursor-pointer ${
              showTrainer
                ? "border-[#ffa116]/40 bg-[#333333] text-[#ffa116]"
                : "border-white/[0.08] bg-[#282828] text-zinc-300 hover:bg-[#333333]"
            }`}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[#ffa116] border border-white/[0.08]">
              <Zap size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100 leading-tight whitespace-nowrap">
                Trainer
              </div>
              <span className="text-[9px] font-mono uppercase text-[#ffa116] block mt-0.5 font-semibold whitespace-nowrap">
                {showTrainer ? "ACTIVE" : "PRACTICE"}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#282828] p-2.5 font-mono">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[#00b8a3] border border-white/[0.08]">
              <Dna size={16} />
            </div>
            <div>
              <div className="flex items-baseline gap-1 text-xs font-bold text-zinc-100 leading-tight whitespace-nowrap">
                <span className="text-sm">{totalMastered}</span>
                <span className="text-zinc-500 text-[10px]">/ {totalPatterns}</span>
              </div>
              <span className="text-[9px] font-mono uppercase text-zinc-500 block mt-0.5 font-semibold whitespace-nowrap">
                MASTERED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Pattern Intuition Trainer Quiz Card ───────────────────────────── */}
      <AnimatePresence>
        {showTrainer && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#282828] p-5 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffa116]/20 text-[#ffa116] text-[10px] font-bold">
                  <Zap size={11} />
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#ffa116]">
                  Pattern Recognition Challenge
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
                <span>Score: <strong className="text-emerald-400">{trainerScore}</strong></span>
                <button
                  onClick={nextQuestion}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-200 hover:bg-zinc-800"
                >
                  Skip <ChevronRight size={12} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
                Interview Clue / Mental Signal:
              </div>
              <blockquote className="rounded-xl border border-white/10 bg-[#1e1e20] p-4 text-sm font-semibold text-zinc-100 italic leading-relaxed">
                "{quizExhibit.mentalTrigger || quizPattern.trigger}"
              </blockquote>

              <div className="text-xs font-mono text-zinc-400 mt-2">
                Which algorithmic pattern fits this problem clue best?
              </div>

              {/* 4 Quiz Options */}
              <div className="grid sm:grid-cols-2 gap-2.5 mt-2">
                {quizOptions.map((opt) => {
                  const isChoice = selectedOption === opt.id
                  const isCorrect = opt.id === quizPattern.id
                  let btnStyle = "border-white/10 bg-[#282828] text-zinc-300 hover:border-white/20"

                  if (selectedOption) {
                    if (isCorrect) {
                      btnStyle = "border-[#00b8a3]/50 bg-[#00b8a3]/15 text-[#00b8a3] font-bold"
                    } else if (isChoice) {
                      btnStyle = "border-rose-500/50 bg-rose-500/15 text-rose-300 font-bold"
                    } else {
                      btnStyle = "border-white/5 bg-[#1e1e20]/40 text-zinc-600 opacity-40"
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionSelect(opt.id)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold text-left transition-all ${btnStyle}`}
                    >
                      <span>{opt.title}</span>
                      <span className="text-[10px] font-mono text-zinc-500">{opt.difficulty}</span>
                    </button>
                  )
                })}
              </div>

              {/* Instant Explanation Feedback */}
              {selectedOption && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-white/10 bg-[#1e1e20] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold font-mono">
                      {selectedOption === quizPattern.id ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Correct Intuition!
                        </span>
                      ) : (
                        <span className="text-rose-400">
                          Incorrect. The matching pattern is {quizPattern.title}.
                        </span>
                      )}
                    </div>
                    <button
                      onClick={nextQuestion}
                      className="flex items-center gap-1.5 rounded-lg bg-[#ffa116] px-3 py-1 text-xs font-bold text-[#1a1a1a] hover:bg-[#ffa116]/90 cursor-pointer"
                    >
                      Next Question <ChevronRight size={13} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    <strong>Core Insight:</strong> {quizExhibit.coreInsight}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Search & Interactive Filter Controls ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search triggers, patterns, or data structures (e.g. 'range sum', 'sliding window')..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#1a1a1a] px-3.5 py-2 pl-9 text-xs text-zinc-100 placeholder-zinc-500 focus:border-[#ffa116] focus:outline-none transition-colors font-sans"
          />
        </div>

        {/* Tier & Difficulty Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
          {/* Difficulty Filters */}
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-1">
            {(["all", "Easy", "Medium", "Hard"] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedDifficulty === diff
                    ? "bg-[#333333] text-white font-bold shadow-sm border border-white/[0.12]"
                    : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                }`}
              >
                {diff === "all" ? "All Diff" : diff}
              </button>
            ))}
          </div>

          {/* Tier Filters */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1a1a1a] p-1">
            <button
              onClick={() => setSelectedTier("all")}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                selectedTier === "all"
                  ? "bg-[#ffa116] text-[#1a1a1a] font-bold shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All Tiers
            </button>
            {PATTERN_TIERS.map((tier, idx) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  selectedTier === tier.id
                    ? "bg-[#ffa116] text-[#1a1a1a] font-bold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Tier {idx + 1}
              </button>
            ))}
            <button
              onClick={() => setShowOnlyMastered(!showOnlyMastered)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                showOnlyMastered
                  ? "border-[#00b8a3]/40 bg-[#00b8a3]/15 text-[#00b8a3] font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CheckCircle2 size={12} /> Mastered
            </button>
          </div>
        </div>
      </div>

      {/* ─── Pattern Ecosystem Matrix Grid ─────────────────────────────────── */}
      <div className="space-y-8">
        {filteredTiers.map((tier) => (
          <div key={tier.id} className="space-y-3.5">
            
            {/* Tier Section Header */}
            <div className="flex items-baseline justify-between border-b border-white/[0.06] pb-2">
              <div>
                <h2 className="text-sm font-bold text-zinc-200 font-sans tracking-wide">
                  {tier.title}
                </h2>
                <p className="text-[11px] text-zinc-500">{tier.subtitle}</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {tier.patterns.length} Patterns
              </span>
            </div>

            {/* Pattern Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {tier.patterns.map((pattern) => {
                const isMastered = !!masteredPatterns[pattern.id]
                const diffColor =
                  pattern.difficulty === "Beginner"
                    ? "text-[#00b8a3] bg-[#00b8a3]/10 border-[#00b8a3]/20"
                    : pattern.difficulty === "Intermediate"
                    ? "text-sky-400 bg-sky-400/10 border-sky-400/20"
                    : pattern.difficulty === "Advanced"
                    ? "text-[#ffc01e] bg-[#ffc01e]/10 border-[#ffc01e]/20"
                    : "text-[#ef4743] bg-[#ef4743]/10 border-[#ef4743]/20"

                return (
                  <motion.div
                    key={pattern.id}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => setActivePattern(pattern)}
                    className={`group relative flex flex-col justify-between rounded-lg border p-4 cursor-pointer transition-all duration-200 ${
                      isMastered
                        ? "border-[#00b8a3]/30 bg-[#282828] hover:border-[#00b8a3]/60"
                        : "border-white/[0.08] bg-[#282828] hover:border-white/[0.16] hover:bg-[#333333]/50"
                    }`}
                  >
                    <div>
                      {/* Top Card Bar */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`rounded px-2 py-0.5 font-mono text-[9.5px] font-bold border ${diffColor}`}>
                          {pattern.difficulty}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                            <Clock size={11} /> {pattern.minutes}m
                          </span>
                          {isMastered && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00b8a3]/20 text-[#00b8a3]">
                              <CheckCircle2 size={12} />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pattern Title */}
                      <h3 className="text-sm font-bold text-zinc-100 group-hover:text-[#ffa116] transition-colors flex items-center justify-between">
                        <span>{pattern.title}</span>
                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-[#ffa116] group-hover:translate-x-0.5 transition-all" />
                      </h3>

                      {/* Mental Trigger Quote */}
                      <p className="mt-2 text-xs font-semibold text-zinc-300 italic line-clamp-2 leading-relaxed">
                        "{pattern.trigger}"
                      </p>
                    </div>

                    {/* Bottom Tag Chips */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                      {pattern.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </div>

          </div>
        ))}

        {filteredTiers.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 bg-[#222224] p-12 text-center text-zinc-500">
            <Search size={24} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-xs font-mono">No patterns match your search filter.</p>
          </div>
        )}
      </div>

      {/* ─── 18-Section Interactive Museum Exhibit Modal ───────────────────── */}
      <AnimatePresence>
        {activePattern && (
          <PatternExhibitModal
            pattern={activePattern}
            onClose={() => setActivePattern(null)}
            onMarkLearned={() => toggleMastered(activePattern.id)}
            isLearned={!!masteredPatterns[activePattern.id]}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
