import { BACKEND_URL } from "../constants"
import type { PredictionResult } from "../types"

export const fetchPrediction = async (titleSlug: string): Promise<PredictionResult> => {
  const res = await fetch(`${BACKEND_URL}/api/predict/${titleSlug}`);
  if (!res.ok) throw new Error("Failed to fetch prediction");
  return res.json();
}

export const fetchDashboard = async () => {
  const res = await fetch(`${BACKEND_URL}/api/dashboard`);
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export const fetchHeatmap = async () => {
  const res = await fetch(`${BACKEND_URL}/api/heatmap`);
  if (!res.ok) throw new Error("Failed to fetch heatmap");
  return res.json();
}

export const fetchMastery = async () => {
  const res = await fetch(`${BACKEND_URL}/api/mastery`);
  if (!res.ok) throw new Error("Failed to fetch mastery");
  return res.json();
}

export const fetchWeakness = async () => {
  const res = await fetch(`${BACKEND_URL}/api/weakness`);
  if (!res.ok) throw new Error("Failed to fetch weakness");
  return res.json();
}

// Sprint 5 additions
export const fetchPotd = async () => {
  const res = await fetch(`${BACKEND_URL}/api/potd`);
  if (!res.ok) throw new Error("Failed to fetch potd");
  return res.json();
}

export const fetchRevisionQueue = async () => {
  const res = await fetch(`${BACKEND_URL}/api/revision/queue`);
  if (!res.ok) throw new Error("Failed to fetch revision queue");
  return res.json();
}

export const fetchContests = async () => {
  const res = await fetch(`${BACKEND_URL}/api/contests`);
  if (!res.ok) throw new Error("Failed to fetch contests");
  return res.json();
}

export const fetchVault = async (query?: string) => {
  const url = query ? `${BACKEND_URL}/api/vault/search?q=${query}` : `${BACKEND_URL}/api/vault`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch vault");
  return res.json();
}
