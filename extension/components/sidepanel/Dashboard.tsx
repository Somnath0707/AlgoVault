import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Activity,
  ArrowUpRight,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Clock3,
  Flame,
  Pause,
  Play,
  RefreshCw,
  Shuffle,
  Sparkles,
  Lock,
  Square,
  Target,
  TrendingUp,
  WifiOff,
} from "lucide-react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import {
  fetchAllSessions,
  fetchDashboard,
  fetchRevisionQueue,
  fetchWeakness,
  reviewRevisionCard
} from "../../lib/api/backend"
import {
  clearCurrentSession,
  getCurrentSession,
  getLastSync,
  getLiveTimer,
  getTodayRecommendationSelection,
  getTodaySnapshot,
  getUsername,
  setCachedDashboard,
  setCachedWeakness,
  setCurrentSession,
  setLiveTimer,
  setTodayRecommendationSelection,
  setTodaySnapshot
} from "../../lib/storage"
import { normalizeZerotracPayload, buildZerotracRatingMap } from "../../lib/zerotrac"
import { WeeklyReportModal } from "./WeeklyReportModal"
import { STUDY_LISTS } from "../../lib/study-lists"
import type {
  ActiveSession,
  DashboardData,
  EvidenceBadge,
  LiveTimerState,
  PrimaryAction,
  QuestStep,
  RevisionQueueItem,
  SessionData,
  TodaySnapshot,
  UserContestRanking,
  WeaknessRecommendation,
  WeaknessSnapshot,
  ZerotracProblem
} from "../../lib/types"
import { usePracticeSession } from "../../hooks/usePracticeSession"

const TODAY_SNAPSHOT_VERSION = 2
const STALE_AFTER_MS = 15 * 60 * 1000
const MIN_SOLVES_FOR_STRETCH = 25
const RECALL_WINDOW_KEY = "algovault.recallWindowDays"

type BackgroundResponse<T> = {
  ok?: boolean
  data?: T
  error?: string
}

type QuestId = QuestStep["id"]

interface DayActivity {
  key: string
  label: string
  dateLabel: string
  focusSeconds: number
  solves: number
  sessions: number
}

function message<T>(payload: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      resolve(response)
    })
  })
}

function parseDate(value: unknown): Date | null {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.valueOf()) ? null : parsed
  }
  if (Array.isArray(value) && value.every((part) => typeof part === "number")) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day, hour, minute, second)
  }
  return null
}

/**
 * The background uses Plasmo Storage, which JSON-serializes values before
 * placing them in chrome.storage.local. This dashboard reads a few hot-path
 * keys directly through chrome.storage.local, so decode both the historical
 * serialized form and a native Chrome storage value.
 */
function parseStoredValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value ?? fallback) as T
  try {
    const parsed: unknown = JSON.parse(value)
    return (parsed ?? fallback) as T
  } catch {
    return fallback
  }
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

function formatLiveTimer(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  const hours = Math.floor(mins / 60)
  const displayMins = mins % 60

  if (hours > 0) {
    return `${hours}:${String(displayMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

function formatCompactDuration(seconds: number) {
  const minutes = Math.max(0, Math.round(seconds / 60))
  if (minutes >= 60) return `${(minutes / 60).toFixed(minutes % 60 === 0 ? 0 : 1)}h`
  return `${minutes}m`
}

function relativeTime(timestamp: number | null) {
  if (!timestamp) return "Not synced yet"
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes < 1) return "Synced just now"
  if (minutes < 60) return `Synced ${minutes}m ago`
  if (minutes < 24 * 60) return `Synced ${Math.floor(minutes / 60)}h ago`
  return `Synced ${Math.floor(minutes / (24 * 60))}d ago`
}

function isStale(timestamp: number | null) {
  return !timestamp || Date.now() - timestamp > STALE_AFTER_MS
}

function normalizeTimer(timer: LiveTimerState | null, session: ActiveSession | null): LiveTimerState | null {
  if (timer) {
    return {
      ...timer,
      activeFocusSeconds: Math.max(0, timer.activeFocusSeconds ?? timer.focusSeconds ?? 0),
      problemFocusSeconds: Math.max(0, timer.problemFocusSeconds ?? 0),
      problemElapsedSeconds: Math.max(0, timer.problemElapsedSeconds ?? 0),
      status: timer.status ?? (timer.isPaused ? "paused" : "running"),
      isPaused: timer.isPaused ?? timer.status === "paused",
      updatedAt: timer.updatedAt ?? Date.now()
    }
  }
  if (!session?.id || session.endedAt) return null
  return {
    activeFocusSeconds: Math.max(0, session.focusSeconds ?? 0),
    focusSeconds: Math.max(0, session.focusSeconds ?? 0),
    status: "running",
    isPaused: false,
    sessionId: session.id,
    mode: session.mode,
    updatedAt: Date.now()
  }
}

function getStudyCandidates(solved: Set<string>) {
  const candidates: { list: (typeof STUDY_LISTS)[0]; problem: (typeof STUDY_LISTS)[0]["problems"][0] }[] = []
  for (const list of STUDY_LISTS) {
    for (const problem of list.problems) {
      if (!solved.has(problem.slug)) {
        candidates.push({ list, problem })
      }
    }
  }
  return candidates
}

function selectStudyProblem(solved: Set<string>, preferredSlug?: string) {
  const candidates = getStudyCandidates(solved)
  return candidates.find((candidate) => candidate.problem.slug === preferredSlug) ?? candidates[0] ?? null
}

function evidenceTone(level?: string): EvidenceBadge["tone"] {
  if (level === "STRONG") return "emerald"
  if (level === "MODERATE") return "blue"
  return "zinc"
}

function evidenceLabel(level?: string) {
  if (level === "STRONG") return "Evidence: strong"
  if (level === "MODERATE") return "Evidence: moderate"
  if (level === "PRELIMINARY") return "Evidence: preliminary"
  return "Evidence: building"
}

function ActionButton({
  href,
  onClick,
  children,
  tone = "zinc",
  disabled = false,
  className: extraClassName = ""
}: {
  href?: string
  onClick?: () => void
  children: ReactNode
  tone?: "zinc" | "amber" | "blue"
  disabled?: boolean
  className?: string
}) {
  const tones = {
    zinc: "border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white",
    amber: "border-amber-400/50 bg-amber-400 text-zinc-950 hover:bg-amber-300",
    blue: "border-sky-400/50 bg-sky-400 text-zinc-950 hover:bg-sky-300"
  }
  const className = `inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-colors ${tones[tone]} ${disabled ? "cursor-not-allowed opacity-45" : ""} ${extraClassName}`

  if (href) {
    return <a href={href} target="_blank" rel="noreferrer" className={className}>{children} <ArrowUpRight size={13} /></a>
  }
  return <button type="button" onClick={onClick} disabled={disabled} className={className}>{children}</button>
}

function Badge({ badge }: { badge: EvidenceBadge }) {
  const tone = {
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
    blue: "border-sky-400/25 bg-sky-400/[0.08] text-sky-300",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
    zinc: "border-zinc-700/80 bg-zinc-900/70 text-zinc-400"
  }[badge.tone]
  return <span className={`rounded-full border px-2 py-0.5 text-[8px] font-mono font-semibold ${tone}`}>{badge.label}</span>
}

function QuestIcon({ id, status }: { id: QuestId; status: QuestStep["status"] }) {
  const className = status === "complete" ? "text-emerald-400" : id === "review" ? "text-amber-400" : id === "practice" ? "text-sky-400" : "text-violet-400"
  const shell = status === "complete" ? "bg-emerald-400/10" : id === "review" ? "bg-amber-400/10" : id === "practice" ? "bg-sky-400/10" : "bg-violet-400/10"
  const icon = status === "complete" ? <Check size={14} /> : id === "review" ? <Brain size={14} /> : id === "practice" ? <Target size={14} /> : <TrendingUp size={14} />
  return <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${shell} ${className}`}>{icon}</div>
}

