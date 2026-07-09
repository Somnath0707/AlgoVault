import type { ZerotracProblem } from "./types"

type RecordLike = Record<string, any>

const WRAPPER_KEYS = ["data", "items", "results", "payload"]

function isRecord(value: unknown): value is RecordLike {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : undefined
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

function toSlug(value: unknown): string | null {
  const text = toText(value)
  if (!text) return null
  try {
    return decodeURIComponent(text)
      .trim()
      .toLowerCase()
      .replace(/^\/+|\/+$/g, "")
  } catch {
    return text.trim().toLowerCase().replace(/^\/+|\/+$/g, "")
  }
}

function toRating(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

function isSingleProblemRecord(value: RecordLike): boolean {
  return [
    value.TitleSlug,
    value.titleSlug,
    value.title_slug,
    value.slug,
    value.problemSlug,
    value.problem_slug,
    value.Rating,
    value.rating,
    value.elo,
    value.score,
  ].some((item) => item != null)
}

function normalizeEntry(value: RecordLike, fallbackSlug?: string): ZerotracProblem | null {
  const slug =
    toSlug(value.TitleSlug) ??
    toSlug(value.titleSlug) ??
    toSlug(value.title_slug) ??
    toSlug(value.slug) ??
    toSlug(value.problemSlug) ??
    toSlug(value.problem_slug) ??
    toSlug(fallbackSlug)

  if (!slug) return null

  const rating =
    toRating(value.Rating) ??
    toRating(value.rating) ??
    toRating(value.elo) ??
    toRating(value.score) ??
    null

  if (rating == null) return null

  return {
    TitleSlug: slug,
    Rating: rating,
    ID: value.ID ?? value.id ?? value.questionId ?? value.questionID,
    Title: toText(value.Title) ?? toText(value.title) ?? slug,
    ContestID_en: toText(value.ContestID_en) ?? toText(value.contestId) ?? toText(value.contestID) ?? "",
    ContestSlug: toText(value.ContestSlug) ?? toText(value.contestSlug) ?? "",
    ProblemIndex: toText(value.ProblemIndex) ?? toText(value.problemIndex) ?? toText(value.index) ?? "?",
  }
}

function collectZerotrac(payload: unknown, fallbackSlug: string | undefined, out: ZerotracProblem[]) {
  if (!payload) return

  if (Array.isArray(payload)) {
    for (const item of payload) {
      collectZerotrac(item, fallbackSlug, out)
    }
    return
  }

  if (!isRecord(payload)) return

  if (isSingleProblemRecord(payload)) {
    const normalized = normalizeEntry(payload, fallbackSlug)
    if (normalized) out.push(normalized)
    return
  }

  for (const key of WRAPPER_KEYS) {
    if (key in payload) {
      collectZerotrac(payload[key], fallbackSlug, out)
      return
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (WRAPPER_KEYS.includes(key) || value == null) continue
    const nextFallback = toSlug(key) ?? fallbackSlug
    collectZerotrac(value, nextFallback || undefined, out)
  }
}

export function normalizeZerotracPayload(payload: unknown): ZerotracProblem[] {
  const normalized: ZerotracProblem[] = []
  collectZerotrac(payload, undefined, normalized)

  const bySlug = new Map<string, ZerotracProblem>()
  for (const entry of normalized) {
    bySlug.set(entry.TitleSlug.toLowerCase(), entry)
  }
  return Array.from(bySlug.values())
}

export function buildZerotracRatingMap(payload: unknown): Map<string, number> {
  const map = new Map<string, number>()
  for (const entry of normalizeZerotracPayload(payload)) {
    map.set(entry.TitleSlug.toLowerCase(), entry.Rating)
  }
  return map
}

export function getZerotracProblemBySlug(payload: unknown, slug: string): ZerotracProblem | null {
  const target = toSlug(slug)
  if (!target) return null

  const normalized = normalizeZerotracPayload(payload)
  return normalized.find((entry) => entry.TitleSlug.toLowerCase() === target) ?? null
}

