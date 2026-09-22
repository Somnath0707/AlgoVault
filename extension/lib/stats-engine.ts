import { getStatusDisplay } from "./api/leetcode"

export interface RawSubmission {
  id: string | number
  title?: string
  titleSlug?: string
  title_slug?: string
  status?: number | string
  status_display?: string
  statusDisplay?: string
  lang?: string
  timestamp?: string | number
}

export interface ProblemMetadata {
  slug: string
  difficulty: "Easy" | "Medium" | "Hard"
  topics: string[]
}

export interface ProcessedSubmission {
  id: string
  title: string
  titleSlug: string
  statusCode: number
  statusDisplay: string
  lang: string
  timestamp: number
  date: Date
  metadata?: ProblemMetadata
}

export interface ProcessedData {
  submissions: ProcessedSubmission[]
  problemMap: Map<string, ProcessedSubmission[]>
}

export type TimeRange = "All Time" | "Last 30 Days" | "Last 90 Days" | "Last 365 Days"
export type DifficultyFilter = "All" | "Easy" | "Medium" | "Hard"

function parseStatusCode(status: any, statusDisplay?: string): number {
  if (typeof status === "number") return status
  const sStr = String(status || "").trim().toLowerCase()
  const dStr = String(statusDisplay || "").trim().toLowerCase()
  const combined = sStr || dStr

  if (combined.includes("accept")) return 10
  if (combined.includes("wrong")) return 11
  if (combined.includes("memory")) return 12
  if (combined.includes("time") || combined.includes("tle")) return 14
  if (combined.includes("compile")) return 20
  return 15 // Runtime Error
}

export function processData(
  rawSubmissions: RawSubmission[] = [],
  metadataMap: Record<string, ProblemMetadata> = {}
): ProcessedData {
  const submissions: ProcessedSubmission[] = []

  for (const raw of rawSubmissions) {
    if (!raw) continue
    const slug = String(raw.titleSlug || raw.title_slug || "").trim().toLowerCase()
    if (!slug) continue

    const rawTs = Number(raw.timestamp) || 0
    const ts = rawTs < 1e11 ? rawTs * 1000 : rawTs
    const date = ts > 0 ? new Date(ts) : new Date()

    const rawStatus = raw.status
    const rawDisplay = raw.statusDisplay || raw.status_display
    const statusCode = parseStatusCode(rawStatus, rawDisplay)
    const statusDisplay = rawDisplay || getStatusDisplay(statusCode)
    const title = raw.title || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    const lang = String(raw.lang || "unknown").toLowerCase()

    const metadata = metadataMap[slug]

    submissions.push({
      id: String(raw.id || ""),
      title,
      titleSlug: slug,
      statusCode,
      statusDisplay,
      lang,
      timestamp: ts,
      date,
      metadata
    })
  }

  // Sort submissions chronologically
  submissions.sort((a, b) => a.timestamp - b.timestamp)

  const problemMap = new Map<string, ProcessedSubmission[]>()
  for (const sub of submissions) {
    if (!problemMap.has(sub.titleSlug)) {
      problemMap.set(sub.titleSlug, [])
    }
    problemMap.get(sub.titleSlug)!.push(sub)
  }

  return { submissions, problemMap }
}

export function filterSubmissions(
  submissions: ProcessedSubmission[],
  timeRange: TimeRange = "All Time",
  difficulty: DifficultyFilter = "All"
): ProcessedSubmission[] {
  const now = Date.now()
  const ONE_DAY_MS = 86_400_000

  return submissions.filter((sub) => {
    if (timeRange === "Last 30 Days" && now - sub.timestamp > 30 * ONE_DAY_MS) return false
    if (timeRange === "Last 90 Days" && now - sub.timestamp > 90 * ONE_DAY_MS) return false
    if (timeRange === "Last 365 Days" && now - sub.timestamp > 365 * ONE_DAY_MS) return false

    if (difficulty !== "All" && sub.metadata?.difficulty !== difficulty) {
      return false
    }

    return true
  })
}

