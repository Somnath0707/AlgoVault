export type AchievementTier = "common" | "rare" | "epic" | "legendary"

export interface AchievementStats {
  totalSolved: number
  totalSubmissions: number
  todaySolves: number
  currentStreak: number
  focusScore: number
  tabSwitches: number
  pasteCount: number
  sessionTimeSeconds: number
  heatmap: Array<{
    bucketRating: number
    attempted: number
    solved: number
    firstAcCount: number
    avgAttempts: number
    avgSolveTime: number
  }>
  lastSyncTime?: string | null
}

export interface Achievement {
  id: string
  title: string
  asset: string
  tier: AchievementTier
  requirement: string
  insight: string
  progressLabel: string
  progress: number
  earned: boolean
  earnedLabel?: string
}

interface AchievementDefinition {
  id: string
  title: string
  asset: string
  tier: AchievementTier
  requirement: string
  insight: string
  evaluate: (stats: AchievementStats, derived: DerivedAchievementStats) => { current: number; target: number; label: string }
}

interface DerivedAchievementStats {
  attemptedBuckets: number
  solvedBuckets: number
  perfectBuckets: number
  totalFirstAc: number
  maxSolvedBucket: number
  heatmapSolved: number
  weightedAvgAttempts: number
}

function clampProgress(current: number, target: number) {
  if (target <= 0) return 100
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

function earnedLabel(stats: AchievementStats) {
  if (!stats.lastSyncTime) return "Earned from current history"
  return `Earned by ${new Date(stats.lastSyncTime).toLocaleDateString()}`
}

function derive(stats: AchievementStats): DerivedAchievementStats {
  const buckets = stats.heatmap || []
  const heatmapSolved = buckets.reduce((sum, bucket) => sum + Number(bucket.solved || 0), 0)
  const totalAttempted = buckets.reduce((sum, bucket) => sum + Number(bucket.attempted || 0), 0)
  const weightedAttempts = buckets.reduce((sum, bucket) => {
    return sum + Number(bucket.avgAttempts || 0) * Number(bucket.attempted || 0)
  }, 0)

  return {
    attemptedBuckets: buckets.filter((bucket) => Number(bucket.attempted || 0) > 0).length,
    solvedBuckets: buckets.filter((bucket) => Number(bucket.solved || 0) > 0).length,
    perfectBuckets: buckets.filter((bucket) => Number(bucket.attempted || 0) >= 3 && Number(bucket.solved || 0) === Number(bucket.attempted || 0)).length,
    totalFirstAc: buckets.reduce((sum, bucket) => sum + Number(bucket.firstAcCount || 0), 0),
    maxSolvedBucket: buckets.reduce((max, bucket) => Number(bucket.solved || 0) > 0 ? Math.max(max, Number(bucket.bucketRating || 0)) : max, 0),
    heatmapSolved,
    weightedAvgAttempts: totalAttempted > 0 ? weightedAttempts / totalAttempted : 99
  }
}

const DEFINITIONS: AchievementDefinition[] = [
  {
    id: "first-blood",
    title: "Nah, I'd Win",
    asset: "first-blood.png",
    tier: "common",
    requirement: "Solve your first tracked LeetCode problem.",
    insight: "The first accepted submission turns the extension from empty UI into personal telemetry.",
    evaluate: (stats) => ({ current: stats.totalSolved, target: 1, label: `${stats.totalSolved}/1 solved` })
  },
  {
    id: "out-67",
    title: "67",
    asset: "67.png",
    tier: "rare",
    requirement: "Reach 67 solved problems.",
    insight: "A milestone badge for the moment your solved history stops looking casual.",
    evaluate: (stats) => ({ current: stats.totalSolved, target: 67, label: `${stats.totalSolved}/67 solved` })
  },
  {
    id: "problem-slayer",
    title: "Tribal Chief",
    asset: "problem-slayer.png",
    tier: "epic",
    requirement: "Reach 100 solved problems.",
    insight: "Triple digits means you now have enough data for meaningful weakness and rating-range analytics.",
    evaluate: (stats) => ({ current: stats.totalSolved, target: 100, label: `${stats.totalSolved}/100 solved` })
  },
  {
    id: "conqueror",
    title: "Conqueror",
    asset: "conqueror.png",
    tier: "legendary",
    requirement: "Solve at least one 1800+ rated problem.",
    insight: "This unlocks when your rating heatmap proves you have taken down a serious bucket.",
    evaluate: (_, derived) => ({ current: derived.maxSolvedBucket, target: 1800, label: derived.maxSolvedBucket ? `best bucket ${derived.maxSolvedBucket}` : "no rated solve yet" })
  },
  {
    id: "cr7",
    title: "Conqueror 7",
    asset: "cr7.png",
    tier: "epic",
    requirement: "Build a 7 day solve streak.",
    insight: "Consistency trophy. It rewards showing up when motivation is not doing the heavy lifting.",
    evaluate: (stats) => ({ current: stats.currentStreak, target: 7, label: `${stats.currentStreak}/7 day streak` })
  },
  {
    id: "messi",
    title: "Number 10",
    asset: "messi.png",
    tier: "legendary",
    requirement: "Reach 10 days of streak momentum.",
    insight: "A playmaker badge for turning daily practice into rhythm.",
    evaluate: (stats) => ({ current: stats.currentStreak, target: 10, label: `${stats.currentStreak}/10 day streak` })
  },
  {
    id: "all-kill",
    title: "All Kill",
    asset: "all-kill.png",
    tier: "legendary",
    requirement: "Fully clear a rating bucket with at least 3 attempted problems.",
    insight: "A ruthless bucket-clear badge. Attempted and solved counts must match in one rating band.",
    evaluate: (_, derived) => ({ current: derived.perfectBuckets, target: 1, label: `${derived.perfectBuckets}/1 perfect bucket` })
  },
  {
    id: "adapt",
    title: "Nah, I'd Adapt",
    asset: "adapt.png",
    tier: "epic",
    requirement: "Solve problems across 5 different rating buckets.",
    insight: "Range matters. This badge unlocks when your solves are spread instead of clustered.",
    evaluate: (_, derived) => ({ current: derived.solvedBuckets, target: 5, label: `${derived.solvedBuckets}/5 solved buckets` })
  },
  {
    id: "equal-exchange",
    title: "Equal Exchange",
    asset: "equal-exchange.png",
    tier: "rare",
    requirement: "Average 2.0 attempts or fewer across rated buckets.",
    insight: "Precision badge. It tracks how efficiently you convert attempts into accepts.",
    evaluate: (_, derived) => {
      const current = derived.weightedAvgAttempts <= 2 && derived.heatmapSolved >= 10 ? 1 : Math.max(0, 2 / Math.max(derived.weightedAvgAttempts, 2))
      return { current, target: 1, label: derived.heatmapSolved < 10 ? `${derived.heatmapSolved}/10 rated solves` : `${derived.weightedAvgAttempts.toFixed(1)} avg attempts` }
    }
  },
  {
    id: "fallen-angle",
    title: "Fallen Angel",
    asset: "fallen-angle.png",
    tier: "rare",
    requirement: "Log 20 non-accepted attempts and still solve 25 problems.",
    insight: "Failure volume plus solved count means you are not avoiding hard fights.",
    evaluate: (stats) => {
      const misses = Math.max(0, stats.totalSubmissions - stats.totalSolved)
      const current = Math.min(misses / 20, stats.totalSolved / 25)
      return { current, target: 1, label: `${misses}/20 misses, ${stats.totalSolved}/25 solved` }
    }
  },
  {
    id: "phoenix",
    title: "Phoenix",
    asset: "phoenix.png",
    tier: "epic",
    requirement: "Solve today while holding at least a 3 day streak.",
    insight: "A comeback flame for keeping the streak alive today, not yesterday.",
    evaluate: (stats) => {
      const current = stats.todaySolves > 0 ? stats.currentStreak : 0
      return { current, target: 3, label: stats.todaySolves > 0 ? `${stats.currentStreak}/3 active streak` : "solve today to ignite" }
    }
  },
  {
    id: "ultra-instincts",
    title: "Ultra Instinct",
    asset: "ultra-instincts.png",
    tier: "legendary",
    requirement: "Keep focus 95+ with 0 pastes and 2 or fewer tab switches.",
    insight: "Clean-room focus badge. It rewards a session where the signal is pure.",
    evaluate: (stats) => {
      const clean = stats.focusScore >= 95 && stats.pasteCount === 0 && stats.tabSwitches <= 2
      return { current: clean ? 1 : Math.max(0, stats.focusScore / 95), target: 1, label: `F ${stats.focusScore}, P ${stats.pasteCount}, S ${stats.tabSwitches}` }
    }
  },
  {
    id: "focus-mode",
    title: "The Godfather",
    asset: "focus-mode.png",
    tier: "rare",
    requirement: "Keep focus score at 90 or higher.",
    insight: "Discipline badge. Quiet sessions produce cleaner data and cleaner solves.",
    evaluate: (stats) => ({ current: stats.focusScore, target: 90, label: `focus ${stats.focusScore}/90` })
  },
  {
    id: "night-owl",
    title: "Night Owl",
    asset: "night-owl.png",
    tier: "common",
    requirement: "Log a 2 hour active session.",
    insight: "Endurance badge for long study blocks. Breaks still recommended.",
    evaluate: (stats) => ({ current: Math.floor(stats.sessionTimeSeconds / 60), target: 120, label: `${Math.floor(stats.sessionTimeSeconds / 60)}/120 min` })
  }
]

export function buildAchievementStats(dashboard: any, heatmap: any[] = []): AchievementStats {
  return {
    totalSolved: Number(dashboard?.totalSolved || 0),
    totalSubmissions: Number(dashboard?.totalSubmissions || 0),
    todaySolves: Number(dashboard?.todaySolves || 0),
    currentStreak: Number(dashboard?.currentStreak || 0),
    focusScore: Number(dashboard?.focusScore ?? 0),
    tabSwitches: Number(dashboard?.tabSwitches || 0),
    pasteCount: Number(dashboard?.pasteCount || 0),
    sessionTimeSeconds: Number(dashboard?.sessionTimeSeconds || 0),
    heatmap: Array.isArray(heatmap) ? heatmap : [],
    lastSyncTime: dashboard?.lastSyncTime || null
  }
}

export function getAchievements(stats: AchievementStats): Achievement[] {
  const derived = derive(stats)
  return DEFINITIONS.map((definition) => {
    const result = definition.evaluate(stats, derived)
    const progress = clampProgress(result.current, result.target)
    const earned = progress >= 100
    return {
      id: definition.id,
      title: definition.title,
      asset: definition.asset,
      tier: definition.tier,
      requirement: definition.requirement,
      insight: definition.insight,
      progressLabel: result.label,
      progress,
      earned,
      earnedLabel: earned ? earnedLabel(stats) : undefined
    }
  })
}

export function getAchievementAssetUrl(asset: string) {
  return chrome.runtime.getURL(`assets/achievement-${asset}`)
}
