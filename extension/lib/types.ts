export interface Problem {
  id?: number;
  frontendId?: number;
  title: string;
  titleSlug: string;
  difficulty?: string;
  actualRating?: number;
  tags?: string[];
  acceptanceRate?: number;
  contestSlug?: string;
  problemIndex?: string;
  isPremium?: boolean;
}

export interface PredictionResult {
  solveChance: number;
  expectedTimeMinutes: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  breakdown?: Record<string, unknown>;
  insufficientData?: boolean;
}

export interface DashboardData {
  lcRating?: number | null;
  virtualRating?: number | null;
  lastSyncTime?: string;
  totalSolved: number;
  totalSubmissions: number;
  todaySolves: number;
  todaySubmissions: number;
  sessionTimeSeconds: number;
  focusScore: number;
  tabSwitches: number;
  pasteCount: number;
  currentMode: string;
  currentStreak: number;
  recentSolves: Array<{
    title: string;
    titleSlug: string;
    difficulty?: string;
    solvedAt: string;
  }>;
  legacy?: {
    milestones: Array<{
      id: string;
      type: "submission" | "problem" | "easy" | "medium" | "hard";
      label: string;
      date: string;
      detail: string;
      slug?: string;
    }>;
    records: {
      oneShotSolves: number;
      longestStreakDays: number;
      longestBreakDays: number;
      busiestDaySubmissions: number;
      busiestDay?: string;
      bestDaySolves: number;
      bestDay?: string;
      bestMonthSolves: number;
      bestMonth?: string;
      bestYearSolves: number;
      bestYear?: string;
    };
  };
}

export interface HeatmapBucket {
  bucketRating: number;
  attempted: number;
  solved: number;
  firstAcCount: number;
  avgAttempts: number;
  avgSolveTime: number;
}

export interface TagMastery {
  tag: string;
  totalAttempted: number;
  totalSolved: number;
  firstAcCount: number;
  successRate: number;
  masteryScore: number;
  rd?: number;
  volatility?: number;
  avgSolveTime?: number | null;
  rawRating?: number;
  lastSolvedAt?: string;
}

export interface ContestResult {
  contestSlug?: string;
  contestTitle: string;
  contestDate: string;
  rank?: number;
  oldRating?: number;
  newRating?: number;
  ratingDelta?: number;
  problemsSolved?: number;
  totalProblems?: number;
  finishTimeMinutes?: number;
  predictedRating?: number | null;
  predictedDelta?: number | null;
  predictedRank?: number | null;
  status?: 'PREDICTING' | 'PREDICTED' | 'FINALIZED' | 'UNRATED';
  source?: 'LEETCODE' | 'ENTRANTHUB' | 'LEETCODE_AND_ENTRANTHUB';
  refreshedAt?: string;
}

export interface UserSettings {
  hideAcceptanceRate: boolean;
  darkMode: boolean;
  dailyPotdEnabled: boolean;
  enableSessionTracking?: boolean;
  enableFocusAnalytics?: boolean;
  enablePasteDetection?: boolean;
  reviewNotifications?: boolean;
  sessionMode?: "PRACTICE" | "CONTEST" | "REVISION" | "CASUAL";
}

export interface ZerotracProblem {
  TitleSlug: string;
  Rating: number;
  ID?: string | number;
  Title?: string;
  ContestID_en?: string;
  ContestSlug?: string;
  ProblemIndex?: string;
}

export interface ActiveSession {
  id?: number;
  mode?: string;
  startedAt?: string | number[];
  endedAt?: string | number[];
  focusSeconds?: number;
  tabSwitches?: number;
  pasteCount?: number;
  focusScore?: number;
  status?: SessionStatus;
  problemTitle?: string;
  problemSlug?: string;
  startTime?: number;
}

export interface SessionData {
  id: number;
  mode: string;
  startedAt: string;
  endedAt?: string;
  problemsAttempted: number;
  problemsSolved: number;
  focusSeconds: number;
  tabSwitches: number;
  pasteCount: number;
  focusScore: number;
}

export type SessionStatus = "idle" | "running" | "paused";

export interface LiveTimerState {
  /** Focus time observed while a user-started session is active. */
  activeFocusSeconds: number;
  /** Foreground, non-idle time observed specifically on the current problem. */
  problemFocusSeconds?: number;
  /** Wall-clock time from first opening this attempt until now (or its first AC). */
  problemElapsedSeconds?: number;
  /** Kept for existing content-script consumers; not used to reconstruct time in UI. */
  focusSeconds?: number;
  elapsedSeconds?: number;
  status: SessionStatus;
  isPaused: boolean;
  isSolved?: boolean;
  sessionId?: number;
  mode?: string;
  slug?: string;
  problemStartTime?: string;
  updatedAt: number;
}

export interface RevisionQueueItem {
  id: number;
  title: string;
  titleSlug: string;
  confidence?: number;
  intervalDays?: number;
  nextReview?: string;
  lastReviewed?: string;
  reviewCount?: number;
}

export interface WeaknessTag {
  tag: string;
  masteryScore?: number;
  rd?: number;
  evidenceLevel?: "EARLY" | "PRELIMINARY" | "MODERATE" | "STRONG" | string;
  totalAttempted?: number;
}

export interface WeaknessRecommendation {
  title: string;
  titleSlug: string;
  tag?: string;
  difficulty?: string;
  actualRating?: number;
  frontendId?: number;
  acceptanceRate?: number;
}

export interface WeaknessSnapshot {
  weakTags?: WeaknessTag[];
  recommendations?: WeaknessRecommendation[];
}

export interface UserContestRanking {
  rating?: number;
  attendedContestsCount?: number;
  globalRanking?: number;
  topPercentage?: number;
}

export type TodayActionKind = "review" | "practice" | "track" | "baseline";

export interface EvidenceBadge {
  label: string;
  tone: "amber" | "blue" | "emerald" | "zinc";
}

export interface PrimaryAction {
  kind: TodayActionKind;
  title: string;
  titleSlug?: string;
  eyebrow: string;
  explanation: string;
  expectedMinutes?: number;
  actionLabel: string;
  badges: EvidenceBadge[];
}

export interface QuestStep {
  id: "review" | "practice" | "stretch";
  status: "available" | "complete" | "unavailable";
  title: string;
  description: string;
  titleSlug?: string;
  actionLabel?: string;
  badges?: EvidenceBadge[];
}

export interface TodaySnapshot {
  schemaVersion: 2;
  data: DashboardData;
  queue: RevisionQueueItem[];
  weakness: WeaknessSnapshot | null;
  sessions: SessionData[];
  solved: string[];
  zerotrac: ZerotracProblem[];
  ranking: UserContestRanking | null;
  savedAt: number;
  /** Whether the snapshot was collected from an incomplete sync. */
  isPartial?: boolean;
}