/* ═══════════════════════════════════════════════════════════
   1. CODING FREQUENCY (DAILY & HOURLY)
   ═══════════════════════════════════════════════════════════ */
export const HOUR_LABELS_24 = [
  "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
  "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
]

export function getCodingClockStats(
  processedData: ProcessedData,
  timeRange: TimeRange = "All Time",
  difficulty: DifficultyFilter = "All"
) {
  const filtered = filterSubmissions(processedData.submissions, timeRange, difficulty)

  // Daily: Mon - Sun (7 buckets)
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const dailyBuckets = Array.from({ length: 7 }, () => ({ accepted: 0, attempted: 0, failed: 0 }))

  // Hourly: All 24 individual hours (0..23) matching leetStats exactly
  const hourlyBuckets = Array.from({ length: 24 }, () => ({ accepted: 0, attempted: 0, failed: 0 }))

  for (const sub of filtered) {
    const isAc = sub.statusCode === 10

    // Day of week: LeetCode JS getDay() is 0 for Sun, 1 for Mon. Map to Mon=0..Sun=6
    const d = sub.date.getDay()
    const dayIndex = (d + 6) % 7
    dailyBuckets[dayIndex].attempted++
    if (isAc) {
      dailyBuckets[dayIndex].accepted++
    } else {
      dailyBuckets[dayIndex].failed++
    }

    // Hour of day: All 24 individual hours (0..23)
    const h = sub.date.getHours()
    hourlyBuckets[h].attempted++
    if (isAc) {
      hourlyBuckets[h].accepted++
    } else {
      hourlyBuckets[h].failed++
    }
  }

  // Find best hour & day by acceptance rate (min 5 submissions)
  let bestHourIdx = -1
  let maxHourRate = -1
  hourlyBuckets.forEach((b, idx) => {
    if (b.attempted >= 5) {
      const rate = b.accepted / b.attempted
      if (rate > maxHourRate) {
        maxHourRate = rate
        bestHourIdx = idx
      }
    }
  })

  let bestDayIdx = -1
  let maxDayRate = -1
  dailyBuckets.forEach((b, idx) => {
    if (b.attempted >= 5) {
      const rate = b.accepted / b.attempted
      if (rate > maxDayRate) {
        maxDayRate = rate
        bestDayIdx = idx
      }
    }
  })

  return {
    daily: dailyBuckets.map((b, i) => ({
      label: dayLabels[i],
      accepted: b.accepted,
      failed: b.failed,
      attempted: b.attempted,
      rate: b.attempted > 0 ? `${((b.accepted / b.attempted) * 100).toFixed(1)}%` : "N/A"
    })),
    hourly: hourlyBuckets.map((b, i) => ({
      label: HOUR_LABELS_24[i],
      hourIndex: i,
      accepted: b.accepted,
      failed: b.failed,
      attempted: b.attempted,
      rate: b.attempted > 0 ? `${((b.accepted / b.attempted) * 100).toFixed(1)}%` : "N/A"
    })),
    bestHourIdx,
    bestDayIdx
  }
}

/* ═══════════════════════════════════════════════════════════
   2. PROGRESS TRACKER (CUMULATIVE GROWTH OVER TIME)
   ═══════════════════════════════════════════════════════════ */
