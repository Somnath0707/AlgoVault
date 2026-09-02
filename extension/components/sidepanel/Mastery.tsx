import React, { useEffect, useState, useMemo } from "react"
import { Card } from "../ui/Card"
import { fetchMastery, recomputeMastery } from "../../lib/api/backend"
import { getCachedMastery, setCachedMastery, getUsername } from "../../lib/storage"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  Target, Shield, Zap, TrendingUp, Trophy, Activity, RefreshCw, 
  ChevronDown, Clock, Crosshair, Flame, ArrowUpRight, Brain, Sigma, 
  Info, Sparkles, Award, BarChart3, Swords, Lock, Gauge, Search, 
  Filter, Layers, Crown, ExternalLink, CheckCircle2, Compass, Radio,
  BookOpen, Eye, Sparkle, ArrowRight
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { TagMastery } from "../../lib/types"

/* ═══════════════════════════════════════════════════════════
   TIER DESIGN SYSTEM & COLOR PALETTE
   Codeforces & Chess Elo aligned rating tiers
   ═══════════════════════════════════════════════════════════ */
const TIERS = [
  { name: "Grandmaster", floor: 2200, minSolves: 20, minConf: 60, color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", icon: Crown, desc: "Elite 1% mastery · Solves Hard problems with ease" },
  { name: "Master",      floor: 1900, minSolves: 12, minConf: 50, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)", icon: Crown, desc: "Top 5% mastery · High speed & clean algorithmic logic" },
  { name: "Expert",      floor: 1600, minSolves: 8,  minConf: 40, color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.35)", icon: Shield, desc: "Top 15% mastery · Consistently solves Medium/Hard topics" },
  { name: "Specialist",  floor: 1400, minSolves: 5,  minConf: 25, color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)", icon: Shield, desc: "Top 35% mastery · Solid fundamentals across core patterns" },
  { name: "Pupil",       floor: 1200, minSolves: 2,  minConf: 10, color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", icon: Trophy, desc: "Developing mastery · Good grasp on basic data structures" },
  { name: "Newbie",      floor: 0,    minSolves: 0,  minConf: 0,  color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.20)", icon: Award, desc: "Early practice · Building foundational problem-solving habits" },
] as const

const rdToConfidence = (rd: number) => Math.max(0, Math.min(100, Math.round(100 * (1 - Math.pow(rd / 350, 1.5)))))

const getTier = (score: number, totalSolved = 0, rd = 350) => {
  const conf = rdToConfidence(rd)
  for (const t of TIERS) {
    if (score >= t.floor && totalSolved >= t.minSolves && conf >= t.minConf) {
      return t
    }
  }
  const eligibleTier = TIERS.find(t => totalSolved >= t.minSolves && conf >= t.minConf) || TIERS[TIERS.length - 1]
  const targetTier = TIERS.find(t => score >= t.floor) || TIERS[TIERS.length - 1]
  return eligibleTier.floor < targetTier.floor ? eligibleTier : targetTier
}

const nextTier = (score: number) => {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score < TIERS[i].floor) return TIERS[i]
  }
  return null
}

