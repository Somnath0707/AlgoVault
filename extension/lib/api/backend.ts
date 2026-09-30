import { BACKEND_URL } from "../constants"
import { getJwtToken, setJwtToken, clearJwtToken, getGithubPat, getOrCreateDeviceId } from "../storage"
import type { ActiveSession, DashboardData, PredictionResult, RevisionQueueItem, SessionData, WeaknessSnapshot } from "../types"
import { fetchEntrantHubPrediction } from "./entranthub"

export const getGithubOAuthState = async (): Promise<string> => {
  const res = await fetch(`${BACKEND_URL}/api/auth/github-state`)
  if (!res.ok) throw new Error("Could not start secure GitHub authorization")
  const payload = await res.json()
  if (!payload?.state || typeof payload.state !== "string") throw new Error("Invalid OAuth state response")
  return payload.state
}

export const exchangeGithubCode = async (code: string, state: string, codeVerifier: string, redirectUri: string) => {
  const deviceId = await getOrCreateDeviceId().catch(() => undefined);
  const jwt = await getValidJwt().catch(() => null);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

  const res = await fetch(`${BACKEND_URL}/api/auth/github-exchange`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, state, codeVerifier, redirectUri, deviceId })
  });
  if (!res.ok) {
    const errorMsg = await res.text().catch(() => "");
    throw new Error(`GitHub token exchange failed: ${res.status} ${errorMsg}`);
  }
  const payload = await res.json();
  if (payload?.token) {
    inMemoryJwt = payload.token;
    await setJwtToken(payload.token);
  }
  return payload;
}

type RefreshResult = { token: string | null; credentialsRejected: boolean }

let activeRefreshPromise: Promise<RefreshResult> | null = null;
let inMemoryJwt: string | null = null;

export async function getValidJwt(): Promise<string | null> {
  const stored = await getJwtToken();
  if (stored) {
    inMemoryJwt = stored;
    return stored;
  }
  return inMemoryJwt;
}

export const authenticateGithubToken = async (token: string) => {
  const deviceId = await getOrCreateDeviceId().catch(() => undefined);
  const jwt = await getValidJwt().catch(() => null);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`${BACKEND_URL}/api/auth/github-token`, {
    method: "POST",
    headers,
    body: JSON.stringify({ token, deviceId })
  })
  if (!res.ok) {
    const status = res.status;
    const body = await res.text().catch(() => "");
    const err: any = new Error(body || `GitHub token verification failed (${status})`);
    err.status = status;
    throw err;
  }
  const payload = await res.json() as { token: string; githubToken: string; username: string };
  if (payload?.token) {
    inMemoryJwt = payload.token;
    await setJwtToken(payload.token);
  }
  return payload;
}