export function getCumulativeStats(
  processedData: ProcessedData,
  timeRange: TimeRange = "All Time",
  difficulty: DifficultyFilter = "All",
  view: "daily" | "monthly" | "yearly" = "monthly"
) {
  const filtered = filterSubmissions(processedData.submissions, timeRange, difficulty)
  if (filtered.length === 0) return []

  const groupMap = new Map<string, {
    submissions: number
    easySolved: Set<string>
    mediumSolved: Set<string>
    hardSolved: Set<string>
    date: Date
  }>()

  for (const sub of filtered) {
    const d = sub.date
    let key: string

    if (view === "daily") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    } else if (view === "monthly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    } else {
      key = `${d.getFullYear()}`
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        submissions: 0,
        easySolved: new Set(),
        mediumSolved: new Set(),
        hardSolved: new Set(),
        date: d
      })
    }

    const group = groupMap.get(key)!
    group.submissions++

    if (sub.statusCode === 10) {
      const diff = sub.metadata?.difficulty || "Medium"
      if (diff === "Easy") group.easySolved.add(sub.titleSlug)
      else if (diff === "Medium") group.mediumSolved.add(sub.titleSlug)
      else if (diff === "Hard") group.hardSolved.add(sub.titleSlug)
    }
  }

  const sortedKeys = Array.from(groupMap.keys()).sort()
  const result: any[] = []

  let cumSubmissions = 0
  const cumEasy = new Set<string>()
  const cumMedium = new Set<string>()
  const cumHard = new Set<string>()

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  for (const key of sortedKeys) {
    const item = groupMap.get(key)!
    cumSubmissions += item.submissions
    item.easySolved.forEach((s) => cumEasy.add(s))
    item.mediumSolved.forEach((s) => cumMedium.add(s))
    item.hardSolved.forEach((s) => cumHard.add(s))

    let displayLabel = key
    if (view === "monthly") {
      const parts = key.split("-")
      const monthIdx = parseInt(parts[1], 10) - 1
      displayLabel = `${monthNames[monthIdx]} ${parts[0]}`
    }

    result.push({
      date: displayLabel,
      totalSubmissions: cumSubmissions,
      totalSolved: cumEasy.size + cumMedium.size + cumHard.size,
      easySolved: cumEasy.size,
      mediumSolved: cumMedium.size,
      hardSolved: cumHard.size
    })
  }

  return result
}

/* ═══════════════════════════════════════════════════════════
   3. SUBMISSION BREAKDOWN (VERDICTS)
   ═══════════════════════════════════════════════════════════ */
export function getSubmissionSignatureStats(
  processedData: ProcessedData,
  timeRange: TimeRange = "All Time",
  difficulty: DifficultyFilter = "All"
) {
  const filtered = filterSubmissions(processedData.submissions, timeRange, difficulty)
  const total = filtered.length

  const verdictMap: Record<string, { count: number; easy: number; medium: number; hard: number }> = {
    "Accepted": { count: 0, easy: 0, medium: 0, hard: 0 },
    "Wrong Answer": { count: 0, easy: 0, medium: 0, hard: 0 },
    "Time Limit Exceeded": { count: 0, easy: 0, medium: 0, hard: 0 },
    "Compile Error": { count: 0, easy: 0, medium: 0, hard: 0 },
    "Runtime Error": { count: 0, easy: 0, medium: 0, hard: 0 },
    "Memory Limit Exceeded": { count: 0, easy: 0, medium: 0, hard: 0 }
  }

  for (const sub of filtered) {
    let key = "Runtime Error"
    switch (sub.statusCode) {
      case 10: key = "Accepted"; break;
      case 11: key = "Wrong Answer"; break;
      case 12: key = "Memory Limit Exceeded"; break;
      case 14: key = "Time Limit Exceeded"; break;
      case 20: key = "Compile Error"; break;
      default: key = "Runtime Error"; break;
    }

    const bucket = verdictMap[key]
    bucket.count++
    const diff = sub.metadata?.difficulty
    if (diff === "Easy") bucket.easy++
    else if (diff === "Medium") bucket.medium++
    else if (diff === "Hard") bucket.hard++
  }

  return Object.entries(verdictMap).map(([name, data]) => ({
    name,
    value: data.count,
    percent: total > 0 ? ((data.count / total) * 100).toFixed(1) : "0.0",
    easy: data.easy,
    medium: data.medium,
    hard: data.hard
  }))
}

