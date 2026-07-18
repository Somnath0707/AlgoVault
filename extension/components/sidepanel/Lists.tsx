import React, { useEffect, useState, useMemo } from "react"
import { Lightbulb } from "lucide-react"
import { Card } from "../ui/Card"
import { ProgressBar } from "../ui/ProgressBar"
import { STUDY_LISTS } from "../../lib/study-lists"
import { normalizeZerotracPayload } from "../../lib/zerotrac"
import { motion, AnimatePresence } from "framer-motion"

export const Lists = () => {
  const [activeList, setActiveList] = useState<"neetcode" | "striver" | "zerotrac">("neetcode")
  const [solvedSlugs, setSolvedSlugs] = useState<Set<string>>(new Set())
  const [zerotracData, setZerotracData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // ZeroTrac Filters state
  const [keyword, setKeyword] = useState("")
  const [contestNumber, setContestNumber] = useState("")
  const [ratingMin, setRatingMin] = useState<number>(1600)
  const [ratingMax, setRatingMax] = useState<number>(1700)
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">("all")
  const [currentPage, setCurrentPage] = useState(1)

  // Topic expansion state for study lists
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setLoading(true)
    Promise.all([
      new Promise<string[]>((resolve) => {
        chrome.runtime.sendMessage({ action: "get_solved_problem_slugs" }, (res) => {
          resolve(res?.ok && Array.isArray(res.data) ? res.data : [])
        })
      }),
      new Promise<any[]>((resolve) => {
        chrome.runtime.sendMessage({ action: "get_zerotrac" }, (res) => {
          resolve(normalizeZerotracPayload(res))
        })
      })
    ]).then(([slugs, zerotrac]) => {
      setSolvedSlugs(new Set(slugs))
      setZerotracData(zerotrac)
      setLoading(false)
    }).catch((err) => {
      console.error("Failed to load list details:", err)
      setLoading(false)
    })
  }, [])

  // Find NeetCode and Striver list objects
  const neetcodeList = STUDY_LISTS.find(l => l.id === "neetcode-150")
  const striverList = STUDY_LISTS.find(l => l.id === "striver-sde")

  const currentStudyList = activeList === "neetcode" ? neetcodeList : striverList
  const nextStudyProblem = currentStudyList?.problems.find((problem) => !solvedSlugs.has(problem.slug))

  // Calculate solved stats for current study list
  const listStats = useMemo(() => {
    if (!currentStudyList) return { total: 0, solved: 0, percent: 0 }
    const total = currentStudyList.problems.length
    const solved = currentStudyList.problems.filter(p => solvedSlugs.has(p.slug)).length
    const percent = total > 0 ? Math.round((solved / total) * 100) : 0
    return { total, solved, percent }
  }, [currentStudyList, solvedSlugs])

  // Group study list problems by topic
  const groupedProblems = useMemo(() => {
    if (!currentStudyList) return {}
    const groups: Record<string, typeof currentStudyList.problems> = {}
    currentStudyList.problems.forEach(p => {
      groups[p.topic] = groups[p.topic] || []
      groups[p.topic].push(p)
    })
    return groups
  }, [currentStudyList])

  // Initialize expanded topics to true
  useEffect(() => {
    if (currentStudyList) {
      const initial: Record<string, boolean> = {}
      currentStudyList.problems.forEach(p => {
        initial[p.topic] = true
      })
      setExpandedTopics(initial)
    }
  }, [activeList])

  // Filter ZeroTrac problems
  const filteredZerotrac = useMemo(() => {
    if (!zerotracData.length) return []
    return zerotracData.filter((p) => {
      // 1. Rating Interval
      const rating = p.Rating || 0
      if (rating < ratingMin || rating > ratingMax) return false

      // 2. Keyword Match (Title or Slug)
      if (keyword) {
        const query = keyword.toLowerCase()
        const titleMatch = p.Title && typeof p.Title === "string" && p.Title.toLowerCase().includes(query)
        const slugMatch = p.TitleSlug && typeof p.TitleSlug === "string" && p.TitleSlug.toLowerCase().includes(query)
        if (!titleMatch && !slugMatch) return false
      }

      // 3. Contest ID/Number Match
      if (contestNumber) {
        const query = contestNumber.toLowerCase()
        const contestMatch = p.ContestID_en && p.ContestID_en.toLowerCase().includes(query)
        const contestSlugMatch = p.ContestSlug && p.ContestSlug.toLowerCase().includes(query)
        if (!contestMatch && !contestSlugMatch) return false
      }

      // 4. Status Check
      const isSolved = solvedSlugs.has(p.TitleSlug)
      if (statusFilter === "open" && isSolved) return false
      if (statusFilter === "done" && !isSolved) return false

      return true
    }).sort((a, b) => b.Rating - a.Rating)
  }, [zerotracData, keyword, contestNumber, ratingMin, ratingMax, statusFilter, solvedSlugs])

  // Pagination bounds
  const totalItems = filteredZerotrac.length
  const totalPages = Math.max(1, Math.ceil(totalItems / 15))
  
  // Constrain currentPage to boundaries
  const activePage = Math.min(totalPages, Math.max(1, currentPage))

  const paginatedItems = useMemo(() => {
    return filteredZerotrac.slice((activePage - 1) * 15, activePage * 15)
  }, [filteredZerotrac, activePage])

  // Generate page numbers
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | string)[] = [1]
    
    if (activePage > 3) {
      pages.push("...")
    }
    
    const start = Math.max(2, activePage - 1)
    const end = Math.min(totalPages - 1, activePage + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    if (activePage < totalPages - 2) {
      pages.push("...")
    }
    
    pages.push(totalPages)
    return pages
  }, [activePage, totalPages])

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }))
  }

  const handleResetFilters = () => {
    setKeyword("")
    setContestNumber("")
    setRatingMin(1600)
    setRatingMax(1700)
    setStatusFilter("all")
    setCurrentPage(1)
  }

  if (loading) {
    return <div className="p-4 text-center text-zinc-500 text-xs font-mono animate-pulse">Loading study sheets...</div>
  }

  return (
    <div className="grid gap-3.5 font-sans select-none">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="panel-label">Practice tracks</div>
          <p className="mt-1 text-[11px] text-zinc-500">Structured paths when you want the next right problem without the noise.</p>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">{solvedSlugs.size} solved</span>
      </div>
      {/* List Type Switcher */}
      <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 shadow-inner">
        {(["neetcode", "striver", "zerotrac"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setActiveList(opt)
              setCurrentPage(1)
            }}
            className={`flex-1 text-[10px] font-semibold py-2 rounded-md transition-all font-mono ${
              activeList === opt 
                ? "bg-zinc-900 text-[#dfa054] border border-zinc-800/80 shadow" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {opt === "neetcode" ? "NeetCode 150" : opt === "striver" ? "Striver SDE" : "ZeroTrac"}
          </button>
        ))}
      </div>

      {activeList !== "zerotrac" ? (
        // NeetCode & Striver Lists Rendering
        <div className="grid gap-3.5">
          {nextStudyProblem && (
            <Card className="relative overflow-hidden border-[#dfa054]/30 bg-gradient-to-br from-[#1c140c] to-[#0a0a0a] p-0 shadow-[0_8px_30px_rgba(223,160,84,0.15)] group">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#dfa054] to-[#f6ce8e] shadow-[0_0_12px_rgba(223,160,84,0.8)]" />
              <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-20 pointer-events-none">
                <Lightbulb size={120} className="text-[#dfa054] -rotate-12 transform translate-x-1/4 -translate-y-1/4" />
              </div>
              <div className="flex items-center justify-between gap-4 p-5 pl-6 relative z-10">
                <div className="min-w-0">
                  <div className="panel-label tracking-widest text-[#dfa054]/80">Continue {currentStudyList?.name}</div>
                  <div className="mt-1.5 truncate text-lg font-bold text-zinc-50 drop-shadow-md">{nextStudyProblem.title}</div>
                  <div className="mt-1.5 text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{nextStudyProblem.topic} <span className="mx-1.5 text-zinc-600">•</span> {listStats.solved}/{listStats.total} complete</div>
                </div>
                <a
                  href={`https://leetcode.com/problems/${nextStudyProblem.slug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg bg-gradient-to-r from-[#dfa054] to-[#c78b40] px-4 py-2.5 text-[11px] font-extrabold text-[#111] transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(223,160,84,0.4)] tracking-wide shadow-md"
                >
                  Open Problem
                </a>
              </div>
            </Card>
          )}
          {/* Progress Header */}
          <Card className="p-4 bg-[#111] border border-zinc-900/80 shadow-inner">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold tracking-widest text-zinc-300 uppercase">{currentStudyList?.name} Progress</span>
              <span className="font-mono text-[#dfa054] font-bold tabular-nums text-sm drop-shadow-[0_0_8px_rgba(223,160,84,0.3)]">
                {listStats.solved} / {listStats.total} <span className="text-zinc-500 font-normal ml-1">({listStats.percent}%)</span>
              </span>
            </div>
            <ProgressBar progress={listStats.percent} />
          </Card>

          {/* Grouped Topics list */}
          <div className="flex flex-col gap-2.5">
            {Object.entries(groupedProblems).map(([topic, problems]) => {
              const isExpanded = !!expandedTopics[topic]
              const topicSolved = problems.filter(p => solvedSlugs.has(p.slug)).length
              const topicTotal = problems.length
              const isTopicComplete = topicSolved === topicTotal

              return (
                <Card 
                  key={topic} 
                  className={`overflow-hidden transition-all duration-300 relative border shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${
                    isTopicComplete 
                      ? 'border-[#ffffff0a] bg-[#161616] opacity-90 shadow-[inset_0_1px_0_rgba(16,185,129,0.2)]' 
                      : isExpanded 
                      ? 'border-[#ffffff0a] bg-[#161616]'
                      : 'border-[#ffffff05] bg-[#121212] hover:border-[#ffffff0a] hover:bg-[#161616]'
                  }`}
                >
                  {/* Topic Header Toggle */}
                  <button
                    onClick={() => toggleTopic(topic)}
                    className="w-full px-4 py-4 flex justify-between items-center hover:bg-white/5 transition-colors outline-none focus-visible:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] transition-transform duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${isExpanded ? "rotate-90 text-[#dfa054]" : "rotate-0 text-zinc-500"}`}>▶</span>
                      <span className={`text-[13px] font-semibold tracking-wide ${isTopicComplete ? "text-zinc-400" : "text-zinc-200"}`}>{topic}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-medium text-zinc-500 font-mono tabular-nums">
                        {topicSolved}/{topicTotal} solved
                      </span>
                      {isTopicComplete && (
                        <span className="text-[9px] text-emerald-500/80 bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Complete</span>
                      )}
                    </div>
                  </button>

                  {/* Topic Problems List */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="px-4 pb-4 pt-1 flex flex-col gap-1.5 bg-gradient-to-b from-[#161616] to-[#0f0f0f] overflow-hidden"
                      >
                        {problems.map((p, idx) => {
                          const isSolved = solvedSlugs.has(p.slug)
                          const difficulty = (p.difficulty || "medium").toLowerCase()
                          
                          let diffColor = "text-amber-400 bg-amber-500/10 border-amber-500/20"
                          if (difficulty === "easy") {
                            diffColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          } else if (difficulty === "hard") {
                            diffColor = "text-red-400 bg-red-500/10 border-red-500/20"
                          }
                          
                          if (isSolved) {
                            diffColor = "text-zinc-600 border-zinc-800 bg-transparent"
                          }

                          return (
                            <motion.div 
                              key={idx} 
                              whileHover={{ scale: 1.01, x: 2 }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className="flex items-center justify-between py-3 px-3.5 hover:bg-zinc-800/40 hover:shadow-lg rounded-lg border border-transparent hover:border-zinc-700/50 group transition-all duration-200 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Sleek Checkbox */}
                                <span 
                                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                                    isSolved 
                                      ? "bg-emerald-500 border-emerald-500 text-zinc-950 shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                                      : "border-zinc-700 bg-zinc-900 text-transparent group-hover:border-zinc-500"
                                  }`}
                                >
                                  {isSolved && (
                                    <svg className="w-2.5 h-2.5 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                  )}
                                </span>
                                <a
                                  href={`https://leetcode.com/problems/${p.slug}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`truncate font-sans text-[14px] leading-snug tracking-wide ${
                                    isSolved ? "text-zinc-500 font-medium" : "text-zinc-200 font-semibold group-hover:text-white"
                                  }`}
                                >
                                  {p.title}
                                </a>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {!isSolved && (
                                  <a
                                    href={`https://leetcode.com/problems/${p.slug}/solutions/`}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`Open solution discussions for ${p.title}`}
                                    className="rounded-full bg-zinc-900 p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-[#dfa054] shadow-sm"
                                  >
                                    <Lightbulb size={12} />
                                  </a>
                                )}
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${diffColor}`}>
                                  {difficulty}
                                </span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        // ZeroTrac Interactive List Rendering
        <div className="grid gap-3.5">
          <Card className="border-sky-500/15 bg-sky-500/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="panel-label">ZeroTrac explorer</div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Find a contest-rated problem by range, contest, or topic keyword. Ratings are sourced from ZeroTrac.</p>
              </div>
              <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[10px] font-mono text-sky-300">{zerotracData.length}</span>
            </div>
          </Card>
          {/* ZeroTrac Advanced Filters Form */}
          <Card className="p-4 flex flex-col gap-3.5 font-sans border-zinc-800 bg-zinc-900/10">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[9px] font-bold text-zinc-500 block mb-1.5 font-mono uppercase tracking-wider">Keyword</label>
                <input 
                  type="text" 
                  placeholder="e.g. sum" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/10 transition-all font-mono"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-zinc-500 block mb-1.5 font-mono uppercase tracking-wider">Contest number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 408" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/10 transition-all font-mono"
                  value={contestNumber}
                  onChange={(e) => {
                    setContestNumber(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            <div className="flex justify-between items-end gap-3.5 border-t border-zinc-900/60 pt-3.5">
              <div className="flex-1">
                <label className="text-[9px] font-bold text-zinc-500 block mb-1.5 font-mono uppercase tracking-wider">Rating interval</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    value={ratingMin}
                    onChange={(e) => {
                      setRatingMin(parseInt(e.target.value) || 0)
                      setCurrentPage(1)
                    }}
                    className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-center text-zinc-300 focus:outline-none focus:border-[#dfa054] font-mono"
                  />
                  <span className="text-zinc-600 font-mono">-</span>
                  <input 
                    type="number"
                    value={ratingMax}
                    onChange={(e) => {
                      setRatingMax(parseInt(e.target.value) || 0)
                      setCurrentPage(1)
                    }}
                    className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-center text-zinc-300 focus:outline-none focus:border-[#dfa054] font-mono"
                  />
                </div>
              </div>

              <button 
                onClick={handleResetFilters}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-lg px-4 py-2 text-[10px] font-bold font-mono tracking-wider uppercase transition-all"
              >
                Reset
              </button>
            </div>

            {/* Status Pills Selector */}
            <div className="border-t border-zinc-900 pt-3.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono">Status Filter:</span>
              <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-800">
                {(["all", "open", "done"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setStatusFilter(filter)
                      setCurrentPage(1)
                    }}
                    className={`text-[9px] font-bold px-3 py-1 rounded uppercase font-mono transition-colors ${
                      statusFilter === filter ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* ZeroTrac Matching Results List */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono px-1">
              <span>Matching Problems</span>
              <span>Count: <span className="text-zinc-300">{filteredZerotrac.length}</span></span>
            </div>

            {filteredZerotrac.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-600 font-mono bg-zinc-950/10 rounded-xl border border-dashed border-zinc-800">
                No matching ZeroTrac problems found.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="overflow-x-auto border border-zinc-900 rounded-xl bg-zinc-950/20 p-2.5">
                  <table className="w-full text-left border-collapse text-[10px] font-mono">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-semibold">
                        <th className="py-2.5 px-1 text-center w-[45px]">ID</th>
                        <th className="py-2.5 px-2">Title</th>
                        <th className="py-2.5 px-2">Contest</th>
                        <th className="py-2.5 px-1 text-center w-[45px]">Index</th>
                        <th className="py-2.5 px-2 text-right w-[60px]">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/40">
                      {paginatedItems.map((p, idx) => {
                        const isSolved = solvedSlugs.has(p.TitleSlug)
                        return (
                          <tr key={idx} className="hover:bg-zinc-900/20 transition-all duration-200">
                            {/* Problem ID */}
                            <td className="py-3 px-1 text-center text-zinc-500 font-mono select-none">
                              {p.ID || p.QuestionID || ""}
                            </td>
                            {/* Problem Title (with solved checkbox indicator) */}
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span 
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSolved 
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                      : "border-zinc-800 bg-zinc-950/30 text-transparent"
                                  }`}
                                  title={isSolved ? "Solved" : "Unsolved"}
                                >
                                  {isSolved && <span className="text-[8px] leading-none">✔</span>}
                                </span>
                                <a
                                  href={`https://leetcode.com/problems/${p.TitleSlug}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`hover:text-[#dfa054] transition-colors truncate font-sans text-xs ${
                                    isSolved ? "text-zinc-500 line-through font-normal" : "text-zinc-200 font-semibold"
                                  }`}
                                  title={`Open ${p.Title} on LeetCode`}
                                >
                                  {p.Title}
                                </a>
                              </div>
                            </td>
                            {/* Contest Name */}
                            <td className="py-3 px-2 text-zinc-400 truncate max-w-[110px]" title={p.ContestID_en}>
                              {p.ContestID_en || p.ContestSlug || "LeetCode Contest"}
                            </td>
                            {/* Problem Index (Q1-Q4) */}
                            <td className="py-3 px-1 text-center font-bold text-zinc-500 font-mono">
                              {p.ProblemIndex || "Q?"}
                            </td>
                            {/* Elo Rating */}
                            <td className="py-3 px-2 text-right font-bold text-zinc-300 font-mono">
                              {Math.round(p.Rating)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ZeroTrac style Pagination UI */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-zinc-950/40 border border-zinc-900 p-2.5 px-3.5 rounded-xl font-mono text-[10px] text-zinc-500">
                  <div className="flex items-center gap-1 shrink-0 select-none">
                    <span>Total {totalItems}</span>
                  </div>
                  
                  {/* Page buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Prev page button */}
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={activePage === 1}
                      className="px-2 py-0.5 rounded-md text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    
                    {pageNumbers.map((page, idx) => {
                      if (page === "...") {
                        return <span key={idx} className="px-1 py-0.5 select-none">...</span>
                      }
                      const isCurrent = activePage === page
                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(Number(page))}
                          className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                            isCurrent 
                              ? "bg-zinc-800 text-[#dfa054] border border-zinc-700/60" 
                              : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}

                    {/* Next page button */}
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={activePage === totalPages}
                      className="px-2 py-0.5 rounded-md text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>

                  {/* Go to page input */}
                  <div className="flex items-center shrink-0">
                    <span className="select-none">Go to</span>
                    <input 
                      type="text" 
                      defaultValue={activePage}
                      key={activePage} // Reset value on page change
                      className="w-8 bg-zinc-900 border border-zinc-800 rounded-md text-center text-[10px] text-zinc-300 font-mono py-0.5 ml-1.5 focus:outline-none focus:border-[#dfa054]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseInt((e.target as HTMLInputElement).value)
                          if (val >= 1 && val <= totalPages) {
                            setCurrentPage(val)
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
