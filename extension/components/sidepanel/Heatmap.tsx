import React, { useEffect, useMemo, useState } from "react"
import { Card } from "../ui/Card"
import { BarChart3, ChevronDown, Crosshair, ListChecks, Trophy, Activity as ActivityIcon, RefreshCw, ExternalLink } from "lucide-react"
import { fetchDashboard, fetchHeatmap } from "../../lib/api/backend"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { getCachedDashboard, getCachedHeatmap, setCachedDashboard, setCachedHeatmap, getZerotracData } from "../../lib/storage"
import { AchievementShowcase } from "./AchievementShowcase"
import { rankThemeForRating } from "../../lib/rank-theme"
import {
  processData,
  getCodingClockStats,
  getCumulativeStats,
  getSubmissionSignatureStats,
  getLanguageStats,
  getSkillsStats,
  calculateRecords,
  getDetailedReview,
  HOUR_LABELS_24,
  type RawSubmission,
  type ProblemMetadata,
  type TimeRange,
  type DifficultyFilter,
  type RecordData
} from "../../lib/stats-engine"

const getRatingTier = (rating: number) => rankThemeForRating(rating)

/* ═══════════════════════════════════════════════════════════
   RATING BAND COLOR & DIFFICULTY THEMES (PHOTO SPECIFICATION)
   ═══════════════════════════════════════════════════════════ */
