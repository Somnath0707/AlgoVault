import { BACKEND_URL } from "../constants"
import { getUsername } from "../storage"
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
  const headers = new Headers(init.headers)
  headers.set("Content-Type", headers.get("Content-Type") || "application/json")

  if (username) {
    headers.set("X-Leetcode-Username", username)
    try {
      const token = await getAuthToken(username);
      headers.set("Authorization", `Bearer ${token}`);
    } catch (e) {
      console.warn("Failed to get JWT, falling back to legacy header", e);
    }
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers
  })

  if (res.status === 401 && cachedToken) {
    // Token might be expired, clear it and retry once
    cachedToken = null;
    cachedTokenUsername = null;
    if (username) {
        const newToken = await getAuthToken(username);
        headers.set("Authorization", `Bearer ${newToken}`);
        const retryRes = await fetch(`${BACKEND_URL}${path}`, { ...init, headers });
        if (!retryRes.ok) {
            const body = await retryRes.text().catch(() => "")
            throw new Error(body || `Backend request failed: ${retryRes.status}`)
        }
        if (retryRes.status === 204) return null;
        return retryRes.json();
    }
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
