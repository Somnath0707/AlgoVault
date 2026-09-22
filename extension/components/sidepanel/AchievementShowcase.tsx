import React, { useEffect, useMemo, useState } from "react"
import { Flag } from "lucide-react"
import {
  processData,
  calculateMilestones,
  type RawSubmission,
  type ProblemMetadata
} from "../../lib/stats-engine"

interface AchievementShowcaseProps {
  stats?: any
  variant?: "compact" | "gallery"
}

const milestoneTone: Record<string, { color: string; label: string }> = {
  submission: { color: "#38bdf8", label: "Submission" },
  submissions: { color: "#38bdf8", label: "Submission" },
  problem: { color: "#00b8a3", label: "Problem" },
  problems_solved: { color: "#00b8a3", label: "Problem" },
  easy: { color: "#06b6d4", label: "Easy" },
  medium: { color: "#ffc01e", label: "Medium" },
  hard: { color: "#ef4743", label: "Hard" }
}

const formatMilestoneDate = (value?: string) => {
  if (!value) return ""
  try {
    const parts = value.split("-")
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`
    }
    const d = new Date(value)
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0")
      const month = String(d.getMonth() + 1).padStart(2, "0")
      const year = d.getFullYear()
      return `${day}/${month}/${year}`
    }
  } catch {}
  return value
}

/**
 * Legacy Milestones view matching reference Screenshot 3 / leetStats pixel-for-pixel:
 * Real chronological milestones, DD/MM/YYYY dates, real submission IDs / problem titles,
 * and colored status nodes on a continuous vertical stem.
 */
export function AchievementShowcase({ stats, variant = "gallery" }: AchievementShowcaseProps) {
  const [computedMilestones, setComputedMilestones] = useState<any[]>([])

  useEffect(() => {
    const computeFromStorage = () => {
      chrome.storage.local.get([
        "algovault.submissions",
        "leetStatsUserData",
        "algovault.problem_metadata",
        "problemMetadata"
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

        const metaMap: Record<string, ProblemMetadata> = {
          ...(result?.["problemMetadata"] || {}),
          ...(result?.["algovault.problem_metadata"] || {})
        }

        if (subs.length > 0) {
          const processed = processData(subs, metaMap)
          const ms = calculateMilestones(processed.submissions)
          setComputedMilestones(ms)
        }
      })
    }

    computeFromStorage()

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName !== "local") return
      if (changes["algovault.submissions"] || changes["algovault.problem_metadata"] || changes["problemMetadata"]) {
        computeFromStorage()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const backendMilestones = Array.isArray(stats?.legacy?.milestones) ? stats.legacy.milestones : []
  const timeline = computedMilestones.length > 0 ? computedMilestones : backendMilestones
  const visibleMilestones = variant === "compact" ? timeline.slice(0, 8) : timeline

  return (
    <div className="rounded-2xl border border-white/10 bg-[#1e1e20] p-6 font-sans text-zinc-200 shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Legacy</h1>
        <h2 className="mt-3 text-base font-semibold text-zinc-100">Milestones</h2>
      </div>

      {!visibleMilestones.length ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-[#222224] p-6 text-xs text-zinc-400 font-mono">
          <Flag size={16} className="text-zinc-500 shrink-0" />
          <span>Your first accepted solution will start this permanent milestone timeline.</span>
        </div>
      ) : (
        <div className="relative pl-1">
          <ol className="relative ml-3 border-l border-zinc-700/80 space-y-4">
            {visibleMilestones.map((item: any) => {
              const tone = milestoneTone[item.type] || { color: item.color || "#00b8a3", label: "Milestone" }
              const displayDate = formatMilestoneDate(item.date)

              const coatingStyle = 
                item.type === "hard"
                  ? "border border-rose-500/30 bg-gradient-to-r from-rose-950/25 via-[#231518] to-transparent shadow-[0_0_15px_rgba(244,63,94,0.08)]"
                  : item.type === "medium"
                  ? "border border-amber-500/30 bg-gradient-to-r from-amber-950/25 via-[#231e16] to-transparent shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                  : item.type === "easy"
                  ? "border border-cyan-500/30 bg-gradient-to-r from-cyan-950/25 via-[#142028] to-transparent shadow-[0_0_15px_rgba(6,182,212,0.08)]"
                  : item.type === "problem" || item.type === "problems_solved"
                  ? "border border-emerald-500/30 bg-gradient-to-r from-emerald-950/25 via-[#15231c] to-transparent shadow-[0_0_15px_rgba(0,184,163,0.08)]"
                  : "border border-sky-500/30 bg-gradient-to-r from-sky-950/25 via-[#14202b] to-transparent shadow-[0_0_15px_rgba(56,189,248,0.08)]"

              return (
                <li key={item.id} className="relative pl-6">
                  {/* Timeline Node Dot centered on line with glow */}
                  <span
                    className="absolute -left-[5.5px] top-3.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#1e1e20] transition-transform"
                    style={{ 
                      backgroundColor: tone.color,
                      boxShadow: `0 0 8px ${tone.color}`
                    }}
                  />
                  
                  {/* Coated Card */}
                  <div className={`p-3 rounded-xl transition-all ${coatingStyle}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-bold block leading-tight font-mono tracking-tight" style={{ color: tone.color }}>
                        {item.label}
                      </span>
                      {displayDate && (
                        <span className="text-[11px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded block leading-tight">
                          {displayDate}
                        </span>
                      )}
                    </div>
                    {item.slug ? (
                      <a
                        href={`https://leetcode.com/problems/${item.slug}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-zinc-200 hover:text-[#ffa116] transition-colors block font-normal leading-tight pt-1.5"
                      >
                        {item.detail}
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-300 block font-normal leading-tight pt-1.5">
                        {item.detail}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
