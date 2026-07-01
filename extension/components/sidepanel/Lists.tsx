import React, { useEffect, useState, useMemo } from "react"
import { Card } from "../ui/Card"
import { ProgressBar } from "../ui/ProgressBar"
import { STUDY_LISTS } from "../../lib/study-lists"

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
          resolve(Array.isArray(res) ? res : [])
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
        const titleMatch = p.Title && p.Title.toLowerCase().includes(query)
        const slugMatch = p.TitleSlug && p.TitleSlug.toLowerCase().includes(query)
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
    <div className="grid gap-4 font-sans select-none">
      {/* List Type Switcher */}
      <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900 shadow-inner">
        {(["neetcode", "striver", "zerotrac"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setActiveList(opt)
              setCurrentPage(1)
            }}
            className={`flex-1 text-[10px] font-bold py-2 rounded-md transition-all uppercase tracking-wider font-mono ${
              activeList === opt 
                ? "bg-zinc-900 text-[#dfa054] border border-zinc-800/80 shadow" 
                : "text-zinc-500 hover:text-zinc-350"
            }`}
          >
            {opt === "neetcode" ? "NeetCode 150" : opt === "striver" ? "Striver SDE" : "ZeroTrac"}
          </button>
        ))}
      </div>

      {activeList !== "zerotrac" ? (
        // NeetCode & Striver Lists Rendering
        <div className="grid gap-4">
          {/* Progress Header */}
          <Card className="p-3.5 bg-zinc-900/10 border-zinc-800/80">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-zinc-300">{currentStudyList?.name} Progress</span>
              <span className="font-mono text-[#dfa054] font-bold tabular-nums">
                {listStats.solved} / {listStats.total} <span className="text-zinc-500 font-normal">({listStats.percent}%)</span>
              </span>
            </div>
            <ProgressBar progress={listStats.percent} />
          </Card>

          {/* Grouped Topics list */}
          <div className="flex flex-col gap-3">
            {Object.entries(groupedProblems).map(([topic, problems]) => {
              const isExpanded = !!expandedTopics[topic]
              const topicSolved = problems.filter(p => solvedSlugs.has(p.slug)).length
              const topicTotal = problems.length
              const isTopicComplete = topicSolved === topicTotal

              return (
                <Card 
                  key={topic} 
                  className={`overflow-hidden border transition-all duration-300 relative ${
                    isTopicComplete 
                      ? 'border-emerald-500/25 bg-emerald-950/5 shadow-[0_2px_12px_rgba(16,185,129,0.02)]' 
                      : isExpanded 
                      ? 'border-zinc-800 bg-zinc-900/10'
                      : 'border-zinc-900 bg-zinc-950/20 hover:border-zinc-850'
                  }`}
                >
                  {/* Left Complete Indicator Line */}
                  {isTopicComplete && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  )}

                  {/* Topic Header Toggle */}
                  <button
                    onClick={() => toggleTopic(topic)}
                    className="w-full px-4 py-3.5 flex justify-between items-center hover:bg-zinc-900/20 transition-colors border-b border-zinc-900/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? "rotate-90 text-[#dfa054]" : "rotate-0 text-zinc-550"}`}>▶</span>
                      <span className={`text-xs font-bold ${isTopicComplete ? "text-emerald-400 pl-1" : "text-zinc-250"}`}>{topic}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                        {topicSolved}/{topicTotal} solved
                      </span>
                      {isTopicComplete && (
                        <span className="text-[8px] text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">Complete</span>
                      )}
                    </div>
                  </button>

                  {/* Topic Problems List */}
                  {isExpanded && (
                    <div className="px-4 pb-3.5 pt-2 flex flex-col gap-2 bg-zinc-950/15">
                      {problems.map((p, idx) => {
                        const isSolved = solvedSlugs.has(p.slug)
                        const difficulty = (p.difficulty || "medium").toLowerCase()
                        
                        let diffColor = "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        if (difficulty === "easy") {
                          diffColor = "text-emerald-450 bg-emerald-500/10 border-emerald-500/20"
                        } else if (difficulty === "hard") {
                          diffColor = "text-red-400 bg-red-500/10 border-red-500/20"
                        }

                        return (
                          <div key={idx} className="flex items-center justify-between text-xs py-1.5 hover:bg-zinc-900/30 rounded-lg px-2 group transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Round Checkbox */}
                              <span 
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                  isSolved 
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-450 scale-105" 
                                    : "border-zinc-800 bg-zinc-950/30 text-transparent group-hover:border-zinc-700"
                                }`}
                              >
                                {isSolved && <span className="text-[9px] leading-none">✔</span>}
                              </span>
                              <a
                                href={`https://leetcode.com/problems/${p.slug}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`hover:text-[#dfa054] transition-colors truncate font-sans text-xs ${
                                  isSolved ? "text-zinc-550 line-through" : "text-zinc-300 font-medium"
                                }`}
                                title={`Open ${p.title} on LeetCode`}
                              >
                                {p.title}
                              </a>
                            </div>
                            <span className={`text-[8px] font-mono shrink-0 px-2 py-0.5 rounded border uppercase tracking-wider font-bold ${diffColor}`}>
                              {difficulty}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      ) : (
        // ZeroTrac Interactive List Rendering
        <div className="grid gap-3.5">
          {/* ZeroTrac Advanced Filters Form */}
          <Card className="p-4 flex flex-col gap-3.5 font-sans border-zinc-850 bg-zinc-900/10">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[9px] font-bold text-zinc-500 block mb-1.5 font-mono uppercase tracking-wider">Keyword</label>
                <input 
                  type="text" 
                  placeholder="e.g. sum" 
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/10 transition-all font-mono"
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
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/10 transition-all font-mono"
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
                    className="w-20 bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-center text-zinc-250 focus:outline-none focus:border-[#dfa054] font-mono"
                  />
                  <span className="text-zinc-650 font-mono">-</span>
                  <input 
                    type="number"
                    value={ratingMax}
                    onChange={(e) => {
                      setRatingMax(parseInt(e.target.value) || 0)
                      setCurrentPage(1)
                    }}
                    className="w-20 bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-center text-zinc-250 focus:outline-none focus:border-[#dfa054] font-mono"
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
              <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-850">
                {(["all", "open", "done"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setStatusFilter(filter)
                      setCurrentPage(1)
                    }}
                    className={`text-[9px] font-bold px-3 py-1 rounded uppercase font-mono transition-colors ${
                      statusFilter === filter ? "bg-zinc-800 text-zinc-100" : "text-zinc-550 hover:text-zinc-350"
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
            <div className="flex justify-between items-center text-[10px] text-zinc-550 font-mono px-1">
              <span>Matching Problems</span>
              <span>Count: <span className="text-zinc-350">{filteredZerotrac.length}</span></span>
            </div>

            {filteredZerotrac.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-650 font-mono bg-zinc-950/10 rounded-xl border border-dashed border-zinc-850">
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
                          <tr key={idx} className="hover:bg-zinc-900/20 transition-all duration-150">
                            {/* Problem ID */}
                            <td className="py-3 px-1 text-center text-zinc-550 font-mono select-none">
                              {p.ID || p.QuestionID || ""}
                            </td>
                            {/* Problem Title (with solved checkbox indicator) */}
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span 
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSolved 
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-450" 
                                      : "border-zinc-850 bg-zinc-950/30 text-transparent"
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
                      className="px-2 py-0.5 rounded-md text-zinc-450 hover:text-zinc-200 disabled:opacity-40"
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
                      className="px-2 py-0.5 rounded-md text-zinc-450 hover:text-zinc-200 disabled:opacity-40"
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
                      className="w-8 bg-zinc-900 border border-zinc-800 rounded-md text-center text-[10px] text-zinc-350 font-mono py-0.5 ml-1.5 focus:outline-none focus:border-[#dfa054]"
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