const getStability = (vol: number) => {
  if (vol <= 0.04) return { label: "Rock Solid", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-500/30", icon: Shield, note: "Consistent first-attempt solutions" }
  if (vol <= 0.06) return { label: "Stable",     color: "text-[#38bdf8]",     bg: "bg-sky-400/10",     border: "border-sky-500/30",     icon: Shield, note: "Dependable performance with minimal retries" }
  if (vol <= 0.08) return { label: "Moderate",   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-500/30",   icon: Activity, note: "Fluctuates on complex edge cases" }
  return                   { label: "Volatile",   color: "text-rose-400",    bg: "bg-rose-400/10",    border: "border-rose-500/30",    icon: Zap, note: "Unpredictable outcomes — needs targeted practice" }
}

const timeSince = (dateStr?: string) => {
  if (!dateStr) return { text: "—", isDecaying: true }
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return { text: "today", isDecaying: false }
  if (days === 1) return { text: "yesterday", isDecaying: false }
  if (days < 7) return { text: `${days}d ago`, isDecaying: false }
  if (days < 30) return { text: `${Math.floor(days / 7)}w ago`, isDecaying: false }
  return { text: `${Math.floor(days / 30)}mo ago`, isDecaying: true }
}/* ═══════════════════════════════════════════════════════════
   PREMIUM SVG RING GAUGE (CHRONOGRAPH STYLE)
   ═══════════════════════════════════════════════════════════ */
const RingGauge = ({ score, size = 56, sw = 3.5, totalSolved = 100, rd = 50 }: { score: number; size?: number; sw?: number; totalSolved?: number; rd?: number }) => {
  const pct = Math.max(5, Math.min(100, (score / 2400) * 100))
  const tier = getTier(score, totalSolved, rd)
  const r = (size - sw * 2) / 2
  const c = 2 * Math.PI * r

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#181920" strokeWidth={sw} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={tier.color} strokeWidth={sw} fill="none"
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (pct / 100) * c }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 5px ${tier.color}66)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="font-mono font-bold text-zinc-100 tabular-nums leading-none tracking-tight" style={{ fontSize: size * 0.28 }}>
          {Math.round(score)}
        </span>
        <span className="text-[7.5px] font-mono text-zinc-400 font-semibold uppercase mt-0.5">ELO</span>
      </div>
    </div>
  )
}

/* Format long tags for radar chart without awkward ellipsis */
const formatRadarTag = (tag: string) => {
  const map: Record<string, string> = {
    "dynamic-programming": "DP",
    "binary-search": "BinSearch",
    "depth-first-search": "DFS",
    "breadth-first-search": "BFS",
    "two-pointers": "2-Pointers",
    "sliding-window": "Sliding Win",
    "divide-and-conquer": "D&C",
    "bit-manipulation": "Bitwise",
    "topological-sort": "TopoSort",
    "monotonic-stack": "MonoStack",
    "union-find": "DSU",
    "hash-table": "Hash Table",
    "binary-tree": "BinTree",
    "greedy": "Greedy",
    "backtracking": "Backtrack",
    "graph": "Graphs",
    "trie": "Trie",
    "math": "Math",
    "geometry": "Geometry",
    "string": "Strings",
    "array": "Arrays",
    "tree": "Trees",
    "heap-priority-queue": "Heap/PQ",
    "linked-list": "LinkedList"
  }
  const clean = tag.toLowerCase().trim()
  if (map[clean]) return map[clean]
  return tag.length > 10 ? tag.slice(0, 9) + "…" : tag
}