export function getRatingBandColor(rating: number): {
  color: string
  label: string
  difficulty: "Easy" | "Medium" | "Hard"
} {
  if (rating < 1400) {
    return { color: "#00e699", label: "Novice", difficulty: "Easy" }
  }
  if (rating < 1700) {
    return { color: "#ffd21e", label: "Apprentice", difficulty: "Medium" }
  }
  if (rating < 2000) {
    return { color: "#ff8c00", label: "Specialist", difficulty: rating >= 1800 ? "Hard" : "Medium" }
  }
  if (rating < 2300) {
    return { color: "#f43f5e", label: "Expert", difficulty: "Hard" }
  }
  return { color: "#a855f7", label: "Master", difficulty: "Hard" }
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM TOOLTIP FOR RATING BANDS (MATCHING PHOTO)
   ═══════════════════════════════════════════════════════════ */
const CustomRatingBandTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  if (!d || d.attempted === 0) return null

  const bandInfo = getRatingBandColor(d.bucketRating)
  const conversionRate = d.attempted > 0 ? ((d.solved / d.attempted) * 100).toFixed(1) : "0.0"
  const firstAcCount = d.firstAcCount ?? d.first_ac_count ?? 0
  const firstAcRate = d.solved > 0 ? ((firstAcCount / d.solved) * 100).toFixed(1) : "0.0"
  const avgAttempts = d.avgAttempts != null
    ? Number(d.avgAttempts).toFixed(1)
    : (d.solved > 0 ? (d.attempted / d.solved).toFixed(1) : "1.0")

  return (
    <div className="bg-[#18191c] border border-white/15 rounded-xl p-3.5 font-mono text-xs shadow-2xl space-y-2 min-w-[210px] z-50">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{d.bucketRating}</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded border"
            style={{
              color: bandInfo.color,
              borderColor: `${bandInfo.color}66`,
              backgroundColor: `${bandInfo.color}18`
            }}
          >
            {bandInfo.difficulty}
          </span>
        </div>
        <span className="text-zinc-400 text-[11px]">Rating Band</span>
      </div>
      <div className="space-y-1.5 pt-0.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">Solved:</span>
          <div className="font-bold tabular-nums">
            <span className="text-[#00e699]">{d.solved}</span>
            <span className="text-zinc-500 mx-1">/</span>
            <span className="text-white">{d.attempted}</span>
          </div>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">Conversion Rate:</span>
          <span className="font-bold text-[#38bdf8] tabular-nums">{conversionRate}%</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">1st-Try AC:</span>
          <span className="font-bold text-[#ffd21e] tabular-nums">{firstAcRate}%</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-zinc-400">Avg Attempts:</span>
          <span className="font-bold text-white tabular-nums">{avgAttempts}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM DUAL-LAYER BAR SHAPE SCALED BY VOLUME
   ═══════════════════════════════════════════════════════════ */
const NestedRatingBarShape = (props: any) => {
  const { x = 0, y = 0, width = 0, height = 0, payload, selectedRating } = props
  if (!payload || !payload.attempted || payload.attempted === 0) {
    return null
  }

  const { bucketRating = 0, attempted = 0, solved = 0 } = payload
  const isSelected = selectedRating === bucketRating
  const bandInfo = getRatingBandColor(bucketRating)
  const barH = 14
  const barY = y + (height - barH) / 2

  const minPillW = 6
  const attemptedWidth = Math.max(width, minPillW)

  let solvedWidth = 0
  if (solved > 0 && attempted > 0) {
    solvedWidth = (solved / attempted) * attemptedWidth
    solvedWidth = Math.max(solvedWidth, minPillW)
  }

  if (attempted > solved && attemptedWidth - solvedWidth < 7) {
    solvedWidth = Math.max(minPillW, attemptedWidth - 7)
  }

  const radius = barH / 2

  return (
    <g className="cursor-pointer">
      {/* Backdrop Bar (Attempted) */}
      <rect
        x={x}
        y={barY}
        width={attemptedWidth}
        height={barH}
        rx={radius}
        ry={radius}
        fill={isSelected ? "#3f424e" : "#2b2d35"}
        stroke={isSelected ? "#ffffff" : "none"}
        strokeWidth={isSelected ? 1.5 : 0}
      />
      {/* Foreground Bar (Solved) */}
      {solved > 0 && solvedWidth > 0 && (
        <rect
          x={x}
          y={barY}
          width={solvedWidth}
          height={barH}
          rx={radius}
          ry={radius}
          fill={bandInfo.color}
          style={{
            filter: isSelected ? `drop-shadow(0 0 6px ${bandInfo.color})` : undefined
          }}
        />
      )}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════
   SUBMISSION BREAKDOWN VERDICT COLORS
   ═══════════════════════════════════════════════════════════ */
const BREAKDOWN_COLORS: Record<string, string> = {
  "Accepted": "#22c55e",
  "Wrong Answer": "#ef4444",
  "Time Limit Exceeded": "#f59e0b",
  "Compile Error": "#a855f7",
  "Runtime Error": "#f97316",
  "Memory Limit Exceeded": "#06b6d4"
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM TOOLTIP FOR PROGRESS TRACKER (SCREENSHOT 4)
   ═══════════════════════════════════════════════════════════ */
const CustomProgressTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  return (
    <div className="p-3 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 z-50">
      <div className="font-bold text-white text-sm">{item.date || label}</div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span>Total Problems Solved:</span>
        <span className="font-bold text-white tabular-nums">{item.totalSolved ?? 0}</span>
      </div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span>Total Submissions:</span>
        <span className="font-bold text-zinc-400 tabular-nums">{item.totalSubmissions ?? 0}</span>
      </div>
      <div className="pt-1.5 border-t border-white/10 space-y-1 text-[11px]">
        <div className="flex justify-between text-cyan-400">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"/>Easy</span>
          <span className="font-bold tabular-nums">{item.easySolved ?? 0}</span>
        </div>
        <div className="flex justify-between text-amber-400">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>Medium</span>
          <span className="font-bold tabular-nums">{item.mediumSolved ?? 0}</span>
        </div>
        <div className="flex justify-between text-rose-400">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"/>Hard</span>
          <span className="font-bold tabular-nums">{item.hardSolved ?? 0}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM TOOLTIP FOR SUBMISSION BREAKDOWN (SCREENSHOT 5)
   ═══════════════════════════════════════════════════════════ */
const CustomSubmissionTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const dotColor = BREAKDOWN_COLORS[d.name] || "#71717a"

  return (
    <div className="p-3 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl font-mono text-xs space-y-2 z-50 min-w-[160px]">
      <div className="flex items-center gap-2 font-bold text-white text-sm">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <span>{d.name}</span>
      </div>
      <div className="flex justify-between gap-4 text-zinc-300 text-xs">
        <span>Count:</span>
        <span className="font-bold text-white tabular-nums">{d.value} ({d.percent}%)</span>
      </div>
      <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
        <div className="flex justify-between text-cyan-400">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"/>Easy</span>
          <span className="font-bold tabular-nums">{d.easy ?? 0}</span>
        </div>
        <div className="flex justify-between text-amber-400">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>Medium</span>
          <span className="font-bold tabular-nums">{d.medium ?? 0}</span>
        </div>
        <div className="flex justify-between text-rose-400">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"/>Hard</span>
          <span className="font-bold tabular-nums">{d.hard ?? 0}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CUSTOM TOOLTIP FOR CODING FREQUENCY (HOURLY / DAILY)
   ═══════════════════════════════════════════════════════════ */
const CustomClockTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  return (
    <div className="p-3 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 z-50 min-w-[150px]">
      <div className="font-bold text-white text-sm">{item.label || label}</div>
      <div className="flex justify-between gap-4 text-zinc-300">
        <span>Total Attempts:</span>
        <span className="font-bold text-white tabular-nums">{item.attempted ?? 0}</span>
      </div>
      <div className="flex justify-between gap-4 text-[#22c55e]">
        <span>Accepted:</span>
        <span className="font-bold tabular-nums">{item.accepted ?? 0}</span>
      </div>
      <div className="flex justify-between gap-4 text-zinc-400">
        <span>Acceptance Rate:</span>
        <span className="font-bold text-white tabular-nums">{item.rate || "N/A"}</span>
      </div>
    </div>
  )
}

export const Heatmap = () => {
  const [data, setData] = useState<any[]>([])
  const [dashboard, setDashboard] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [activeSubTab, setActiveSubTab] = useState<"bands" | "activity" | "legacy">("bands")

  // Real Submissions & Metadata
  const [rawSubmissions, setRawSubmissions] = useState<RawSubmission[]>([])
  const [metadataMap, setMetadataMap] = useState<Record<string, ProblemMetadata>>({})
  const [zerotracMap, setZerotracMap] = useState<Record<string, number>>({})
  const [hoveredLang, setHoveredLang] = useState<any | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ status: string; message: string; count?: number; subCount?: number } | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Filters (Fully Interactive)
  const [timeRange, setTimeRange] = useState<TimeRange>("All Time")
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("All")
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false)
  const [diffDropdownOpen, setDiffDropdownOpen] = useState(false)
  const [freqMode, setFreqMode] = useState<"daily" | "hourly">("daily")
  const [trackerMode, setTrackerMode] = useState<"daily" | "monthly" | "yearly">("monthly")

  useEffect(() => {
    // 0. Load ZeroTrac ratings for accurate competitive rating distribution
    getZerotracData().then((ztList) => {
      if (ztList && Array.isArray(ztList) && ztList.length > 0) {
        const map: Record<string, number> = {}
        ztList.forEach((item) => {
          const slug = (item.TitleSlug || (item as any).titleSlug || "").toLowerCase().trim()
          if (slug && typeof item.Rating === "number") {
            map[slug] = item.Rating
          }
        })
        setZerotracMap(map)
      } else {
        chrome.runtime.sendMessage({ action: "get_zerotrac" }, (res) => {
          if (Array.isArray(res) && res.length > 0) {
            const map: Record<string, number> = {}
            res.forEach((item: any) => {
              const slug = (item.TitleSlug || item.titleSlug || "").toLowerCase().trim()
              if (slug && typeof item.Rating === "number") {
                map[slug] = item.Rating
              }
            })
            setZerotracMap(map)
          }
        })
      }
    }).catch(() => {})

    // 1. Load submissions, metadata, and sync status from chrome.storage.local
    const loadFromStorage = () => {
      chrome.storage.local.get([
        "algovault.submissions",
        "leetStatsUserData",
        "algovault.problem_metadata",
        "problemMetadata",
        "syncStatus"
      ], (result) => {
        let subs: RawSubmission[] = []
        const agSubs = result?.["algovault.submissions"]
        const lsData = result?.["leetStatsUserData"]

        if (Array.isArray(agSubs) && agSubs.length > 0) {
          subs = agSubs
        } else if (lsData && typeof lsData === "object") {
          const username = Object.keys(lsData)[0]
          if (username && Array.isArray(lsData[username]?.submissions)) {
            subs = lsData[username].submissions
          }
        }

        const meta: Record<string, ProblemMetadata> = {
          ...(result?.["problemMetadata"] || {}),
          ...(result?.["algovault.problem_metadata"] || {})
        }

        if (subs.length > 0) setRawSubmissions(subs)
        setMetadataMap(meta)

        if (result?.["syncStatus"]) {
          const st = result["syncStatus"]
          setSyncStatus(st)
          if (st.status === "RUNNING") {
            setSyncing(true)
          } else {
            setSyncing(false)
            if (st.status === "ERROR") {
              setSyncError(st.message)
            }
          }
        }
      })
    }

    loadFromStorage()

    // 2. Reactively update state whenever background crawler saves submissions or updates status
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== "local") return

      if (changes["algovault.submissions"]) {
        const newSubs = changes["algovault.submissions"].newValue
        if (Array.isArray(newSubs) && newSubs.length > 0) {
          setRawSubmissions(newSubs)
        }
      }

      if (changes["algovault.problem_metadata"] || changes["problemMetadata"]) {
        const newMeta = changes["algovault.problem_metadata"]?.newValue || changes["problemMetadata"]?.newValue
        if (newMeta) {
          setMetadataMap((prev) => ({ ...prev, ...newMeta }))
        }
      }

      if (changes["syncStatus"]) {
        const st = changes["syncStatus"].newValue
        if (st) {
          setSyncStatus(st)
          if (st.status === "RUNNING") {
            setSyncing(true)
            setSyncError(null)
          } else {
            setSyncing(false)
            if (st.status === "ERROR") {
              setSyncError(st.message || "Sync failed")
            } else if (st.status === "SUCCESS") {
              setSyncError(null)
              fetchDashboard().then((d) => { if (d) setDashboard(d) }).catch(() => {})
              fetchHeatmap().then((h) => { if (h && h.length) setData(h) }).catch(() => {})
            }
          }
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    // 3. Load backend telemetry
    Promise.all([
      getCachedHeatmap().catch(() => null),
      getCachedDashboard().catch(() => null)
    ]).then(([cachedHeatmap, cachedDashboard]) => {
      if (cachedHeatmap) setData(cachedHeatmap)
      if (cachedDashboard) setDashboard(cachedDashboard)
      if (cachedHeatmap || cachedDashboard) setLoading(false)
    })

    fetchHeatmap().then((freshHeatmap) => {
      if (freshHeatmap && Array.isArray(freshHeatmap) && freshHeatmap.length > 0) {
        setData(freshHeatmap)
        setCachedHeatmap(freshHeatmap)
      }
    }).catch(console.error).finally(() => setLoading(false))

    fetchDashboard().then((freshDashboard) => {
      if (freshDashboard) {
        setDashboard(freshDashboard)
        setCachedDashboard(freshDashboard)
      }
    }).catch(console.error)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  /* ═══════════════════════════════════════════════════════════
     COMPUTE REAL TELEMETRY WITH STATS ENGINE
     ═══════════════════════════════════════════════════════════ */
  const processed = useMemo(() => {
    if (rawSubmissions.length === 0) return null
    return processData(rawSubmissions, metadataMap)
  }, [rawSubmissions, metadataMap])

  const sortedData = useMemo(() => {
    // 1. If backend telemetry exists and has attempted > 0
    if (data && data.length > 0) {
      const valid = data.filter((d) => (d.attempted || 0) > 0)
      if (valid.length > 0) {
        return [...valid].sort((a, b) => a.bucketRating - b.bucketRating)
      }
    }

    // 2. Client-side telemetry computation from real submissions + zerotrac ratings
    if (processed && processed.problemMap.size > 0) {
      const bucketMap: Record<number, {
        bucketRating: number
        attempted: number
        solved: number
        firstAcCount: number
        totalAttemptsUntilAc: number
      }> = {}

      for (const [slug, subs] of processed.problemMap.entries()) {
        if (!subs || subs.length === 0) continue

        // Determine problem rating
        let rating: number | null = zerotracMap[slug] ?? (metadataMap[slug] as any)?.rating ?? null
        if (typeof rating !== "number" || rating < 800 || rating > 3500) {
          const diff = metadataMap[slug]?.difficulty || subs[0]?.metadata?.difficulty
          if (diff === "Easy") rating = 1200
          else if (diff === "Medium") rating = 1600
          else if (diff === "Hard") rating = 2000
          else continue
        }

        const bRating = Math.floor(rating / 100) * 100
        if (!bucketMap[bRating]) {
          bucketMap[bRating] = {
            bucketRating: bRating,
            attempted: 0,
            solved: 0,
            firstAcCount: 0,
            totalAttemptsUntilAc: 0
          }
        }

        bucketMap[bRating].attempted += 1

        const isEventualAc = subs.some((s) => s.statusDisplay === "Accepted" || s.statusCode === 10)
        const isFirstTryAc = subs[0].statusDisplay === "Accepted" || subs[0].statusCode === 10

        if (isEventualAc) {
          bucketMap[bRating].solved += 1
        }
        if (isFirstTryAc) {
          bucketMap[bRating].firstAcCount += 1
        }

        let attemptsUntilAc = 0
        for (const s of subs) {
          attemptsUntilAc++
          if (s.statusDisplay === "Accepted" || s.statusCode === 10) break
        }
        bucketMap[bRating].totalAttemptsUntilAc += attemptsUntilAc
      }

      const list = Object.values(bucketMap).map((b) => ({
        bucketRating: b.bucketRating,
        attempted: b.attempted,
        solved: b.solved,
        firstAcCount: b.firstAcCount,
        avgAttempts: b.attempted > 0 ? Number((b.totalAttemptsUntilAc / b.attempted).toFixed(1)) : 1.0,
        passRate: b.attempted > 0 ? b.solved / b.attempted : 0
      })).sort((a, b) => a.bucketRating - b.bucketRating)

      if (list.length > 0) return list
    }

    return []
  }, [data, processed, metadataMap, zerotracMap])

  // Coding Frequency: Daily & Hourly (using interactive filters)
  const codingFrequency = useMemo(() => {
    if (processed) return getCodingClockStats(processed, timeRange, difficultyFilter)
    if (dashboard?.activity?.codingFrequency) return dashboard.activity.codingFrequency
    return { daily: [], hourly: [], bestHourIdx: -1, bestDayIdx: -1 }
  }, [processed, dashboard, timeRange, difficultyFilter])

  // Progress Tracker (using interactive filters)
  const progressTracker = useMemo(() => {
    if (processed) return getCumulativeStats(processed, timeRange, difficultyFilter, trackerMode)
    if (dashboard?.activity?.progressTracker) return dashboard.activity.progressTracker
    return []
  }, [processed, dashboard, trackerMode, timeRange, difficultyFilter])

  // Submission Breakdown (Verdicts) (using interactive filters)
  const breakdownData = useMemo(() => {
    if (processed) return getSubmissionSignatureStats(processed, timeRange, difficultyFilter)
    if (dashboard?.activity?.submissionBreakdown) {
      return Object.entries(dashboard.activity.submissionBreakdown).map(([name, value]) => ({
        name,
        value: Number(value),
        percent: "0.0",
        easy: 0,
        medium: 0,
        hard: 0
      }))
    }
    return []
  }, [processed, dashboard, timeRange, difficultyFilter])

  // Language Stats (using interactive filters)
  const languageStats = useMemo(() => {
    if (processed) return getLanguageStats(processed, timeRange, difficultyFilter)
    if (dashboard?.activity?.languageStats) return dashboard.activity.languageStats
    return []
  }, [processed, dashboard, timeRange, difficultyFilter])

  // Skills Table
  const skillsData = useMemo(() => {
    if (processed) return getSkillsStats(processed)
    return []
  }, [processed])

  // Records (Matching leetStats Screenshot 3 / media_1790069401276.png)
  const recordsData = useMemo(() => {
    if (processed) return calculateRecords(processed)
    return []
  }, [processed])

  // Detailed Review (Insights & Productivity Pattern)
  const detailedReview = useMemo(() => {
    if (processed) return getDetailedReview(processed)
    return null
  }, [processed])

  const maxLanguageCount = useMemo(() => {
    if (!languageStats.length) return 5000
    const max = Math.max(...languageStats.map((l: any) => l.count))
    return Math.max(5000, Math.ceil(max / 1000) * 1000)
  }, [languageStats])

  const continuousData = useMemo(() => {
    if (!sortedData || sortedData.length === 0) return []
    const existingMap = new Map<number, any>()
    sortedData.forEach((b) => existingMap.set(b.bucketRating, b))

    const minRating = sortedData.length > 0 ? Math.min(1000, Math.min(...sortedData.map((d) => d.bucketRating))) : 1000
    const maxRating = sortedData.length > 0 ? Math.max(2500, Math.max(...sortedData.map((d) => d.bucketRating))) : 2500

    const fullList: any[] = []
    for (let r = minRating; r <= maxRating; r += 100) {
      if (existingMap.has(r)) {
        fullList.push(existingMap.get(r))
      } else {
        fullList.push({
          bucketRating: r,
          attempted: 0,
          solved: 0,
          firstAcCount: 0,
          avgAttempts: 0,
          avgSolveTime: 0,
          passRate: 0
        })
      }
    }
    return fullList
  }, [sortedData])

  const maxAttempted = useMemo(() => {
    const max = Math.max(...continuousData.map((d) => d.attempted || 0), 10)
    return Math.ceil(max * 1.05)
  }, [continuousData])

  const { totalSolved, totalAttempted, conversionRate, bestBand } = useMemo(() => {
    let solved = 0
    let attempted = 0
    let best = 0

    sortedData.forEach((b) => {
      const s = b.solved || 0
      const a = b.attempted || 0
      solved += s
      attempted += a
      if (s > 0 && b.bucketRating > best) {
        best = b.bucketRating
      }
    })

    const rate = attempted > 0 ? Math.round((solved / attempted) * 100) : 0

    return {
      totalSolved: solved,
      totalAttempted: attempted,
      conversionRate: rate,
      bestBand: best > 0 ? String(best) : "N/A"
    }
  }, [sortedData])

  const chartHeight = useMemo(() => {
    if (continuousData.length === 0) return 320
    return Math.max(380, continuousData.length * 28 + 24)
  }, [continuousData])

  const selectedBucket = selectedRating == null
    ? null
    : continuousData.find((bucket) => bucket.bucketRating === selectedRating) ?? null

  const handleTriggerSync = () => {
    setSyncing(true)
    setSyncError(null)
    chrome.runtime.sendMessage({ action: "sync_history", forceFullSync: true }, (response) => {
      if (chrome.runtime.lastError) {
        setSyncing(false)
        setSyncError(chrome.runtime.lastError.message || "Could not connect to background service")
        return
      }
      if (response && !response.ok) {
        setSyncing(false)
        setSyncError(response.error || "Sync failed")
      }
    })
  }

  return (
    <div className="space-y-4 font-sans select-none animate-fadeIn pb-6">
      {/* ─── SUB-NAVIGATION SWITCHER (Rating Bands First) ─── */}
      <div className="flex bg-[#1e1e1e] p-1.5 rounded-xl border border-white/10 items-center justify-between gap-1 shadow-inner">
        <button
          onClick={() => setActiveSubTab("bands")}
          className={`flex-1 text-xs font-mono font-medium py-2 px-3 rounded-lg transition-all cursor-pointer text-center ${
            activeSubTab === "bands"
              ? "bg-[#282828] text-white border border-white/10 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Rating Bands
        </button>
        <button
          onClick={() => setActiveSubTab("activity")}
          className={`flex-1 text-xs font-mono font-medium py-2 px-3 rounded-lg transition-all cursor-pointer text-center ${
            activeSubTab === "activity"
              ? "bg-[#282828] text-white border border-white/10 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveSubTab("legacy")}
          className={`flex-1 text-xs font-mono font-medium py-2 px-3 rounded-lg transition-all cursor-pointer text-center ${
            activeSubTab === "legacy"
              ? "bg-[#282828] text-white border border-white/10 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Legacy
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         SUB-TAB 1: RATING BANDS (FIRST TAB - PHOTO SPECIFICATION)
         ═══════════════════════════════════════════════════════════ */}
      {activeSubTab === "bands" && (
        <div className="space-y-3.5 animate-fadeIn">
          {/* ─── 4 TOP SUMMARY METRIC CARDS ─── */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#1e1e20] border border-white/10 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
                SOLVED
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#00e699] mt-0.5 tabular-nums">
                {totalSolved}
              </span>
            </div>
            <div className="bg-[#1e1e20] border border-white/10 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
                ATTEMPTED
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5 tabular-nums">
                {totalAttempted}
              </span>
            </div>
            <div className="bg-[#1e1e20] border border-white/10 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
                CONVERSION
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#38bdf8] mt-0.5 tabular-nums">
                {conversionRate}%
              </span>
            </div>
            <div className="bg-[#1e1e20] border border-white/10 rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-semibold">
                BEST BAND
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#ffd21e] mt-0.5 tabular-nums">
                {bestBand}
              </span>
            </div>
          </div>

          {/* ─── MAIN VOLUME-SCALED RATING GRAPH CARD ─── */}
          <Card className="p-4 sm:p-5 space-y-3 bg-[#1e1e20] border border-white/10 rounded-2xl shadow-sm">
            {/* Header & Legend */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={17} className="text-[#f97316]" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">ZeroTrac Rating Distribution</h2>
              </div>
              <div className="flex items-center gap-3.5 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-[#3a3d45]" />
                  <span>Attempted</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-[#00e699]" />
                  <span>Solved</span>
                </div>
              </div>
            </div>

            {/* Recharts Scaled Horizontal Bar Chart */}
            <div style={{ height: chartHeight }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={continuousData}
                  layout="vertical"
                  margin={{ top: 6, right: 20, left: 6, bottom: 6 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      const clickedRating = state.activePayload[0].payload.bucketRating
                      setSelectedRating(selectedRating === clickedRating ? null : clickedRating)
                    }
                  }}
                >
                  <XAxis
                    type="number"
                    domain={[0, maxAttempted]}
                    hide
                  />
                  <YAxis
                    type="category"
                    dataKey="bucketRating"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tick={({ x, y, payload }: any) => {
                      const isSel = selectedRating === payload.value
                      return (
                        <text
                          x={x}
                          y={y}
                          dy={4}
                          textAnchor="end"
                          fill={isSel ? "#ffffff" : "#8e8e93"}
                          fontFamily="monospace"
                          fontSize={11}
                          fontWeight={isSel ? "bold" : "normal"}
                        >
                          {payload.value}
                        </text>
                      )
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    content={<CustomRatingBandTooltip />}
                  />
                  <Bar
                    dataKey="attempted"
                    shape={(props: any) => <NestedRatingBarShape {...props} selectedRating={selectedRating} />}
                    barSize={14}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ─── EXPLORE RATING BANDS CARD (MATCHING PHOTO) ─── */}
          <div className="bg-[#1e1e20] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Crosshair size={16} className="text-[#38bdf8]" />
                  <h3 className="text-sm font-bold text-white tracking-tight">Explore Rating Bands</h3>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  Click any rating band to inspect detailed performance & attempt statistics.
                </p>
              </div>
              {selectedRating != null && (
                <button
                  onClick={() => setSelectedRating(null)}
                  className="text-[11px] font-mono text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded-md transition cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* Rating Band Filter Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {continuousData
                .filter((b) => b.attempted > 0)
                .map((b) => {
                  const isSelected = selectedRating === b.bucketRating
                  const bandInfo = getRatingBandColor(b.bucketRating)
                  const conv = b.attempted > 0 ? Math.round((b.solved / b.attempted) * 100) : 0
                  return (
                    <button
                      key={b.bucketRating}
                      onClick={() => setSelectedRating(isSelected ? null : b.bucketRating)}
                      className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-white/15 text-white border-white shadow-sm"
                          : "bg-[#252528] text-zinc-300 border-white/10 hover:border-white/20 hover:text-white"
                      }`}
                      style={{
                        borderColor: isSelected ? bandInfo.color : undefined
                      }}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bandInfo.color }} />
                      <span>{b.bucketRating}</span>
                      <span className="text-zinc-500 text-[10px]">({conv}%)</span>
                    </button>
                  )
                })}
            </div>

            {/* Selected Band Telemetry Breakdown Box */}
            {selectedBucket && (
              <div className="rounded-xl border border-white/15 bg-[#252528] p-4 font-mono text-xs space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Rating {selectedBucket.bucketRating} Band Telemetry</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                      style={{
                        color: getRatingBandColor(selectedBucket.bucketRating).color,
                        borderColor: `${getRatingBandColor(selectedBucket.bucketRating).color}66`,
                        backgroundColor: `${getRatingBandColor(selectedBucket.bucketRating).color}18`
                      }}
                    >
                      {getRatingBandColor(selectedBucket.bucketRating).difficulty}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Click to close</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase">Solved</span>
                    <div className="font-bold text-sm">
                      <span className="text-[#00e699]">{selectedBucket.solved}</span>
                      <span className="text-zinc-500 mx-1">/</span>
                      <span className="text-white">{selectedBucket.attempted}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase">Conversion Rate</span>
                    <div className="font-bold text-sm text-[#38bdf8]">
                      {selectedBucket.attempted > 0 ? Math.round((selectedBucket.solved / selectedBucket.attempted) * 100) : 0}%
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase">1st-Try AC</span>
                    <div className="font-bold text-sm text-[#ffd21e]">
                      {selectedBucket.solved > 0
                        ? `${(((selectedBucket.firstAcCount ?? 0) / selectedBucket.solved) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-400 uppercase">Avg Attempts</span>
                    <div className="font-bold text-sm text-white">
                      {selectedBucket.avgAttempts != null
                        ? Number(selectedBucket.avgAttempts).toFixed(1)
                        : (selectedBucket.solved > 0 ? (selectedBucket.attempted / selectedBucket.solved).toFixed(1) : "1.0")}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         SUB-TAB 2: ACTIVITY (REAL TELEMETRY FROM LEETCODE SUBMISSIONS)
         ═══════════════════════════════════════════════════════════ */}
      {activeSubTab === "activity" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Header Bar with Working Interactive Dropdowns */}
          <div className="flex items-center justify-between px-1 relative z-30">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white tracking-tight">Activity</h1>
              {syncing && (
                <span className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full animate-pulse">
                  <RefreshCw size={10} className="animate-spin" />
                  {syncStatus?.message || "Syncing..."}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                title="Sync submissions"
                className="p-1.5 rounded-lg border border-white/10 bg-[#282828] hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <RefreshCw size={13} className={syncing ? "animate-spin text-[#ffa116]" : ""} />
              </button>

              {/* Backdrop to close dropdowns on outside click */}
              {(timeDropdownOpen || diffDropdownOpen) && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setTimeDropdownOpen(false)
                    setDiffDropdownOpen(false)
                  }}
                />
              )}

              {/* Time Range Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTimeDropdownOpen(!timeDropdownOpen)
                    setDiffDropdownOpen(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-[#282828] hover:bg-white/5 shadow-sm cursor-pointer text-white"
                >
                  <span>{timeRange}</span>
                  <ChevronDown size={13} className={`text-zinc-400 transition-transform ${timeDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {timeDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl py-1 z-50 font-mono text-xs overflow-hidden">
                    {(["All Time", "Last 365 Days", "Last 90 Days", "Last 30 Days"] as TimeRange[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTimeRange(t)
                          setTimeDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 transition-colors cursor-pointer flex items-center justify-between ${
                          timeRange === t ? "bg-[#282828] text-[#ffa116] font-bold" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{t}</span>
                        {timeRange === t && <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Difficulty Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setDiffDropdownOpen(!diffDropdownOpen)
                    setTimeDropdownOpen(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-[#282828] hover:bg-white/5 shadow-sm cursor-pointer text-white"
                >
                  <span>{difficultyFilter}</span>
                  <ChevronDown size={13} className={`text-zinc-400 transition-transform ${diffDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {diffDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-32 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl py-1 z-50 font-mono text-xs overflow-hidden">
                    {(["All", "Easy", "Medium", "Hard"] as DifficultyFilter[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDifficultyFilter(d)
                          setDiffDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 transition-colors cursor-pointer flex items-center justify-between ${
                          difficultyFilter === d ? "bg-[#282828] text-[#ffa116] font-bold" : "text-zinc-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span className={d === "Easy" ? "text-cyan-400" : d === "Medium" ? "text-amber-400" : d === "Hard" ? "text-rose-400" : ""}>
                          {d}
                        </span>
                        {difficultyFilter === d && <span className="w-1.5 h-1.5 rounded-full bg-[#ffa116]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Empty State if No Submissions Synced */}
          {rawSubmissions.length === 0 && !dashboard?.activity ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-[#242424] p-8 text-center space-y-3 shadow-sm">
              <ActivityIcon size={32} className={`mx-auto ${syncing ? "text-amber-400 animate-pulse" : "text-[#ffa116]"}`} />
              <h3 className="text-base font-bold text-white">
                {syncing ? "Syncing Real Submissions..." : "Submissions Not Yet Synced"}
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-mono">
                {syncing
                  ? (syncStatus?.message || "Retrieving complete submission history from LeetCode...")
                  : "Connect your authentic LeetCode submission history to unlock all real telemetry charts."}
              </p>

              {syncError && (
                <div className="text-xs text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg max-w-md mx-auto">
                  {syncError}
                </div>
              )}

              <button
                onClick={handleTriggerSync}
                disabled={syncing}
                className={`px-4 py-2 rounded-xl font-bold font-mono text-xs transition flex items-center gap-2 mx-auto mt-2 ${
                  syncing
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-wait"
                    : "bg-[#ffa116] hover:bg-[#ffb03a] text-black cursor-pointer shadow-lg shadow-amber-500/10"
                }`}
              >
                <RefreshCw size={13} className={syncing ? "animate-spin text-amber-300" : ""} />
                <span>{syncing ? (syncStatus?.message || "Syncing...") : "Sync Submissions Now"}</span>
              </button>
            </div>
          ) : (
            <>
              {/* PRODUCTIVITY PATTERN & DETAILED REVIEW */}
              {detailedReview && (
                <div className="rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Activity Pattern & Productivity Review</span>
                    </h3>
                    <span className="text-[11px] font-mono text-[#ffa116] bg-[#ffa116]/10 px-2 py-0.5 rounded-md border border-[#ffa116]/20">
                      AI Telemetry Insights
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5 font-mono space-y-1">
                      <div className="text-[10px] text-zinc-400">Peak Coding Time</div>
                      <div className="text-sm font-bold text-white">{detailedReview.peakActiveTime}</div>
                      <div className="text-[10px] text-zinc-500">{detailedReview.peakActiveCount} submissions</div>
                    </div>
                    <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5 font-mono space-y-1">
                      <div className="text-[10px] text-zinc-400">Highest Accuracy</div>
                      <div className="text-sm font-bold text-[#22c55e]">{detailedReview.peakAccuracyTime}</div>
                      <div className="text-[10px] text-zinc-500">{detailedReview.peakAccuracyRate} pass rate</div>
                    </div>
                    <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5 font-mono space-y-1">
                      <div className="text-[10px] text-zinc-400">Most Active Day</div>
                      <div className="text-sm font-bold text-[#38bdf8]">{detailedReview.mostActiveDay}</div>
                      <div className="text-[10px] text-zinc-500">{detailedReview.mostActiveDayCount} submissions</div>
                    </div>
                    <div className="bg-[#1e1e1e] p-3 rounded-xl border border-white/5 font-mono space-y-1">
                      <div className="text-[10px] text-zinc-400">Overall Accuracy</div>
                      <div className="text-sm font-bold text-[#ffa116]">{detailedReview.overallAcceptanceRate}</div>
                      <div className="text-[10px] text-zinc-500">Across all records</div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 font-mono pt-1 leading-relaxed">
                    You solve the bulk of your challenges on <span className="text-white font-semibold">{detailedReview.mostActiveDay}s</span> with your peak coding concentration around <span className="text-white font-semibold">{detailedReview.peakActiveTime}</span> ({detailedReview.peakActiveCount} submissions), while maintaining your highest problem accuracy at <span className="text-[#22c55e] font-semibold">{detailedReview.peakAccuracyTime}</span> ({detailedReview.peakAccuracyRate}).
                  </p>
                </div>
              )}

              {/* 2x2 Grid Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. CODING FREQUENCY (All 24 Hours Included) */}
                <div className="rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Coding Frequency</h3>
                    <div className="flex items-center gap-0.5 bg-[#1e1e1e] border border-white/10 p-0.5 rounded-lg text-xs font-mono">
                      <button
                        onClick={() => setFreqMode("daily")}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          freqMode === "daily" ? "bg-[#333333] text-white font-bold shadow" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setFreqMode("hourly")}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          freqMode === "hourly" ? "bg-[#333333] text-white font-bold shadow" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        Hourly
                      </button>
                    </div>
                  </div>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={freqMode === "daily" ? codingFrequency.daily : codingFrequency.hourly}
                        margin={{ top: 10, right: 10, left: -22, bottom: freqMode === "hourly" ? 30 : 20 }}
                      >
                        <XAxis
                          dataKey="label"
                          stroke="#71717a"
                          fontSize={9}
                          tickLine={false}
                          interval={freqMode === "hourly" ? 1 : 0}
                          angle={freqMode === "hourly" ? -45 : 0}
                          textAnchor={freqMode === "hourly" ? "end" : "middle"}
                          height={freqMode === "hourly" ? 40 : 25}
                        />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                        <Tooltip content={<CustomClockTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                        {/* Bottom Green Accepted Solves */}
                        <Bar dataKey="accepted" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
                        {/* Top Dark Gray Failed Attempts */}
                        <Bar dataKey="failed" fill="#3f3f46" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. PROGRESS TRACKER */}
                <div className="rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Progress Tracker</h3>
                    <div className="flex items-center gap-0.5 bg-[#1e1e1e] border border-white/10 p-0.5 rounded-lg text-xs font-mono">
                      <button
                        onClick={() => setTrackerMode("daily")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          trackerMode === "daily" ? "bg-[#333333] text-white font-bold shadow" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => setTrackerMode("monthly")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          trackerMode === "monthly" ? "bg-[#333333] text-white font-bold shadow" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setTrackerMode("yearly")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          trackerMode === "yearly" ? "bg-[#333333] text-white font-bold shadow" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={progressTracker}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
                        <Tooltip content={<CustomProgressTooltip />} />
                        <Line type="monotone" dataKey="totalSubmissions" stroke="#71717a" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="mediumSolved" stroke="#ffc01e" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="easySolved" stroke="#06b6d4" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="hardSolved" stroke="#ef4743" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. SUBMISSION BREAKDOWN (Matching Screenshot 5 with custom tooltip) */}
                <div className="rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-4 shadow-sm">
                  <h3 className="text-base font-bold text-white">Submission Breakdown</h3>

                  <div className="flex items-center justify-between gap-4 pt-1 flex-wrap min-[480px]:flex-nowrap">
                    <div className="h-44 w-44 shrink-0 mx-auto min-[480px]:mx-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={breakdownData}
                            innerRadius={48}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {breakdownData.map((entry: any) => (
                              <Cell key={`cell-${entry.name}`} fill={BREAKDOWN_COLORS[entry.name] || "#71717a"} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomSubmissionTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Verdict Legend */}
                    <div className="space-y-2 font-mono text-[11px] flex-1 min-w-[140px]">
                      {breakdownData.map((item: any) => (
                        <div key={item.name} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-2.5 w-2.5 rounded shrink-0"
                              style={{ backgroundColor: BREAKDOWN_COLORS[item.name] || "#71717a" }}
                            />
                            <span className="truncate text-zinc-300 text-[10.5px]">{item.name}</span>
                          </div>
                          <span className="text-zinc-400 font-bold tabular-nums text-[10.5px]">
                            {item.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. LANGUAGE STATS (Matching Screenshot 2 / media_1790069341160.png) */}
                <div className="relative rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-4 shadow-sm">
                  <h3 className="text-base font-bold text-white">Language Stats</h3>

                  <div className="space-y-4 pt-2 font-mono">
                    {languageStats.map((lang: any) => {
                      const pct = Math.max(3, Math.min(100, Math.round((lang.count / maxLanguageCount) * 100)))

                      return (
                        <div
                          key={lang.language}
                          className="relative flex items-center gap-3 cursor-pointer group"
                          onMouseEnter={() => setHoveredLang(lang)}
                          onMouseLeave={() => setHoveredLang(null)}
                        >
                          <span className="w-16 text-right text-xs text-zinc-300 font-medium truncate group-hover:text-white transition-colors">
                            {lang.language}
                          </span>
                          <div className="flex-1 h-7 rounded-lg bg-[#333333] overflow-hidden p-0.5 flex items-center">
                            <div
                              className="h-full bg-[#22c55e] rounded-md transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-14 text-right text-xs font-bold text-zinc-300 tabular-nums">
                            {lang.count.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}

                    {/* Bottom Axis Ruler */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-3 border-t border-white/[0.08]">
                      <span>0</span>
                      <span>1,000</span>
                      <span>2,000</span>
                      <span>3,000</span>
                      <span>4,000</span>
                      <span>{maxLanguageCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Language Hover Popover */}
                  {hoveredLang && (
                    <div className="absolute right-5 top-12 z-50 w-64 p-3.5 bg-[#1e1e1e] border border-white/15 rounded-xl shadow-2xl space-y-2 text-xs font-mono pointer-events-none animate-fadeIn">
                      <div className="text-white font-bold text-sm border-b border-white/10 pb-1">
                        {hoveredLang.language}
                      </div>
                      <div className="flex justify-between gap-4 text-zinc-300">
                        <span>Total Submissions</span>
                        <span className="font-bold text-white tabular-nums">{hoveredLang.count.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-zinc-300">
                        <span>Acceptance Rate</span>
                        <span className="font-bold text-[#22c55e] tabular-nums">{hoveredLang.acceptanceRate}</span>
                      </div>
                      <div className="pt-2 border-t border-white/10 space-y-1">
                        <div className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Problems Solved</div>
                        <div className="flex justify-between text-[11px] text-cyan-400">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400"/>Easy</span>
                          <span className="font-bold tabular-nums">{hoveredLang.solvedBreakdown?.easy ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-amber-400">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>Medium</span>
                          <span className="font-bold tabular-nums">{hoveredLang.solvedBreakdown?.medium ?? 0}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-rose-400">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"/>Hard</span>
                          <span className="font-bold tabular-nums">{hoveredLang.solvedBreakdown?.hard ?? 0}</span>
                        </div>
                      </div>
                      {(hoveredLang.firstUsed || hoveredLang.lastUsed) && (
                        <div className="pt-2 border-t border-white/10 text-[10px] text-zinc-400 space-y-0.5">
                          {hoveredLang.firstUsed && <div>First used: <span className="text-zinc-200">{hoveredLang.firstUsed}</span></div>}
                          {hoveredLang.lastUsed && <div>Last used: <span className="text-zinc-200">{hoveredLang.lastUsed}</span></div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. RECORDS SECTION (Matching Screenshot 3 / media_1790069401276.png) */}
              {recordsData.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-4 shadow-sm">
                  <h3 className="text-base font-bold text-white">Records</h3>
                  <div className="space-y-3">
                    {recordsData.map((rec) => (
                      <div key={rec.name} className="flex items-start justify-between gap-3 text-xs font-mono py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-zinc-300 font-medium">{rec.name}</span>
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{rec.mainStat || rec.value}</span>
                            {rec.subStats && (
                              <div className="flex items-end gap-0.5 h-3">
                                <div
                                  className="w-1 bg-cyan-400 rounded-xs"
                                  style={{ height: `${Math.max(3, Math.min(12, Math.round((rec.subStats.easy / (rec.value || 1)) * 12)))}px` }}
                                  title={`Easy: ${rec.subStats.easy}`}
                                />
                                <div
                                  className="w-1 bg-amber-400 rounded-xs"
                                  style={{ height: `${Math.max(3, Math.min(12, Math.round((rec.subStats.medium / (rec.value || 1)) * 12)))}px` }}
                                  title={`Medium: ${rec.subStats.medium}`}
                                />
                                <div
                                  className="w-1 bg-rose-500 rounded-xs"
                                  style={{ height: `${Math.max(3, Math.min(12, Math.round((rec.subStats.hard / (rec.value || 1)) * 12)))}px` }}
                                  title={`Hard: ${rec.subStats.hard}`}
                                />
                              </div>
                            )}
                          </div>
                          {rec.dateStat && (
                            <span className="text-[11px] text-zinc-500">{rec.dateStat}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. SKILLS SECTION */}
              {skillsData.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-[#242424] p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Skills</h3>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-[#282828] text-xs font-mono text-zinc-300 shadow-sm">
                      <span>{timeRange}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] text-zinc-400">
                          <th className="py-2.5 px-3 font-semibold">Topic</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Problems Solved</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Average Attempts</th>
                          <th className="py-2.5 px-3 font-semibold text-right">First Ace Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {skillsData.slice(0, 15).map((skill) => (
                          <tr key={skill.topic} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 px-3 text-zinc-200 font-medium">{skill.topic}</td>
                            <td className="py-2.5 px-3 text-right text-zinc-300 font-bold tabular-nums">{skill.problemsSolved}</td>
                            <td className="py-2.5 px-3 text-right text-zinc-300 tabular-nums">{skill.averageAttempts}</td>
                            <td className="py-2.5 px-3 text-right text-[#22c55e] font-bold tabular-nums">{skill.firstAceRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. INSPIRED BY LEETSTATS FOOTER */}
              <div className="pt-4 pb-2 text-center border-t border-white/5">
                <p className="text-xs text-zinc-500 font-mono flex items-center justify-center gap-1.5">
                  <span>Inspired by</span>
                  <a
                    href="https://github.com/heyitsmadan/leetStats"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-[#ffa116] underline underline-offset-2 transition-colors font-medium flex items-center gap-1 cursor-pointer"
                  >
                    leetStats by @heyitsmadan
                    <ExternalLink size={11} className="inline" />
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
         SUB-TAB 3: LEGACY MILESTONES (MATCHING SCREENSHOT 3)
         ═══════════════════════════════════════════════════════════ */}
      {activeSubTab === "legacy" && (
        <AchievementShowcase stats={dashboard} variant="gallery" />
      )}
    </div>
  )
}
