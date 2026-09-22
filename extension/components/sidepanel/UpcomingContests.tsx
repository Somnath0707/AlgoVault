import { useEffect, useState, useMemo } from "react"
import { motion } from "framer-motion"
import { Clock, CalendarDays, Trophy } from "lucide-react"
import { fetchEntrantHubUpcomingBackend } from "../../lib/api/backend"
import type { EntrantHubContest } from "../../lib/api/entranthub"

const formatCountdown = (ms: number) => {
  if (ms <= 0) return "Started"
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

const LeetCodeLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-amber-500">
    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.939 5.939 0 0 0 1.271 1.541l5.967 5.68c.231.22.544.326.835.336.236.036.474.01.707-.073.227-.082.401-.223.513-.42.156-.259.194-.582.104-.874-.052-.162-.136-.316-.249-.44l-5.73-5.46a3.84 3.84 0 0 1-1.059-1.224 3.967 3.967 0 0 1-.302-1.076 3.737 3.737 0 0 1-.031-1.085 3.84 3.84 0 0 1 .47-1.155 3.99 3.99 0 0 1 .792-.93l6.16-6.512c.189-.2.285-.47.26-.745-.025-.276-.172-.518-.403-.66-.201-.113-.443-.138-.663-.07-.22.067-.406.216-.518.42L8.586 10.618l.82 1.396c.215.358.556.592.95.66.393.067.8-.02 1.135-.24.335-.22.56-.566.626-.95.067-.384-.025-.783-.255-1.109L9.42 6.55 13.91 1.77c.18-.182.269-.434.246-.688-.023-.253-.16-.474-.374-.614-.15-.098-.329-.142-.5-.13z"/>
  </svg>
)

const CodeforcesLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-blue-500">
    <path d="M4.5 7.5A1.5 1.5 0 0 1 6 9v10.5A1.5 1.5 0 0 1 4.5 21h-3A1.5 1.5 0 0 1 0 19.5V9A1.5 1.5 0 0 1 1.5 7.5h3zm9-4.5A1.5 1.5 0 0 1 15 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 10.5 3h3zm9 7.5A1.5 1.5 0 0 1 24 12v7.5a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5V12a1.5 1.5 0 0 1 1.5-1.5h3z"/>
  </svg>
)

const AtCoderLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-zinc-100">
    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.172 13.172a.5.5 0 0 1-.707 0L12 12.707l-2.465 2.465a.5.5 0 0 1-.707-.707l2.465-2.465-2.465-2.465a.5.5 0 0 1 .707-.707l2.465 2.465 2.465-2.465a.5.5 0 0 1 .707.707L12.707 12l2.465 2.465a.5.5 0 0 1 0 .707z"/>
  </svg>
)

const CodeChefLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-orange-500">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
  </svg>
)

const getPlatformLogo = (platform: string) => {
  if (platform.toLowerCase().includes("leetcode")) return <LeetCodeLogo />
  if (platform.toLowerCase().includes("codeforces")) return <CodeforcesLogo />
  if (platform.toLowerCase().includes("atcoder")) return <AtCoderLogo />
  if (platform.toLowerCase().includes("codechef")) return <CodeChefLogo />
  return <Trophy size={16} className="text-zinc-400" />
}