export const authenticateGuest = async (deviceId: string) => {
  const res = await fetch(`${BACKEND_URL}/api/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId })
  });
  if (!res.ok) {
    const errorMsg = await res.text().catch(() => "");
    throw new Error(`Guest session init failed: ${res.status} ${errorMsg}`);
  }
  return res.json() as Promise<{ token: string; username: string }>;
}

async function trySilentRefresh(): Promise<RefreshResult> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const pat = await getGithubPat();
      if (pat) {
        try {
          const authRes = await authenticateGithubToken(pat);
          if (authRes?.token) {
            inMemoryJwt = authRes.token;
            await setJwtToken(authRes.token);
            return { token: authRes.token, credentialsRejected: false };
          }
        } catch (patErr: any) {
          console.warn("[AlgoVault] GitHub PAT refresh failed, falling back to guest mode:", patErr?.message || patErr);
          if (patErr?.status === 401) {
            inMemoryJwt = null;
            await clearJwtToken();
          }
        }
      }

      // If no PAT or PAT was rejected, provision/restore device guest session
      const deviceId = await getOrCreateDeviceId();
      const guestRes = await authenticateGuest(deviceId);
      if (guestRes?.token) {
        inMemoryJwt = guestRes.token;
        await setJwtToken(guestRes.token);
        return { token: guestRes.token, credentialsRejected: false };
      }
      return { token: null, credentialsRejected: false };
    } catch (err: any) {
      console.warn("[AlgoVault] Silent token refresh failed:", err?.message || err);
      return { token: null, credentialsRejected: false };
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

// Every API request uses a valid JWT (either guest session or GitHub authenticated)
async function backendFetch<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  let jwt = await getValidJwt();
  let initialRefresh: RefreshResult | null = null
  if (!jwt) {
    initialRefresh = await trySilentRefresh();
    jwt = initialRefresh.token;
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  if (!jwt) {
    throw new Error("Unable to establish a secure session with AlgoVault backend. Please check your network and retry.");
  }
  headers.set("Authorization", `Bearer ${jwt}`);

  const timeoutMs = (init as any)?.timeoutMs ?? (path.includes("/api/sync") ? 180000 : 35000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`AlgoVault server took longer than ${Math.round(timeoutMs / 1000)}s to respond. Please retry.`));
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    });
  } catch (fetchErr: any) {
    if (controller.signal.aborted) {
      throw new Error(controller.signal.reason?.message || `Request timed out after ${Math.round(timeoutMs / 1000)}s.`);
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401) {
    // Attempt one automatic token refresh and retry
    const refresh = await trySilentRefresh();
    if (refresh.token) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("Content-Type", retryHeaders.get("Content-Type") || "application/json");
      retryHeaders.set("Authorization", `Bearer ${refresh.token}`);
      
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => {
        retryController.abort(new Error(`AlgoVault server took longer than ${Math.round(timeoutMs / 1000)}s to respond on retry.`));
      }, timeoutMs);
      try {
        const retryRes = await fetch(`${BACKEND_URL}${path}`, {
          ...init,
          headers: retryHeaders,
          signal: retryController.signal
        });
        if (retryRes.ok) {
          if (retryRes.status === 204) return null as T;
          const text = await retryRes.text().catch(() => "");
          if (!text.trim()) return null as T;
          return JSON.parse(text) as T;
        }
      } catch (retryErr: any) {
        if (retryController.signal.aborted) {
          throw new Error(retryController.signal.reason?.message || `Request timed out after ${Math.round(timeoutMs / 1000)}s on retry.`);
        }
        throw retryErr;
      } finally {
        clearTimeout(retryTimeoutId);
      }
    }

    // The JWT itself is stale after the backend's 401, but preserve the GitHub
    // credential unless GitHub explicitly rejected it.
    inMemoryJwt = null;
    await clearJwtToken();
    const hasGithub = Boolean(await getGithubPat());
    if (hasGithub) {
      if (refresh.credentialsRejected) {
        throw new Error("Your GitHub authorization was rejected. Reconnect GitHub in Settings.");
      }
      throw new Error("Could not refresh your session right now. Your GitHub login was kept; please retry shortly.");
    }
    throw new Error("Could not refresh your session right now. Please retry shortly.");
  }

  if (res.status === 429) {
    throw new Error("Too many cloud requests. Please wait a moment before trying again.");
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

export interface ContestPredictionPayload {
  contestSlug: string
  contestTitle?: string
  username?: string
  rank?: number | null
  solved?: number | null
  totalQuestions?: number | null
  finishTimeMinutes?: number | null
  currentRating?: number | null
  attendedContestsCount?: number | null
  forceRefresh?: boolean
}

export const predictContestBackend = async (payload: ContestPredictionPayload): Promise<any> => {
  const jwt = await getValidJwt().catch(() => null);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  // 1. Try local dev backend first (instant & unblocked locally), then configured BACKEND_URL
  const candidateUrls = Array.from(new Set([
    "http://localhost:8080/api/contests/predict",
    `${BACKEND_URL}/api/contests/predict`
  ]));

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status !== "UNRATED" && data.source === "ENTRANTHUB") {
          return data;
        }
      }
    } catch (backendErr) {
      console.warn(`[AlgoVault] Predict request to ${url} failed or unreachable:`, backendErr);
    }
  }

  // 2. Direct EntrantHub fallback (works seamlessly even when Spring backend is stopped)
  if (payload.contestSlug && payload.username) {
    try {
      const match = await fetchEntrantHubPrediction(payload.contestSlug, payload.username);
      if (match) {
        return {
          contestSlug: payload.contestSlug,
          contestTitle: payload.contestTitle,
          rank: match.rank,
          problemsSolved: payload.solved,
          totalProblems: payload.totalQuestions || 4,
          finishTimeMinutes: payload.finishTimeMinutes,
          ratingBefore: match.oldRating,
          predictedRating: Math.round(match.newRating * 10) / 10,
          predictedDelta: Math.round(match.deltaRating * 10) / 10,
          status: "PREDICTED",
          source: "ENTRANTHUB"
        };
      }
    } catch (directErr) {
      console.warn("[AlgoVault] Direct EntrantHub lookup failed:", directErr);
    }
  }

  return {
    contestSlug: payload.contestSlug,
    contestTitle: payload.contestTitle,
    rank: payload.rank,
    problemsSolved: payload.solved,
    totalProblems: payload.totalQuestions || 4,
    finishTimeMinutes: payload.finishTimeMinutes,
    ratingBefore: payload.currentRating,
    predictedRating: payload.currentRating,
    predictedDelta: null,
    status: "PREDICTION_PENDING",
    source: "FALLBACK"
  };
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
    inMemoryJwt = null
    await clearJwtToken()
  }
}

export const exportUserData = async (): Promise<Blob> => {
  const data = await backendFetch("/api/export/json")
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
}
