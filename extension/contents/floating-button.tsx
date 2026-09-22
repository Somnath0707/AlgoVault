import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"
import { usePracticeSession } from "../hooks/usePracticeSession"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText.replaceAll(':root', ':host(plasmo-csui)')
  return style
}

const FloatingButton = () => {
  const { session, clocks, pauseSession, resumeSession, finishSession, logTimeSession } = usePracticeSession()
  const [expanded, setExpanded] = useState(false)

  // Zenith properties
  const [isZenith, setIsZenith] = useState(false)
  const [zenithGrade, setZenithGrade] = useState("S_PLUS")

  useEffect(() => {
    chrome.storage.local.get([
      "algovault.isZenith",
      "algovault.zenithGrade"
    ], (result) => {
      setIsZenith(!!result["algovault.isZenith"])
      setZenithGrade(result["algovault.zenithGrade"] || "S_PLUS")
    })

    const listener = (changes: any, areaName: string) => {
      if (areaName === "local" && (changes["algovault.isZenith"] || changes["algovault.zenithGrade"])) {
        setIsZenith(!!changes["algovault.isZenith"]?.newValue)
        setZenithGrade(changes["algovault.zenithGrade"]?.newValue || "S_PLUS")
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  const handleOpenPanel = (e: React.MouseEvent) => {
    e.stopPropagation()
    chrome.runtime.sendMessage({ action: "open_side_panel" })
  }

  const togglePauseTimer = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (clocks.isPaused) {
      resumeSession()
    } else {
      pauseSession("MANUAL")
    }
  }

  const handleAbandonZenith = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to abandon this Zenith session? Your quest progress will be lost.")) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      chrome.storage.local.set({
        "algovault.isZenith": false,
        "algovault.zenithGrade": "S_PLUS"
      }, () => {
        location.reload()
      })
    }
  }

  const activeMinutes = Math.floor(clocks.activeSeconds / 60)
  const activeRem = String(clocks.activeSeconds % 60).padStart(2, "0")
  const elapsedMinutes = Math.floor(clocks.elapsedSeconds / 60)
  const elapsedRem = String(clocks.elapsedSeconds % 60).padStart(2, "0")

  const formattedGrade = zenithGrade.replace("_PLUS", "+")

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handlePushTime = (e: React.MouseEvent) => {
    e.stopPropagation()
    logTimeSession()
    setToastMessage("⏱️ Time saved to logs!")
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleMarkSolved = (e: React.MouseEvent) => {
    e.stopPropagation()
    finishSession()
    setToastMessage("🎉 Problem Solved & logged!")
    setTimeout(() => setToastMessage(null), 2500)
  }

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed bottom-6 right-6 z-[9999] transition-all duration-200 ease-in-out font-sans flex flex-col items-end gap-1.5"
    >
      {toastMessage && (
        <div className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-3 py-1.5 rounded-lg shadow-xl animate-bounce">
          {toastMessage}
        </div>
      )}
      {!expanded ? (
        // Collapsed Pill Button
        <button
          onClick={handleOpenPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-zinc-300 font-mono font-medium hover:border-white/[0.2] transition-all border ${
            clocks.isPaused
              ? "border-[#ffc01e]/60 bg-[#ffc01e]/10 text-[#ffc01e]"
              : isZenith 
                ? (activeMinutes >= 25 ? 'border-[#ef4743]/80 text-[#ef4743]' : 'border-[#00b8a3]/50 text-[#00b8a3]')
                : 'border-white/[0.12] bg-[#282828] hover:bg-[#333333]'
          } shadow-lg cursor-pointer`}
          title={session ? `Active: ${activeMinutes}m ${activeRem}s | Elapsed: ${elapsedMinutes}m ${elapsedRem}s` : "AlgoVault Practice Engine"}
        >
          <span className={`${clocks.isPaused ? 'text-[#ffc01e]' : isZenith ? (activeMinutes >= 25 ? 'text-[#ef4743]' : 'text-[#00b8a3]') : 'text-[#ffa116]'} text-xs`}>
            {clocks.isPaused ? '⏸️' : isZenith ? `⚔️ ${formattedGrade}` : '⚡'}
          </span>
          {session ? (
            <>
              <span className="tabular-nums font-bold">{activeMinutes}:{activeRem}</span>
              <span className="text-[10px] text-zinc-400 font-normal">/{elapsedMinutes}:{elapsedRem}</span>
            </>
          ) : (
            <span className="font-bold text-zinc-400">Ready</span>
          )}
        </button>
      ) : (
        // Expanded Command Surface Layout
        <div className={`w-[210px] rounded-xl border bg-[#282828] p-3 shadow-2xl transition-all duration-200 ${
          isZenith ? 'border-[#00b8a3]/40' : 'border-white/[0.12]'
        }`}>
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
                <span className={`inline-flex rounded-full h-1.5 w-1.5 ${clocks.isPaused ? 'bg-[#ffc01e]' : isZenith ? 'bg-[#00b8a3]' : session ? 'bg-[#ffa116]' : 'bg-zinc-600'}`}></span>
              </span>
              <span className="font-bold text-[10px] text-zinc-300 tracking-wider font-mono">
                {clocks.isPaused ? "AV:PAUSED" : isZenith ? "AV:ZENITH" : "AV:SOLVING"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-mono font-semibold tabular-nums ${clocks.isPaused ? 'text-[#ffc01e]' : isZenith ? 'text-[#00b8a3]' : 'text-[#ffa116]'}`}>
                {activeMinutes}:{activeRem}
              </span>
              <button
                onClick={togglePauseTimer}
                className="ml-1 px-1.5 py-0.5 rounded border border-white/[0.08] bg-[#1a1a1a] text-[9px] font-mono font-bold text-zinc-300 hover:text-white cursor-pointer"
                title={clocks.isPaused ? "Resume Timer" : "Pause Timer"}
              >
                {clocks.isPaused ? "▶️" : "⏸️"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-zinc-400 mb-2">
            <div className="flex flex-col items-center bg-[#1a1a1a] border border-white/[0.08] py-1.5 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Active time
              </span>
              <span className="font-bold text-[#00b8a3] mt-0.5 tabular-nums">
                {activeMinutes}m {activeRem}s
              </span>
            </div>
            <div className="flex flex-col items-center bg-[#1a1a1a] border border-white/[0.08] py-1.5 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                {clocks.isSolved ? "Elapsed to AC" : "Elapsed time"}
              </span>
              <span className="font-bold text-sky-400 mt-0.5 tabular-nums">
                {elapsedMinutes}m {elapsedRem}s
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-zinc-400 mb-2.5">
            <div className="flex flex-col items-center bg-[#1a1a1a] border border-white/[0.08] py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                {isZenith ? "Grade" : "Focus"}
              </span>
              <span className={`font-bold mt-0.5 ${isZenith ? 'text-[#00b8a3]' : 'text-zinc-200'}`}>
                {isZenith ? formattedGrade : `${clocks.focusScore}%`}
              </span>
            </div>
            <div className="flex flex-col items-center bg-[#1a1a1a] border border-white/[0.08] py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Tabs
              </span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">
                {session?.tabs ?? 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-[#1a1a1a] border border-white/[0.08] py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Paste
              </span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">
                {session?.pastes ?? 0}
              </span>
            </div>
          </div>

          {session && (
            <button
              onClick={handlePushTime}
              className="w-full mb-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⏱️</span> Push Time to Practice Log
            </button>
          )}

          {session && !clocks.isSolved && (
            <button
              onClick={handleMarkSolved}
              className="w-full mb-1.5 bg-[#00b8a3]/20 hover:bg-[#00b8a3]/30 text-[#00b8a3] border border-[#00b8a3]/40 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✓</span> Mark Solved & Log Time
            </button>
          )}

          {isZenith ? (
            <button
              onClick={handleAbandonZenith}
              className="w-full bg-[#ef4743]/20 hover:bg-[#ef4743]/30 text-[#ef4743] border border-[#ef4743]/40 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer"
            >
              Abandon Quest
            </button>
          ) : (
            <button
              onClick={handleOpenPanel}
              className="w-full bg-[#ffa116] hover:bg-[#ffa116]/90 text-zinc-950 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer"
            >
              Open Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default FloatingButton
