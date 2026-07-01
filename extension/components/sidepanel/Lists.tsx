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

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => ({ ...prev, [topic]: !prev[topic] }))
  }

  const handleResetFilters = () => {
    setKeyword("")
    setContestNumber("")
    setRatingMin(1600)
    setRatingMax(1700)
    setStatusFilter("all")
  }

  if (loading) {
    return <div className="p-4 text-center text-zinc-500 text-xs font-mono animate-pulse">Loading study sheets...</div>
  }

  return (
    <div className="grid gap-3.5">
      {/* List Type Switcher */}
      <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
        <button
          onClick={() => setActiveList("neetcode")}
          className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${
            activeList === "neetcode" ? "bg-zinc-850 text-[#dfa054]" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          NeetCode 150
        </button>
        <button
          onClick={() => setActiveList("striver")}
          className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${
            activeList === "striver" ? "bg-zinc-850 text-[#dfa054]" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Striver SDE
        </button>
        <button
          onClick={() => setActiveList("zerotrac")}
          className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${
            activeList === "zerotrac" ? "bg-zinc-850 text-[#dfa054]" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          ZeroTrac
        </button>
      </div>

      {activeList !== "zerotrac" ? (
        // NeetCode & Striver Lists Rendering
        <div className="grid gap-3.5">
          {/* Progress Header */}
          <Card className="p-3.5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-200">{currentStudyList?.name} Progress</span>
              <span className="font-mono text-zinc-100 font-bold tabular-nums">
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
                <Card key={topic} className="p-0 overflow-hidden border border-zinc-800/80 bg-zinc-900/10">
                  {/* Topic Header Toggle */}
                  <button
                    onClick={() => toggleTopic(topic)}
                    className="w-full px-4 py-3 flex justify-between items-center hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] transition-transform ${isExpanded ? "rotate-90" : "rotate-0"} text-zinc-500`}>▶</span>
                      <span className={`text-xs font-bold ${isTopicComplete ? "text-[#10b981]" : "text-zinc-250"}`}>{topic}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
                      {topicSolved}/{topicTotal}
                    </span>
                  </button>

                  {/* Topic Problems List */}
                  {isExpanded && (
                    <div className="p-3.5 pt-2 flex flex-col gap-2.5">
                      {problems.map((p, idx) => {
                        const isSolved = solvedSlugs.has(p.slug)
                        return (
                          <div key={idx} className="flex items-center gap-3 text-xs leading-none">
                            {/* Checkbox icon indicator */}
                            <span 
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                isSolved 
                                  ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]" 
                                  : "border-zinc-800 bg-zinc-950/20 text-transparent"
                              }`}
                            >
                              {isSolved && <span className="text-[10px] leading-none">✔</span>}
                            </span>
                            <a
                              href={`https://leetcode.com/problems/${p.slug}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`hover:text-[#dfa054] transition-colors truncate ${
                                isSolved ? "text-zinc-500 line-through" : "text-zinc-300 font-medium"
                              }`}
                              title={`Open ${p.title} on LeetCode`}
                            >
                              {p.title}
                            </a>
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
          <Card className="p-3.5 flex flex-col gap-3 font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1 font-mono uppercase">Keyword</label>
                <input 
                  type="text" 
                  placeholder="type a keyword" 
                  className="w-full bg-zinc-900/30 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dfa054]"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1 font-mono uppercase">Contest number</label>
                <input 
                  type="text" 
                  placeholder="e.g. 408" 
                  className="w-full bg-zinc-900/30 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dfa054]"
                  value={contestNumber}
                  onChange={(e) => setContestNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-end gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 block mb-1 font-mono uppercase">Rating interval</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    value={ratingMin}
                    onChange={(e) => setRatingMin(parseInt(e.target.value) || 0)}
                    className="w-16 bg-zinc-900/30 border border-zinc-800 rounded px-2 py-1 text-xs text-center text-zinc-200 focus:outline-none focus:border-[#dfa054] font-mono"
                  />
                  <span className="text-zinc-600 font-mono">-</span>
                  <input 
                    type="number"
                    value={ratingMax}
                    onChange={(e) => setRatingMax(parseInt(e.target.value) || 0)}
                    className="w-16 bg-zinc-900/30 border border-zinc-800 rounded px-2 py-1 text-xs text-center text-zinc-200 focus:outline-none focus:border-[#dfa054] font-mono"
                  />
                </div>
              </div>

              <button 
                onClick={handleResetFilters}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded px-3 py-1.5 text-[10px] font-bold font-mono tracking-wider uppercase transition-colors"
              >
                Reset
              </button>
            </div>

            {/* Status Pills Selector */}
            <div className="border-t border-zinc-800/40 pt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono">Status Filter:</span>
              <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-850">
                {(["all", "open", "done"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono transition-colors ${
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
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono px-1">
              <span>Matching Problems</span>
              <span>Count: <span className="text-zinc-300">{filteredZerotrac.length}</span></span>
            </div>

            {filteredZerotrac.length === 0 ? (
              <div className="text-center py-6 text-xs text-zinc-650 font-mono bg-zinc-900/5 rounded-lg border border-dashed border-zinc-850">
                No matching ZeroTrac problems found.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredZerotrac.slice(0, 100).map((p, idx) => {
                  const isSolved = solvedSlugs.has(p.TitleSlug)
                  return (
                    <Card key={idx} className="py-2.5 px-3 flex items-start gap-3">
                      {/* Checkbox status indicator */}
                      <span 
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isSolved 
                            ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]" 
                            : "border-zinc-800 bg-zinc-950/20 text-transparent"
                        }`}
                      >
                        {isSolved && <span className="text-[10px] leading-none">✔</span>}
                      </span>

                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex justify-between items-start gap-2">
                          <a
                            href={`https://leetcode.com/problems/${p.TitleSlug}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`hover:text-[#dfa054] transition-colors truncate text-xs font-semibold ${
                              isSolved ? "text-zinc-500 line-through" : "text-zinc-200"
                            }`}
                            title={`Open ${p.Title} on LeetCode`}
                          >
                            {p.Title}
                          </a>
                          <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">
                            {Math.round(p.Rating)}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-zinc-500 truncate">
                          {p.ContestID_en || p.ContestSlug || "LeetCode Contest"}
                        </div>
                      </div>
                    </Card>
                  )
                })}
                {filteredZerotrac.length > 100 && (
                  <div className="text-center py-2 text-[9px] font-mono text-zinc-600">
                    Showing first 100 matching problems.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
