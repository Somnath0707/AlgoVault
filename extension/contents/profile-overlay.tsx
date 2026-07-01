import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useState, useEffect } from "react"
import { getUsername as getConfiguredUsername } from "../lib/storage"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/u/*"],
  all_frames: true
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  return document.body
}

export default function ProfileOverlay() {
  const [isOpen, setIsOpen] = useState(false) // Toggle panel state
  const [view, setView] = useState<"contests" | "settings">("contests") // View state
  const [username, setUsername] = useState<string>("")
  const [contests, setContests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isConfiguredProfile, setIsConfiguredProfile] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState("")

  // Expanded contest state
  const [expandedContestId, setExpandedContestId] = useState<number | null>(null)
  const [questionsMap, setQuestionsMap] = useState<Record<string, any[]>>({})
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null)

  // Settings states
  const [celebrationOverlay, setCelebrationOverlay] = useState(true)
  const [celebrationSound, setCelebrationSound] = useState(true)
  const [celebrationTheme, setCelebrationTheme] = useState("gta")

  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/u\/([^\/]+)/)
    if (match) {
      const u = match[1]
      setUsername(u)
      // Check if this is the configured (own) profile (clean quotes/whitespace for bulletproof matching)
      getConfiguredUsername().then((configured) => {
        const cleanConfig = configured ? configured.replace(/^["']|["']$/g, "").trim().toLowerCase() : ""
        const cleanUser = u ? u.replace(/^["']|["']$/g, "").trim().toLowerCase() : ""
        const matches = Boolean(cleanConfig && cleanConfig === cleanUser)
        setIsConfiguredProfile(matches)
      })
      // Always fetch contest data — it's public GraphQL, works for any user
      fetchContestData(u)
    }

    // Load Settings — use chrome.storage.sync with keys matching solve-celebration.tsx
    chrome.storage.sync.get(
      ["celebrationOverlay", "celebrationSound", "celebrationTheme"],
      (res) => {
        if (res.celebrationOverlay !== undefined) setCelebrationOverlay(res.celebrationOverlay)
        if (res.celebrationSound !== undefined) setCelebrationSound(res.celebrationSound)
        if (res.celebrationTheme !== undefined) setCelebrationTheme(res.celebrationTheme)
      }
    )
  }, [])

  const fetchContestData = async (activeUser?: string) => {
    const currentUsername = activeUser || username
    if (!currentUsername) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      // 1. Fetch live history directly from LeetCode public GraphQL (no sync required)
      const lcRes: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "get_user_contest_history",
          payload: { username: currentUsername }
        }, resolve)
      })

      // 2. Fetch history from EntrantHub (for rating predictions fallback)
      const ehRes: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "get_entranthub_history",
          payload: { username: currentUsername }
        }, resolve)
      })

      let formattedBackend: any[] = []
      if (lcRes && lcRes.ok && lcRes.data) {
        const rankingHistory = lcRes.data.userContestRankingHistory || []
        const attended = rankingHistory.filter((c: any) => c.attended)

        formattedBackend = attended.map((c: any, i: number) => {
          const prev = attended[i - 1]
          const ratingDelta = prev ? (c.rating - prev.rating) : 0

          return {
            id: i,
            title: c.contest.title,
            titleSlug: c.contest.titleSlug,
            ranking: c.ranking ? `#${c.ranking}` : "Unranked",
            solved: c.problemsSolved ?? 0,
            total: c.totalProblems ?? 4,
            delta: ratingDelta,
            predictedDelta: null,
            contestDate: new Date(c.contest.startTime * 1000).toISOString(),
            ratingBefore: prev ? prev.rating : 1500,
            ratingAfter: c.rating,
            submissions: []
          }
        })
      }

      // Fallback to backend local data if LeetCode direct fetch failed
      if (formattedBackend.length === 0) {
        const res: any = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "get_contests_backend" }, resolve)
        })
        if (res && !res.error && Array.isArray(res)) {
          formattedBackend = res.map((c: any, i: number) => {
            const contestSlug = c.contestTitle.toLowerCase().replace(/ /g, '-')
            return {
              id: i,
              title: c.contestTitle,
              titleSlug: contestSlug,
              ranking: c.rank ? `#${c.rank}` : "Unranked",
              solved: c.problemsSolved ?? 0,
              total: c.totalProblems,
              delta: c.ratingDelta,
              predictedDelta: null,
              contestDate: c.contestDate,
              ratingBefore: c.ratingBefore,
              ratingAfter: c.ratingAfter,
              submissions: c.questionDetails?.submissions || []
            }
          })
        }
      }

      const merged = [...formattedBackend]
      const backendSlugs = new Set(formattedBackend.map((c: any) => c.titleSlug))

      if (ehRes && ehRes.ok && Array.isArray(ehRes.data)) {
        for (const item of ehRes.data) {
          // EntrantHub history shape: { titleSlug, ranking, newRating, oldRating, finishTimeInSeconds, attendedContestsCount }
          const ehSlug = (item.titleSlug || "").toLowerCase()
          if (!ehSlug) continue

          // Derive a readable title from the slug
          const ehTitle = ehSlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
          const ehRank = item.ranking ?? null
          const ehNewRating = item.newRating ?? null
          const ehOldRating = item.oldRating ?? null
          const ehDelta = (ehNewRating !== null && ehOldRating !== null) ? (ehNewRating - ehOldRating) : null

          if (backendSlugs.has(ehSlug)) {
            const existing = merged.find(c => c.titleSlug === ehSlug)
            if (existing) {
              if ((!existing.delta || existing.delta === 0) && ehDelta !== null) {
                existing.predictedDelta = ehDelta
              }
              if (!existing.ratingAfter && ehNewRating) {
                existing.ratingAfter = ehNewRating
              }
              if (!existing.ratingBefore && ehOldRating) {
                existing.ratingBefore = ehOldRating
              }
            }
          } else {
            merged.push({
              id: merged.length,
              title: ehTitle,
              titleSlug: ehSlug,
              ranking: ehRank ? `#${ehRank}` : "Unranked",
              solved: 0,
              total: 0,
              delta: null,
              predictedDelta: ehDelta,
              contestDate: null,
              ratingBefore: ehOldRating,
              ratingAfter: ehNewRating,
              submissions: [],
              isUnofficial: true
            })
            backendSlugs.add(ehSlug)
          }
        }
      }

      // Sort merged contests descending
      merged.sort((a, b) => {
        const timeA = a.contestDate ? new Date(a.contestDate).getTime() : 0
        const timeB = b.contestDate ? new Date(b.contestDate).getTime() : 0
        if (timeA && timeB) {
          return timeB - timeA
        }
        const getContestVal = (slug: string) => {
          const weeklyMatch = slug.match(/weekly-contest-(\d+)/)
          if (weeklyMatch) return parseInt(weeklyMatch[1]) * 2
          const biweeklyMatch = slug.match(/biweekly-contest-(\d+)/)
          if (biweeklyMatch) return parseInt(biweeklyMatch[1]) * 2.8
          return 0
        }
        return getContestVal(b.titleSlug) - getContestVal(a.titleSlug)
      })

      // Try parallel fallback prediction query if there are still any missing deltas/predictions
      const enhanced = await Promise.all(merged.map(async (c: any) => {
        if ((c.delta === null || c.delta === 0) && c.predictedDelta === null) {
          try {
            const predRes: any = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                action: "get_entranthub_prediction",
                payload: { contestSlug: c.titleSlug, username: currentUsername }
              }, resolve)
            })
            if (predRes && predRes.ok && predRes.data) {
              // EntrantHub realtime shape: { ranks: number[], ratings: number[] }
              const ehData = predRes.data
              const ratings = ehData.ratings
              if (ratings && Array.isArray(ratings) && ratings.length >= 2) {
                const predictedDelta = ratings[ratings.length - 1] - ratings[0]
                c.predictedDelta = predictedDelta
              }
            }
          } catch (e) {
            console.error("Failed to fetch fallback EntrantHub prediction", e)
          }
        }
        return c
      }))

      setContests(enhanced)
    } catch (e) {
      console.error("AlgoVault failed to fetch contests", e)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setScanning(true)
    setScanStatus("Fetching contest history...")
    await fetchContestData(username)
    setScanning(false)
    setScanStatus("")
  }

  const toggleExpandContest = async (contest: any) => {
    if (expandedContestId === contest.id) {
      setExpandedContestId(null)
      return
    }
    setExpandedContestId(contest.id)

    if (questionsMap[contest.titleSlug]) return // Already fetched

    setLoadingQuestions(contest.titleSlug)
    try {
      // Fetch contest questions from LeetCode GraphQL
      const qRes: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: "get_contest_questions",
          payload: { contestSlug: contest.titleSlug }
        }, resolve)
      })

      // Background already unwraps: fetchContestQuestions returns the array directly
      const questionList = (qRes?.ok && Array.isArray(qRes.data)) ? qRes.data : []

      if (questionList.length > 0) {
        const mappedQuestions = await Promise.all(questionList.map(async (q: any) => {
          let report: any = { status: 'SKIPPED', label: 'No Data', color: 'text-zinc-500', details: ['No data'], pasteCount: 0, focusLoss: 0 }
          let isAccepted = false
          let attemptStatus = null

          try {
            const replayRes: any = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                action: "get_replay_events",
                payload: { username: username, contestSlug: contest.titleSlug, questionSlug: q.titleSlug }
              }, resolve)
            })
            
            const events = (replayRes?.ok && Array.isArray(replayRes.data)) ? replayRes.data : []
            if (events.length > 0) {
              for (const e of events) {
                const type = parseInt(e.eventType, 10)
                if (type === 5) {
                  try {
                    const data = JSON.parse(e.eventData)
                    if (data.result && data.result.status === 10) { isAccepted = true; break }
                    else if (data.result) { attemptStatus = data.result.status }
                  } catch (err) {}
                }
              }

              let pasteCount = 0
              let focusLoss = 0
              const HEAVY_THRESHOLD = 500
              const MILD_THRESHOLD = 100
              const detectedPastes: string[] = []

              events.forEach((e: any) => {
                const type = parseInt(e.eventType, 10)
                if (type === 3) {
                  if (e.eventData.includes('"val": false') || e.eventData.includes('"val":false')) focusLoss++
                }
                if ((type === 7 || type === 10) && e.eventData) {
                  try {
                    const data = JSON.parse(e.eventData)
                    const isInternal = data.isFromInside === true
                    if (data.change && data.change.changes) {
                      data.change.changes.forEach((change: any) => {
                        const insertedLen = (change.insert || "").length
                        if (insertedLen > 0 && !isInternal && insertedLen > MILD_THRESHOLD && type === 10) {
                          pasteCount++
                          const dateStr = e.timestamp ? new Date(parseInt(e.timestamp, 10)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''
                          const timePrefix = dateStr ? `[${dateStr}] ` : ''
                          let snippet = change.insert.trim().substring(0, 40).replace(/\n/g, ' ')
                          if (change.insert.length > 40) snippet += '...'
                          if (insertedLen > HEAVY_THRESHOLD) {
                            detectedPastes.push(`${timePrefix}Large Ext. Paste (${insertedLen}c): "${snippet}"`)
                          } else {
                            detectedPastes.push(`${timePrefix}Small Ext. Paste (${insertedLen}c): "${snippet}"`)
                          }
                        }
                      })
                    }
                  } catch (err) {}
                }
              })

              let status = 'CLEAN'
              let label = 'Manual Typing'
              let color = 'text-emerald-500'
              const hasHeavyPaste = detectedPastes.some(d => d.includes('Large Ext. Paste'))
              if (hasHeavyPaste) { status = 'HEAVY_PASTE'; label = 'Large Paste'; color = 'text-rose-500' }
              else if (pasteCount > 0) { status = 'MILD_PASTE'; label = 'Small Paste'; color = 'text-amber-500' }
              
              if (!isAccepted) { 
                const msg = attemptStatus ? `Not Accepted (Status ${attemptStatus})` : `No Submission`;
                status = 'SKIPPED'; 
                label = 'Skipped'; 
                color = 'text-zinc-500';
                report = { status, label, color, details: [msg], pasteCount: 0, focusLoss: 0 }
              } else {
                report = { status, label, color, details: detectedPastes, pasteCount, focusLoss }
              }
            } else {
               report = { status: 'SKIPPED', label: 'Skipped', color: 'text-zinc-500', details: ['No Submission'], pasteCount: 0, focusLoss: 0 }
            }
          } catch (e) {
            console.error(e)
          }

          return {
            titleSlug: q.titleSlug,
            title: q.titleUs || q.title || q.titleSlug,
            status: isAccepted ? "Accepted" : (attemptStatus ? "Wrong Answer" : "Skipped"),
            tabSwitches: report.focusLoss,
            typingType: report.label,
            reportColor: report.color,
            statusLabel: report.status,
            details: report.details || []
          }
        }))
        setQuestionsMap(prev => ({ ...prev, [contest.titleSlug]: mappedQuestions }))
      }
    } catch (e) {
      console.error("Failed to load contest questions list", e)
    } finally {
      setLoadingQuestions(null)
    }
  }

  // Toggle settings
  const handleToggleCelebration = () => {
    const val = !celebrationOverlay
    setCelebrationOverlay(val)
    chrome.storage.sync.set({ celebrationOverlay: val })
  }

  const handleToggleSound = () => {
    const val = !celebrationSound
    setCelebrationSound(val)
    chrome.storage.sync.set({ celebrationSound: val })
  }

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setCelebrationTheme(val)
    chrome.storage.sync.set({ celebrationTheme: val })
  }

  // Floating Green Circle trigger button when panel is closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#09090b] border border-zinc-800 flex items-center justify-center shadow-2xl hover:border-[#10b981] hover:scale-105 transition-all z-[9999] group"
      >
        <div className="w-6 h-6 rounded-full border-2 border-[#10b981] flex items-center justify-center relative">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
        </div>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-[360px] bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 z-[9999] overflow-hidden font-sans text-zinc-100 flex flex-col elevated-floating animate-fade-in">
      
      {/* Header section rebranded to AlgoVault */}
      <div className="p-4 border-b border-zinc-850 flex justify-between items-center bg-zinc-950/40">
        <div className="flex items-center gap-3">
          {/* Circular AV Logo */}
          <div className="w-9 h-9 rounded-full border border-[#10b981]/30 flex items-center justify-center bg-[#10b981]/10">
            <span className="text-[#10b981] font-extrabold text-sm tracking-wider">AV</span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide leading-tight text-zinc-100">AlgoVault</h1>
            <p className="text-[10px] text-zinc-400 font-mono">@{username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Settings gear */}
          <button
            onClick={() => setView(view === "settings" ? "contests" : "settings")}
            className={`p-1.5 rounded-lg transition-colors border ${
              view === "settings" ? "bg-zinc-800 border-zinc-700 text-[#10b981]" : "border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
          </button>
          {/* Close panel */}
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-850 text-zinc-400 hover:text-zinc-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {view === "settings" ? (
        /* Settings Drawer exactly matching mockups */
        <div className="p-4 flex flex-col gap-4 max-h-[440px] overflow-y-auto">
          <h2 className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">SETTINGS</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">Appearance</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900">
                  <div>
                    <div className="text-[11px] font-medium text-zinc-200">Celebration Mode</div>
                    <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Show GTA-style banner on submission</div>
                  </div>
                  <button
                    onClick={handleToggleCelebration}
                    className={`w-8 h-4.5 rounded-full relative transition-colors shrink-0 ${celebrationOverlay ? 'bg-[#10b981]' : 'bg-zinc-850'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-zinc-950 absolute top-0.5 transition-all ${celebrationOverlay ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex justify-between items-center bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900">
                  <div>
                    <div className="text-[11px] font-medium text-zinc-200">Sound Effects</div>
                    <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Play Wasted / Mission Passed audio</div>
                  </div>
                  <button
                    onClick={handleToggleSound}
                    className={`w-8 h-4.5 rounded-full relative transition-colors shrink-0 ${celebrationSound ? 'bg-[#10b981]' : 'bg-zinc-850'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-zinc-950 absolute top-0.5 transition-all ${celebrationSound ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Theme</h3>
              <div className="bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-900 space-y-2">
                <select
                  value={celebrationTheme}
                  onChange={handleThemeChange}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#10b981] font-mono cursor-pointer"
                >
                  <option value="gta">GTA San Andreas</option>
                  <option value="minecraft">Minecraft</option>
                </select>
                <div className="text-[9px] text-zinc-500 font-mono">Controls banner visuals and sound style.</div>
              </div>
            </div>

            <div className="text-[9.5px] text-zinc-600 font-mono text-center pt-2">
              Settings are saved automatically to your browser.
            </div>
          </div>
        </div>
      ) : (
        /* Contest list view */
        <div className="p-4 flex flex-col gap-3 max-h-[440px] overflow-y-auto">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">CONTEST HISTORY</span>
            <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-850">
              {contests.length > 0 ? contests.length : '0'}
            </span>
          </div>

          {/* Scan Button section */}
          <div className="relative">
            {scanning ? (
              <div className="w-full bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl font-mono text-[10px] text-zinc-400 text-center flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
                <span>{scanStatus}</span>
              </div>
            ) : (
              <button
                onClick={handleScan}
                className="w-full bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#059669] text-zinc-950 font-bold text-xs py-2.5 px-4 rounded-xl transition-all border border-[#10b981]/20 font-sans tracking-wide active:scale-98"
              >
                Scan Last 5 Contests
              </button>
            )}
          </div>

          {!isConfiguredProfile && (
            <div className="text-[11px] text-zinc-400 border border-zinc-850 bg-zinc-900/30 rounded-xl p-3 leading-relaxed font-mono">
              ⚠️ This profile does not match the username configured in Settings.
            </div>
          )}

          {loading && contests.length === 0 && (
            <div className="text-[11px] text-zinc-500 font-mono py-4 text-center animate-pulse">
              Loading synced contest history...
            </div>
          )}

          {/* Contest List with expandable dropdown */}
          <div className="flex flex-col gap-2">
            {contests.map((contest, i) => {
              const isExpanded = expandedContestId === contest.id
              const questions = questionsMap[contest.titleSlug] || []
              const isQuestionsLoading = loadingQuestions === contest.titleSlug

              return (
                <div key={i} className="rounded-xl border border-zinc-850 bg-zinc-900/20 overflow-hidden hover:border-zinc-800/80 transition-colors">
                  <div
                    onClick={() => toggleExpandContest(contest)}
                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-zinc-900/10 transition-colors"
                  >
                    <div>
                      <h3 className="font-bold text-xs text-zinc-200">{contest.title}</h3>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>Global Ranking</span>
                        {contest.delta != null && contest.delta !== 0 ? (
                          <span className={`text-[9px] px-1 py-0.2 rounded font-semibold font-mono ${
                            contest.delta > 0 ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {contest.ratingAfter ? `${Math.round(contest.ratingAfter)} (${contest.delta > 0 ? "+" : ""}${Math.round(contest.delta)})` : `${contest.delta > 0 ? "+" : ""}${Math.round(contest.delta)}`}
                          </span>
                        ) : contest.predictedDelta != null ? (
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold font-mono bg-[#dfa054]/10 text-[#dfa054] animate-pulse">
                            Est: {contest.ratingAfter ? `${Math.round(contest.ratingAfter)} (${contest.predictedDelta > 0 ? "+" : ""}${Math.round(contest.predictedDelta)})` : `${contest.predictedDelta > 0 ? "+" : ""}${Math.round(contest.predictedDelta)}`}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-650 font-semibold font-mono bg-zinc-950 px-1 py-0.2 rounded border border-zinc-850">
                            Pending
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono text-zinc-400 font-medium">{contest.ranking}</span>
                      
                      {/* Play button opens user's exact ranking page */}
                      {(() => {
                        const rkStr = typeof contest.ranking === 'string' ? contest.ranking.replace(/\D/g, '') : String(contest.ranking)
                        const rk = parseInt(rkStr, 10) || 1
                        const pg = Math.ceil(rk / 25)
                        const repUrl = `https://leetcode.com/contest/${contest.titleSlug}/ranking/${pg}/?region=global`
                        return (
                          <a
                            href={repUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] hover:bg-[#10b981] hover:text-zinc-950 transition-colors"
                            title="Go to my ranking page"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </a>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Expandable Contest Problem List */}
                  {isExpanded && (
                    <div className="border-t border-zinc-900 bg-zinc-950/45 px-3 py-2.5 space-y-2">
                      {isQuestionsLoading ? (
                        <div className="text-[9.5px] text-zinc-650 font-mono animate-pulse py-1">
                          Analyzing contest details...
                        </div>
                      ) : questions.length > 0 ? (
                        questions.map((q: any, idx: number) => {
                          const isAc = q.status === "Accepted"
                          const isSkipped = q.status === "Skipped"
                          return (
                            <div key={idx} className="flex justify-between items-start text-[10px] py-1 border-b border-zinc-900/40 last:border-0">
                              <div className="max-w-[210px]">
                                <div className="text-zinc-300 font-medium truncate" title={q.title}>
                                  {q.title}
                                </div>
                                <div className="text-[8.5px] text-zinc-500 font-mono mt-0.5 flex flex-col gap-0.5">
                                  {!isSkipped && (
                                    <>
                                      <span>• Tab Switches: {q.tabSwitches}x</span>
                                      <span>• Verdict: {q.typingType}</span>
                                      {q.details && q.details.map((d: string, dIdx: number) => (
                                        <span key={dIdx} className="text-red-400 font-medium">• {d}</span>
                                      ))}
                                    </>
                                  )}
                                  {isSkipped && <span>• No Submission</span>}
                                </div>
                              </div>
                              <span className={`font-mono text-[9px] font-semibold tracking-wider ${q.reportColor || (isSkipped ? 'text-zinc-500' : 'text-zinc-400')}`}>
                                {q.statusLabel || (isSkipped ? "Skipped" : isAc ? "Accepted" : "Manual Typing")}
                              </span>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-[9.5px] text-zinc-650 font-mono py-1">
                          No problem records found for this contest.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {contests.length > 0 && (
            <div className="mt-2 text-center text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
              AlgoVault • v1.1
            </div>
          )}
        </div>
      )}
    </div>
  )
}
