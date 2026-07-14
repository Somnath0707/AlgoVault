import { BACKEND_URL } from "../constants"
import { getUsername, getJwtToken, clearJwtToken } from "../storage"
import type { PredictionResult } from "../types"

let cachedToken: string | null = null;
let cachedTokenUsername: string | null = null;
let cachedTokenTime: number = 0;

async function getAuthToken(username: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedTokenUsername === username && (now - cachedTokenTime < 30 * 60 * 1000)) return cachedToken;

  const res = await fetch(`${BACKEND_URL}/api/auth/extension-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error("Failed to authenticate extension");
  const data = await res.json();
  cachedToken = data.token;
  cachedTokenUsername = username;
  cachedTokenTime = Date.now();
  return data.token;
}

export const exchangeGithubCode = async (code: string) => {
  const res = await fetch(`${BACKEND_URL}/api/auth/github-exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  if (!res.ok) {
    const errorMsg = await res.text().catch(() => "");
    throw new Error(`GitHub token exchange failed: ${res.status} ${errorMsg}`);
  }
  return res.json();
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers,
    signal: controller.signal
  })
  clearTimeout(timeoutId);

  if (res.status === 401) {
    if (jwt) {
      await clearJwtToken()
    }
    // ALWAYS clear the in-memory cache on 401, regardless of where the token came from.
    // If the token was rejected, we must force a new one.
    cachedToken = null;
    cachedTokenUsername = null;
    
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
    
    const retryController = new AbortController();
    const retryTimeoutId = setTimeout(() => retryController.abort(), 15000);
    const retryRes = await fetch(`${BACKEND_URL}${path}`, { ...init, headers: headersRetry, signal: retryController.signal });
    clearTimeout(retryTimeoutId);
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
export const fetchWeakness = async (refresh = false) => backendFetch(refresh ? "/api/weakness?refresh=true" : "/api/weakness")
export const fetchPotd = async () => backendFetch("/api/potd")
export const fetchRevisionQueue = async () => backendFetch("/api/revision")
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

export const exportUserData = async (): Promise<Blob> => {
  const token = await getJwtToken()
  const headers: Record<string, string> = {}
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const response = await fetch(`${BACKEND_URL}/api/export/json`, {
    method: "GET",
    headers
  })
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`)
  }
  return response.blob()
}