export const Mastery = () => {
  const [data, setData] = useState<TagMastery[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showGuidebook, setShowGuidebook] = useState(false)
  const [expandedTag, setExpandedTag] = useState<string | null>(null)
  const [username, setUsernameState] = useState<string>("")

  // Search & Filter & View state
  const [searchQuery, setSearchQuery] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"score" | "weakest" | "solved" | "volatility">("score")
  const [chartMode, setChartMode] = useState<"radar" | "distribution">("radar")

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      if (!forceRefresh) {
        const cached = await getCachedMastery()
        if (cached?.length) {
          setData(cached)
          setLoading(false)
        }
      }
      const fetched = forceRefresh ? await recomputeMastery() : await fetchMastery()
      setData(fetched)
      setCachedMastery(fetched)
    } catch (err) {
      console.error("Failed to fetch tag mastery:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
    getUsername().then(u => setUsernameState(u || ""))
  }, [])

  /* ═══════════════════════════════════════════════════════════
     STATISTICALLY SOUND GLICKO-2 COMPOSITE CALCULATIONS
     ═══════════════════════════════════════════════════════════ */
  const analytics = useMemo(() => {
    if (!data.length) return null
    const sorted = [...data].sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0))

    let wSum = 0, wTotal = 0, solved = 0, attempted = 0, firstAc = 0
    sorted.forEach(m => {
      const rd = Math.max(m.rd || 350, 30)
      const w = 1 / (rd * rd + 100)

      wSum += w * (m.masteryScore || 800)
      wTotal += w
      solved += m.totalSolved || 0
      attempted += m.totalAttempted || 0
      firstAc += m.firstAcCount || 0
    })

    let rdW = 0, volW = 0, rdN = 0
    sorted.forEach(m => {
      const n = m.totalAttempted || 1
      rdW += n * (m.rd || 350)
      volW += n * (m.volatility || 0.06)
      rdN += n
    })

    const tierDist: Record<string, number> = {}
    TIERS.forEach(t => { tierDist[t.name] = 0 })
    sorted.forEach(m => { 
      const t = getTier(m.masteryScore || 800, m.totalSolved || 0, m.rd || 350)
      tierDist[t.name] = (tierDist[t.name] || 0) + 1 
    })

    const compositePowerIndex = Math.max(800, wTotal > 0 ? wSum / wTotal : 800)

    return {
      sorted,
      powerIndex: compositePowerIndex,
      avgRd: rdN > 0 ? rdW / rdN : 350,
      avgVol: rdN > 0 ? volW / rdN : 0.06,
      solved, attempted, firstAc, tierDist,
      top3: sorted.slice(0, 3),
      weakest: sorted[sorted.length - 1],
      closestPromo: sorted.reduce<{ tag: string; needed: number; tier: string; color: string } | null>((b, m) => {
        const nx = nextTier(m.masteryScore || 0)
        if (!nx) return b
        const gap = nx.floor - (m.masteryScore || 0)
        return !b || gap < b.needed ? { tag: m.tag, needed: gap, tier: nx.name, color: nx.color } : b
      }, null),
      mostVolatile: sorted.reduce<TagMastery | null>((b, m) => !b || (m.volatility || 0) > (b.volatility || 0) ? m : b, null),
      mostPracticed: sorted.reduce<TagMastery | null>((b, m) => !b || (m.totalAttempted || 0) > (b.totalAttempted || 0) ? m : b, null),
    }
  }, [data])

  const filteredTopics = useMemo(() => {
    if (!analytics) return []
    let list = [...analytics.sorted]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(m => m.tag.toLowerCase().includes(q))
    }

    if (tierFilter !== "all") {
      list = list.filter(m => getTier(m.masteryScore || 800, m.totalSolved || 0, m.rd || 350).name.toLowerCase() === tierFilter.toLowerCase())
    }

    list.sort((a, b) => {
      if (sortBy === "weakest") return (a.masteryScore || 0) - (b.masteryScore || 0)
      if (sortBy === "solved") return (b.totalSolved || 0) - (a.totalSolved || 0)
      if (sortBy === "volatility") return (b.volatility || 0) - (a.volatility || 0)
      return (b.masteryScore || 0) - (a.masteryScore || 0)
    })

    return list
  }, [analytics, searchQuery, tierFilter, sortBy])

  if (loading) return (
    <div className="grid h-64 place-items-center font-sans">
      <div className="flex flex-col items-center gap-2">
        <RefreshCw size={22} className="animate-spin text-amber-400" />
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">Loading Skill Telemetry...</span>
      </div>
    </div>
  )

  if (!data.length || !analytics) return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#090a0f] p-8 text-center font-sans">
      <Trophy className="mx-auto h-9 w-9 text-zinc-600 mb-2.5" />
      <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">No Mastery Telemetry Logged</h2>
      <p className="mx-auto mt-1 max-w-[260px] text-xs leading-relaxed text-zinc-500 font-mono">
        Run a sync in Settings to compute your Glicko-2 topic ratings and weakness targets.
      </p>
    </div>
  )

  const { sorted, powerIndex, avgRd, avgVol, solved, attempted, firstAc, tierDist, top3, weakest } = analytics
  const pi = getTier(powerIndex, solved, avgRd)
  const conf = rdToConfidence(avgRd)
  const stability = getStability(avgVol)
  const nextTr = nextTier(powerIndex)
  const TierIcon = pi.icon

  // Continuum placement (range: 800 to 2400)
  const continuumPct = Math.max(3, Math.min(97, Math.round(((powerIndex - 800) / (2400 - 800)) * 100)))

  // Progress to next tier
  const currentFloor = pi.floor
  const targetFloor = nextTr ? nextTr.floor : 2400
  const tierProgressPct = nextTr
    ? Math.max(5, Math.min(100, Math.round(((powerIndex - currentFloor) / (targetFloor - currentFloor)) * 100)))
    : 100

  return (
    <div className="space-y-4 pb-8 font-sans select-none animate-fadeIn">

      {/* ══════════ 1. HEADER BAR & GUIDEBOOK TOGGLE ══════════ */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shadow-sm shrink-0">
            <Brain size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <span className="truncate">Mastery Engine</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.2 rounded-full font-normal shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Glicko-2
              </span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono truncate">
              Algorithmic Elo ratings calibrated across {sorted.length} topics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono shrink-0 ml-2">
          <button
            onClick={() => setShowGuidebook(!showGuidebook)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-[11px] text-zinc-300 hover:text-white transition cursor-pointer shadow-sm"
            title="Open Mastery Guidebook"
          >
            <BookOpen size={12} className="text-amber-400" />
            <span>Guide</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition cursor-pointer shadow-sm"
            title="Recalculate Glicko-2 ratings"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-amber-400" : ""} />
          </button>
        </div>
      </div>

      {/* ══════════ GUIDEBOOK DRAWER ══════════ */}
      <AnimatePresence>
        {showGuidebook && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-[#0d0e14] rounded-2xl border border-amber-500/30 space-y-3 font-sans text-xs text-zinc-300 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
                  <BookOpen size={14} /> Guidebook · Understanding Your Skill Metrics
                </div>
                <button 
                  onClick={() => setShowGuidebook(false)} 
                  className="text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] leading-relaxed text-zinc-400 font-sans">
                AlgoVault calculates your <strong className="text-zinc-200">Glicko-2 Elo rating per topic</strong> (the statistical engine powering FIDE chess and competitive gaming). Here is what each telemetry indicator represents:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[9.5px]">
                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="font-bold text-amber-400 uppercase flex items-center gap-1.5">
                    <Sigma size={12} /> Composite Power ELO
                  </span>
                  <p className="text-zinc-400 leading-relaxed text-[9.5px]">
                    Your global skill score across all patterns, weighted by problem sample size and inverse rating variance.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                    <Shield size={12} /> Certainty % (Rating Deviation)
                  </span>
                  <p className="text-zinc-400 leading-relaxed text-[9.5px]">
                    How confident the system is in your score. Starts wide (RD 350) and sharpens as you log verified solves.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="font-bold text-sky-400 uppercase flex items-center gap-1.5">
                    <Activity size={12} /> Stability & Volatility (σ)
                  </span>
                  <p className="text-zinc-400 leading-relaxed text-[9.5px]">
                    Measures consistency. <em>Rock Solid</em> means steady first-try wins; <em>Volatile</em> indicates swings on edge cases.
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <span className="font-bold text-purple-400 uppercase flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> 1st-Try AC Precision
                  </span>
                  <p className="text-zinc-400 leading-relaxed text-[9.5px]">
                    Percentage of problems accepted on your very first submission without penalties, editorial peeks, or TLE.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ 2. HERO ELO COMMAND CENTER (PRESTIGE RANK CARD) ══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-b from-zinc-900/90 via-[#0a0c10] to-[#0a0c10] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ borderColor: pi.border }}
      >
        {/* Radiant Ambient Tier Aura */}
        <div 
          className="absolute -top-16 -right-16 h-52 w-52 rounded-full blur-3xl pointer-events-none opacity-25 transition-all duration-700" 
          style={{ backgroundColor: pi.color }} 
        />

        <div className="relative space-y-4">
          {/* Card Top Eyebrow */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400 font-mono">
              <Sparkles size={12} /> Composite Elo Command Score
            </span>
            <div 
              className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9.5px] font-mono font-bold uppercase border shadow-sm"
              style={{ color: pi.color, backgroundColor: pi.bg, borderColor: pi.border }}
            >
              <TierIcon size={12} />
              <span>{pi.name} Tier</span>
            </div>
          </div>

          {/* Main Score & Radial Chronograph Row */}
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <motion.span
                  className="text-4xl font-bold font-mono tracking-tight text-white leading-none tabular-nums drop-shadow-sm"
                  initial={{ opacity: 0, scale: 0.94 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08, type: "spring", stiffness: 200 }}
                >
                  {Math.round(powerIndex)}
                </motion.span>
                <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
                  ELO
                </span>
              </div>
              <p className="text-[11px] font-sans text-zinc-400 mt-2 max-w-[290px] leading-relaxed">
                {pi.desc}
              </p>
            </div>

            <RingGauge score={powerIndex} size={64} sw={4} totalSolved={solved} rd={avgRd} />
          </div>

          {/* CODEFORCES / LEETCODE CONTINUUM BAR WITH GLOWING PIN */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-3.5 font-mono">
            <div className="flex justify-between text-[8px] text-zinc-400 uppercase font-bold tracking-wider">
              <span>Newbie (0)</span>
              <span>Pupil (1200)</span>
              <span>Specialist (1400)</span>
              <span>Expert (1600)</span>
              <span>Master (1900)</span>
              <span>GM (2200+)</span>
            </div>

            {/* Continuum Track with Interactive Glow Pin */}
            <div className="relative h-2.5 w-full bg-zinc-950 border border-zinc-800 rounded-full p-0.5 flex items-center">
              {TIERS.slice().reverse().map(t => (
                <div 
                  key={t.name} 
                  className="h-full flex-1 border-r border-zinc-950/60 first:rounded-l-full last:rounded-r-full opacity-65" 
                  style={{ backgroundColor: t.color }} 
                />
              ))}

              {/* Glowing Indicator Pin */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] flex items-center justify-center transition-all duration-700"
                style={{ left: `${continuumPct}%`, backgroundColor: pi.color }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              </div>
            </div>

            {/* Next Tier Progression */}
            <div className="flex items-center justify-between text-[9.5px] text-zinc-400 pt-0.5">
              <span>
                Tier: <strong style={{ color: pi.color }}>{pi.name}</strong> ({pi.floor}+)
              </span>
              {nextTr ? (
                <span className="font-semibold text-zinc-200 flex items-center gap-1">
                  <span>+{Math.max(0, nextTr.floor - Math.round(powerIndex))} ELO to</span>
                  <strong style={{ color: nextTr.color }}>{nextTr.name}</strong>
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">Peak Grandmaster Reached</span>
              )}
            </div>

            {/* Sleek Mini Progress Bar to Next Tier */}
            {nextTr && (
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden flex items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${tierProgressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: pi.color }}
                />
              </div>
            )}
          </div>

          {/* 3 Prestige Telemetry Pods */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 flex flex-col justify-between shadow-sm">
              <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Certainty (RD)</div>
              <div className={`text-sm font-bold tabular-nums mt-1 ${conf >= 60 ? "text-emerald-400" : "text-amber-400"}`}>
                {conf}% <span className="text-[8.5px] text-zinc-400 font-normal">±{Math.round(avgRd)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 flex flex-col justify-between shadow-sm">
              <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">Consistency</div>
              <div className={`text-sm font-bold mt-1 flex items-center justify-center gap-1.5 ${stability.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>{stability.label}</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 flex flex-col justify-between shadow-sm">
              <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-400">1st-Try AC Rate</div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums mt-1">
                {attempted > 0 ? Math.round((firstAc / attempted) * 100) : 0}%
                <span className="text-[8.5px] text-zinc-400 font-normal ml-1">({firstAc}/{attempted})</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ══════════ 3. DUAL SPOTLIGHT: DOMINANT DOMAIN VS GROWTH FRONTIER ══════════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Hall of Fame (#1 Top Topic) */}
        {top3[0] && (
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#0d0e14] to-[#0d0e14] p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Crown size={13} /> #1 Dominant Domain
              </span>
              <span className="text-[9px] font-mono text-zinc-400">Highest ELO</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-100 truncate" title={top3[0].tag}>
                  {top3[0].tag}
                </p>
                <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  {top3[0].totalSolved} Solved · {top3[0].totalAttempted > 0 ? Math.round((top3[0].totalSolved / top3[0].totalAttempted) * 100) : 0}% Win Rate
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-lg font-bold text-amber-400 tabular-nums">
                  ★ {Math.round(top3[0].masteryScore || 800)}
                </span>
              </div>
            </div>

            <a
              href={`https://leetcode.com/tag/${top3[0].tag.toLowerCase().replace(/\s+/g, '-')}/`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center justify-end gap-1 pt-1.5 border-t border-zinc-800/80 transition-colors"
            >
              <span>Practice Top Tag</span>
              <ArrowUpRight size={11} />
            </a>
          </div>
        )}

        {/* Primary Weakness Target */}
        {weakest && (
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-[#0d0e14] to-[#0d0e14] p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Crosshair size={13} /> Primary Growth Frontier
              </span>
              <span className="text-[9px] font-mono text-zinc-400">Needs Focus</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-rose-300 truncate" title={weakest.tag}>
                  {weakest.tag}
                </p>
                <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                  {weakest.totalSolved} Solved · RD ±{Math.round(weakest.rd || 350)}
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-lg font-bold text-rose-400 tabular-nums">
                  ★ {Math.round(weakest.masteryScore || 800)}
                </span>
              </div>
            </div>

            <a
              href={`https://leetcode.com/tag/${weakest.tag.toLowerCase().replace(/\s+/g, '-')}/`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono font-bold text-rose-400 hover:text-rose-300 flex items-center justify-end gap-1 pt-1.5 border-t border-zinc-800/80 transition-colors"
            >
              <span>Drill Weakness Target</span>
              <ArrowUpRight size={11} />
            </a>
          </div>
        )}
      </section>

      {/* ══════════ 4. SKILL CONSTELLATION & HORIZON VISUALIZER ══════════ */}
      {(() => {
        const items = sorted.filter(d => d.totalAttempted >= 2).slice(0, 8)
        if (items.length < 3) return null

        const radarData = items.map(d => ({
          subject: formatRadarTag(d.tag),
          score: Math.round(d.masteryScore || 800),
          raw: Math.round((d.rawRating || d.masteryScore || 800) + (d.rd ? d.rd : 0)),
          fullName: d.tag
        }))

        return (
          <div className="p-4 rounded-2xl bg-[#0d0e14] border border-zinc-800/80 space-y-3 shadow-md">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Brain size={14} className="text-sky-400" />
                <span className="text-xs font-bold text-zinc-100 font-sans tracking-tight">
                  Skill Horizon Telemetry
                </span>
              </div>

              {/* View Switcher: Radar vs Distribution */}
              <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-lg text-[10px] font-mono">
                <button
                  onClick={() => setChartMode("radar")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    chartMode === "radar" ? "bg-zinc-800 text-sky-400 font-bold shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Radar Constellation
                </button>
                <button
                  onClick={() => setChartMode("distribution")}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    chartMode === "distribution" ? "bg-zinc-800 text-amber-400 font-bold shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Tier Horizon
                </button>
              </div>
            </div>

            {chartMode === "radar" ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
                    <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'monospace', fontWeight: 600 }} 
                    />
                    <Radar 
                      name="Ceiling" 
                      dataKey="raw" 
                      stroke="rgba(56,189,248,0.45)" 
                      strokeWidth={1} 
                      fill="rgba(56,189,248,0.08)" 
                      fillOpacity={1} 
                    />
                    <Radar 
                      name="Elo Score" 
                      dataKey="score" 
                      stroke={pi.color} 
                      strokeWidth={1.5} 
                      fill={pi.color} 
                      fillOpacity={0.18} 
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: '#090a0f', 
                        border: '1px solid #27272a', 
                        borderRadius: '10px', 
                        fontSize: 10.5, 
                        fontFamily: 'monospace', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.9)', 
                        padding: '8px 12px' 
                      }}
                      formatter={(v: number, n: string) => [`★ ${v} ELO`, n]}
                      labelFormatter={(label) => {
                        const item = radarData.find(d => d.subject === label)
                        return item ? item.fullName : label
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="space-y-2 pt-1 font-mono">
                {TIERS.map(t => {
                  const count = tierDist[t.name] || 0
                  const pct = sorted.length > 0 ? Math.round((count / sorted.length) * 100) : 0
                  return (
                    <div 
                      key={t.name} 
                      onClick={() => setTierFilter(t.name.toLowerCase())}
                      className="flex items-center gap-2 text-xs hover:bg-zinc-850/40 p-1 rounded-lg transition-colors cursor-pointer group"
                    >
                      <span className="w-24 truncate text-[10.5px] font-semibold" style={{ color: t.color }}>
                        {t.name}
                      </span>
                      <div className="flex-1 h-3 bg-zinc-850/70 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(2, pct)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full rounded-full transition-all group-hover:brightness-125"
                          style={{ backgroundColor: t.color }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono w-14 text-right tabular-nums">
                        {count} <span className="text-[9px] text-zinc-400">({pct}%)</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ══════════ 5. TOPIC MASTERY FILTERABLE MATRIX ══════════ */}
      <div className="space-y-3 pt-2 font-mono">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5 font-sans tracking-tight">
            <Layers size={14} className="text-amber-400" /> Topic Skill Matrix ({filteredTopics.length})
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            Click any card to inspect
          </span>
        </div>

        {/* Search Bar with Instant Clear */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics by name (e.g. dp, graph, tree)..."
            className="w-full bg-[#0d0e14] border border-zinc-800 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Horizontally Scrollable Tier Pill Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
          <button
            onClick={() => setTierFilter("all")}
            className={`px-3 py-1 rounded-lg border text-[10.5px] whitespace-nowrap transition-all cursor-pointer ${
              tierFilter === "all"
                ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm font-semibold"
                : "bg-[#0d0e14] text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
            }`}
          >
            All Topics ({analytics.sorted.length})
          </button>
          {TIERS.map(t => {
            const count = analytics.tierDist[t.name] || 0
            const isSelected = tierFilter.toLowerCase() === t.name.toLowerCase()
            return (
              <button
                key={t.name}
                onClick={() => setTierFilter(isSelected ? "all" : t.name.toLowerCase())}
                className={`px-2.5 py-1 rounded-lg border text-[10.5px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "border-current font-bold shadow-sm"
                    : "bg-[#0d0e14] text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                }`}
                style={isSelected ? { color: t.color, backgroundColor: `${t.color}18`, borderColor: `${t.color}50` } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}</span>
                <span className="text-[9.5px] opacity-70 font-mono">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Sort Controls Bar */}
        <div className="flex items-center justify-between text-xs font-mono px-0.5">
          <span className="text-zinc-400 text-[10px] font-mono">
            Showing {filteredTopics.length} of {sorted.length} topics
          </span>
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 p-0.5 rounded-lg text-[10px]">
            {[
              { key: "score", label: "Elo ↓" },
              { key: "weakest", label: "Weakest ↑" },
              { key: "solved", label: "Solved" },
              { key: "volatility", label: "Volatile" }
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setSortBy(s.key as any)}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  sortBy === s.key ? "bg-zinc-800 text-amber-400 font-bold shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TOPIC MASTERY CARDS LIST */}
      <div className="space-y-2">
        {filteredTopics.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-[#0d0e14]">
            No topic tags match your active filter.
          </div>
        ) : (
          filteredTopics.map((m, i) => {
            const score = m.masteryScore || 800
            const rd = m.rd || 350
            const vol = m.volatility || 0.06
            const winRate = m.totalAttempted > 0 ? Math.round((m.totalSolved / m.totalAttempted) * 100) : 0
            const stab = getStability(vol)
            const open = expandedTag === m.tag
            const tierStyle = getTier(score, m.totalSolved || 0, rd)
            const CardIcon = tierStyle.icon

            // Progress bar to 2400 Grandmaster benchmark
            const progressToGm = Math.max(5, Math.min(100, Math.round((score / 2400) * 100)))

            return (
              <motion.div 
                key={m.tag}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.25) }}
                className="rounded-2xl border bg-[#0d0e14] overflow-hidden transition-all hover:border-zinc-700/80 shadow-sm"
                style={{ borderColor: open ? tierStyle.color : "rgba(39,39,42,0.7)" }}
              >
                <button 
                  onClick={() => setExpandedTag(open ? null : m.tag)} 
                  className="w-full flex items-center gap-3.5 p-3.5 text-left cursor-pointer hover:bg-zinc-850/30 transition-colors"
                >
                  {/* Tier Emblem Square */}
                  <div 
                    className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm"
                    style={{ color: tierStyle.color, backgroundColor: tierStyle.bg, borderColor: tierStyle.border }}
                  >
                    <CardIcon size={16} />
                  </div>

                  {/* Middle: Title & Meta Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-zinc-100 font-sans tracking-tight" title={m.tag}>
                        {m.tag}
                      </span>
                      <div className="flex items-center gap-1 font-mono shrink-0">
                        <span className="text-xs font-bold tabular-nums text-zinc-100">
                          ★ {Math.round(score)}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-normal">ELO</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[9.5px]">
                      <span 
                        className="font-bold px-1.5 py-0.2 rounded border text-[8.5px]"
                        style={{ color: tierStyle.color, backgroundColor: tierStyle.bg, borderColor: tierStyle.border }}
                      >
                        {tierStyle.name}
                      </span>
                      <span className="text-zinc-400">
                        {m.totalSolved} Solved
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        {winRate}% WR
                      </span>
                    </div>

                    {/* Subtle Topic Strength Bar */}
                    <div className="h-1 w-full bg-zinc-850/80 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${progressToGm}%`, backgroundColor: tierStyle.color }} 
                      />
                    </div>
                  </div>

                  <ChevronDown 
                    size={14} 
                    className={`text-zinc-500 transition-transform shrink-0 ${open ? 'rotate-180 text-zinc-200' : ''}`} 
                  />
                </button>
                
                {/* Expanded Detailed Breakdown Drawer */}
                <AnimatePresence>
                  {open && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} 
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} 
                      className="overflow-hidden border-t border-zinc-800/80 bg-zinc-950/70"
                    >
                      <div className="p-4 space-y-3">
                        {/* 4 Detail Badges */}
                        <div className="grid grid-cols-4 gap-2 font-mono text-center">
                          <div className="rounded-xl bg-[#0d0e14] p-2 border border-zinc-800/80">
                            <div className="text-[8px] uppercase font-bold text-zinc-400">Solved</div>
                            <div className="text-xs font-bold text-zinc-200 mt-0.5 tabular-nums">
                              {m.totalSolved} / {m.totalAttempted}
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#0d0e14] p-2 border border-zinc-800/80">
                            <div className="text-[8px] uppercase font-bold text-zinc-400">1st-Try AC</div>
                            <div className="text-xs font-bold text-emerald-400 mt-0.5 tabular-nums">
                              {m.totalAttempted > 0 ? Math.round((m.firstAcCount / m.totalAttempted) * 100) : 0}%
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#0d0e14] p-2 border border-zinc-800/80">
                            <div className="text-[8px] uppercase font-bold text-zinc-400">Certainty</div>
                            <div className="text-xs font-bold text-amber-400 mt-0.5 tabular-nums">
                              ±{Math.round(rd)} RD
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#0d0e14] p-2 border border-zinc-800/80">
                            <div className="text-[8px] uppercase font-bold text-zinc-400">Last Active</div>
                            <div className="text-xs font-bold text-sky-400 mt-0.5">
                              {timeSince(m.lastSolvedAt).text}
                            </div>
                          </div>
                        </div>

                        {/* Stability note */}
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                          <strong className={stab.color}>{stab.label}:</strong> {stab.note}.
                        </p>

                        {/* Direct Practice Action */}
                        <a
                          href={`https://leetcode.com/tag/${m.tag.toLowerCase().replace(/\s+/g, '-')}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 py-2.5 text-xs font-mono font-bold text-amber-400 transition cursor-pointer shadow-sm"
                        >
                          <span>Practice {m.tag} Problems on LeetCode</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
