import React, { useState, useRef } from "react"
import { motion, useMotionValue, useTransform, useSpring, useMotionTemplate } from "framer-motion"
import { Lock, Sparkles } from "lucide-react"
import { Card } from "../ui/Card"
import { getAchievementAssetUrl, type Achievement } from "../../lib/achievements"
import confetti from "canvas-confetti"

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
    corner: "bg-zinc-500",
    bg: "bg-[#18181b]" 
  },
  rare: { 
    text: "text-sky-400", 
    border: "border-sky-600", 
    glow: "shadow-sky-500/10", 
    label: "Rare",
    corner: "bg-sky-400",
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

function VaultTrophy({ achievement, onHover }: { achievement: Achievement, onHover: (ach: Achievement | null, cardEl?: HTMLElement) => void }) {
  const isEarned = achievement.earned
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const ref = useRef<HTMLDivElement>(null)
  
  // Spring config tailored for premium badge physics
  const springConfig = { stiffness: 150, damping: 18 }
  const rotateX = useTransform(y, [-50, 50], [12, -12])
  const rotateY = useTransform(x, [-50, 50], [-12, 12])
  const springRotateX = useSpring(rotateX, springConfig)
  const springRotateY = useSpring(rotateY, springConfig)

  // Real-time glare coordinates
  const glareX = useTransform(x, [-50, 50], [0, 100])
  const glareY = useTransform(y, [-50, 50], [0, 100])
  const springGlareX = useSpring(glareX, springConfig)
  const springGlareY = useSpring(glareY, springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEarned) return;
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top
    const valX = ((clientX / rect.width) - 0.5) * 100
    const valY = ((clientY / rect.height) - 0.5) * 100
    x.set(valX)
    y.set(valY)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
    onHover(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEarned) return;
    const rect = e.currentTarget.getBoundingClientRect()
    const originX = (rect.left + rect.width / 2) / window.innerWidth
    const originY = (rect.top + rect.height / 2) / window.innerHeight
    
    let colors = ['#a1a1aa', '#d4d4d8']
    if (achievement.tier === "rare") colors = ['#38bdf8', '#7dd3fc']
    if (achievement.tier === "epic") colors = ['#c084fc', '#e879f9']
    if (achievement.tier === "legendary") colors = ['#dfa054', '#fcd34d', '#fbbf24']

    confetti({
      particleCount: achievement.tier === "legendary" ? 120 : 60,
      spread: achievement.tier === "legendary" ? 100 : 70,
      origin: { x: originX, y: originY },
      colors,
      disableForReducedMotion: true,
      zIndex: 9999,
      gravity: 1.2,
      ticks: 200
    })
  }

  let borderStyle = "border-[#ffffff04]"
  let shadowStyle = "shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
  
  if (achievement.tier === "rare") {
    borderStyle = "border-[#94a3b8]/20"
  } else if (achievement.tier === "epic") {
    borderStyle = "border-[#ffffff04]"
    shadowStyle += " shadow-[inset_0_0_20px_rgba(147,51,234,0.15)]"
  } else if (achievement.tier === "legendary") {
    borderStyle = "border-[#dfa054]/40"
  }

  return (
    <motion.div
      ref={ref}
      style={isEarned ? {
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d"
      } : {}}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => onHover(achievement, ref.current || undefined)}
      onClick={handleClick}
      whileTap={isEarned ? { scale: 0.85, rotateZ: (Math.random() - 0.5) * 15, zIndex: 50, transition: { type: "spring", stiffness: 600, damping: 12 } } : {}}
      whileHover={isEarned ? { scale: 1.12, zIndex: 40, transition: { stiffness: 200, damping: 15 } } : { scale: 1.01 }}
      animate={isEarned && achievement.tier === "legendary" ? { boxShadow: ["0px 0px 0px rgba(223,160,84,0)", "0px 0px 30px rgba(223,160,84,0.25)", "0px 0px 0px rgba(223,160,84,0)"] } : {}}
      transition={isEarned && achievement.tier === "legendary" ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
      className={`relative aspect-square rounded-md bg-[#0a0a0a] border cursor-pointer overflow-hidden transition-colors ${borderStyle} ${isEarned ? shadowStyle : 'border-zinc-900/40'}`}
    >
      {isEarned && achievement.tier === "legendary" && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 bg-[#dfa054]/60 border border-[#0a0a0a] z-20"></div>
      )}

      {isEarned ? (
        <>
          {achievement.tier === "legendary" && (
            <>
              {/* Grand Spotlight Beam */}
              <div 
                className="absolute -top-[20%] left-1/2 w-[200%] h-[200%] -translate-x-1/2 pointer-events-none z-0" 
                style={{ background: "conic-gradient(from 180deg at 50% 0%, transparent 140deg, rgba(223, 160, 84, 0.2) 180deg, transparent 220deg)" }} 
              />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[20%] bg-[#dfa054]/20 blur-xl rounded-full z-0 pointer-events-none" />
              
              {/* Floating Sparkles */}
              <div className="absolute inset-0 z-0 pointer-events-none">
                <motion.div animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[15%] text-[#dfa054]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </motion.div>
                <motion.div animate={{ y: [0, -15, 0], opacity: [0.1, 0.8, 0.1], scale: [1, 1.5, 1] }} transition={{ duration: 3.2, repeat: Infinity, delay: 0.7, ease: "easeInOut" }} className="absolute bottom-[25%] right-[10%] text-[#f6ce8e]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </motion.div>
                <motion.div animate={{ rotate: [0, 90, 180], opacity: [0.4, 1, 0.4] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute top-[35%] right-[20%] text-[#dfa054]">
                  <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>
                </motion.div>
              </div>
            </>
          )}
          {/* Float the badge inside the container for genuine 3D parallax depth */}
          <div 
            style={{ transform: "translateZ(24px)", transformStyle: "preserve-3d" }}
            className="w-full h-full p-2.5 pointer-events-none select-none"
          >
            <img
              src={getAchievementAssetUrl(achievement.asset)}
              alt={achievement.title}
              className="h-full w-full object-cover select-none pointer-events-none rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            />
          </div>
          {/* Glare/Shine filter reflecting tilting angle */}
          <motion.div
            style={{
              background: useMotionTemplate`radial-gradient(circle at ${springGlareX}% ${springGlareY}%, rgba(255,255,255,0.15) 0%, transparent 55%)`,
              transform: "translateZ(1px)"
            }}
            className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#121214] flex items-center justify-center">
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "4px 4px" }}></div>
          <img
            src={getAchievementAssetUrl(achievement.asset)}
            alt="Locked"
            className="h-full w-full object-cover select-none pointer-events-none grayscale opacity-[0.25] brightness-75 contrast-75"
          />
        </div>
      )}
    </motion.div>
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

  const handleHoverTrophy = (achievement: Achievement | null, cardEl?: HTMLElement) => {
    if (!containerRef.current || !cardEl || !achievement) {
      setHoveredTrophy(achievement)
      return
    }
    
    // Position the tooltip static above the hovered card instead of following mouse
    const containerRect = containerRef.current.getBoundingClientRect()
    const cardRect = cardEl.getBoundingClientRect()
    
    const x = cardRect.left - containerRect.left + (cardRect.width / 2) - 110 // Center tooltip to card (width=220)
    const y = cardRect.top - containerRect.top - 128 // Floating slightly above the card (height=~100 + offset)
    
    setTooltipPos({ x, y })
    setHoveredTrophy(achievement)
  }

  const legendaryTrophies = achievements.filter(a => a.tier === "legendary")
  const epicTrophies = achievements.filter(a => a.tier === "epic")
  const rareTrophies = achievements.filter(a => a.tier === "rare")
  const commonTrophies = achievements.filter(a => a.tier === "common")

  if (variant === "compact") {
    return (
      <Card className="overflow-hidden p-0 border border-zinc-800/80 bg-gradient-to-br from-zinc-900/40 to-zinc-950/60 shadow-xl hover:border-[#dfa054]/25 transition duration-300">
        <div className="relative border-b border-zinc-800/80 bg-gradient-to-r from-emerald-500/10 via-[#dfa054]/5 to-zinc-900/10 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-200">Achievement Showcase</div>
              <div className="mt-0.5 text-[9px] text-zinc-500 font-mono">
                {earned.length ? "Pinned from earned achievements" : "Closest unlocks shown until your first badge"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#dfa054]/20 bg-[#dfa054]/5 px-2 py-1 text-[9px] font-mono font-bold text-[#dfa054] shadow-[0_0_8px_rgba(223,160,84,0.1)]">
              <Sparkles size={11} className="text-[#dfa054] animate-pulse" />
              {completionRate(achievements)}% COMPLETE
            </div>
          </div>
          <div className="mt-3.5 flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {showcase.map((achievement) => (
              <div 
                key={achievement.id} 
                className="group relative cursor-pointer" 
                title={`${achievement.title}: ${achievement.requirement}`}
              >
                <AchievementImage achievement={achievement} size="sm" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-zinc-800/80 bg-zinc-950/40 font-mono">
          <div className="px-4 py-3 text-center">
            <div className="text-lg font-black text-zinc-100 tabular-nums">{earned.length}</div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">Earned</div>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="text-lg font-black text-[#dfa054] tabular-nums">
              {achievements.filter((achievement) => achievement.earned && achievement.tier === "legendary").length}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">Legendary</div>
          </div>
          <div className="px-4 py-3 text-center">
            <div className="text-lg font-black text-emerald-400 tabular-nums truncate max-w-full">
              {nextUnlock ? `${nextUnlock.progress}%` : "100%"}
            </div>
            <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5 truncate max-w-full">
              {nextUnlock ? nextUnlock.title : "Complete"}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <section className="relative font-sans select-none mt-2 pb-6" ref={containerRef}>
      <div className="flex items-end justify-between px-2 mb-6">
        <div>
          <h3 className="text-[11px] font-mono tracking-[0.2em] text-zinc-500 uppercase">The Vault</h3>
        </div>
        <div className="text-sm font-medium text-zinc-400 font-mono">
          {earned.length} <span className="text-zinc-655">/ {achievements.length}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {commonTrophies.length > 0 && (
          <div>
            <div className="text-[9px] font-mono tracking-widest text-zinc-500/70 uppercase mb-2 px-1">Common</div>
            <div className="grid grid-cols-3 gap-6 bg-[#060607]/40 border border-zinc-900/50 p-6 rounded-xl relative overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.85)]">
              {commonTrophies.map((achievement) => (
                <VaultTrophy 
                  key={achievement.id} 
                  achievement={achievement} 
                  onHover={handleHoverTrophy} 
                />
              ))}
            </div>
          </div>
        )}

        {rareTrophies.length > 0 && (
          <div>
            <div className="text-[9px] font-mono tracking-widest text-sky-400/60 uppercase mb-2 px-1">Rare</div>
            <div className="grid grid-cols-3 gap-6 bg-[#060607]/40 border border-zinc-900/50 p-6 rounded-xl relative overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.85)]">
              {rareTrophies.map((achievement) => (
                <VaultTrophy 
                  key={achievement.id} 
                  achievement={achievement} 
                  onHover={handleHoverTrophy} 
                />
              ))}
            </div>
          </div>
        )}

        {epicTrophies.length > 0 && (
          <div>
            <div className="text-[9px] font-mono tracking-widest text-purple-400/60 uppercase mb-2 px-1">Epic</div>
            <div className="grid grid-cols-3 gap-6 bg-[#060607]/40 border border-zinc-900/50 p-6 rounded-xl relative overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.85)]">
              {epicTrophies.map((achievement) => (
                <VaultTrophy 
                  key={achievement.id} 
                  achievement={achievement} 
                  onHover={handleHoverTrophy} 
                />
              ))}
            </div>
          </div>
        )}

        {legendaryTrophies.length > 0 && (
          <div>
            <div className="text-[9px] font-mono tracking-widest text-[#dfa054]/70 uppercase mb-2 px-1">Legendary</div>
            <div className="grid grid-cols-3 gap-6 bg-[#060607]/40 border border-zinc-900/50 p-6 rounded-xl relative overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.85)]">
              {legendaryTrophies.map((achievement) => (
                <VaultTrophy 
                  key={achievement.id} 
                  achievement={achievement} 
                  onHover={handleHoverTrophy} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {hoveredTrophy && (
        <div
          className="absolute z-50 p-4 rounded-md border border-[#ffffff0a] bg-[#161616]/95 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.8)] text-xs min-w-[220px] pointer-events-none transition-all duration-75"
          style={{
            left: `${Math.max(5, Math.min(tooltipPos.x, 100))}px`,
            top: `${tooltipPos.y}px`
          }}
        >
          <div className="font-bold text-zinc-200 border-b border-[#ffffff04] pb-2 mb-2 flex justify-between items-center font-mono">
            <span className="truncate max-w-[135px] text-[13px]">{hoveredTrophy.title}</span>
            <span className={`shrink-0 font-bold text-[9px] uppercase ${tierStyle[hoveredTrophy.tier].text}`}>
              {tierStyle[hoveredTrophy.tier].label}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            {hoveredTrophy.requirement}
          </div>
          <div className="flex flex-col gap-1 font-mono text-[10px] border-t border-[#ffffff04] pt-2">
            <span className="text-zinc-500">{hoveredTrophy.insight}</span>
            {hoveredTrophy.earnedLabel && (
              <span className="text-[#dfa054] font-medium mt-1">{hoveredTrophy.earnedLabel}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
