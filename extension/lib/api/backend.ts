import { BACKEND_URL } from "../constants"
import { getUsername } from "../storage"
import type { PredictionResult } from "../types"

async function backendFetch(path: string, init: RequestInit = {}) {
  const username = await getUsername()
  const headers = new Headers(init.headers)
  headers.set("Content-Type", headers.get("Content-Type") || "application/json")
  if (username) {
    headers.set("X-Leetcode-Username", username)
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers
  })
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
export const fetchPotd = async () => backendFetch("/api/potd")
export const fetchRevisionQueue = async () => backendFetch("/api/revision/queue")
export const fetchContests = async () => backendFetch("/api/contests")

export const fetchVault = async (query?: string) => {
  const path = query ? `/api/vault/search?q=${encodeURIComponent(query)}` : "/api/vault"
  return backendFetch(path)
}

export const startSession = async (mode = "PRACTICE") => {
  return backendFetch("/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({ mode })
  })
}

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
