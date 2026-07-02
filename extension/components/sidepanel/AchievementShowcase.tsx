import { Lock, Sparkles } from "lucide-react"
import { Card } from "../ui/Card"
import { getAchievementAssetUrl, type Achievement } from "../../lib/achievements"

type AchievementShowcaseVariant = "compact" | "gallery"

interface AchievementShowcaseProps {
  achievements: Achievement[]
  variant?: AchievementShowcaseVariant
}

const tierStyle: Record<string, { text: string; border: string; glow: string; label: string }> = {
  common: { text: "text-zinc-300", border: "border-zinc-700/70", glow: "shadow-zinc-950/20", label: "Common" },
  rare: { text: "text-sky-300", border: "border-sky-500/30", glow: "shadow-sky-500/10", label: "Rare" },
  epic: { text: "text-violet-300", border: "border-violet-500/30", glow: "shadow-violet-500/10", label: "Epic" },
  legendary: { text: "text-[#dfa054]", border: "border-[#dfa054]/35", glow: "shadow-[#dfa054]/15", label: "Legendary" }
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
  const earned = achievements.filter((achievement) => achievement.earned)
  const showcase = sortedForShowcase(achievements)
  const nextUnlock = [...achievements]
    .filter((achievement) => !achievement.earned)
    .sort((left, right) => right.progress - left.progress)[0]

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
    <section className="grid gap-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-mono">Achievement Cabinet</h3>
          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Unlocked badges glow. Solve problems to progress.</p>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950/45 px-2.5 py-1 text-[9px] font-mono text-zinc-400">
          {earned.length}/{achievements.length} earned
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {achievements.map((achievement) => {
          const style = tierStyle[achievement.tier]
          return (
            <Card
              key={achievement.id}
              className={`group relative overflow-hidden p-3.5 transition duration-300 hover:border-zinc-800 hover:bg-zinc-900/20 ${
                achievement.earned 
                  ? "bg-[#0e0e11]/80 border-zinc-900" 
                  : "bg-[#0e0e11]/30 border-zinc-955 opacity-60 hover:opacity-90"
              }`}
            >
              {/* Hover Radial Background Gradient */}
              <div 
                className={`pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 ${
                  achievement.earned 
                    ? "bg-[radial-gradient(circle_at_20%_0%,rgba(223,160,84,0.06),transparent_42%)]" 
                    : "bg-[radial-gradient(circle_at_20%_0%,rgba(113,113,122,0.04),transparent_42%)]"
                }`} 
              />

              <div className="relative flex items-center gap-3.5">
                {/* 🎨 Circular Badge Image */}
                <div className={`relative shrink-0 overflow-hidden rounded-xl border ${
                  achievement.earned ? style.border : "border-zinc-800"
                } bg-zinc-950 w-12 h-12 shadow-lg ${achievement.earned ? style.glow : ""}`}>
                  <img
                    src={getAchievementAssetUrl(achievement.asset)}
                    alt={achievement.title}
                    className={`h-full w-full object-cover transition duration-300 ${
                      achievement.earned 
                        ? "scale-100 group-hover:scale-110" 
                        : "scale-100 grayscale opacity-25"
                    }`}
                  />
                  {!achievement.earned && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40">
                      <Lock size={14} className="text-zinc-500" />
                    </div>
                  )}
                </div>

                {/* 📝 Metadata */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`truncate text-xs font-bold tracking-tight ${
                      achievement.earned ? "text-zinc-100" : "text-zinc-450"
                    }`}>
                      {achievement.title}
                    </h4>
                    <span className="text-[9px] font-mono text-zinc-550 shrink-0 select-none">
                      {achievement.earned ? "Unlocked ✓" : `${achievement.progress}%`}
                    </span>
                  </div>

                  {/* Tier Label + Requirement Text */}
                  <div className="flex items-center gap-1.5 mt-0.5 text-[8.5px] font-mono text-zinc-550">
                    <span className={`font-bold ${style.text}`}>
                      {achievement.tier === "legendary" ? "💍 Legendary" : achievement.tier === "epic" ? "🥇 Epic" : achievement.tier === "rare" ? "🥈 Rare" : "🥉 Common"}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[170px] text-zinc-500" title={achievement.requirement}>
                      {achievement.requirement}
                    </span>
                  </div>

                  {/* Locked Mini Progress Bar */}
                  {!achievement.earned && (
                    <div className="w-full h-1 bg-zinc-900 rounded-full mt-2.5 overflow-hidden border border-zinc-950/20">
                      <div className="h-full bg-zinc-650" style={{ width: `${achievement.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Expansion insight/earned dates on hover */}
              <div className="relative mt-2 max-h-0 overflow-hidden border-t border-zinc-900/60 pt-0 opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:pt-2 group-hover:opacity-100">
                <div className="text-[9.5px] leading-relaxed text-zinc-450 font-mono">
                  {achievement.earned 
                    ? `${achievement.earnedLabel || "Earned"} — ${achievement.insight}` 
                    : `Insight: ${achievement.insight}`}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
