import React, { useState, useRef } from "react"
import { Lock, Sparkles } from "lucide-react"
import { Card } from "../ui/Card"
import { getAchievementAssetUrl, type Achievement } from "../../lib/achievements"

type AchievementShowcaseVariant = "compact" | "gallery"

interface AchievementShowcaseProps {
  achievements: Achievement[]
  variant?: AchievementShowcaseVariant
}

const tierStyle: Record<string, { text: string; border: string; glow: string; label: string; corner: string; bg: string }> = {
  common: { 
    text: "text-zinc-400", 
    border: "border-zinc-700", 
    glow: "shadow-zinc-950/40", 
    label: "Common",
    corner: "bg-zinc-550",
    bg: "bg-[#18181b]" 
  },
  rare: { 
    text: "text-sky-400", 
    border: "border-sky-600", 
    glow: "shadow-sky-500/10", 
    label: "Rare",
    corner: "bg-sky-450",
    bg: "bg-[#0c1a24]" 
  },
  epic: { 
    text: "text-violet-400", 
    border: "border-violet-600", 
    glow: "shadow-violet-500/15", 
    label: "Epic",
    corner: "bg-violet-400",
    bg: "bg-[#160f24]" 
  },
  legendary: { 
    text: "text-[#dfa054]", 
    border: "border-amber-600", 
    glow: "shadow-[#dfa054]/20", 
    label: "Legendary",
    corner: "bg-amber-400",
    bg: "bg-[#1c120c]" 
  }
}

function completionRate(achievements: Achievement[]) {
  if (!achievements.length) return 0
  return Math.round((achievements.filter((achievement) => achievement.earned).length / achievements.length) * 100)
}

function sortedForShowcase(achievements: Achievement[]) {
  const earned = achievements.filter((achievement) => achievement.earned)
  if (earned.length) return earned.slice(0, 7)
  return [...achievements].sort((left, right) => right.progress - left.progress).slice(0, 7)
}