/* ═══════════════════════════════════════════════════════════
   4. LANGUAGE STATS
   ═══════════════════════════════════════════════════════════ */
export function getLanguageStats(
  processedData: ProcessedData,
  timeRange: TimeRange = "All Time",
  difficulty: DifficultyFilter = "All"
) {
  const filtered = filterSubmissions(processedData.submissions, timeRange, difficulty)

  const langMap = new Map<string, {
    total: number
    accepted: number
    failed: number
    solvedEasy: Set<string>
    solvedMedium: Set<string>
    solvedHard: Set<string>
    firstUsed: Date
    lastUsed: Date
  }>()

  for (const sub of filtered) {
    const lang = sub.lang
    if (!langMap.has(lang)) {
      langMap.set(lang, {
        total: 0,
        accepted: 0,
        failed: 0,
        solvedEasy: new Set(),
        solvedMedium: new Set(),
        solvedHard: new Set(),
        firstUsed: sub.date,
        lastUsed: sub.date
      })
    }
    const bucket = langMap.get(lang)!
    bucket.total++

    if (sub.statusCode === 10) {
      bucket.accepted++
      const diff = sub.metadata?.difficulty || "Medium"
      if (diff === "Easy") bucket.solvedEasy.add(sub.titleSlug)
      else if (diff === "Medium") bucket.solvedMedium.add(sub.titleSlug)
      else if (diff === "Hard") bucket.solvedHard.add(sub.titleSlug)
    } else {
      bucket.failed++
    }

    if (sub.date < bucket.firstUsed) bucket.firstUsed = sub.date
    if (sub.date > bucket.lastUsed) bucket.lastUsed = sub.date
  }

  const sorted = Array.from(langMap.entries()).sort((a, b) => b[1].total - a[1].total)

  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  }

  return sorted.map(([lang, stats]) => ({
    language: lang,
    count: stats.total,
    accepted: stats.accepted,
    failed: stats.failed,
    acceptanceRate: stats.total > 0 ? `${((stats.accepted / stats.total) * 100).toFixed(1)}%` : "0%",
    solvedBreakdown: {
      easy: stats.solvedEasy.size,
      medium: stats.solvedMedium.size,
      hard: stats.solvedHard.size
    },
    firstUsed: formatDisplayDate(stats.firstUsed),
    lastUsed: formatDisplayDate(stats.lastUsed)
  }))
}

/* ═══════════════════════════════════════════════════════════
   5. LEGACY MILESTONES (EXACT leetStats ALGORITHM)
   ═══════════════════════════════════════════════════════════ */
