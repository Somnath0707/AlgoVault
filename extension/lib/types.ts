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
  breakdown?: Record<string, any>;
}

export interface DashboardData {
  virtualRating: number;
  lcRating: number;
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
  lastSolvedAt?: string;
}

export interface ContestResult {
  contestTitle: string;
  contestDate: string;
  rank?: number;
  oldRating?: number;
  newRating?: number;
  ratingDelta?: number;
  problemsSolved?: number;
  totalProblems?: number;
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