function AchievementImage({ achievement, size = "md" }: { achievement: Achievement; size?: "sm" | "md" | "lg" }) {
  const style = tierStyle[achievement.tier]
  const sizeClass = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-14 w-14"
  return (
    <div className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-md border ${achievement.earned ? style.border : "border-zinc-800"} bg-zinc-950 shadow-lg ${achievement.earned ? style.glow : ""}`}>
      <img
        src={getAchievementAssetUrl(achievement.asset)}
        alt={achievement.title}
        className={`h-full w-full object-cover transition duration-300 ${achievement.earned ? "scale-100 group-hover:scale-110" : "scale-100 grayscale opacity-35 group-hover:opacity-55"}`}
      />
      {!achievement.earned && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/35">
          <Lock size={size === "lg" ? 20 : 15} className="text-zinc-500" />
        </div>
      )}
    </div>
  )
}

export function AchievementShowcase({ achievements, variant = "gallery" }: AchievementShowcaseProps) {
  const [hoveredTrophy, setHoveredTrophy] = useState<Achievement | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const earned = achievements.filter((achievement) => achievement.earned)
  const showcase = sortedForShowcase(achievements)
  const nextUnlock = [...achievements]
    .filter((achievement) => !achievement.earned)
    .sort((left, right) => right.progress - left.progress)[0]

  const handleMouseMove = (e: React.MouseEvent, achievement: Achievement) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Align tooltip position above the hovered grid cell
    const x = e.clientX - rect.left - 50
    const y = e.clientY - rect.top - 165
    setTooltipPos({ x, y })
    setHoveredTrophy(achievement)
  }

  if (variant === "compact") {
    return (
      <Card className="overflow-hidden p-0">
        <div className="border-b border-zinc-800/80 bg-[linear-gradient(90deg,rgba(16,185,129,0.12),rgba(223,160,84,0.08),rgba(39,39,42,0.2))] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-100">Achievement Showcase</div>
              <div className="mt-0.5 text-[10px] text-zinc-500">{earned.length ? "Pinned from earned achievements" : "Closest unlocks shown until your first badge"}</div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-700/70 bg-zinc-950/45 px-2 py-1 text-[10px] font-mono text-zinc-400">
              <Sparkles size={12} className="text-[#dfa054]" />
              {completionRate(achievements)}%
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {showcase.map((achievement) => (
              <div key={achievement.id} className="group" title={`${achievement.title}: ${achievement.requirement}`}>
                <AchievementImage achievement={achievement} size="sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-800/80 bg-zinc-950/25">
          <div className="px-3 py-2.5">
            <div className="font-mono text-xl font-semibold text-zinc-100">{earned.length}</div>
            <div className="text-[10px] text-zinc-500">Earned</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="font-mono text-xl font-semibold text-zinc-100">{achievements.filter((achievement) => achievement.earned && achievement.tier === "legendary").length}</div>
            <div className="text-[10px] text-zinc-500">Legendary</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="truncate font-mono text-xl font-semibold text-zinc-100">{nextUnlock ? `${nextUnlock.progress}%` : "100%"}</div>
            <div className="truncate text-[10px] text-zinc-500">{nextUnlock ? nextUnlock.title : "Complete"}</div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <section className="grid gap-3 relative font-sans select-none mt-2" ref={containerRef}>
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">Trophy Cabinet</h3>
          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Hover icons for details and stats</p>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950/45 px-2.5 py-1 text-[9px] font-mono text-zinc-400">
          {earned.length}/{achievements.length} earned
        </div>
      </div>

      {/* 🎮 3-Column Square Badge Grid */}
      <div className="grid grid-cols-3 gap-3 bg-zinc-950/20 p-3 rounded-xl border border-zinc-900 shadow-inner">
        {achievements.map((achievement) => {
          const style = tierStyle[achievement.tier]
          const isEarned = achievement.earned

          return (
            <div
              key={achievement.id}
              onMouseMove={(e) => handleMouseMove(e, achievement)}
              onMouseLeave={() => setHoveredTrophy(null)}
              className={`relative aspect-square rounded-xl border-4 transition-all duration-300 cursor-pointer overflow-hidden ${
                isEarned 
                  ? `${style.border} ${style.bg} ${style.glow} hover:scale-110 hover:-translate-y-1 hover:rotate-2 hover:shadow-[0_0_15px_rgba(223,160,84,0.35)]` 
                  : "border-zinc-800/80 bg-zinc-950 hover:border-zinc-700 hover:scale-105"
              }`}
            >
              {/* Beveled Corner Decorations (to look exactly like the reference image) */}
              <div className={`absolute top-0 left-0 w-2 h-2 rounded-br-sm ${isEarned ? style.corner : "bg-zinc-700"}`} />
              <div className={`absolute top-0 right-0 w-2 h-2 rounded-bl-sm ${isEarned ? style.corner : "bg-zinc-700"}`} />
              <div className={`absolute bottom-0 left-0 w-2 h-2 rounded-tr-sm ${isEarned ? style.corner : "bg-zinc-700"}`} />
              <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-tl-sm ${isEarned ? style.corner : "bg-zinc-700"}`} />

              {/* Achievement Badge Graphic */}
              <img
                src={getAchievementAssetUrl(achievement.asset)}
                alt={achievement.title}
                className={`h-full w-full object-cover transition-transform duration-300 ${
                  isEarned ? "scale-100 group-hover:scale-110" : "scale-100 grayscale opacity-25"
                }`}
              />

              {/* Lock Indicator overlay */}
              {!isEarned && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20">
                  <Lock size={15} className="text-zinc-650" />
                </div>
              )}

              {/* Progress bar inside the square box itself */}
              {!isEarned && achievement.progress > 0 && (
                <div className="absolute bottom-1.5 inset-x-2 h-1 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800/40">
                  <div className="h-full bg-zinc-600" style={{ width: `${achievement.progress}%` }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 🛸 HUD Glassmorphic Tooltip Details */}
      {hoveredTrophy && (
        <div
          className="absolute z-50 p-3 rounded-xl border border-zinc-800/85 bg-zinc-950/95 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6)] text-xs text-zinc-300 min-w-[200px] pointer-events-none transition-all duration-75"
          style={{
            left: `${Math.max(5, Math.min(tooltipPos.x, 120))}px`,
            top: `${tooltipPos.y}px`
          }}
        >
          <div className="font-bold text-zinc-100 border-b border-zinc-900 pb-1.5 mb-1.5 flex justify-between items-center font-mono">
            <span className="truncate max-w-[125px]">{hoveredTrophy.title}</span>
            <span className={`shrink-0 font-bold text-[9px] uppercase ${tierStyle[hoveredTrophy.tier].text}`}>
              {tierStyle[hoveredTrophy.tier].label}
            </span>
          </div>

          <div className="text-[10px] text-zinc-450 leading-relaxed mb-2 font-medium">
            {hoveredTrophy.requirement}
          </div>

          <div className="flex justify-between items-center font-mono mt-1 text-[9px]">
            <span className="text-zinc-550">Status:</span>
            <span className={`font-bold ${hoveredTrophy.earned ? "text-emerald-450" : "text-zinc-500"}`}>
              {hoveredTrophy.earned ? "Unlocked ✓" : `${hoveredTrophy.progress}% Unlocked`}
            </span>
          </div>

          {!hoveredTrophy.earned && (
            <div className="flex justify-between items-center font-mono text-[9px] mt-0.5">
              <span className="text-zinc-550">Progress:</span>
              <span className="text-zinc-350">{hoveredTrophy.progressLabel}</span>
            </div>
          )}

          <div className="flex flex-col gap-0.5 font-mono text-[9px] border-t border-zinc-900 pt-1.5 mt-1.5">
            <span className="text-zinc-550">Insight:</span>
            <span className="text-zinc-400 leading-relaxed text-[8.5px]">{hoveredTrophy.insight}</span>
          </div>

          {hoveredTrophy.earned && hoveredTrophy.earnedLabel && (
            <div className="text-[8px] font-mono text-zinc-550 text-right mt-1.5">
              {hoveredTrophy.earnedLabel}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
