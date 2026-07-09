import { Storage } from "@plasmohq/storage"

import { STORAGE_KEYS } from "./constants"
import type {
  ContestResult,
  DashboardData,
  HeatmapBucket,
  TagMastery,
  UserSettings,
  ZerotracProblem,
} from "./types"

const storage = new Storage({ area: "local" })

// ─── Generic Helpers ──────────────────────────────────────────────

async function getTyped<T>(key: string): Promise<T | null> {
  try {
    const data = await storage.get(key)
    return data ? (data as T) : null
  } catch {
    return null
  }
}

async function setTyped<T>(key: string, value: T): Promise<void> {
  await storage.set(key, value as unknown as string)
}

// ─── Username ─────────────────────────────────────────────────────

export async function getUsername(): Promise<string | null> {
  return getTyped<string>(STORAGE_KEYS.USERNAME)
}

export async function setUsername(username: string): Promise<void> {
  await setTyped(STORAGE_KEYS.USERNAME, username)
}

// ─── JWT Token ────────────────────────────────────────────────────

export async function getJwtToken(): Promise<string | null> {
  return getTyped<string>(STORAGE_KEYS.JWT_TOKEN)
}

export async function setJwtToken(token: string): Promise<void> {
  await setTyped(STORAGE_KEYS.JWT_TOKEN, token)
}

export async function clearJwtToken(): Promise<void> {
  await storage.remove(STORAGE_KEYS.JWT_TOKEN)
}

// ─── Zerotrac Data ────────────────────────────────────────────────

export async function getZerotracData(): Promise<ZerotracProblem[] | null> {
  return getTyped<ZerotracProblem[]>(STORAGE_KEYS.ZEROTRAC_DATA)
}

export async function setZerotracData(
  data: ZerotracProblem[]
): Promise<void> {
  await setTyped(STORAGE_KEYS.ZEROTRAC_DATA, data)
  await setTyped(STORAGE_KEYS.ZEROTRAC_LAST_FETCHED, Date.now())
}

export async function getZerotracLastFetched(): Promise<number | null> {
  return getTyped<number>(STORAGE_KEYS.ZEROTRAC_LAST_FETCHED)
}

// ─── Last Sync ────────────────────────────────────────────────────

export async function getLastSync(): Promise<number | null> {
  return getTyped<number>(STORAGE_KEYS.LAST_SYNC)
}

export async function setLastSync(timestamp: number): Promise<void> {
  await setTyped(STORAGE_KEYS.LAST_SYNC, timestamp)
}

// ─── User Settings ────────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  hideAcceptanceRate: false,
  darkMode: true,
  dailyPotdEnabled: true,
  enableSessionTracking: true,
  enableFocusAnalytics: true,
  enablePasteDetection: true,
  reviewNotifications: true,
  sessionMode: "PRACTICE",
}

export async function getUserSettings(): Promise<UserSettings> {
  const settings = await getTyped<UserSettings>(STORAGE_KEYS.USER_SETTINGS)
  return settings ?? DEFAULT_SETTINGS
}

export async function updateUserSettings(
  partial: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getUserSettings()
  const updated = { ...current, ...partial }
  await setTyped(STORAGE_KEYS.USER_SETTINGS, updated)
  return updated
}

// ─── Cached Dashboard ─────────────────────────────────────────────

export async function getCachedDashboard(): Promise<DashboardData | null> {
  return getTyped<DashboardData>(STORAGE_KEYS.CACHED_DASHBOARD)
}

export async function setCachedDashboard(data: DashboardData): Promise<void> {
  await setTyped(STORAGE_KEYS.CACHED_DASHBOARD, data)
}

// ─── Cached Mastery ───────────────────────────────────────────────

export async function getCachedMastery(): Promise<TagMastery[] | null> {
  return getTyped<TagMastery[]>(STORAGE_KEYS.CACHED_MASTERY)
}

export async function setCachedMastery(data: TagMastery[]): Promise<void> {
  await setTyped(STORAGE_KEYS.CACHED_MASTERY, data)
}

// ─── Cached Heatmap ───────────────────────────────────────────────

export async function getCachedHeatmap(): Promise<HeatmapBucket[] | null> {
  return getTyped<HeatmapBucket[]>(STORAGE_KEYS.CACHED_HEATMAP)
}

export async function setCachedHeatmap(data: HeatmapBucket[]): Promise<void> {
  await setTyped(STORAGE_KEYS.CACHED_HEATMAP, data)
}

// ─── Cached Contests ──────────────────────────────────────────────

export async function getCachedContests(): Promise<ContestResult[] | null> {
  return getTyped<ContestResult[]>(STORAGE_KEYS.CACHED_CONTESTS)
}

export async function setCachedContests(data: ContestResult[]): Promise<void> {
  await setTyped(STORAGE_KEYS.CACHED_CONTESTS, data)
}

// ─── Cached Weakness ──────────────────────────────────────────────

export async function getCachedWeakness(): Promise<any | null> {
  return getTyped<any>(STORAGE_KEYS.CACHED_WEAKNESS)
}

export async function setCachedWeakness(data: any): Promise<void> {
  await setTyped(STORAGE_KEYS.CACHED_WEAKNESS, data)
}

// ─── GitHub Credentials ───────────────────────────────────────────

export async function getGithubPat(): Promise<string | null> {
  return new Promise((resolve) => {
    if (chrome.storage.session) {
      chrome.storage.session.get(STORAGE_KEYS.GITHUB_PAT, (res) => {
        resolve(res[STORAGE_KEYS.GITHUB_PAT] || null)
      })
    } else {
      resolve(getTyped<string>(STORAGE_KEYS.GITHUB_PAT))
    }
  })
}

export async function setGithubPat(pat: string): Promise<void> {
  return new Promise((resolve) => {
    if (chrome.storage.session) {
      chrome.storage.session.set({ [STORAGE_KEYS.GITHUB_PAT]: pat }, () => {
        storage.remove(STORAGE_KEYS.GITHUB_PAT).then(resolve)
      })
    } else {
      setTyped(STORAGE_KEYS.GITHUB_PAT, pat).then(resolve)
    }
  })
}

export async function getGithubRepo(): Promise<string | null> {
  return getTyped<string>(STORAGE_KEYS.GITHUB_REPO)
}

export async function setGithubRepo(repo: string): Promise<void> {
  await setTyped(STORAGE_KEYS.GITHUB_REPO, repo)
}

// ─── Export the raw storage instance ──────────────────────────────

export { storage }
