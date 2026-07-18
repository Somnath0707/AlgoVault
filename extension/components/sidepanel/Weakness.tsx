import React, { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, CircleCheck, Filter, Gauge, RefreshCw, Sparkles, Target, TrendingUp, Zap, ChevronDown, ChevronUp } from "lucide-react"
import { Card } from "../ui/Card"
import { fetchWeakness } from "../../lib/api/backend"
import { getCachedWeakness, setCachedWeakness } from "../../lib/storage"

interface WeakTag {
  tag: string
  masteryScore: number
}

interface RecommendedProblem {
  title: string
  titleSlug: string
  tag?: string
  difficulty?: string
  actualRating?: number
  frontendId?: number
  acceptanceRate?: number
}

interface WeaknessData {
  weakTags: WeakTag[]
  recommendations: RecommendedProblem[]
}

/* ── Mastery tiers (competitive-programming style) ── */
const getTier = (score: number) => {
  if (score >= 2200) return { name: "Grandmaster", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" }
  if (score >= 1900) return { name: "Master", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" }
  if (score >= 1600) return { name: "Expert", color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" }
  if (score >= 1400) return { name: "Specialist", color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)" }
  if (score >= 1200) return { name: "Pupil", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" }
  return { name: "Newbie", color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.2)" }
}

const difficultyMeta = (rating?: number, difficulty?: string) => {
  if (rating && rating < 1300) return { text: String(Math.round(rating)), color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)", label: "Easy" }
  if (rating && rating < 1800) return { text: String(Math.round(rating)), color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", label: "Medium" }
  if (rating) return { text: String(Math.round(rating)), color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", label: "Hard" }
  if (difficulty === "Easy") return { text: "Easy", color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.25)", label: "Easy" }
  if (difficulty === "Medium") return { text: "Medium", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", label: "Medium" }
  if (difficulty === "Hard") return { text: "Hard", color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", label: "Hard" }
  return { text: difficulty || "?", color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.2)", label: "Unknown" }
}

const masteryPercent = (score: number) => Math.max(5, Math.min(100, Math.round((Number(score) / 2500) * 100)))

/* ── Ring Gauge Component ── */
const RingGauge = ({ score, size = 72 }: { score: number; size?: number }) => {
  const percent = masteryPercent(score)
  const tier = getTier(score)
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#27272a" strokeWidth={4} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tier.color}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold text-zinc-100 tabular-nums leading-none">{Math.round(score)}</span>
        <span className="text-[7px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: tier.color }}>{tier.name}</span>
      </div>
    </div>
  )
}

export const Weakness = () => {
  const [data, setData] = useState<WeaknessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [diffFilter, setDiffFilter] = useState<"all" | "Easy" | "Medium" | "Hard">("all")
  const [showAllTags, setShowAllTags] = useState(false)

  const useData = (next: WeaknessData | null) => {
    if (!next) return
    setData(next)
    // Don't auto-select a tag — default to showing ALL recommendations
    setSelectedTag((current) => current && next.weakTags.some((tag) => tag.tag === current) ? current : null)
  }

  useEffect(() => {
    let live = true
    getCachedWeakness().then((cached) => {
      if (live && cached) {
        useData(cached as WeaknessData)
        setLoading(false)
      }
    })
    fetchWeakness()
      .then((fresh) => {
        if (!live) return
        useData(fresh as WeaknessData)
        setCachedWeakness(fresh)
      })
      .catch((error) => console.error("Unable to load training priorities:", error))
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const fresh = await fetchWeakness(true) as WeaknessData
      useData(fresh)
      await setCachedWeakness(fresh)
    } catch (error) {
      console.error("Unable to refresh training priorities:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const recommendations = useMemo(() => {
    const all = data?.recommendations || []
    let filtered = all
    if (selectedTag) {
      const tagFiltered = all.filter((problem) => problem.tag === selectedTag)
      // Only apply tag filter if it actually produces results
      if (tagFiltered.length > 0) {
        filtered = tagFiltered
      }
      // If the selected tag has 0 results, show all and let the user know
    }
    if (diffFilter !== "all") {
      filtered = filtered.filter((problem) => {
        const meta = difficultyMeta(problem.actualRating, problem.difficulty)
        return meta.label === diffFilter
      })
    }
    return filtered
  }, [data, selectedTag, diffFilter])

  if (loading) return <div className="grid h-48 place-items-center"><div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500"><RefreshCw size={14} className="animate-spin" /> Reading your training history</div></div>

  if (!data?.weakTags?.length) {
    return <Card className="grid min-h-56 place-items-center border-dashed border-zinc-800 bg-zinc-950/40 p-7 text-center"><div><Target className="mx-auto h-7 w-7 text-zinc-600" /><h2 className="mt-3 text-sm font-semibold text-zinc-200">Your training room is waiting.</h2><p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-500">Sync a few attempts and accepted submissions to build a recommendation queue from your actual patterns.</p></div></Card>
  }

  const focus = data.weakTags.find((tag) => tag.tag === selectedTag) || data.weakTags[0]
  const focusTier = getTier(focus.masteryScore)
  const visibleTags = showAllTags ? data.weakTags : data.weakTags.slice(0, 3)

  // Motivational tagline based on mastery level
  const getMotivation = (score: number) => {
    if (score >= 2000) return "You're crushing it. Push into the hard zone."
    if (score >= 1600) return "Strong foundation. Time to sharpen the edges."
    if (score >= 1200) return "Good momentum. Keep reinforcing the patterns."
    if (score >= 800) return "Building up. Every solve compounds your growth."
    return "Start here. The first few solves matter most."
  }

  const diffFilters: Array<{ key: "all" | "Easy" | "Medium" | "Hard"; label: string; color: string }> = [
    { key: "all", label: "All", color: "#a1a1aa" },
    { key: "Easy", label: "Easy", color: "#34d399" },
    { key: "Medium", label: "Medium", color: "#fbbf24" },
    { key: "Hard", label: "Hard", color: "#f87171" }
  ]

  return (
    <div className="grid gap-4 pb-6">

      {/* ═══════════ HERO: Focus Card with Ring Gauge ═══════════ */}
      <section className="relative overflow-hidden rounded-xl border border-teal-400/15 bg-gradient-to-br from-[#07191b] to-[#0a1a1f] px-4 py-4 shadow-[0_14px_34px_rgba(0,0,0,.24)]">
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_8%_5%,rgba(45,212,191,.14),transparent_30%),radial-gradient(circle_at_95%_100%,rgba(251,191,36,.12),transparent_30%)]" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-300">
              <Target size={13} /> Training room
            </div>
            <h2 className="mt-1.5 text-base font-semibold text-zinc-50 leading-tight">
              {getMotivation(focus.masteryScore)}
            </h2>
          </div>
          <button type="button" onClick={refresh} disabled={refreshing} className="group flex items-center gap-1.5 shrink-0 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1.5 text-[10px] font-mono font-bold text-teal-300 transition hover:bg-teal-400/20 hover:border-teal-400/40 disabled:opacity-50" aria-label="Shuffle recommendations">
            <RefreshCw size={12} className={refreshing ? "animate-spin text-teal-200" : "text-teal-400/70 group-hover:text-teal-300"} />
            SHUFFLE
          </button>
        </div>

        {/* Focus topic + ring gauge */}
        <div className="relative mt-4 flex items-center gap-4">
          <RingGauge score={focus.masteryScore} />
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-teal-300/70">Focus now</div>
            <div className="mt-0.5 text-lg font-semibold text-zinc-50 truncate">{focus.tag}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: focusTier.bg, color: focusTier.color, border: `1px solid ${focusTier.border}` }}>
                <Zap size={9} /> {focusTier.name}
              </span>
              <span className="text-[9px] text-zinc-500 font-mono tabular-nums">
                {recommendations.length} drill{recommendations.length !== 1 ? "s" : ""} queued
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SKILL SIGNALS ═══════════ */}
      <section>
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 panel-label"><Gauge size={13} className="text-[#e7ba68]" /> Skill signals</div>
          <span className="text-[9px] font-mono text-zinc-600">{data.weakTags.length} topics</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/35">
          {visibleTags.map((tag, index) => {
            const active = tag.tag === selectedTag
            const percent = masteryPercent(tag.masteryScore)
            const tier = getTier(tag.masteryScore)

            return (
              <button
                key={tag.tag}
                type="button"
                onClick={() => setSelectedTag(tag.tag)}
                className={`group flex w-full items-center gap-3 border-b border-zinc-800/60 px-3.5 py-2.5 text-left last:border-b-0 transition-all duration-200 ${active ? "bg-[#d9a441]/[.07]" : "hover:bg-zinc-900/60"}`}
                aria-pressed={active}
              >
                {/* Rank number or active dot */}
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-mono font-bold transition-all ${active ? "bg-[#d9a441]/20 text-[#f8d791] border border-[#d9a441]/40" : "bg-zinc-900 text-zinc-600 border border-zinc-700"}`}>
                  {index + 1}
                </span>

                {/* Tag info */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-zinc-200">{tag.tag}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}` }}>
                        {tier.name}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 tabular-nums w-8 text-right">{Math.round(tag.masteryScore)}</span>
                    </span>
                  </span>

                  {/* Progress bar */}
                  <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-black/40">
                    <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: active ? "#e7ba68" : tier.color }} />
                  </span>
                </span>
              </button>
            )
          })}

          {/* Show more / less toggle */}
          {data.weakTags.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllTags(!showAllTags)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-wide text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 transition border-t border-zinc-800/60"
            >
              {showAllTags ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show all {data.weakTags.length} topics</>}
            </button>
          )}
        </div>
      </section>

      {/* ═══════════ DRILL DECK ═══════════ */}
      <section>
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 panel-label"><Sparkles size={13} className="text-emerald-400" /> Drill deck</div>
          <button type="button" onClick={() => setSelectedTag(null)} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] transition ${selectedTag ? "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300" : "bg-zinc-900 text-zinc-300"}`}><Filter size={10} /> All</button>
        </div>

        {/* Difficulty filter pills */}
        <div className="flex gap-1.5 mb-3">
          {diffFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setDiffFilter(f.key)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-semibold transition-all duration-200 ${diffFilter === f.key ? "shadow-sm" : "opacity-60 hover:opacity-100"}`}
              style={diffFilter === f.key ? { backgroundColor: `${f.color}15`, color: f.color, border: `1px solid ${f.color}40` } : { backgroundColor: "transparent", color: "#71717a", border: "1px solid #27272a" }}
            >
              {f.key !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Problem cards */}
        <div className="grid gap-2">
          {recommendations.length > 0 ? recommendations.map((problem, index) => {
            const meta = difficultyMeta(problem.actualRating, problem.difficulty)
            return (
              <a
                key={`${problem.titleSlug}-${index}`}
                href={`https://leetcode.com/problems/${problem.titleSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="group relative flex items-center gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-900/70 overflow-hidden"
              >
                {/* Left color accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ backgroundColor: meta.color }} />

                {/* Problem number badge */}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border text-[10px] font-mono font-bold ml-1" style={{ borderColor: meta.border, backgroundColor: meta.bg, color: meta.color }}>
                  {problem.frontendId || "#"}
                </span>

                {/* Problem details */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block truncate text-xs font-semibold text-zinc-200 transition group-hover:text-white">{problem.title}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-[9px] text-zinc-500">
                    <span className="uppercase tracking-[0.08em]">{problem.tag || focus.tag}</span>
                    {problem.acceptanceRate != null && (
                      <>
                        <span className="text-zinc-700">•</span>
                        <span className="tabular-nums">{Math.round(problem.acceptanceRate)}% acc</span>
                      </>
                    )}
                  </span>
                </span>

                {/* Rating badge */}
                <span className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-mono font-bold tabular-nums" style={{ borderColor: meta.border, backgroundColor: meta.bg, color: meta.color }}>
                  {meta.text}
                </span>

                <ArrowUpRight size={13} className="shrink-0 text-zinc-700 transition group-hover:text-zinc-300" />
              </a>
            )
          }) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/35 px-4 py-8 text-center">
              <Target className="mx-auto h-6 w-6 text-zinc-600 mb-2" />
              <p className="text-[11px] text-zinc-500">
                {diffFilter !== "all"
                  ? `No ${diffFilter} problems found for this topic. Try another difficulty.`
                  : "No unsolved drills found for this route yet. Choose another signal or shuffle."}
              </p>
            </div>
          )}
        </div>

        {/* Problem count footer */}
        {recommendations.length > 0 && (
          <div className="mt-3 flex items-center justify-between px-1 text-[9px] text-zinc-600">
            <span className="flex items-center gap-1.5 font-mono">
              <TrendingUp size={10} /> Showing {recommendations.length} problem{recommendations.length !== 1 ? "s" : ""}
            </span>
            <button type="button" onClick={refresh} disabled={refreshing} className="text-teal-400/60 hover:text-teal-300 transition font-semibold">
              {refreshing ? "Shuffling..." : "Shuffle for more →"}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