const KNOWN_PREMIUM_SLUGS = new Set([
  "encode-and-decode-strings",
  "walls-and-gates",
  "graph-valid-tree",
  "number-of-connected-components-in-an-undirected-graph",
  "alien-dictionary",
  "meeting-rooms",
  "meeting-rooms-ii"
])

export const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [queue, setQueue] = useState<RevisionQueueItem[]>([])
  const [weakness, setWeakness] = useState<WeaknessSnapshot | null>(null)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [solved, setSolved] = useState<Set<string>>(new Set())
  const [zerotrac, setZerotrac] = useState<ZerotracProblem[]>([])
  const [ranking, setRanking] = useState<UserContestRanking | null>(null)
  const { session: apseSession, clocks, pauseSession, resumeSession, resetSession, stopAllRunningSessions, finishSession, logTimeSession } = usePracticeSession()
  const [localLogs, setLocalLogs] = useState<any[]>([])
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [snapshotSavedAt, setSnapshotSavedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewedToday, setReviewedToday] = useState(false)
  const [sessionActionPending, setSessionActionPending] = useState(false)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  const [recallWindowDays, setRecallWindowDays] = useState<number | null>(null)
  const [recallDaysInput, setRecallDaysInput] = useState("30")
  const [recommendationSelection, setRecommendationSelection] = useState<{ practiceSlug?: string; stretchSlug?: string }>({})
  const [hoveredActivityKey, setHoveredActivityKey] = useState<string | null>(null)
  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState(false)

  const loadLocalLogs = useCallback(() => {
    const now = new Date()
    const yyyyMm = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, "0")}`
    const bucketKey = `algovault.logs.${yyyyMm}`

    chrome.storage.local.get(["algovault.logs.index", bucketKey, "algovault.session.store"], (res) => {
      const storedIndex = parseStoredValue<unknown>(res["algovault.logs.index"], [])
      const storedBucket = parseStoredValue<unknown>(res[bucketKey], [])
      const storedSessions = parseStoredValue<unknown>(res["algovault.session.store"], {})
      const indexLogs = Array.isArray(storedIndex) ? storedIndex : []
      const bucketLogs = Array.isArray(storedBucket) ? storedBucket : []
      const storeSessions = storedSessions && typeof storedSessions === "object" && !Array.isArray(storedSessions)
        ? storedSessions as Record<string, unknown>
        : {}

      const logMap = new Map<string, any>()

      // 1. Add summary index logs
      for (const log of indexLogs) {
        if (!log) continue
        const key = log.sessionId || `${log.slug}_${log.ts}`
        logMap.set(key, log)
      }

      // 2. Merge detailed monthly bucket logs
      for (const log of bucketLogs) {
        if (!log) continue
        const key = log.sessionId || `${log.slug}_${log.startedAt}`
        const existing = logMap.get(key)
        const activeSecs = Number(log.activeSecs ?? log.actSecs ?? log.focusSeconds ?? 0)
        if (!existing || Number(existing.actSecs ?? existing.activeSecs ?? 0) < activeSecs) {
          logMap.set(key, {
            sessionId: log.sessionId,
            slug: log.slug,
            ts: log.startedAt || log.completedAt || Date.now(),
            actSecs: activeSecs,
            elSecs: log.elapsedSecs ?? 0,
            score: log.focusScore ?? 100,
            solved: Boolean(log.isSolved || log.solved)
          })
        }
      }

      // 3. Add stored multi-tab sessions
      for (const [slug, storeSess] of Object.entries(storeSessions)) {
        if (!storeSess || typeof storeSess !== "object") continue
        const sess = storeSess as any
        const key = sess.id || `${slug}_${sess.tElapsedStart}`
        if (!logMap.has(key)) {
          const accActiveMs = typeof sess.accActiveMs === "number" ? sess.accActiveMs : 0
          const actSecs = Math.floor(accActiveMs / 1000)
          if (actSecs > 0) {
            logMap.set(key, {
              sessionId: sess.id,
              slug,
              ts: sess.tElapsedStart || Date.now(),
              actSecs,
              elSecs: Math.floor((Date.now() - (sess.tElapsedStart || Date.now())) / 1000),
              score: 100,
              solved: sess.st === "SOLVED"
            })
          }
        }
      }

      setLocalLogs(Array.from(logMap.values()))
    })
  }, [])

  const applySnapshot = useCallback((snapshot: TodaySnapshot) => {
    setData(snapshot.data)
    setQueue(snapshot.queue)
    setWeakness(snapshot.weakness)
    setSessions(snapshot.sessions)
    setSolved(new Set(snapshot.solved))
    setZerotrac(snapshot.zerotrac)
    setRanking(snapshot.ranking)
    setSnapshotSavedAt(snapshot.savedAt)
  }, [])

  const updateRecommendationSelection = useCallback((update: { practiceSlug?: string; stretchSlug?: string }) => {
    setRecommendationSelection((current) => {
      const next = { ...current, ...update }
      void setTodayRecommendationSelection(next)
      return next
    })
  }, [])

  const refresh = useCallback(async (recallWindowOverride = recallWindowDays) => {
    setRefreshing(true)
    try {
      const username = await getUsername()
      const [dashboard, reviews, weak, allSessions, solvedResponse, zerotracResponse, rankingResponse] = await Promise.all([
        fetchDashboard(),
        fetchRevisionQueue(recallWindowOverride).catch((): RevisionQueueItem[] => []),
        fetchWeakness().catch((): WeaknessSnapshot | null => null),
        fetchAllSessions().catch((): SessionData[] => []),
        message<BackgroundResponse<string[]>>({ action: "get_solved_problem_slugs" }).catch((): BackgroundResponse<string[]> => ({})),
        message<unknown>({ action: "get_zerotrac" }).catch((): unknown => null),
        username
          ? message<BackgroundResponse<{ userContestRanking?: UserContestRanking }>>({ action: "get_user_contest_history", payload: { username } }).catch((): BackgroundResponse<{ userContestRanking?: UserContestRanking }> => ({}))
          : Promise.resolve<BackgroundResponse<{ userContestRanking?: UserContestRanking }>>({})
      ])

      const snapshot: TodaySnapshot = {
        schemaVersion: TODAY_SNAPSHOT_VERSION,
        data: dashboard,
        queue: reviews,
        weakness: weak,
        sessions: allSessions,
        solved: Array.from(new Set(solvedResponse.data ?? [])),
        zerotrac: normalizeZerotracPayload(zerotracResponse),
        ranking: rankingResponse.ok ? rankingResponse.data?.userContestRanking ?? null : null,
        savedAt: Date.now()
      }
      applySnapshot(snapshot)
      await setTodaySnapshot(snapshot)
      await setCachedDashboard(dashboard)
      if (weak) await setCachedWeakness(weak)
      setError(null)
    } catch (refreshError: unknown) {
      const message = refreshError instanceof Error ? refreshError.message : "Could not refresh your command center."
      setError(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [applySnapshot, recallWindowDays])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const snap = await getTodaySnapshot()
      if (mounted && snap?.schemaVersion === TODAY_SNAPSHOT_VERSION) applySnapshot(snap)
      if (mounted) loadLocalLogs()
      if (mounted) void refresh()
    }
    void init()

    const messageListener = (event: { action?: string }) => {
      if (event.action === "dashboard_refresh") {
        loadLocalLogs()
        void refresh()
      }
    }
    const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "local" && changes["algovault.logs.index"]) {
        loadLocalLogs()
      }
    }
    chrome.runtime.onMessage.addListener(messageListener)
    chrome.storage.onChanged.addListener(storageListener)
    return () => {
      mounted = false
      chrome.runtime.onMessage.removeListener(messageListener)
      chrome.storage.onChanged.removeListener(storageListener)
    }
  }, [applySnapshot, loadLocalLogs, refresh])

  useEffect(() => {
    let mounted = true
    void getTodayRecommendationSelection().then((selection) => {
      if (mounted) setRecommendationSelection(selection)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    chrome.storage.local.get(RECALL_WINDOW_KEY, (result) => {
      const storedDays = Number(result[RECALL_WINDOW_KEY])
      if (Number.isInteger(storedDays) && storedDays >= 1 && storedDays <= 3650) {
        setRecallWindowDays(storedDays)
        setRecallDaysInput(String(storedDays))
      }
    })
  }, [])

  const activeSeconds = clocks.activeSeconds
  const sessionIsRunning = clocks.isRunning
  const sessionIsPaused = clocks.isPaused
  const today = dateKey(new Date())

  const activeReview = queue[0] ?? null
  const practiceRecommendations = useMemo(
    () => (weakness?.recommendations ?? []).filter((problem) => !solved.has(problem.titleSlug)),
    [solved, weakness?.recommendations]
  )
  const selectedRecommendation = useMemo<WeaknessRecommendation | null>(() => {
    return practiceRecommendations.find((problem) => problem.titleSlug === recommendationSelection.practiceSlug)
      ?? practiceRecommendations[0]
      ?? null
  }, [practiceRecommendations, recommendationSelection.practiceSlug])
  const selectedWeakTag = useMemo(() => {
    if (!selectedRecommendation?.tag) return null
    return weakness?.weakTags?.find((tag) => tag.tag === selectedRecommendation.tag) ?? null
  }, [selectedRecommendation?.tag, weakness?.weakTags])
  const studyContinuation = useMemo(
    () => selectStudyProblem(solved, recommendationSelection.practiceSlug),
    [solved, recommendationSelection.practiceSlug]
  )

  const primaryAction = useMemo<PrimaryAction>(() => {
    if (activeReview) {
      const interval = Math.max(1, Math.round(activeReview.intervalDays ?? 1))
      return {
        kind: "review",
        eyebrow: "Memory recall",
        title: activeReview.title,
        titleSlug: activeReview.titleSlug,
        explanation: `Due after ${interval} day${interval === 1 ? "" : "s"}. Recall the pattern and invariant before opening the problem.`,
        expectedMinutes: 5,
        actionLabel: "Start recall",
        badges: [
          { label: "Review due", tone: "amber" },
          { label: activeReview.reviewCount ? `${activeReview.reviewCount} prior reviews` : "First review", tone: "zinc" }
        ]
      }
    }
    if (selectedRecommendation) {
      const level = selectedWeakTag?.evidenceLevel
      const isPremium = KNOWN_PREMIUM_SLUGS.has(selectedRecommendation.titleSlug)
      return {
        kind: "practice",
        eyebrow: "Target practice",
        title: selectedRecommendation.title,
        titleSlug: selectedRecommendation.titleSlug,
        explanation: selectedRecommendation.tag
          ? `A focused practice opportunity in ${selectedRecommendation.tag}. Use this as evidence-building, not a verdict about your ability.`
          : "A recommended problem from your available practice history.",
        expectedMinutes: 30,
        actionLabel: "Open problem",
        badges: [
          { label: selectedRecommendation.tag ?? "Targeted practice", tone: "blue" },
          { label: evidenceLabel(level), tone: evidenceTone(level) },
          ...(isPremium ? [{ label: "🔒 LeetCode Premium", tone: "amber" as const }] : []),
          ...(selectedWeakTag?.totalAttempted ? [{ label: `${selectedWeakTag.totalAttempted} tagged attempts`, tone: "zinc" as const }] : []),
          ...(selectedRecommendation.actualRating ? [{ label: `Rating ${Math.round(selectedRecommendation.actualRating)}`, tone: "zinc" as const }] : [])
        ]
      }
    }
    if (studyContinuation) {
      const isPremium = KNOWN_PREMIUM_SLUGS.has(studyContinuation.problem.slug)
      return {
        kind: "track",
        eyebrow: "Continue your track",
        title: studyContinuation.problem.title,
        titleSlug: studyContinuation.problem.slug,
        explanation: `Continue ${studyContinuation.list.name} with one focused problem. Consistency beats finding the perfect metric.`,
        expectedMinutes: 25,
        actionLabel: "Continue track",
        badges: [
          { label: studyContinuation.list.name, tone: "blue" },
          { label: studyContinuation.problem.topic, tone: "zinc" },
          ...(isPremium ? [{ label: "🔒 LeetCode Premium", tone: "amber" as const }] : [])
        ]
      }
    }
    return {
      kind: "baseline",
      eyebrow: "Build your baseline",
      title: "Choose a practice track",
      explanation: "Sync a little history or choose a study track. AlgoVault will earn the right to personalise recommendations from your evidence.",
      actionLabel: "Choose a track",
      badges: [{ label: "No personalised data yet", tone: "zinc" }]
    }
  }, [activeReview, selectedRecommendation, selectedWeakTag?.evidenceLevel, studyContinuation])

  const zerotracMap = useMemo(() => buildZerotracRatingMap(zerotrac), [zerotrac])

  const stretchProblem = useMemo(() => {
    const baseRating = ranking?.rating ?? data?.virtualRating ?? null
    const hasEvidence = (data?.totalSolved ?? 0) >= MIN_SOLVES_FOR_STRETCH
    if (!baseRating || !hasEvidence) return null
    const low = Math.round(baseRating + 50)
    const high = Math.round(baseRating + 100)
    const targetRating = baseRating + 75
    const candidates = zerotrac
      .filter((problem) => !solved.has(problem.TitleSlug) && problem.Rating >= low && problem.Rating <= high)
      .sort((left, right) => Math.abs(left.Rating - targetRating) - Math.abs(right.Rating - targetRating) || left.TitleSlug.localeCompare(right.TitleSlug))
    if (!candidates.length) return null
    const chosen = candidates.find((problem) => problem.TitleSlug === recommendationSelection.stretchSlug) ?? candidates[0]
    return { problem: chosen, low, high, candidateCount: candidates.length }
  }, [data?.totalSolved, data?.virtualRating, ranking?.rating, recommendationSelection.stretchSlug, solved, zerotrac])

  const shufflePractice = () => {
    const candidateSlugs = practiceRecommendations.length
      ? practiceRecommendations.map((problem) => problem.titleSlug)
      : getStudyCandidates(solved).map((candidate) => candidate.problem.slug)
    if (candidateSlugs.length < 2) return
    const currentIndex = candidateSlugs.indexOf(selectedRecommendation?.titleSlug ?? studyContinuation?.problem.slug ?? "")
    updateRecommendationSelection({ practiceSlug: candidateSlugs[(Math.max(currentIndex, -1) + 1) % candidateSlugs.length] })
  }

  const shuffleStretch = () => {
    if (!stretchProblem) return
    const baseRating = ranking?.rating ?? data?.virtualRating ?? null
    if (!baseRating) return
    const candidates = zerotrac
      .filter((problem) => !solved.has(problem.TitleSlug) && problem.Rating >= baseRating + 50 && problem.Rating <= baseRating + 100)
      .sort((left, right) => Math.abs(left.Rating - (baseRating + 75)) - Math.abs(right.Rating - (baseRating + 75)) || left.TitleSlug.localeCompare(right.TitleSlug))
    if (candidates.length < 2) return
    const currentIndex = candidates.findIndex((problem) => problem.TitleSlug === stretchProblem.problem.TitleSlug)
    updateRecommendationSelection({ stretchSlug: candidates[(Math.max(currentIndex, -1) + 1) % candidates.length].TitleSlug })
  }

  const targetPracticeSlug = selectedRecommendation?.titleSlug ?? studyContinuation?.problem.slug
  const targetSolved = Boolean(targetPracticeSlug && solved.has(targetPracticeSlug))
  const coreComplete = Number(Boolean(activeReview) && reviewedToday) + Number(Boolean(targetPracticeSlug) && targetSolved)
  const coreAvailable = Number(Boolean(activeReview)) + Number(Boolean(targetPracticeSlug))

  const questSteps = useMemo<QuestStep[]>(() => [
    {
      id: "review",
      status: reviewedToday ? "complete" : activeReview ? "available" : "unavailable",
      title: activeReview?.title ?? "No review due",
      description: activeReview
        ? "Recall the pattern and invariant before checking your old solution."
        : "Your due review queue is clear.",
      titleSlug: activeReview?.titleSlug,
      actionLabel: activeReview ? "Recall" : undefined,
      badges: activeReview ? [{ label: "Review due", tone: "amber" }] : undefined
    },
    {
      id: "practice",
      status: targetSolved ? "complete" : selectedRecommendation || studyContinuation ? "available" : "unavailable",
      title: selectedRecommendation?.title ?? studyContinuation?.problem.title ?? "Choose a practice path",
      description: targetSolved
        ? "Your selected practice problem is solved. Capture what changed your approach."
        : selectedRecommendation?.tag
          ? `${selectedRecommendation.tag} · ${evidenceLabel(selectedWeakTag?.evidenceLevel).replace("Evidence: ", "")}`
          : studyContinuation
            ? `Continue ${studyContinuation.list.name} in ${studyContinuation.problem.topic}.`
            : "Sync history or choose a study list to get a next action.",
      titleSlug: selectedRecommendation?.titleSlug ?? studyContinuation?.problem.slug,
      actionLabel: selectedRecommendation || studyContinuation ? "Practice" : undefined,
      badges: selectedRecommendation?.actualRating
        ? [{ label: `Rating ${Math.round(selectedRecommendation.actualRating)}`, tone: "zinc" }]
        : undefined
    },
    {
      id: "stretch",
      status: stretchProblem ? "available" : "unavailable",
      title: stretchProblem?.problem.Title ?? "Stretch is optional",
      description: stretchProblem
        ? `A calibrated +50–100 stretch (${stretchProblem.low}–${stretchProblem.high}). Attempting is success; solving is not required.`
        : (data?.totalSolved ?? 0) < MIN_SOLVES_FOR_STRETCH
          ? `Stretch unlocks after ${MIN_SOLVES_FOR_STRETCH} solved problems with rating evidence.`
          : "No calibrated stretch candidate is available today.",
      titleSlug: stretchProblem?.problem.TitleSlug,
      actionLabel: stretchProblem ? "Attempt" : undefined,
      badges: stretchProblem ? [{ label: `Rating ${Math.round(stretchProblem.problem.Rating)}`, tone: "zinc" }] : undefined
    }
  ], [activeReview, data?.totalSolved, reviewedToday, selectedRecommendation, selectedWeakTag?.evidenceLevel, stretchProblem, studyContinuation, targetSolved])

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index): DayActivity => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      return {
        key: dateKey(date),
        label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
        dateLabel: date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        focusSeconds: 0,
        solves: 0,
        sessions: 0
      }
    })
    const byDay = new Map(days.map((day) => [day.key, day]))
    const daySolvedSlugs = new Map<string, Set<string>>()
    for (const day of days) {
      daySolvedSlugs.set(day.key, new Set<string>())
    }

    const activeSessionSlug = apseSession?.slug
    for (const session of sessions) {
      if (activeSessionSlug && (String(session.id) === activeSessionSlug || (session as any).slug === activeSessionSlug)) continue
      const started = parseDate(session.startedAt)
      if (!started) continue
      const bucket = byDay.get(dateKey(started))
      if (!bucket) continue
      bucket.focusSeconds += Math.max(0, session.focusSeconds ?? 0)
      bucket.sessions += 1
    }

    for (const log of localLogs) {
      if (!log.ts) continue
      // Skip log ONLY if it represents the exact live active session (live clocks adds it below)
      if (apseSession && log.sessionId && log.sessionId === apseSession.id) {
        continue
      }
      const date = new Date(log.ts)
      const key = dateKey(date)
      const bucket = byDay.get(key)
      if (!bucket) continue
      const logSecs = Number(log.actSecs ?? log.activeSecs ?? log.focusSeconds ?? 0)
      bucket.focusSeconds += Math.max(0, logSecs)
      bucket.sessions += 1
      if ((log.solved || log.isSolved) && log.slug) {
        daySolvedSlugs.get(key)?.add(log.slug)
      }
    }

    if (apseSession && clocks.activeSeconds > 0) {
      const started = new Date(apseSession.tElapsedStart || Date.now())
      const key = dateKey(started) ?? today
      const bucket = byDay.get(key) ?? byDay.get(today)
      if (bucket) {
        bucket.focusSeconds += clocks.activeSeconds
        bucket.sessions += 1
        if (clocks.isSolved && apseSession.slug) {
          daySolvedSlugs.get(key)?.add(apseSession.slug)
        }
      }
    }

    for (const solve of data?.recentSolves ?? []) {
      const solvedAt = parseDate(solve.solvedAt)
      if (!solvedAt) continue
      const key = dateKey(solvedAt)
      if (solve.titleSlug) {
        daySolvedSlugs.get(key)?.add(solve.titleSlug)
      }
    }

    for (const day of days) {
      const solvedSet = daySolvedSlugs.get(day.key)
      day.solves = solvedSet ? solvedSet.size : 0
    }

    const todayActivity = byDay.get(today)
    if (todayActivity && data?.todaySolves) {
      todayActivity.solves = Math.max(todayActivity.solves, data.todaySolves)
    }

    const weekFocusSeconds = days.reduce((sum, day) => sum + day.focusSeconds, 0)
    const weekSolves = days.reduce((sum, day) => sum + day.solves, 0)
    const weekSessions = days.reduce((sum, day) => sum + day.sessions, 0)
    const strongestDay = [...days].sort((a, b) => b.focusSeconds - a.focusSeconds)[0]
    return { days, todayActivity, weekFocusSeconds, weekSolves, weekSessions, strongestDay }
  }, [apseSession, clocks.activeSeconds, clocks.isSolved, data?.recentSolves, data?.todaySolves, localLogs, sessions, today])

  const primaryActionHref = primaryAction.titleSlug ? `https://leetcode.com/problems/${primaryAction.titleSlug}/` : undefined
  const maxFocus = Math.max(1, ...activity.days.map((day) => day.focusSeconds))

  const openTrackPicker = () => {
    chrome.storage.local.set({ "algovault.requestedTab": "Lists" })
  }

  const submitReview = async (quality: number) => {
    if (!activeReview) return
    setReviewSubmitting(true)
    try {
      await reviewRevisionCard(activeReview.id, quality)
      setReviewedToday(true)
      setReviewOpen(false)
      await refresh()
    } catch (reviewError: unknown) {
      setError(reviewError instanceof Error ? reviewError.message : "Your review was not saved. Please try again.")
    } finally {
      setReviewSubmitting(false)
    }
  }

  const updateRecallWindow = (days: number | null) => {
    setRecallWindowDays(days)
    setReviewedToday(false)
    if (days) setRecallDaysInput(String(days))
    chrome.storage.local.set({ [RECALL_WINDOW_KEY]: days })
    void refresh(days)
  }

  const applyCustomRecallWindow = () => {
    const days = Number(recallDaysInput)
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      setError("Enter a recall window from 1 to 3,650 days.")
      return
    }
    updateRecallWindow(days)
  }

  const stopAllTimers = async () => {
    setSessionActionPending(true)
    try {
      const stopped = await stopAllRunningSessions()
      setSessionNotice(stopped ? `Cleared ${stopped} timer${stopped === 1 ? "" : "s"} across all tabs. Saved practice logs were kept.` : "No live, tab-paused, or completed timers were found.")
    } catch (sessionError: unknown) {
      setError(sessionError instanceof Error ? sessionError.message : "Could not stop active timers.")
    } finally {
      setSessionActionPending(false)
    }
  }

  if (loading && !data) {
    return <div className="space-y-3 px-1 pt-1"><Skeleton className="h-52 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
  }

  if (!data) {
    return (
      <Card className="mx-1 border-zinc-800/80 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/70 text-zinc-300"><WifiOff size={17} /></div>
        <h2 className="mt-3 text-sm font-semibold text-zinc-100">Your command center is waiting for data.</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">Connect LeetCode and run your first sync. We’ll keep the next action simple once there is evidence to use.</p>
        <button type="button" onClick={() => void refresh()} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700"><RefreshCw size={12} /> Retry</button>
        {error && <p className="mt-3 text-[10px] text-rose-400">{error}</p>}
      </Card>
    )
  }

  return (
    <main className="mx-auto max-w-2xl space-y-3.5 px-1 pb-7 pt-1 font-sans">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-[#0d0d0f]">
        <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: "radial-gradient(ellipse 72% 60% at 95% 0%, rgba(251,191,36,0.11), transparent), radial-gradient(ellipse 50% 60% at 0% 100%, rgba(14,165,233,0.06), transparent)" }} />
        <div className="relative px-4 pb-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-amber-400/80">Today · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[8px] font-mono ${refreshing ? "text-sky-400" : isStale(lastSync ?? snapshotSavedAt) ? "text-amber-400" : "text-zinc-500"}`}>
                {refreshing && <RefreshCw size={10} className="animate-spin" />}
                {isStale(lastSync ?? snapshotSavedAt) && !refreshing && <Clock3 size={10} />}
                {refreshing ? "Refreshing" : relativeTime(lastSync ?? snapshotSavedAt)}
              </span>
              <button type="button" onClick={() => void refresh()} className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200" aria-label="Refresh Today"><RefreshCw size={13} /></button>
            </div>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-amber-400/80">{primaryAction.eyebrow}</p>
              <h1 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-zinc-50 sm:text-[24px]">{primaryAction.title}</h1>
              <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-zinc-400">{primaryAction.explanation}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {primaryAction.badges.map((badge) => <Badge key={badge.label} badge={badge} />)}
                {primaryAction.expectedMinutes && <Badge badge={{ label: `~${primaryAction.expectedMinutes} min`, tone: "zinc" }} />}
              </div>
            </div>
            {primaryAction.kind === "review" ? (
              <ActionButton onClick={() => setReviewOpen(true)} tone="amber">{primaryAction.actionLabel}</ActionButton>
            ) : primaryActionHref ? (
              <ActionButton href={primaryActionHref} tone="blue">{primaryAction.actionLabel}</ActionButton>
            ) : (
              <ActionButton onClick={openTrackPicker}>{primaryAction.actionLabel}</ActionButton>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-zinc-800/60 border-t border-zinc-800/60 pt-3">
            <div className="pr-3"><span className="block text-[18px] font-bold font-mono tabular-nums text-zinc-100">{data.todaySolves}</span><span className="text-[8px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-600">solved today</span></div>
            <div className="px-3"><span className="block text-[18px] font-bold font-mono tabular-nums text-zinc-100">{formatCompactDuration(activity.todayActivity?.focusSeconds ?? 0)}</span><span className="text-[8px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-600">active time</span></div>
            <div className="pl-3"><span className="block text-[18px] font-bold font-mono tabular-nums text-zinc-100">{data.currentStreak}d</span><span className="text-[8px] font-bold font-mono uppercase tracking-[0.14em] text-zinc-600">solve streak</span></div>
          </div>
        </div>
      </section>

      <section className="relative flex flex-col rounded-2xl border border-zinc-800 bg-[#0d0d0d] font-mono shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${clocks.isSolved ? "bg-emerald-400" : sessionIsRunning ? "bg-emerald-400 animate-pulse" : sessionIsPaused ? "bg-amber-400" : "bg-zinc-700"}`} />
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-zinc-300">{apseSession ? `PROBLEM: ${apseSession.slug}` : "PRACTICE ENGINE IDLE"}</p>
              <p className="text-[9px] text-zinc-600">{clocks.isSolved ? "SOLVED · Recorded in Logs" : sessionIsRunning ? "APSE v2 Active Focus" : sessionIsPaused ? `APSE v2 Paused (${apseSession?.pr || "MANUAL"})` : "Open a problem to auto-start"}</p>
            </div>
          </div>
          {apseSession ? (
            <div className="flex items-center gap-2">
              <span className={`mr-1 font-mono text-sm font-bold tabular-nums ${clocks.isSolved ? "text-emerald-400" : sessionIsPaused ? "text-amber-300" : "text-emerald-400"}`}>{Math.floor(activeSeconds / 60).toString().padStart(2, "0")}:{(activeSeconds % 60).toString().padStart(2, "0")}</span>
              
              {!clocks.isSolved && (
                <>
                  <button type="button" onClick={() => sessionIsPaused ? resumeSession() : pauseSession("MANUAL")} className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700/80 px-2 text-[9px] font-bold font-mono uppercase tracking-wide text-zinc-300 transition hover:border-zinc-500 hover:text-white" aria-label={sessionIsPaused ? "Resume focus session" : "Pause focus session"}>{sessionIsPaused ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}{sessionIsPaused ? "Resume" : "Pause"}</button>
                  <button type="button" onClick={() => logTimeSession()} className="inline-flex h-8 items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 text-[9px] font-bold font-mono uppercase tracking-wide text-sky-400 transition hover:bg-sky-500/20 hover:text-sky-300" title="Push current focus time to practice log"><Clock size={10} /> Log Time</button>
                  <button type="button" onClick={() => finishSession()} className="inline-flex h-8 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 text-[9px] font-bold font-mono uppercase tracking-wide text-emerald-400 transition hover:bg-emerald-500/20 hover:text-emerald-300" title="Mark as Solved & Log"><Check size={10} /> Finish</button>
                </>
              )}
              
              <button type="button" onClick={() => resetSession()} className="inline-flex h-8 items-center gap-1 rounded-md border border-rose-900/60 px-2 text-[9px] font-bold font-mono uppercase tracking-wide text-rose-300 transition hover:border-rose-700 hover:text-rose-200" aria-label="End focus session"><Square size={9} fill="currentColor" /> {clocks.isSolved ? "Clear" : "Reset"}</button>
            </div>
          ) : (
            <span className="text-[9px] font-mono text-zinc-600">No live timer</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-zinc-800/60 px-4 py-2.5 sm:px-5">
          <p className="text-[9px] leading-relaxed text-zinc-600">Clears live, tab-paused, and completed timers across every tab. Saved practice logs stay intact.</p>
          <button type="button" disabled={sessionActionPending} onClick={() => void stopAllTimers()} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-rose-900/60 bg-rose-950/20 px-2 text-[9px] font-bold font-mono uppercase tracking-wide text-rose-300 transition hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50" title="Clear timers from every tab"><Square size={9} fill="currentColor" /> {sessionActionPending ? "Clearing" : "Clear all timers"}</button>
        </div>
        {sessionNotice && <p className="border-t border-emerald-900/30 bg-emerald-950/10 px-4 py-2 text-[9px] font-mono text-emerald-300 sm:px-5">{sessionNotice}</p>}
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-[#111008] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold font-mono uppercase tracking-[0.16em] text-amber-300">Recall window</p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">Show due recalls from all time, or only problems accepted within your chosen number of days.</p>
          </div>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2 py-1 text-[8px] font-mono font-semibold text-amber-200">{recallWindowDays ? `Last ${recallWindowDays} days` : "All time"} · {queue.length} due</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {[10, 30, 50].map((days) => <button key={days} type="button" onClick={() => updateRecallWindow(days)} className={`rounded-md border px-2 py-1.5 text-[9px] font-mono font-semibold transition ${recallWindowDays === days ? "border-amber-300/60 bg-amber-400 text-zinc-950" : "border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:border-amber-400/40 hover:text-amber-200"}`}>Last {days}d</button>)}
          <button type="button" onClick={() => updateRecallWindow(null)} className={`rounded-md border px-2 py-1.5 text-[9px] font-mono font-semibold transition ${recallWindowDays === null ? "border-amber-300/60 bg-amber-400 text-zinc-950" : "border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:border-amber-400/40 hover:text-amber-200"}`}>All time</button>
          <div className="ml-1 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950/50 p-0.5">
            <input type="number" min="1" max="3650" value={recallDaysInput} onChange={(event) => setRecallDaysInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyCustomRecallWindow() }} className="w-16 bg-transparent px-1.5 py-1 text-[9px] font-mono text-zinc-200 outline-none" aria-label="Custom recall window in days" />
            <button type="button" onClick={applyCustomRecallWindow} className="rounded bg-zinc-800 px-2 py-1 text-[9px] font-mono font-semibold text-zinc-200 transition hover:bg-zinc-700">Apply days</button>
          </div>
        </div>
      </section>

      {reviewOpen && activeReview && (
        <section className="rounded-2xl border border-amber-400/25 bg-[#15120b] p-4 sm:p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold font-mono uppercase tracking-[0.16em] text-amber-300">Active recall</p><h2 className="mt-1 text-[15px] font-semibold text-zinc-100">Before opening {activeReview.title}</h2></div><button type="button" onClick={() => setReviewOpen(false)} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200" aria-label="Close recall prompt">×</button></div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">Name the pattern, state its invariant, and identify one boundary case. Then open the problem only to check your recall.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2"><ActionButton href={`https://leetcode.com/problems/${activeReview.titleSlug}/`} tone="amber">Open for recall</ActionButton><span className="text-[9px] text-zinc-500">When you are ready, log the quality of your recall below.</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[[1, "Forgot"], [2, "Hard"], [4, "Good"], [5, "Easy"]].map(([quality, label]) => <button key={label as string} type="button" disabled={reviewSubmitting} onClick={() => void submitReview(quality as number)} className="rounded-lg border border-zinc-800 bg-black/30 px-2 py-2 text-[10px] font-mono font-semibold text-zinc-300 transition hover:border-amber-400/45 hover:text-amber-200 disabled:opacity-40">{label as string}</button>)}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0d0d0f]">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3 sm:px-5"><div><p className="text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-zinc-500">Today’s practice sequence</p><p className="mt-0.5 text-[10px] text-zinc-600">Two core actions, then an optional stretch.</p></div><span className="text-[10px] font-mono font-bold tabular-nums text-zinc-400">{coreAvailable ? `${coreComplete}/${coreAvailable}` : "Ready"}</span></div>
        <div className="divide-y divide-zinc-800/50">
          {questSteps.map((step, index) => {
            const href = step.titleSlug ? `https://leetcode.com/problems/${step.titleSlug}/` : undefined
            const shuffleAvailable = step.id === "practice"
              ? (practiceRecommendations.length || getStudyCandidates(solved).length) > 1
              : step.id === "stretch" && (stretchProblem?.candidateCount ?? 0) > 1
            return <article key={step.id} className={`flex gap-3 p-4 sm:p-5 ${step.status === "complete" ? "bg-emerald-500/[0.025]" : ""}`}>
              <div className="flex flex-col items-center"><QuestIcon id={step.id} status={step.status} />{index < questSteps.length - 1 && <div className="mt-2 h-full min-h-5 w-px bg-zinc-800/70" />}</div>
              <div className="min-w-0 flex-1 pb-1"><div className="flex flex-wrap items-center gap-2"><p className="text-[8px] font-bold font-mono uppercase tracking-[0.16em] text-zinc-500">{index + 1}. {step.id === "review" ? "Memory recall" : step.id === "practice" ? "Target practice" : "Optional stretch"}</p>{step.status === "complete" && <span className="text-[8px] font-mono font-bold uppercase text-emerald-400">complete</span>}</div><h2 className={`mt-1 text-[13px] font-semibold ${step.status === "unavailable" ? "text-zinc-500" : "text-zinc-100"}`}>{step.title}</h2><p className="mt-1 text-[10px] leading-relaxed text-zinc-500">{step.description}</p>{step.badges && <div className="mt-2 flex flex-wrap gap-1.5">{step.badges.map((badge) => <Badge key={badge.label} badge={badge} />)}</div>}</div>
              {step.status === "available" && (
                step.id === "review" ? (
                  <button type="button" onClick={() => setReviewOpen(true)} className="inline-flex h-8 shrink-0 items-center gap-1 self-center rounded-md border border-amber-400/40 bg-amber-400 px-2.5 text-[9px] font-bold text-zinc-950 hover:bg-amber-300">Recall <ChevronRight size={11} /></button>
                ) : href ? (
                  <div className="flex flex-col items-end gap-1.5 self-center shrink-0">
                    <ActionButton href={href} tone={step.id === "practice" ? "blue" : "zinc"}>{step.actionLabel ?? "Open"}</ActionButton>
                    <button
                      type="button"
                      disabled={!shuffleAvailable}
                      onClick={() => {
                        if (step.id === "practice") shufflePractice()
                        else if (step.id === "stretch") shuffleStretch()
                      }}
                      className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-lg border border-sky-500/30 bg-gradient-to-r from-sky-950/70 via-zinc-900/90 to-blue-950/70 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all duration-200 hover:scale-[1.04] hover:border-sky-400/60 hover:text-white hover:shadow-[0_0_18px_rgba(56,189,248,0.35)] active:scale-95 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900/40 disabled:text-zinc-600 disabled:shadow-none disabled:hover:scale-100"
                      title={shuffleAvailable ? "Choose another recommendation. Your choice stays after refresh." : "No other calibrated recommendation is available yet."}
                    >
                      <Shuffle size={10} className="text-sky-400 transition-transform duration-300 group-hover:rotate-180" />
                      <span>Shuffle</span>
                      <Sparkles size={9} className="text-amber-400 animate-pulse" />
                    </button>
                  </div>
                ) : null
              )}
            </article>
          })}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-zinc-800/70 bg-[#0d0d0f] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-zinc-500">Your practice time</p><p className="mt-1 text-[11px] text-zinc-400">{formatDuration(activity.weekFocusSeconds)} active this week · {activity.weekSolves} solved</p></div><Activity size={16} className="text-amber-400/80" /></div>
          <div className="mt-5 flex h-[106px] items-end justify-between gap-1.5">
            {activity.days.map((day) => {
              const isToday = day.key === today
              const isBestDay = day.focusSeconds > 0 && day.key === activity.strongestDay?.key
              const isHovered = hoveredActivityKey === day.key
              const height = day.focusSeconds ? Math.max(8, (day.focusSeconds / maxFocus) * 70) : 3
              const label = `${day.dateLabel}: ${formatDuration(day.focusSeconds)} active, ${day.solves} solve${day.solves === 1 ? "" : "s"}, ${day.sessions} session${day.sessions === 1 ? "" : "s"}`
              return <button
                key={day.key}
                type="button"
                onMouseEnter={() => setHoveredActivityKey(day.key)}
                onMouseLeave={() => setHoveredActivityKey(null)}
                onFocus={() => setHoveredActivityKey(day.key)}
                onBlur={() => setHoveredActivityKey(null)}
                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-amber-400/80"
                aria-label={label}
              >
                {isHovered && (
                  <div role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-lg border border-zinc-700/80 bg-[#17171b] p-2.5 text-left shadow-xl shadow-black/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold text-zinc-100">{isToday ? "Today" : day.dateLabel}</span>
                      {isBestDay && <span className="rounded bg-amber-400/10 px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wide text-amber-300">Best day</span>}
                    </div>
                    <p className="mt-1.5 text-[12px] font-semibold tabular-nums text-zinc-100">{formatDuration(day.focusSeconds)} <span className="text-[9px] font-normal text-zinc-500">active practice</span></p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-zinc-800 pt-2 text-[8px] font-mono">
                      <span className="text-zinc-400"><b className="text-emerald-400">{day.solves}</b> solved</span>
                      <span className="text-zinc-400"><b className="text-sky-400">{day.sessions}</b> session{day.sessions === 1 ? "" : "s"}</span>
                    </div>
                    {isToday && <p className="mt-2 text-[8px] leading-snug text-zinc-500">Includes live focused time while this problem is open.</p>}
                  </div>
                )}
                <span className={`text-[8px] font-mono tabular-nums transition-opacity ${day.focusSeconds ? "text-zinc-400" : "text-transparent"}`}>{formatCompactDuration(day.focusSeconds)}</span>
                <div className={`w-full rounded-sm transition-all duration-300 group-hover:brightness-125 ${isToday ? "bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.22)]" : day.focusSeconds ? "bg-zinc-600" : "bg-zinc-800/60"}`} style={{ height: `${height}px`, maxWidth: 32 }} />
                <span className={`text-[8px] font-mono ${isToday ? "font-bold text-amber-300" : "text-zinc-600"}`}>{day.label}</span>
              </button>
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-zinc-800/50 pt-3 text-[9px] font-mono text-zinc-500"><span>{activity.weekSessions} focused sessions</span><span>Best day: {activity.strongestDay?.focusSeconds ? `${activity.strongestDay.dateLabel} · ${formatCompactDuration(activity.strongestDay.focusSeconds)}` : "start your first"}</span></div>
        </div>

        <div className="rounded-2xl border border-zinc-800/70 bg-[#0d0d0f] p-4 sm:p-5">
          <p className="text-[9px] font-bold font-mono uppercase tracking-[0.18em] text-zinc-500">What you did</p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400"><Check size={13} /></div><div><p className="text-[11px] font-medium text-zinc-200">{data.todaySolves} problem{data.todaySolves === 1 ? "" : "s"} solved today</p><p className="text-[9px] text-zinc-600">{data.todaySubmissions} submission{data.todaySubmissions === 1 ? "" : "s"} recorded</p></div></div>
            <div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400"><Clock3 size={13} /></div><div><p className="text-[11px] font-medium text-zinc-200">{formatDuration(activity.todayActivity?.focusSeconds ?? 0)} active practice</p><p className="text-[9px] text-zinc-600">Only explicit focus sessions are counted</p></div></div>
            <div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/10 text-sky-400"><Flame size={13} /></div><div><p className="text-[11px] font-medium text-zinc-200">{data.currentStreak}-day solve streak</p><p className="text-[9px] text-zinc-600">Progress is a record, not a requirement</p></div></div>
          </div>
        </div>
      </section>

      {/* ─── WEEKLY PERFORMANCE REPORT BUTTON ────────────── */}
      <section className="pt-0.5">
        <button
          type="button"
          onClick={() => setIsWeeklyReportOpen(true)}
          className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-zinc-800/80 bg-[#0d0d0f] hover:border-[#dfa054]/40 hover:bg-zinc-900/50 transition-all duration-200 shadow-sm cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#dfa054]/10 text-[#dfa054] border border-[#dfa054]/20 group-hover:bg-[#dfa054]/20 transition-colors">
              <TrendingUp size={15} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-zinc-200 group-hover:text-zinc-100 flex items-center gap-2 font-sans">
                Weekly Performance Report
                <span className="text-[8.5px] font-mono text-[#dfa054] bg-[#dfa054]/10 border border-[#dfa054]/20 px-1.5 py-0.5 rounded">
                  7 Days
                </span>
              </div>
              <div className="text-[9.5px] font-mono text-zinc-400 mt-0.5">
                {formatDuration(activity.weekFocusSeconds)} practice · {activity.weekSolves} solved · {activity.weekSessions} sessions
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 group-hover:text-[#dfa054] transition-colors">
            <span>View Debrief</span>
            <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </section>

      {/* ─── WEEKLY REPORT MODAL ───────────────────────── */}
      <WeeklyReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
        days={activity.days}
        weekFocusSeconds={activity.weekFocusSeconds}
        weekSolves={activity.weekSolves}
        weekSessions={activity.weekSessions}
        strongestDay={activity.strongestDay}
        recentSolves={data?.recentSolves}
        localLogs={localLogs}
        zerotracMap={zerotracMap}
        zerotrac={zerotrac}
        weakness={weakness}
        username={(data as any)?.username || "Som_07"}
      />

      {error && <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-900/40 bg-rose-950/20 px-3 py-2 text-[10px] text-rose-300"><span>{error}</span><button type="button" onClick={() => void refresh()} className="shrink-0 font-semibold underline underline-offset-2">Retry</button></div>}
    </main>
  )
}