function getOrdinalSuffix(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const value = num % 100
  return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]
}

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function calculateMilestones(sortedSubmissions: ProcessedSubmission[]) {
  const milestones: any[] = []
  const milestoneNumbers = [1, 10, 50, 100, 500, 1000, 2000, 3000, 4000, 5000]

  let totalSubmissions = 0
  const problemsSolved = new Set<string>()
  let easyCount = 0
  let mediumCount = 0
  let hardCount = 0

  for (const sub of sortedSubmissions) {
    totalSubmissions++

    if (milestoneNumbers.includes(totalSubmissions)) {
      milestones.push({
        id: `sub-${totalSubmissions}`,
        type: "submission",
        milestone: totalSubmissions,
        label: `${totalSubmissions}${getOrdinalSuffix(totalSubmissions)} Submission`,
        date: formatDate(sub.date),
        rawDate: sub.date,
        detail: `Submission #${sub.id}`,
        submissionId: sub.id,
        color: "#38bdf8"
      })
    }

    if (sub.statusCode === 10 && !problemsSolved.has(sub.titleSlug)) {
      problemsSolved.add(sub.titleSlug)
      const solvedCount = problemsSolved.size

      if (milestoneNumbers.includes(solvedCount)) {
        milestones.push({
          id: `problem-${solvedCount}`,
          type: "problem",
          milestone: solvedCount,
          label: `${solvedCount}${getOrdinalSuffix(solvedCount)} Problem`,
          date: formatDate(sub.date),
          rawDate: sub.date,
          detail: sub.title,
          slug: sub.titleSlug,
          color: "#00b8a3"
        })
      }

      const diff = sub.metadata?.difficulty || "Medium"
      if (diff === "Easy") {
        easyCount++
        if (milestoneNumbers.includes(easyCount)) {
          milestones.push({
            id: `easy-${easyCount}`,
            type: "easy",
            milestone: easyCount,
            label: `${easyCount}${getOrdinalSuffix(easyCount)} Easy`,
            date: formatDate(sub.date),
            rawDate: sub.date,
            detail: sub.title,
            slug: sub.titleSlug,
            color: "#06b6d4"
          })
        }
      } else if (diff === "Medium") {
        mediumCount++
        if (milestoneNumbers.includes(mediumCount)) {
          milestones.push({
            id: `medium-${mediumCount}`,
            type: "medium",
            milestone: mediumCount,
            label: `${mediumCount}${getOrdinalSuffix(mediumCount)} Medium`,
            date: formatDate(sub.date),
            rawDate: sub.date,
            detail: sub.title,
            slug: sub.titleSlug,
            color: "#ffc01e"
          })
        }
      } else if (diff === "Hard") {
        hardCount++
        if (milestoneNumbers.includes(hardCount)) {
          milestones.push({
            id: `hard-${hardCount}`,
            type: "hard",
            milestone: hardCount,
            label: `${hardCount}${getOrdinalSuffix(hardCount)} Hard`,
            date: formatDate(sub.date),
            rawDate: sub.date,
            detail: sub.title,
            slug: sub.titleSlug,
            color: "#ef4743"
          })
        }
      }
    }
  }

  // Sort reverse-chronologically so newest milestones appear at top (matching media_1790067515789.png)
  milestones.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())

  return milestones
}

/* ═══════════════════════════════════════════════════════════
   6. SKILL MATRIX STATS (TOPIC ACCURACY & FIRST ACE RATE)
   ═══════════════════════════════════════════════════════════ */
export function getSkillsStats(processedData: ProcessedData) {
  const topicMap = new Map<string, {
    solvedProblems: Set<string>
    attemptsOnSolved: number
    firstTrySolves: number
  }>()

  for (const [slug, subs] of processedData.problemMap.entries()) {
    const acceptedIndex = subs.findIndex((s) => s.statusCode === 10)
    if (acceptedIndex === -1) continue

    const topics = subs[0].metadata?.topics || []
    const attempts = acceptedIndex + 1
    const isFirstTry = acceptedIndex === 0

    for (const rawTopic of topics) {
      const topicName = rawTopic
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())

      if (!topicMap.has(topicName)) {
        topicMap.set(topicName, {
          solvedProblems: new Set(),
          attemptsOnSolved: 0,
          firstTrySolves: 0
        })
      }

      const item = topicMap.get(topicName)!
      item.solvedProblems.add(slug)
      item.attemptsOnSolved += attempts
      if (isFirstTry) item.firstTrySolves++
    }
  }

  const list = Array.from(topicMap.entries()).map(([topic, stats]) => {
    const solved = stats.solvedProblems.size
    const avgAttempts = solved > 0 ? (stats.attemptsOnSolved / solved).toFixed(1) : "0.0"
    const firstAceRate = solved > 0 ? Math.round((stats.firstTrySolves / solved) * 100) : 0

    return {
      topic,
      problemsSolved: solved,
      averageAttempts: avgAttempts,
      firstAceRate: `${firstAceRate}%`
    }
  })

  // Sort descending by problems solved
  list.sort((a, b) => b.problemsSolved - a.problemsSolved)

  return list
}

