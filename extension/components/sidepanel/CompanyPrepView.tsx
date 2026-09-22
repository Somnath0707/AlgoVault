import React, { useState, useMemo, useEffect } from "react"
import {
  Search,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  Circle,
  Flame,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Target,
  Activity
} from "lucide-react"
import { Card } from "../ui/Card"
import { ProgressBar } from "../ui/ProgressBar"
import {
  COMPANIES_DATA,
  type CompanySummary,
  type CompanyProblemEvidence,
  type CompanyCategory,
  type TimeWindow,
  calculateWindowDifficultyStats
} from "../../lib/company-data"
import { rankThemeForRating } from "../../lib/rank-theme"

interface CompanyPrepViewProps {
  solvedSlugs: Set<string>
  zerotracRatingMap: Map<string, number>
}

// ─── HIGH-SPEED REAL LOGO COMPONENT WITH FALLBACK ──────────────────────────
const CompanyLogo: React.FC<{ company: CompanySummary; className?: string; imgClassName?: string }> = ({
  company,
  className = "w-9 h-9",
  imgClassName = "w-5 h-5"
}) => {
  const [useFallback, setUseFallback] = useState(false)
  const domain = company.domain || `${company.slug.replace(/[^a-z0-9]/g, "")}.com`
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  const initials = (company.name || "CO").slice(0, 2).toUpperCase()

  return (
    <div className={`${className} rounded-lg bg-[#1a1a1a] p-1.5 flex items-center justify-center border border-white/[0.08] shrink-0 group-hover:border-white/[0.16] transition-all overflow-hidden`}>
      {!useFallback ? (
        <img
          src={faviconUrl}
          alt={company.name}
          className={`${imgClassName} object-contain rounded transition-transform group-hover:scale-110`}
          loading="lazy"
          onError={() => setUseFallback(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[10px] font-mono font-bold text-[#ffa116] select-none">
          {initials}
        </div>
      )}
    </div>
  )
}

export const CompanyPrepView: React.FC<CompanyPrepViewProps> = ({
  solvedSlugs,
  zerotracRatingMap
}) => {
  // Navigation
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  // Directory Filters
  const [directorySearch, setDirectorySearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"all" | CompanyCategory>("all")
  const [dirPage, setDirPage] = useState(1)
  const DIR_ITEMS_PER_PAGE = 24

  // Explorer Filters inside a selected company
  const [problemSearch, setProblemSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "remaining" | "solved">("all")
  const [diffFilter, setDiffFilter] = useState<"all" | "Easy" | "Medium" | "Hard">("all")
  const [timeframeFilter, setTimeframeFilter] = useState<"all" | TimeWindow>("all")
  const [selectedTopic, setSelectedTopic] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"freq" | "rating_desc" | "rating_asc" | "recency" | "title">("freq")
  const [problemPage, setProblemPage] = useState(1)
  const [showMetricGuide, setShowMetricGuide] = useState(false)
  const PROBLEMS_PER_PAGE = 25

  // Reset page when filters change
  useEffect(() => {
    setProblemPage(1)
  }, [problemSearch, statusFilter, diffFilter, timeframeFilter, selectedTopic, sortBy, selectedCompanyId])

  useEffect(() => {
    setDirPage(1)
  }, [directorySearch, categoryFilter])

  // Active Company
  const activeCompany = useMemo(() => {
    if (!selectedCompanyId) return null
    return COMPANIES_DATA.find((c) => c.id === selectedCompanyId) || null
  }, [selectedCompanyId])

  // Summaries with user solved stats
  const companySummaries = useMemo(() => {
    return COMPANIES_DATA.map((c) => {
      const total = c.problems.length
      const solved = c.problems.filter((p) => solvedSlugs.has(p.slug.toLowerCase())).length
      const remaining = total - solved
      const coverage = total > 0 ? Math.round((solved / total) * 100) : 0
      return {
        ...c,
        solvedCount: solved,
        remainingCount: remaining,
        coveragePercent: coverage
      }
    })
  }, [solvedSlugs])

  // Filtered Company List for Directory
  const filteredCompanies = useMemo(() => {
    return companySummaries.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false
      if (directorySearch.trim()) {
        const q = directorySearch.toLowerCase().trim()
        const matchName = c.name.toLowerCase().includes(q)
        const matchTopic = c.mostFrequentTopics.some((t) => t.toLowerCase().includes(q))
        if (!matchName && !matchTopic) return false
      }
      return true
    })
  }, [companySummaries, categoryFilter, directorySearch])

  // Paginated Directory Companies
  const totalDirPages = Math.max(1, Math.ceil(filteredCompanies.length / DIR_ITEMS_PER_PAGE))
  const paginatedCompanies = useMemo(() => {
    const start = (dirPage - 1) * DIR_ITEMS_PER_PAGE
    return filteredCompanies.slice(start, start + DIR_ITEMS_PER_PAGE)
  }, [filteredCompanies, dirPage])

  // ZeroTrac Difficulty Stats for active company
  const stats30D = useMemo(() => {
    if (!activeCompany) return null
    return calculateWindowDifficultyStats(activeCompany.problems, zerotracRatingMap, "30d")
  }, [activeCompany, zerotracRatingMap])

  const stats3M = useMemo(() => {
    if (!activeCompany) return null
    return calculateWindowDifficultyStats(activeCompany.problems, zerotracRatingMap, "3m")
  }, [activeCompany, zerotracRatingMap])

  const stats6M = useMemo(() => {
    if (!activeCompany) return null
    return calculateWindowDifficultyStats(activeCompany.problems, zerotracRatingMap, "6m")
  }, [activeCompany, zerotracRatingMap])

  const statsAll = useMemo(() => {
    if (!activeCompany) return null
    return calculateWindowDifficultyStats(activeCompany.problems, zerotracRatingMap, "all")
  }, [activeCompany, zerotracRatingMap])

  // Active Company Progress
  const activeSolvedCount = useMemo(() => {
    if (!activeCompany) return 0
    return activeCompany.problems.filter((p) => solvedSlugs.has(p.slug.toLowerCase())).length
  }, [activeCompany, solvedSlugs])

  const activeTotalCount = activeCompany?.problems.length || 0
  const activeRemainingCount = Math.max(0, activeTotalCount - activeSolvedCount)
  const activeCoverage = activeTotalCount > 0 ? Math.round((activeSolvedCount / activeTotalCount) * 100) : 0

  // Topic Breakdown with Counts
  const topicBreakdown = useMemo(() => {
    if (!activeCompany) return []
    const map = new Map<string, { total: number; solved: number }>()
    for (const p of activeCompany.problems) {
      const curr = map.get(p.topic) || { total: 0, solved: 0 }
      curr.total++
      if (solvedSlugs.has(p.slug.toLowerCase())) curr.solved++
      map.set(p.topic, curr)
    }
    return Array.from(map.entries())
      .map(([topic, data]) => ({
        topic,
        total: data.total,
        solved: data.solved,
        coverage: Math.round((data.solved / data.total) * 100)
      }))
      .sort((a, b) => b.total - a.total)
  }, [activeCompany, solvedSlugs])

  // Difficulty Breakdown with Counts
  const difficultyBreakdown = useMemo(() => {
    if (!activeCompany) return []
    const counts = {
      Easy: { total: 0, solved: 0 },
      Medium: { total: 0, solved: 0 },
      Hard: { total: 0, solved: 0 }
    }
    for (const p of activeCompany.problems) {
      const d = p.difficulty as "Easy" | "Medium" | "Hard"
      if (counts[d]) {
        counts[d].total++
        if (solvedSlugs.has(p.slug.toLowerCase())) counts[d].solved++
      }
    }
    return (["Easy", "Medium", "Hard"] as const).map((d) => ({
      difficulty: d,
      total: counts[d].total,
      solved: counts[d].solved,
      coverage: counts[d].total > 0 ? Math.round((counts[d].solved / counts[d].total) * 100) : 0
    }))
  }, [activeCompany, solvedSlugs])

  // Timeframe Window Counts
  const timeframeCounts = useMemo(() => {
    if (!activeCompany) return { "30d": 0, "3m": 0, "6m": 0, "1y": 0, "all": 0 }
    return {
      "30d": activeCompany.problems.filter((p) => p.windows && p.windows.includes("30d")).length,
      "3m": activeCompany.problems.filter((p) => p.windows && p.windows.includes("3m")).length,
      "6m": activeCompany.problems.filter((p) => p.windows && p.windows.includes("6m")).length,
      "1y": activeCompany.problems.filter((p) => p.windows && p.windows.includes("1y")).length,
      "all": activeCompany.problems.length
    }
  }, [activeCompany])

  // Top 5 Frequent Problems
  const topFrequentProblems = useMemo(() => {
    if (!activeCompany) return []
    return [...activeCompany.problems]
      .sort((a, b) => b.frequencyScore - a.frequencyScore)
      .slice(0, 5)
  }, [activeCompany])

  // Filtered & Sorted Problems for Explorer
  const filteredProblems = useMemo(() => {
    if (!activeCompany) return []
    const list = activeCompany.problems.filter((p) => {
      const isSolved = solvedSlugs.has(p.slug.toLowerCase())
      if (statusFilter === "remaining" && isSolved) return false
      if (statusFilter === "solved" && !isSolved) return false
      if (diffFilter !== "all" && p.difficulty !== diffFilter) return false
      if (timeframeFilter !== "all" && (!p.windows || !p.windows.includes(timeframeFilter))) return false
      if (selectedTopic !== "all" && p.topic !== selectedTopic) return false
      if (problemSearch.trim()) {
        const q = problemSearch.toLowerCase().trim()
        const matchTitle = p.title.toLowerCase().includes(q)
        const matchSlug = p.slug.toLowerCase().includes(q)
        if (!matchTitle && !matchSlug) return false
      }
      return true
    })

    return list.sort((a, b) => {
      if (sortBy === "freq") return b.frequencyScore - a.frequencyScore
      if (sortBy === "rating_desc") {
        const rA = zerotracRatingMap.get(a.slug.toLowerCase()) ?? -1
        const rB = zerotracRatingMap.get(b.slug.toLowerCase()) ?? -1
        if (rA === -1 && rB === -1) return b.frequencyScore - a.frequencyScore
        if (rA === -1) return 1
        if (rB === -1) return -1
        return rB - rA
      }
      if (sortBy === "rating_asc") {
        const rA = zerotracRatingMap.get(a.slug.toLowerCase()) ?? 99999
        const rB = zerotracRatingMap.get(b.slug.toLowerCase()) ?? 99999
        if (rA === 99999 && rB === 99999) return b.frequencyScore - a.frequencyScore
        if (rA === 99999) return 1
        if (rB === 99999) return -1
        return rA - rB
      }
      if (sortBy === "recency") {
        const recWeight: Record<string, number> = { "30d": 4, "3m": 3, "6m": 2, "1y": 1, "all": 0 }
        return (recWeight[b.timeframe] || 0) - (recWeight[a.timeframe] || 0)
      }
      if (sortBy === "title") return a.title.localeCompare(b.title)
      return 0
    })
  }, [activeCompany, statusFilter, diffFilter, timeframeFilter, selectedTopic, problemSearch, sortBy, solvedSlugs, zerotracRatingMap])

  // Paginated Problem Rows
  const totalProblemPages = Math.max(1, Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE))
  const paginatedProblems = useMemo(() => {
    const start = (problemPage - 1) * PROBLEMS_PER_PAGE
    return filteredProblems.slice(start, start + PROBLEMS_PER_PAGE)
  }, [filteredProblems, problemPage])

  const categoryLabels: Record<string, string> = {
    all: "All Companies",
    "big-tech": "Big Tech",
    "quant-finance": "Quant & Finance",
    unicorns: "Unicorns & Fintech",
    enterprise: "Enterprise & Cloud",
    other: "Other"
  }

  return (
    <div className="grid gap-3.5 font-sans select-none pb-6">
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: MASTER COMPANY DIRECTORY (440+ Companies)                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {!activeCompany ? (
        <div className="grid gap-3.5">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#282828] p-4">
            <div className="flex items-center justify-between gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="panel-label text-[#ffa116] tracking-widest font-mono text-[10px] uppercase font-bold">
                    Company Practice Tracks
                  </span>
                  <span className="text-[9px] bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/20 px-1.5 py-0.5 rounded font-mono font-bold">
                    440+ Real Companies
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 font-sans">
                  Real interview questions curated from LeetCode. Explore ZeroTrac contest difficulty medians, historical frequency tiers, and personal coverage.
                </p>
                <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-zinc-500">
                  <Calendar size={10} className="text-[#ffa116]" />
                  <span>Verified LeetCode Company Records · Updated: June 2025</span>
                </div>
              </div>
              <div className="shrink-0 text-right font-mono">
                <div className="text-sm font-extrabold text-[#ffa116] tabular-nums">{filteredCompanies.length}</div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Available</div>
              </div>
            </div>
          </div>

          {/* Search & Category Pills */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by company (e.g. Google, Citadel) or topic (e.g. DP)..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="w-full bg-[#1a1a1a] text-zinc-200 text-xs pl-8 pr-8 py-2.5 rounded-lg border border-white/[0.08] focus:border-[#ffa116] focus:outline-none placeholder:text-zinc-600 transition-colors font-mono"
              />
              {directorySearch && (
                <button
                  onClick={() => setDirectorySearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
              {(["all", "big-tech", "quant-finance", "unicorns", "enterprise"] as const).map((cat) => {
                const isSelected = categoryFilter === cat
                const count = companySummaries.filter((c) => cat === "all" || c.category === cat).length
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-[#ffa116] text-[#1a1a1a] font-semibold"
                        : "bg-[#282828] text-zinc-400 hover:text-zinc-200 border border-white/[0.08] hover:border-white/[0.16]"
                    }`}
                  >
                    <span>{categoryLabels[cat]}</span>
                    <span className={`text-[8.5px] px-1 py-0.2 rounded ${isSelected ? "bg-[#1a1a1a]/20 text-[#1a1a1a] font-bold" : "bg-[#333333] text-zinc-400"}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Company Cards Grid */}
          <div className="grid grid-cols-1 gap-2">
            {paginatedCompanies.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono bg-[#282828] rounded-xl border border-white/[0.08]">
                No companies found matching &ldquo;{directorySearch}&rdquo;.
              </div>
            ) : (
              paginatedCompanies.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => {
                    setSelectedCompanyId(comp.id)
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className="p-3 bg-[#282828] hover:bg-[#333333] border border-white/[0.08] hover:border-white/[0.16] rounded-xl transition-all cursor-pointer group flex items-center justify-between gap-3"
                >
                  {/* Left: Real Logo & Meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyLogo company={comp} className="w-8 h-8" imgClassName="w-5 h-5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-zinc-100 group-hover:text-[#ffa116] transition-colors truncate">
                          {comp.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1a1a1a] text-zinc-400 border border-white/[0.08] shrink-0">
                          {comp.totalProblems.toLocaleString()} Qs
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                        {comp.mostFrequentTopics.slice(0, 3).join(" · ") || "Algorithms"}
                      </div>
                    </div>
                  </div>

                  {/* Right: Solved Progress & CTA */}
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className={comp.solvedCount > 0 ? "text-[#00b8a3] font-bold" : "text-zinc-500"}>
                        {comp.solvedCount}
                      </span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-zinc-400">{comp.totalProblems}</span>
                      <span className="text-[#ffa116] font-semibold ml-1">({comp.coveragePercent}%)</span>
                    </div>
                    <div className="w-20 mt-1">
                      <ProgressBar progress={comp.coveragePercent} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Directory Pagination Bar */}
          {totalDirPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2 border-t border-white/[0.08] font-mono text-xs text-zinc-400">
              <button
                disabled={dirPage <= 1}
                onClick={() => setDirPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-[#282828] border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#333333] text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={12} />
                <span>Prev</span>
              </button>
              <span className="text-[10px] text-zinc-500">
                Page <strong className="text-zinc-300">{dirPage}</strong> of <strong className="text-zinc-300">{totalDirPages}</strong>
              </span>
              <button
                disabled={dirPage >= totalDirPages}
                onClick={() => setDirPage((p) => Math.min(totalDirPages, p + 1))}
                className="px-2.5 py-1 rounded bg-[#282828] border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#333333] text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════════ */
        /* VIEW 2: DETAILED COMPANY SURFACE & QUESTION EXPLORER                */
        /* ═════════════════════════════════════════════════════════════════════ */
        <div className="grid gap-3.5">
          {/* Back Button */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={() => setSelectedCompanyId(null)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#ffa116] font-mono transition-colors cursor-pointer py-1"
            >
              <ArrowLeft size={13} />
              <span>Back to 440+ Companies</span>
            </button>
            <span className="text-[9.5px] font-mono text-zinc-500">
              Source: LeetCode · June 2025
            </span>
          </div>

          {/* Company Profile Header */}
          <Card className="p-4 bg-[#282828] border border-white/[0.08]">
            <div className="flex items-center gap-3.5 mb-3">
              <CompanyLogo company={activeCompany} className="w-12 h-12" imgClassName="w-7 h-7" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-zinc-50 tracking-tight">{activeCompany.name}</h2>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] text-[#ffa116] border border-white/[0.08] uppercase font-semibold">
                    {categoryLabels[activeCompany.category] || activeCompany.category}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {activeTotalCount.toLocaleString()} Authentic Questions · 5 Verified Timeframes
                </p>
              </div>
            </div>

            {/* Solved Progress Overview */}
            <div className="pt-2.5 border-t border-white/[0.08]">
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="text-zinc-400 font-medium">Coverage Progress</span>
                <span className="font-bold text-zinc-200">
                  <span className="text-[#00b8a3]">{activeSolvedCount} solved</span>
                  <span className="text-zinc-600 mx-1.5">·</span>
                  <span className="text-zinc-400">{activeRemainingCount} remaining</span>
                  <span className="text-[#ffa116] ml-2">({activeCoverage}%)</span>
                </span>
              </div>
              <ProgressBar progress={activeCoverage} />
            </div>
          </Card>

          {/* ─── ZEROTRAC PROBLEM DIFFICULTY ANALYTICS PANEL ─────────────── */}
          <Card className="p-4 bg-[#282828] border border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BarChart3 size={13} className="text-[#ffa116]" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">ZeroTrac Problem Difficulty</span>
              </div>
              <button
                onClick={() => setShowMetricGuide((prev) => !prev)}
                className="flex items-center gap-1 text-[9.5px] font-mono text-zinc-400 hover:text-[#ffa116] transition-colors cursor-pointer"
              >
                <HelpCircle size={11} className="text-[#ffa116]" />
                <span>What do these metrics mean?</span>
                {showMetricGuide ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            </div>

            {/* Metric Guide Accordion */}
            {showMetricGuide && (
              <div className="p-3 bg-[#1a1a1a] rounded-xl border border-white/[0.08] mb-3 space-y-2">
                {/* ZeroTrac Rating Card */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#282828] border border-white/[0.08]">
                  <div className="w-6 h-6 rounded-md bg-[#ffa116]/10 border border-[#ffa116]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#ffa116]">
                    <Target size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-zinc-200 font-sans">ZeroTrac Elo Rating</span>
                      <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-[#1a1a1a] text-[#ffa116] border border-white/[0.08]">Contest Elo</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5 font-sans">
                      Contest-calibrated difficulty. <strong className="text-zinc-300">&lt;1600</strong> = Foundational/Easy, <strong className="text-zinc-300">1600–1900</strong> = Standard Medium (sweet spot for real tech interviews), <strong className="text-zinc-300">&gt;2000</strong> = Advanced/Hard caliber.
                    </p>
                  </div>
                </div>

                {/* Middle 50% Typical Range Card */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#282828] border border-white/[0.08]">
                  <div className="w-6 h-6 rounded-md bg-[#00b8a3]/10 border border-[#00b8a3]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#00b8a3]">
                    <Activity size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-zinc-200 font-sans">Middle 50% Typical Range</span>
                      <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-[#1a1a1a] text-[#00b8a3] border border-white/[0.08]">P25 – P75 (IQR)</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5 font-sans">
                      The interquartile range where 50% of this company&apos;s interview questions concentrate. Mastering problems within this band provides the highest practice ROI.
                    </p>
                  </div>
                </div>

                {/* Frequency Score Card */}
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#282828] border border-white/[0.08]">
                  <div className="w-6 h-6 rounded-md bg-[#ffc01e]/10 border border-[#ffc01e]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#ffc01e]">
                    <Flame size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-zinc-200 font-sans">Reported Frequency</span>
                      <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-[#1a1a1a] text-[#ffc01e] border border-white/[0.08]">0 – 100% Score</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mt-0.5 font-sans">
                      Normalized popularity based on verified candidate debriefs. Higher scores indicate questions asked repeatedly across recent candidate interview panels.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4-Window Difficulty Matrix */}
            <div className="grid grid-cols-4 gap-1.5 p-2.5 bg-[#1a1a1a] rounded-lg border border-white/[0.08] mb-3 text-center">
              <div>
                <div className="text-[8.5px] font-mono text-zinc-500 uppercase">30 Days</div>
                <div className="text-sm font-bold font-mono text-[#ffa116] mt-0.5">
                  {stats30D?.median ? Math.round(stats30D.median) : "--"}
                </div>
                <div className="text-[8px] font-mono text-zinc-500">
                  {stats30D?.sampleSize ? `n=${stats30D.sampleSize}` : "No rated Qs"}
                </div>
              </div>
              <div className="border-l border-white/[0.08] pl-1">
                <div className="text-[8.5px] font-mono text-zinc-400 uppercase">3 Months</div>
                <div className="text-sm font-bold font-mono text-[#ffc01e] mt-0.5">
                  {stats3M?.median ? Math.round(stats3M.median) : "--"}
                </div>
                <div className="text-[8px] font-mono text-zinc-500">
                  {stats3M?.sampleSize ? `n=${stats3M.sampleSize}` : "No rated Qs"}
                </div>
              </div>
              <div className="border-l border-white/[0.08] pl-1">
                <div className="text-[8.5px] font-mono text-zinc-400 uppercase font-semibold">6 Months</div>
                <div className="text-sm font-extrabold font-mono text-[#00b8a3] mt-0.5">
                  {stats6M?.median ? Math.round(stats6M.median) : "--"}
                </div>
                <div className="text-[8px] font-mono text-zinc-400">
                  {stats6M?.sampleSize ? `n=${stats6M.sampleSize}` : "No rated Qs"}
                </div>
              </div>
              <div className="border-l border-white/[0.08] pl-1">
                <div className="text-[8.5px] font-mono text-zinc-500 uppercase">All Time</div>
                <div className="text-sm font-bold font-mono text-zinc-200 mt-0.5">
                  {statsAll?.median ? Math.round(statsAll.median) : "--"}
                </div>
                <div className="text-[8px] font-mono text-zinc-500">
                  {statsAll?.sampleSize ? `n=${statsAll.sampleSize}` : "No rated Qs"}
                </div>
              </div>
            </div>

            {/* Middle 50% Range Indicator */}
            {statsAll && !statsAll.insufficientData && statsAll.p25 && statsAll.p75 && (
              <div className="p-3 bg-[#1a1a1a] rounded-lg border border-white/[0.08] mb-3">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mb-1.5">
                  <span>Middle 50% Typical Range (All Time)</span>
                  <span className="text-zinc-200 font-semibold">{statsAll.p25} — {statsAll.p75}</span>
                </div>
                <div className="relative h-2 bg-[#282828] rounded-full overflow-hidden border border-white/[0.08] flex items-center">
                  <div
                    className="h-full bg-[#ffa116] rounded-full"
                    style={{
                      marginLeft: `${Math.max(0, Math.min(80, ((statsAll.p25 - 1200) / 1400) * 100))}%`,
                      width: `${Math.max(15, Math.min(100, ((statsAll.p75 - statsAll.p25) / 1400) * 100))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1">
                  <span>Rating 1200</span>
                  <span className="text-[#ffa116]">Median {statsAll.median}</span>
                  <span>Rating 2600</span>
                </div>
              </div>
            )}

            {/* Rating Bands Histogram */}
            {statsAll && statsAll.sampleSize > 0 && (
              <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9px] pt-2 border-t border-white/[0.08]">
                <div className="p-1 bg-[#1a1a1a] rounded border border-white/[0.08]">
                  <div className="text-zinc-500">&lt;1600</div>
                  <div className="font-bold text-zinc-300 mt-0.5">{statsAll.ratingBands.under1600}</div>
                </div>
                <div className="p-1 bg-[#1a1a1a] rounded border border-white/[0.08]">
                  <div className="text-zinc-500">1600-1800</div>
                  <div className="font-bold text-zinc-300 mt-0.5">{statsAll.ratingBands.band1600_1800}</div>
                </div>
                <div className="p-1 bg-[#1a1a1a] rounded border border-white/[0.08]">
                  <div className="text-[#00b8a3] font-semibold">1800-2000</div>
                  <div className="font-bold text-[#00b8a3] mt-0.5">{statsAll.ratingBands.band1800_2000}</div>
                </div>
                <div className="p-1 bg-[#1a1a1a] rounded border border-white/[0.08]">
                  <div className="text-zinc-500">2000-2200</div>
                  <div className="font-bold text-zinc-300 mt-0.5">{statsAll.ratingBands.band2000_2200}</div>
                </div>
                <div className="p-1 bg-[#1a1a1a] rounded border border-white/[0.08]">
                  <div className="text-[#ef4743] font-semibold">2200+</div>
                  <div className="font-bold text-[#ef4743] mt-0.5">{statsAll.ratingBands.above2200}</div>
                </div>
              </div>
            )}
          </Card>

          {/* ─── TOPICS & DIFFICULTY COVERAGE MATRICES ───────────────────── */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Topic Coverage */}
            <Card className="p-3 bg-[#282828] border border-white/[0.08]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-2 font-mono flex items-center justify-between">
                <span>Top Topics</span>
                <span className="text-[8px] text-zinc-500">Click to filter</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {topicBreakdown.slice(0, 5).map((t) => (
                  <button
                    key={t.topic}
                    onClick={() => setSelectedTopic(selectedTopic === t.topic ? "all" : t.topic)}
                    className={`flex items-center justify-between p-1.5 rounded text-[10px] font-mono transition-colors text-left cursor-pointer ${
                      selectedTopic === t.topic
                        ? "bg-[#333333] text-[#ffa116] border border-[#ffa116]/40 font-bold"
                        : "bg-[#1a1a1a] hover:bg-[#333333] text-zinc-400 border border-white/[0.08]"
                    }`}
                  >
                    <span className="truncate">{t.topic}</span>
                    <span className="shrink-0 font-bold ml-1">
                      <span className={t.solved > 0 ? "text-[#00b8a3]" : "text-zinc-600"}>{t.solved}</span>
                      <span className="text-zinc-600">/</span>
                      <span>{t.total}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Difficulty Coverage */}
            <Card className="p-3 bg-[#282828] border border-white/[0.08]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 mb-2 font-mono flex items-center justify-between">
                <span>Difficulty</span>
                <span className="text-[8px] text-zinc-500">Click to filter</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {difficultyBreakdown.map((d) => {
                  const colorClass =
                    d.difficulty === "Easy"
                      ? "text-[#00b8a3]"
                      : d.difficulty === "Medium"
                      ? "text-[#ffc01e]"
                      : "text-[#ef4743]"
                  return (
                    <button
                      key={d.difficulty}
                      onClick={() => setDiffFilter(diffFilter === d.difficulty ? "all" : d.difficulty)}
                      className={`flex items-center justify-between p-1.5 rounded text-[10px] font-mono transition-colors text-left cursor-pointer ${
                        diffFilter === d.difficulty
                          ? "bg-[#333333] text-[#ffa116] border border-[#ffa116]/40 font-bold"
                          : "bg-[#1a1a1a] hover:bg-[#333333] text-zinc-400 border border-white/[0.08]"
                      }`}
                    >
                      <span className={colorClass}>{d.difficulty}</span>
                      <span className="shrink-0 font-bold">
                        <span className={d.solved > 0 ? "text-[#00b8a3]" : "text-zinc-600"}>{d.solved}</span>
                        <span className="text-zinc-600">/</span>
                        <span>{d.total}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* ─── MOST FREQUENT QUESTIONS SHELF ──────────────────────────── */}
          <Card className="p-3 bg-[#282828] border border-white/[0.08]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono mb-2">
              <Flame size={12} className="text-[#ffa116]" />
              <span>Highest Reported Frequency</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {topFrequentProblems.map((p) => {
                const isSolved = solvedSlugs.has(p.slug.toLowerCase())
                const rating = zerotracRatingMap.get(p.slug.toLowerCase())
                return (
                  <div
                    key={p.slug}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1a] border border-white/[0.08] hover:border-white/[0.16] transition-colors gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSolved ? (
                        <CheckCircle2 size={13} className="text-[#00b8a3] shrink-0" />
                      ) : (
                        <Circle size={13} className="text-zinc-600 shrink-0" />
                      )}
                      <a
                        href={`https://leetcode.com/problems/${p.slug}/`}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs truncate font-medium hover:text-[#ffa116] transition-colors ${
                          isSolved ? "text-zinc-400 line-through" : "text-zinc-200"
                        }`}
                      >
                        {p.title}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
                      {typeof rating === "number" && rating > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-[#282828] text-zinc-300 border border-white/[0.08] font-bold">
                          Elo {Math.round(rating)}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/20 font-bold">
                        {p.frequencyScore}% Freq
                      </span>
                      <a
                        href={`https://leetcode.com/problems/${p.slug}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-[#ffa116] p-1"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ─── FULL INTERACTIVE QUESTION EXPLORER ─────────────────────── */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider">
                Question Explorer ({filteredProblems.length})
              </span>
              {(statusFilter !== "all" || diffFilter !== "all" || timeframeFilter !== "all" || selectedTopic !== "all" || problemSearch || sortBy !== "freq") && (
                <button
                  onClick={() => {
                    setStatusFilter("all")
                    setDiffFilter("all")
                    setTimeframeFilter("all")
                    setSelectedTopic("all")
                    setProblemSearch("")
                    setSortBy("freq")
                  }}
                  className="text-[9px] font-mono text-zinc-500 hover:text-[#ffa116] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Filter problem title..."
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                className="bg-[#1a1a1a] text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg border border-white/[0.08] focus:border-[#ffa116] focus:outline-none placeholder:text-zinc-600 font-mono"
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#1a1a1a] text-zinc-300 text-xs px-2 py-1.5 rounded-lg border border-white/[0.08] font-mono focus:border-[#ffa116] focus:outline-none cursor-pointer"
              >
                <option value="freq">Sort: Frequency (High → Low)</option>
                <option value="rating_desc">Sort: ZeroTrac Rating (Hard → Easy)</option>
                <option value="rating_asc">Sort: ZeroTrac Rating (Easy → Hard)</option>
                <option value="recency">Sort: Recency (Recent first)</option>
                <option value="title">Sort: Title (A → Z)</option>
              </select>
            </div>

            {/* 5-Timeframe Pills with Exact Counts */}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              {(
                [
                  { id: "all", label: `All Time (${timeframeCounts.all.toLocaleString()})` },
                  { id: "30d", label: `30 Days (${timeframeCounts["30d"].toLocaleString()})` },
                  { id: "3m", label: `3 Months (${timeframeCounts["3m"].toLocaleString()})` },
                  { id: "6m", label: `6 Months (${timeframeCounts["6m"].toLocaleString()})` },
                  { id: "1y", label: `> 6 Months (${timeframeCounts["1y"].toLocaleString()})` }
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeframeFilter(t.id as any)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    timeframeFilter === t.id
                      ? "bg-[#ffa116] text-[#1a1a1a] font-bold"
                      : "bg-[#282828] text-zinc-400 hover:text-zinc-200 border border-white/[0.08]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status & Topic Pill Bar */}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono items-center">
              {(["all", "remaining", "solved"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-0.5 rounded transition-all capitalize cursor-pointer ${
                    statusFilter === s
                      ? "bg-[#333333] text-zinc-100 font-bold border border-white/[0.16]"
                      : "bg-[#282828] text-zinc-400 hover:text-zinc-200 border border-white/[0.08]"
                  }`}
                >
                  {s === "all" ? "All Status" : s}
                </button>
              ))}

              {selectedTopic !== "all" && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30 font-bold">
                  <span>{selectedTopic}</span>
                  <button onClick={() => setSelectedTopic("all")} className="cursor-pointer">
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>

            {/* Question Rows List */}
            <div className="flex flex-col gap-1.5 mt-1">
              {paginatedProblems.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-mono bg-[#282828] rounded-xl border border-white/[0.08]">
                  No questions match the current explorer filters.
                </div>
              ) : (
                paginatedProblems.map((prob) => {
                  const isSolved = solvedSlugs.has(prob.slug.toLowerCase())
                  const rawRating = zerotracRatingMap.get(prob.slug.toLowerCase())
                  const hasRating = typeof rawRating === "number" && Number.isFinite(rawRating) && rawRating > 0
                  const rating = hasRating ? Math.round(rawRating) : null

                  const diffColor =
                    prob.difficulty === "Easy"
                      ? "text-[#00b8a3] bg-[#00b8a3]/10 border-[#00b8a3]/20"
                      : prob.difficulty === "Medium"
                      ? "text-[#ffc01e] bg-[#ffc01e]/10 border-[#ffc01e]/20"
                      : "text-[#ef4743] bg-[#ef4743]/10 border-[#ef4743]/20"

                  const ratingTheme = rating ? rankThemeForRating(rating) : null

                  return (
                    <div
                      key={prob.slug}
                      className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isSolved
                          ? "bg-[#1a1a1a]/60 border-white/[0.04] text-zinc-400"
                          : "bg-[#282828] hover:bg-[#333333] border-white/[0.08] text-zinc-200"
                      }`}
                    >
                      {/* Left: Status, Title, Topic & Recency */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSolved ? (
                          <CheckCircle2 size={15} className="text-[#00b8a3] shrink-0" />
                        ) : (
                          <Circle size={15} className="text-zinc-600 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <a
                            href={`https://leetcode.com/problems/${prob.slug}/`}
                            target="_blank"
                            rel="noreferrer"
                            className={`text-xs font-semibold hover:text-[#ffa116] transition-colors truncate block ${
                              isSolved ? "line-through text-zinc-500" : "text-zinc-100"
                            }`}
                          >
                            {prob.title}
                          </a>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 mt-0.5">
                            <span>{prob.topic}</span>
                            <span>·</span>
                            <span className="text-[#ffa116] font-medium">{prob.timeframeLabel}</span>
                            <span>·</span>
                            <span className="text-zinc-400">{prob.frequencyScore}% Freq</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Badges & Solve Button */}
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[9px]">
                        {rating ? (
                          <span
                            title={`ZeroTrac Contest Rating: ${rating}`}
                            className="px-1.5 py-0.5 rounded border font-bold"
                            style={{ color: ratingTheme?.color, borderColor: ratingTheme?.border, backgroundColor: ratingTheme?.soft }}
                          >
                            Elo {rating}
                          </span>
                        ) : (
                          <span
                            title="Standard LeetCode Interview Problem (Not from a contest)"
                            className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-zinc-500 border border-white/[0.08]"
                          >
                            Standard
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded border font-semibold ${diffColor}`}>
                          {prob.difficulty}
                        </span>
                        <a
                          href={`https://leetcode.com/problems/${prob.slug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-[#ffa116]/10 hover:bg-[#ffa116]/20 text-[#ffa116] border border-[#ffa116]/30 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Solve</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Problem Pagination Controls */}
            {totalProblemPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2 border-t border-white/[0.08] font-mono text-xs text-zinc-400">
                <button
                  disabled={problemPage <= 1}
                  onClick={() => setProblemPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-[#282828] border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#333333] text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={12} />
                  <span>Prev</span>
                </button>
                <span className="text-[10px] text-zinc-500">
                  Page <strong className="text-zinc-300">{problemPage}</strong> of <strong className="text-zinc-300">{totalProblemPages}</strong> ({filteredProblems.length} total)
                </span>
                <button
                  disabled={problemPage >= totalProblemPages}
                  onClick={() => setProblemPage((p) => Math.min(totalProblemPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-[#282828] border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#333333] text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
