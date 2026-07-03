import { BACKEND_URL } from "../constants"
import { getUsername, getJwtToken, clearJwtToken } from "../storage"
import type { PredictionResult } from "../types"

let cachedToken: string | null = null;
let cachedTokenUsername: string | null = null;

async function getAuthToken(username: string): Promise<string> {
  if (cachedToken && cachedTokenUsername === username) return cachedToken;

  const res = await fetch(`${BACKEND_URL}/api/auth/extension-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error("Failed to authenticate extension");
  const data = await res.json();
  cachedToken = data.token;
  cachedTokenUsername = username;
  return data.token;
}

async function backendFetch(path: string, init: RequestInit = {}) {
  const username = await getUsername()
  const jwt = await getJwtToken()
  const headers = new Headers(init.headers)
  headers.set("Content-Type", headers.get("Content-Type") || "application/json")

  if (jwt) {
    headers.set("Authorization", `Bearer ${jwt}`)
  } else if (username) {
    try {
      const token = await getAuthToken(username);
      headers.set("Authorization", `Bearer ${token}`);
    } catch (e) {
      console.warn("Failed to get JWT via extension-login", e);
    }
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers
  })

  if (res.status === 401) {
    if (jwt) {
      await clearJwtToken()
    } else {
      cachedToken = null;
      cachedTokenUsername = null;
    }
    
    // Retry once
    const nextJwt = await getJwtToken()
    const headersRetry = new Headers(init.headers)
    headersRetry.set("Content-Type", headersRetry.get("Content-Type") || "application/json")
    if (nextJwt) {
      headersRetry.set("Authorization", `Bearer ${nextJwt}`)
    } else if (username) {
      try {
        const token = await getAuthToken(username);
        headersRetry.set("Authorization", `Bearer ${token}`);
      } catch (e) {
        console.warn("Failed to get JWT via extension-login on retry", e);
      }
    }
    
    const retryRes = await fetch(`${BACKEND_URL}${path}`, { ...init, headers: headersRetry });
    if (!retryRes.ok) {
      const body = await retryRes.text().catch(() => "")
      throw new Error(body || `Backend request failed: ${retryRes.status}`)
    }
    if (retryRes.status === 204) return null;
    return retryRes.json();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(body || `Backend request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const fetchPrediction = async (titleSlug: string): Promise<PredictionResult> => {
  return backendFetch(`/api/predict/${titleSlug}`)
}

export const fetchDashboard = async () => backendFetch("/api/dashboard")
export const fetchHeatmap = async () => backendFetch("/api/heatmap")
export const fetchMastery = async () => backendFetch("/api/mastery")
export const fetchWeakness = async () => backendFetch("/api/weakness")
export const fetchRecommendations = async () => backendFetch("/api/recommendations")
export const fetchPotd = async () => backendFetch("/api/potd")
export const fetchRevisionQueue = async () => backendFetch("/api/revision/queue")
export const fetchContests = async () => backendFetch("/api/contests")
export const syncLeetcode = async (payload: Record<string, any>) => {
  return backendFetch("/api/sync/leetcode", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const fetchVault = async (query?: string) => {
  const path = query ? `/api/vault/search?q=${encodeURIComponent(query)}` : "/api/vault"
  return backendFetch(path)
}

export const addToVault = async (payload: Record<string, any>) => {
  return backendFetch("/api/vault", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const startSession = async (mode = "PRACTICE") => {
  return backendFetch("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ mode })
  })
}

export const fetchCurrentSession = async () => backendFetch("/api/sessions/current")

export const fetchAllSessions = async () => backendFetch("/api/sessions/all")

export const sendSessionEvent = async (payload: Record<string, any>) => {
  return backendFetch("/api/sessions/event", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const sendSessionHeartbeat = async (payload: Record<string, any>) => {
  return backendFetch("/api/sessions/heartbeat", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export const sendSubmissionResult = async (payload: Record<string, any>) => {
  return backendFetch("/api/sessions/submission", {
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

export const endSession = async () => {
  return backendFetch("/api/sessions/end", {
    method: "POST"
  })
}

export const fetchEntrantHubHistoryBackend = async (username: string, region: string): Promise<any> => {
  return backendFetch(`/api/entranthub/history?username=${encodeURIComponent(username)}&region=${encodeURIComponent(region)}`)
}

export const fetchEntrantHubRankingPredictionBackend = async (contestSlug: string, username: string): Promise<any> => {
  return backendFetch(`/api/entranthub/ranking?contestSlug=${encodeURIComponent(contestSlug)}&username=${encodeURIComponent(username)}`)
}

export const fetchEntrantHubUpcomingBackend = async (): Promise<any> => {
  return backendFetch("/api/entranthub/upcoming")
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

export const exportUserData = async (): Promise<Blob> => {
  const token = await getJwtToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const response = await fetch(`${BACKEND_URL}/api/export`, {
    method: "GET",
    headers
  })
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`)
  }
  return response.blob()
}