/* ═══════════════════════════════════════════════════════════
   7. RECORDS (STREAKS, BREAKS, BEST PERIODS, ONE SHOT SOLVES)
   ═══════════════════════════════════════════════════════════ */
export interface RecordData {
  name: string
  mainStat?: string
  value?: number
  subStats?: { easy: number; medium: number; hard: number }
  dateStat: string
}

function formatMonthYear(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function pluralize(count: number, noun: string, suffix = "s"): string {
  return `${count} ${noun}${count !== 1 ? suffix : ""}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return "0 seconds"

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const years = Math.floor(days / 365)

  const timeParts = [
    { value: years, unit: "year" },
    { value: days % 365, unit: "day" },
    { value: hours % 24, unit: "hour" },
    { value: minutes % 60, unit: "minute" },
    { value: seconds % 60, unit: "second" }
  ]

  if (days > 30) {
    const months = Math.floor(days / 30.44)
    timeParts[0] = { value: Math.floor(months / 12), unit: "year" }
    timeParts.splice(1, 1, { value: months % 12, unit: "month" })
    timeParts[2] = { value: days % 30, unit: "day" }
  }

  const nonZeroParts = timeParts.filter((part) => part.value > 0)
  if (nonZeroParts.length === 0) return "0 seconds"
  if (nonZeroParts[0].unit === "second") return pluralize(nonZeroParts[0].value, "second")

  const partsToShow = nonZeroParts.slice(0, 2)
  if (partsToShow.length === 1) return pluralize(partsToShow[0].value, partsToShow[0].unit)

  return `${pluralize(partsToShow[0].value, partsToShow[0].unit)} and ${pluralize(partsToShow[1].value, partsToShow[1].unit)}`
}

function calculateLongestStreak(sortedSubmissions: ProcessedSubmission[]): { length: number; endDate: Date } {
  if (sortedSubmissions.length === 0) {
    return { length: 0, endDate: new Date() }
  }
  let currentStreak = 0, maxStreak = 0
  let lastDate: Date | null = null
  let maxStreakEndDate = new Date(), currentStreakEndDate = new Date()

  for (const sub of sortedSubmissions) {
    const currentDate = new Date(sub.date.getFullYear(), sub.date.getMonth(), sub.date.getDate())
    if (lastDate) {
      const dayDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (dayDiff === 1) {
        currentStreak++
        currentStreakEndDate = currentDate
      } else if (dayDiff > 1) {
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak
          maxStreakEndDate = currentStreakEndDate
        }
        currentStreak = 1
        currentStreakEndDate = currentDate
      }
    } else {
      currentStreak = 1
      currentStreakEndDate = currentDate
    }
    lastDate = currentDate
  }

  if (currentStreak > maxStreak) {
    maxStreak = currentStreak
    maxStreakEndDate = currentStreakEndDate
  }
  return { length: maxStreak, endDate: maxStreakEndDate }
}

function calculateLongestBreak(sortedSubmissions: ProcessedSubmission[]): { breakInMs: number; date: Date } {
  if (sortedSubmissions.length < 2) {
    return { breakInMs: 0, date: new Date() }
  }
  let maxBreak = 0
  let breakStartDate: Date = sortedSubmissions[0].date

  for (let i = 1; i < sortedSubmissions.length; i++) {
    const gap = sortedSubmissions[i].date.getTime() - sortedSubmissions[i - 1].date.getTime()
    if (gap > maxBreak) {
      maxBreak = gap
      breakStartDate = sortedSubmissions[i - 1].date
    }
  }
  return { breakInMs: maxBreak, date: breakStartDate }
}

function calculateBestPeriods(submissions: ProcessedSubmission[]) {
  const acceptedSubs = submissions.filter((sub) => sub.statusCode === 10)
  const dayMap = new Map<string, Set<string>>()
  const monthMap = new Map<string, Set<string>>()
  const yearMap = new Map<string, Set<string>>()

  acceptedSubs.forEach((sub) => {
    const date = sub.date
    const dayKey = date.toISOString().split("T")[0]
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
    const yearKey = `${date.getFullYear()}`

    if (!dayMap.has(dayKey)) dayMap.set(dayKey, new Set())
    dayMap.get(dayKey)!.add(sub.titleSlug)

    if (!monthMap.has(monthKey)) monthMap.set(monthKey, new Set())
    monthMap.get(monthKey)!.add(sub.titleSlug)

    if (!yearMap.has(yearKey)) yearMap.set(yearKey, new Set())
    yearMap.get(yearKey)!.add(sub.titleSlug)
  })

  let bestDay = { count: 0, date: new Date() }
  dayMap.forEach((set, dayKey) => {
    if (set.size > bestDay.count) {
      bestDay = { count: set.size, date: new Date(dayKey) }
    }
  })

  let bestMonth = { count: 0, date: new Date() }
  monthMap.forEach((set, monthKey) => {
    if (set.size > bestMonth.count) {
      const [year, month] = monthKey.split("-").map(Number)
      bestMonth = { count: set.size, date: new Date(year, month - 1, 1) }
    }
  })

  let bestYear = { count: 0, date: new Date() }
  yearMap.forEach((set, yearKey) => {
    if (set.size > bestYear.count) {
      bestYear = { count: set.size, date: new Date(parseInt(yearKey), 0, 1) }
    }
  })

  return { bestDay, bestMonth, bestYear }
}

export function calculateRecords(processedData: ProcessedData): RecordData[] {
  const sortedSubmissions = processedData.submissions
  const records: RecordData[] = []

  // 1. One Shot Solves
  let firstTryEasy = 0, firstTryMedium = 0, firstTryHard = 0
  for (const [slug, subs] of processedData.problemMap) {
    if (subs[0].statusCode === 10) {
      const difficulty = subs[0].metadata?.difficulty
      if (difficulty === "Easy") firstTryEasy++
      else if (difficulty === "Medium") firstTryMedium++
      else if (difficulty === "Hard") firstTryHard++
    }
  }
  const oneShotSolves = firstTryEasy + firstTryMedium + firstTryHard
  if (oneShotSolves > 0) {
    let totalUniqueSolved = 0
    for (const subs of processedData.problemMap.values()) {
      if (subs.some((s) => s.statusCode === 10)) totalUniqueSolved++
    }
    const percentage = totalUniqueSolved > 0 ? Math.round((oneShotSolves / totalUniqueSolved) * 100) : 0
    records.push({
      name: "One Shot Solves",
      value: oneShotSolves,
      subStats: { easy: firstTryEasy, medium: firstTryMedium, hard: firstTryHard },
      dateStat: `~${percentage}% of solved problems`
    })
  } else {
    records.push({ name: "One Shot Solves", mainStat: "—", dateStat: "" })
  }

  // 2. Longest Streak
  const streakData = calculateLongestStreak(sortedSubmissions)
  if (streakData.length > 0) {
    records.push({
      name: "Longest Streak",
      mainStat: pluralize(streakData.length, "day"),
      dateStat: `ending on ${formatDate(streakData.endDate)}`
    })
  } else {
    records.push({ name: "Longest Streak", mainStat: "—", dateStat: "" })
  }

  // 3. Longest Break
  const breakData = calculateLongestBreak(sortedSubmissions)
  if (breakData.breakInMs > 0) {
    records.push({
      name: "Longest Break",
      mainStat: formatDuration(breakData.breakInMs),
      dateStat: `on ${formatDate(breakData.date)}`
    })
  } else {
    records.push({ name: "Longest Break", mainStat: "—", dateStat: "" })
  }

  // 4. Busiest Day
  const dayMap = new Map<string, number>()
  for (const sub of sortedSubmissions) {
    const dateKey = sub.date.toDateString()
    dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + 1)
  }
  let busiestDay = "", maxDaySubmissions = 0
  for (const [date, count] of dayMap) {
    if (count > maxDaySubmissions) {
      maxDaySubmissions = count
      busiestDay = date
    }
  }
  if (maxDaySubmissions > 0) {
    records.push({
      name: "Busiest Day",
      mainStat: pluralize(maxDaySubmissions, "submission"),
      dateStat: `on ${formatDate(new Date(busiestDay))}`
    })
  } else {
    records.push({ name: "Busiest Day", mainStat: "—", dateStat: "" })
  }

  // 5-7. Best Periods
  const bestPeriods = calculateBestPeriods(sortedSubmissions)
  if (bestPeriods.bestDay.count > 0) {
    records.push({
      name: "Best Day",
      mainStat: `${pluralize(bestPeriods.bestDay.count, "problem")} solved`,
      dateStat: `on ${formatDate(bestPeriods.bestDay.date)}`
    })
  } else {
    records.push({ name: "Best Day", mainStat: "—", dateStat: "" })
  }

  if (bestPeriods.bestMonth.count > 0) {
    records.push({
      name: "Best Month",
      mainStat: `${pluralize(bestPeriods.bestMonth.count, "problem")} solved`,
      dateStat: `in ${formatMonthYear(bestPeriods.bestMonth.date)}`
    })
  } else {
    records.push({ name: "Best Month", mainStat: "—", dateStat: "" })
  }

  if (bestPeriods.bestYear.count > 0) {
    records.push({
      name: "Best Year",
      mainStat: `${pluralize(bestPeriods.bestYear.count, "problem")} solved`,
      dateStat: `in ${bestPeriods.bestYear.date.getFullYear()}`
    })
  } else {
    records.push({ name: "Best Year", mainStat: "—", dateStat: "" })
  }

  return records
}

export function getDetailedReview(processedData: ProcessedData) {
  const clock = getCodingClockStats(processedData)
  
  let maxHourly = -1
  let peakHourIdx = 19
  clock.hourly.forEach((h, idx) => {
    if (h.attempted > maxHourly) {
      maxHourly = h.attempted
      peakHourIdx = idx
    }
  })

  let bestAccuracy = -1
  let bestHourIdx = -1
  clock.hourly.forEach((h, idx) => {
    if (h.attempted >= 5) {
      const rate = h.accepted / h.attempted
      if (rate > bestAccuracy) {
        bestAccuracy = rate
        bestHourIdx = idx
      }
    }
  })

  let maxDaily = -1
  let peakDayIdx = 1
  clock.daily.forEach((d, idx) => {
    if (d.attempted > maxDaily) {
      maxDaily = d.attempted
      peakDayIdx = idx
    }
  })

  const fullDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const peakHourLabel = HOUR_LABELS_24[peakHourIdx]
  const nextHourLabel = HOUR_LABELS_24[(peakHourIdx + 1) % 24]
  const bestHourLabel = bestHourIdx !== -1 ? HOUR_LABELS_24[bestHourIdx] : "N/A"
  const bestAccuracyPct = bestAccuracy !== -1 ? `${(bestAccuracy * 100).toFixed(1)}%` : "N/A"

  const totalSubs = processedData.submissions.length
  const totalAc = processedData.submissions.filter((s) => s.statusCode === 10).length
  const overallRate = totalSubs > 0 ? `${((totalAc / totalSubs) * 100).toFixed(1)}%` : "0%"

  return {
    peakActiveTime: `${peakHourLabel} – ${nextHourLabel}`,
    peakActiveCount: maxHourly,
    peakAccuracyTime: bestHourLabel,
    peakAccuracyRate: bestAccuracyPct,
    mostActiveDay: fullDays[peakDayIdx] || "Tuesday",
    mostActiveDayCount: maxDaily,
    overallAcceptanceRate: overallRate
  }
}
