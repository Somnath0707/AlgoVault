import { BACKEND_URL } from "../constants"
import { getJwtToken, setJwtToken, clearJwtToken, getGithubPat } from "../storage"
import type { ActiveSession, DashboardData, PredictionResult, RevisionQueueItem, SessionData, WeaknessSnapshot } from "../types"

export const getGithubOAuthState = async (): Promise<string> => {
  const res = await fetch(`${BACKEND_URL}/api/auth/github-state`)
  if (!res.ok) throw new Error("Could not start secure GitHub authorization")
  const payload = await res.json()
  if (!payload?.state || typeof payload.state !== "string") throw new Error("Invalid OAuth state response")
  return payload.state
}

export const exchangeGithubCode = async (code: string, state: string, codeVerifier: string, redirectUri: string) => {
  const res = await fetch(`${BACKEND_URL}/api/auth/github-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state, codeVerifier, redirectUri })
  });
  if (!res.ok) {
    const errorMsg = await res.text().catch(() => "");
    throw new Error(`GitHub token exchange failed: ${res.status} ${errorMsg}`);
  }
  return res.json();
}

export const authenticateGithubToken = async (token: string) => {
  const res = await fetch(`${BACKEND_URL}/api/auth/github-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  })
  if (!res.ok) throw new Error("GitHub token verification failed")
  return res.json() as Promise<{ token: string; githubToken: string; username: string }>
}

async function trySilentRefresh(): Promise<string | null> {
  const pat = await getGithubPat()
  if (!pat) return null
  try {
    const authRes = await authenticateGithubToken(pat)
    if (authRes?.token) {
      await setJwtToken(authRes.token)
      return authRes.token
    }
  } catch {
    // Silent fail if network issue or invalid token
  }
  return null
}

// Every API request requires the JWT issued after server-verified GitHub OAuth.
async function backendFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  let jwt = await getJwtToken()
  if (!jwt) {
    jwt = await trySilentRefresh()
  }

  const headers = new Headers(init.headers)
  headers.set("Content-Type", headers.get("Content-Type") || "application/json")

  if (!jwt) throw new Error("Connect GitHub in Settings before using cloud features.")
  headers.set("Authorization", `Bearer ${jwt}`)

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (res.status === 401) {
    // Attempt one automatic token refresh and retry
    const freshJwt = await trySilentRefresh()
    if (freshJwt) {
      const retryHeaders = new Headers(init.headers)
      retryHeaders.set("Content-Type", retryHeaders.get("Content-Type") || "application/json")
      retryHeaders.set("Authorization", `Bearer ${freshJwt}`)
      
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
      try {
        const retryRes = await fetch(`${BACKEND_URL}${path}`, {
          ...init,
          headers: retryHeaders,
          signal: retryController.signal
        })
        if (retryRes.ok) {
          if (retryRes.status === 204) return null as T
          const text = await retryRes.text().catch(() => "")
          if (!text.trim()) return null as T
          return JSON.parse(text) as T
        }
      } finally {
        clearTimeout(retryTimeoutId)
      }
    }

    await clearJwtToken()
    throw new Error("Your session expired. Reconnect GitHub in Settings.")
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(body || `Backend request failed: ${res.status}`)
  }
  if (res.status === 204) return null as T
  const text = await res.text().catch(() => "")
  if (!text.trim()) return null as T
  return JSON.parse(text) as T
}

export const fetchPrediction = async (titleSlug: string): Promise<PredictionResult> => {
  return backendFetch<PredictionResult>(`/api/predict/${titleSlug}`)
}

export const fetchDashboard = async (): Promise<DashboardData> => backendFetch<DashboardData>("/api/dashboard")
export const fetchHeatmap = async (limit?: number) => {
  const query = limit && limit > 0 ? `?limit=${limit}` : ""
  return backendFetch<any[]>(`/api/heatmap${query}`)
}
export const fetchMastery = async () => backendFetch("/api/mastery")
export const recomputeMastery = async () => backendFetch("/api/mastery/recompute", { method: "POST" })
export const fetchWeakness = async (refresh = false): Promise<WeaknessSnapshot> => backendFetch<WeaknessSnapshot>(refresh ? "/api/weakness?refresh=true" : "/api/weakness")
export const fetchPotd = async () => backendFetch("/api/potd")
export const fetchRevisionQueue = async (solvedWithinDays?: number | null): Promise<RevisionQueueItem[]> => {
  const query = solvedWithinDays && solvedWithinDays > 0 ? `?solvedWithinDays=${solvedWithinDays}` : ""
  return backendFetch<RevisionQueueItem[]>(`/api/revision${query}`)
}
export const reviewRevisionCard = async (cardId: number, quality: number) => {
  return backendFetch(`/api/revision/${cardId}`, {
    method: "POST",
    body: JSON.stringify({ quality })
  })
}
export const fetchContests = async () => backendFetch("/api/contests")
export const syncLeetcode = async (payload: Record<string, any>) => {
  return backendFetch("/api/sync/leetcode", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const fetchVault = async (query?: string) => {
  const path = query ? `/api/vault?query=${encodeURIComponent(query)}` : "/api/vault"
  return backendFetch(path)
}

export const addToVault = async (payload: Record<string, any>) => {
  return backendFetch("/api/vault", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const fetchAllSessions = async (): Promise<SessionData[]> => backendFetch<SessionData[]>("/api/sessions/all")

export const sendSubmissionResult = async (payload: Record<string, unknown>): Promise<ActiveSession | null> => {
  return backendFetch<ActiveSession | null>("/api/sessions/submission", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const sendSelfReport = async (payload: Record<string, any>) => {
  return backendFetch("/api/sessions/self-report", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const fetchEntrantHubHistoryBackend = async (username: string, region: string): Promise<any> => {
  return backendFetch(`/api/entranthub/history?username=${encodeURIComponent(username)}&region=${encodeURIComponent(region)}`)
}



export const fetchEntrantHubUpcomingBackend = async (): Promise<any> => {
  return backendFetch("/api/entranthub/upcoming")
}

export const fetchZerotracRatingsBackend = async (): Promise<any> => {
  return backendFetch("/api/metadata/zerotrac-ratings")
}

export const getSettings = async () => {
  return backendFetch("/api/settings", {
    method: "GET"
  })
}

export const updateSettings = async (preferences: Record<string, any>) => {
  return backendFetch("/api/settings", {
    method: "POST",
    body: JSON.stringify(preferences)
  })
}

export const logout = async (): Promise<void> => {
  try {
    await backendFetch("/api/auth/logout", { method: "POST" })
  } finally {
    await clearJwtToken()
  }
}

export const exportUserData = async (): Promise<Blob> => {
  const data = await backendFetch("/api/export/json")
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
}
