// ─── ALGOVAULT COMPANY INTERVIEW PRACTICE ENGINE (REAL LEETCODE DATA) ────────
// Real, authentic dataset compiled from 680+ tech & finance companies.
// Dataset provenance: LeetCode Verified Interview Questions (Updated: June 2025).

import rawCompaniesJson from "./companies-dataset.json"

export type CompanyCategory = "big-tech" | "quant-finance" | "unicorns" | "enterprise" | "other"
export type FrequencyTier = "VERY_HIGH" | "HIGH" | "MEDIUM" | "LOW"
export type TimeWindow = "30d" | "3m" | "6m" | "1y" | "all"

export interface CompanyProblemEvidence {
  companyId: string
  companyName: string
  problemId: number
  title: string
  slug: string
  difficulty: "Easy" | "Medium" | "Hard"
  frequencyScore: number
  frequencyTier: FrequencyTier
  timeframe: TimeWindow
  timeframeLabel: string
  windows: TimeWindow[]
  topic: string
  acceptanceRate?: string
  source: "LEETCODE"
  sourceUpdatedAt: string
}

export interface CompanySummary {
  id: string
  name: string
  slug: string
  category: CompanyCategory
  accentColor: string
  domain?: string
  logoSvg: string
  totalProblems: number
  mostFrequentTopics: string[]
  source: "LEETCODE"
  sourceUpdatedAt: string
  problems: CompanyProblemEvidence[]
}

export interface DifficultyStats {
  sampleSize: number
  median: number | null
  mean: number | null
  p25: number | null
  p75: number | null
  min: number | null
  max: number | null
  insufficientData: boolean
  ratingBands: {
    under1600: number
    band1600_1800: number
    band1800_2000: number
    band2000_2200: number
    above2200: number
  }
}

// ─── UNIFIED STATISTICAL FUNCTIONS (Linear Interpolation) ──────────────────

export function calculatePercentile(sortedValues: number[], p: number): number | null {
  if (!sortedValues || sortedValues.length === 0) return null
  if (sortedValues.length === 1) return sortedValues[0]
  if (p <= 0) return sortedValues[0]
  if (p >= 1) return sortedValues[sortedValues.length - 1]

  const index = (sortedValues.length - 1) * p
  const lower = Math.floor(index)
  const fraction = index - lower

  if (lower + 1 < sortedValues.length) {
    return Math.round(sortedValues[lower] + fraction * (sortedValues[lower + 1] - sortedValues[lower]))
  }
  return sortedValues[lower]
}

export function calculateWindowDifficultyStats(
  problems: CompanyProblemEvidence[],
  zerotracRatingMap: Map<string, number>,
  timeframe?: "30d" | "3m" | "6m" | "1y" | "all"
): DifficultyStats {
  const filtered = timeframe && timeframe !== "all"
    ? problems.filter((p) => p.windows && p.windows.includes(timeframe))
    : problems

  const validRatings: number[] = []
  const bands = {
    under1600: 0,
    band1600_1800: 0,
    band1800_2000: 0,
    band2000_2200: 0,
    above2200: 0
  }

  for (const prob of filtered) {
    const rating = zerotracRatingMap.get(prob.slug.toLowerCase())
    if (typeof rating === "number" && Number.isFinite(rating) && rating > 0) {
      validRatings.push(rating)
      if (rating < 1600) bands.under1600++
      else if (rating < 1800) bands.band1600_1800++
      else if (rating < 2000) bands.band1800_2000++
      else if (rating < 2200) bands.band2000_2200++
      else bands.above2200++
    }
  }

  const sampleSize = validRatings.length
  if (sampleSize === 0) {
    return {
      sampleSize: 0,
      median: null,
      mean: null,
      p25: null,
      p75: null,
      min: null,
      max: null,
      insufficientData: true,
      ratingBands: bands
    }
  }

  validRatings.sort((a, b) => a - b)

  const sum = validRatings.reduce((acc, r) => acc + r, 0)
  const mean = Math.round(sum / sampleSize)
  const median = calculatePercentile(validRatings, 0.5)
  const p25 = calculatePercentile(validRatings, 0.25)
  const p75 = calculatePercentile(validRatings, 0.75)
  const min = validRatings[0]
  const max = validRatings[validRatings.length - 1]

  return {
    sampleSize,
    median,
    mean,
    p25,
    p75,
    min,
    max,
    insufficientData: sampleSize < 3,
    ratingBands: bands
  }
}

// ─── HIGH-PERFORMANCE DATASET HYDRATION ────────────────────────────────────

interface CompactDataset {
  p: Record<string, [string, string, string, string, number]>
  c: Array<{
    i: string
    n: string
    s: string
    c: CompanyCategory
    d?: string
    t?: string[]
    p: Array<[string, number, TimeWindow[]]>
  }>
}

function hydrateCompanies(raw: any): { companies: CompanySummary[]; slugMap: Map<string, CompanyProblemEvidence[]> } {
  const dataset = raw as CompactDataset
  const probMap = dataset.p || {}
  const compList = dataset.c || []

  const slugMap = new Map<string, CompanyProblemEvidence[]>()
  const companies: CompanySummary[] = []

  for (let i = 0; i < compList.length; i++) {
    const c = compList[i]
    const cProblems: CompanyProblemEvidence[] = []

    for (let j = 0; j < c.p.length; j++) {
      const [slug, freq, windows] = c.p[j]
      const pInfo = probMap[slug] || ["Unknown", "M", "Algorithms", "", 0]
      const diff = pInfo[1] === "E" ? "Easy" : pInfo[1] === "H" ? "Hard" : "Medium"
      const w = windows || ["all"]
      const primaryWindow = w.includes("30d") ? "30d" : w.includes("3m") ? "3m" : w.includes("6m") ? "6m" : w.includes("1y") ? "1y" : "all"
      const tfLabel = primaryWindow === "30d" ? "30 Days" : primaryWindow === "3m" ? "3 Months" : primaryWindow === "6m" ? "6 Months" : primaryWindow === "1y" ? "> 6 Months" : "All Time"
      const freqTier = freq >= 75 ? "VERY_HIGH" : freq >= 50 ? "HIGH" : freq >= 30 ? "MEDIUM" : "LOW"

      const evidence: CompanyProblemEvidence = {
        companyId: c.i,
        companyName: c.n,
        problemId: pInfo[4] || 0,
        title: pInfo[0],
        slug,
        difficulty: diff,
        frequencyScore: freq,
        frequencyTier: freqTier,
        timeframe: primaryWindow,
        timeframeLabel: tfLabel,
        windows: w,
        topic: pInfo[2] || "Algorithms",
        acceptanceRate: pInfo[3] || "",
        source: "LEETCODE",
        sourceUpdatedAt: "June 2025"
      }

      cProblems.push(evidence)

      const slugKey = slug.toLowerCase()
      const existing = slugMap.get(slugKey) || []
      existing.push(evidence)
      slugMap.set(slugKey, existing)
    }

    companies.push({
      id: c.i,
      name: c.n,
      slug: c.s,
      category: c.c,
      accentColor: "#ffa116",
      domain: c.d,
      logoSvg: "",
      totalProblems: cProblems.length,
      mostFrequentTopics: c.t || [],
      source: "LEETCODE",
      sourceUpdatedAt: "June 2025",
      problems: cProblems
    })
  }

  return { companies, slugMap }
}

const hydrated = hydrateCompanies(rawCompaniesJson)

export const COMPANIES_DATA: CompanySummary[] = hydrated.companies
export const PROBLEM_SLUG_TO_COMPANIES: Map<string, CompanyProblemEvidence[]> = hydrated.slugMap