export const UpcomingContests = () => {
  const [contests, setContests] = useState<EntrantHubContest[]>([])
  const [registered, setRegistered] = useState<string[]>([])
  const [autoRegistered, setAutoRegistered] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [now, setNow] = useState(Date.now())

  // Live countdown tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Fetch upcoming contests
    fetchEntrantHubUpcomingBackend()
      .then((data) => {
        if (Array.isArray(data)) setContests(data)
        else setError("Upcoming contests are temporarily unavailable")
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message || "Upcoming contests are temporarily unavailable")
        setLoading(false)
      })

    // Load registered contests from storage
    chrome.storage.local.get(["algovault.registeredContests"], (res) => {
      let regList = res["algovault.registeredContests"]
      if (typeof regList === "string") {
        try { regList = JSON.parse(regList) } catch (e) {}
      }
      if (Array.isArray(regList)) setRegistered(regList)
    })

    // Auto-detect LeetCode registered contests
    chrome.runtime.sendMessage({ action: "get_registered_contests" }, (res) => {
      if (res?.ok && Array.isArray(res.data)) {
        setAutoRegistered(new Set(res.data.map((c: any) => String(c))))
      }
    })
  }, [])

  const toggleRegistered = (contestId: string) => {
    const next = registered.includes(contestId)
      ? registered.filter((id) => id !== contestId)
      : [...registered, contestId]
    setRegistered(next)
    chrome.storage.local.set({ "algovault.registeredContests": next })
  }

  const groupedContests = useMemo(() => {
    const leetcode = contests.filter(c => c.platform.toLowerCase().includes("leetcode"))
    const codeforces = contests.filter(c => c.platform.toLowerCase().includes("codeforces"))
    const others = contests.filter(c => !c.platform.toLowerCase().includes("leetcode") && !c.platform.toLowerCase().includes("codeforces"))
    
    return [
      { id: "leetcode", title: "LeetCode", contests: leetcode, Logo: LeetCodeLogo, color: "text-[#ffa116]", border: "border-white/[0.08]", bg: "bg-[#282828]" },
      { id: "codeforces", title: "Codeforces", contests: codeforces, Logo: CodeforcesLogo, color: "text-blue-500", border: "border-white/[0.08]", bg: "bg-[#282828]" },
      { id: "others", title: "Other Platforms", contests: others, Logo: Trophy, color: "text-purple-400", border: "border-white/[0.08]", bg: "bg-[#282828]" }
    ].filter(group => group.contests.length > 0)
  }, [contests])

  if (loading) return <div className="p-4 text-center text-zinc-500 font-mono text-[10px]">Loading upcoming contests...</div>
  if (error) return <div className="p-4 text-center text-red-400 font-mono text-[10px]">{error}</div>

  return (
    <div className="flex flex-col gap-4">
      {groupedContests.length === 0 ? (
        <div className="text-center text-zinc-500 font-mono text-[10px] py-4">No upcoming contests found.</div>
      ) : groupedContests.map((group, gIdx) => (
        <div key={group.id} className="flex flex-col gap-2">
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-1 px-1">
            <div className={`w-4 h-4 shrink-0 ${group.color}`}>
              <group.Logo />
            </div>
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">{group.title}</h3>
            <div className="flex-1 h-px bg-white/[0.06] ml-2" />
          </div>

          {/* Contests List */}
          <div className="flex flex-col gap-2.5">
            {group.contests.map((contest, i) => {
              const date = new Date(contest.startTime)
              const isToday = date.toDateString() === new Date().toDateString()
              const isReg = registered.includes(contest.id) || autoRegistered.has(contest.id)
              const remaining = date.getTime() - now
              const isUrgent = remaining > 0 && remaining < 3600000 // < 1 hour
              const durationHours = contest.durationSeconds / 3600
              const durationLabel = durationHours >= 1
                ? `${Math.round(durationHours * 10) / 10}h`
                : `${Math.round(contest.durationSeconds / 60)}m`

              return (
                <motion.div
                  key={`${contest.platform}:${contest.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (gIdx * 0.1) + (i * 0.05) }}
                  className={[
                    "p-3 rounded-lg transition-all duration-200",
                    "elevated-card",
                    isToday
                      ? "border border-[#00b8a3]/40 bg-[#282828]"
                      : "border border-white/[0.08] bg-[#282828] hover:bg-[#333333]/50",
                    isReg
                      ? "border-l-2 border-l-[#00b8a3] bg-[#00b8a3]/5"
                      : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <a
                      href={contest.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-zinc-200 hover:text-[#00b8a3] transition-colors line-clamp-1 flex-1 min-w-0"
                    >
                      {contest.name}
                    </a>
                    {group.id === "others" && (
                      <span className="shrink-0 flex items-center gap-1.5 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border border-white/[0.08] bg-[#1a1a1a] text-zinc-300">
                        <div className="w-3 h-3">{getPlatformLogo(contest.platform)}</div>
                        {contest.platform}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mb-2 text-[10px] text-zinc-400 font-mono">
                    <CalendarDays size={11} className="text-zinc-500 shrink-0" />
                    {isToday && (
                      <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-[#00b8a3]" />
                      </span>
                    )}
                    <span className={isToday ? "text-[#00b8a3] font-semibold" : ""}>
                      {isToday ? "Today, " : ""}
                      {date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-1 text-[10px] font-mono font-bold ${isUrgent ? "text-red-400" : remaining <= 0 ? "text-zinc-500" : "text-zinc-300"}`}>
                      <Clock size={11} className="shrink-0" />
                      <span>{formatCountdown(remaining)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#1a1a1a] text-zinc-400 text-[9px] font-mono border border-white/[0.08]">
                        {durationLabel}
                      </span>
                      <button
                        onClick={() => toggleRegistered(contest.id)}
                        disabled={autoRegistered.has(contest.id)}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                          isReg 
                            ? "bg-[#00b8a3]/10 text-[#00b8a3] border border-[#00b8a3]/20 cursor-default" 
                            : "bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/20 hover:bg-[#ffa116]/20 cursor-pointer"
                        }`}
                      >
                        {autoRegistered.has(contest.id) ? "Auto-Reg" : isReg ? "Registered" : "Register"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
