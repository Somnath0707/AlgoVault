import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"
import { usePracticeSession } from "../hooks/usePracticeSession"
import { showZenithUnlockConfirmModal, showZenithToast } from "./ZenithSystemOverlay"

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
  const [isZenithRevealed, setIsZenithRevealed] = useState(false)
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null)

  useEffect(() => {
    chrome.storage.local.get([
      "algovault.isZenith",
      "algovault.zenithRevealed",
      "algovault.zenithTargetMinutes"
    ], (result) => {
      setIsZenith(!!result["algovault.isZenith"])
      setIsZenithRevealed(!!result["algovault.zenithRevealed"])
      setTargetMinutes(typeof result["algovault.zenithTargetMinutes"] === "number" ? result["algovault.zenithTargetMinutes"] : null)
    })

    const listener = (changes: any, areaName: string) => {
      if (areaName === "local") {
        if (changes["algovault.isZenith"]) {
          setIsZenith(!!changes["algovault.isZenith"]?.newValue)
        }
        if (changes["algovault.zenithRevealed"]) {
          setIsZenithRevealed(!!changes["algovault.zenithRevealed"]?.newValue)
        }
        if (changes["algovault.zenithTargetMinutes"]) {
          setTargetMinutes(typeof changes["algovault.zenithTargetMinutes"]?.newValue === "number" ? changes["algovault.zenithTargetMinutes"]?.newValue : null)
        }
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

  const handleExitZenith = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    chrome.storage.local.set({
      "algovault.isZenith": false,
      "algovault.zenithRevealed": false
    })
  }

  const handleUnlockSolutions = (e: React.MouseEvent) => {
    e.stopPropagation()
    showZenithUnlockConfirmModal(
      () => {
        chrome.storage.local.set({
          "algovault.zenithRevealed": true,
          "algovault.zenithReason": "Solutions Unlocked"
        })
        setIsZenithRevealed(true)
        showZenithToast("Solutions unlocked for this session")
      },
      () => {
        // Kept focusing
      }
    )
  }

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const checkFs = () => setIsFullscreen(!!document.fullscreenElement)
    checkFs()
    document.addEventListener("fullscreenchange", checkFs)
    return () => document.removeEventListener("fullscreenchange", checkFs)
  }, [])

  const activeMinutes = Math.floor(clocks.activeSeconds / 60)
  const activeRem = String(clocks.activeSeconds % 60).padStart(2, "0")
  const elapsedMinutes = Math.floor(clocks.elapsedSeconds / 60)
  const elapsedRem = String(clocks.elapsedSeconds % 60).padStart(2, "0")

  // Target progress calculation
  const targetSeconds = targetMinutes ? targetMinutes * 60 : null
  const targetProgress = targetSeconds ? Math.min(100, Math.round((clocks.activeSeconds / targetSeconds) * 100)) : null
  const isTargetReached = targetSeconds !== null && clocks.activeSeconds >= targetSeconds

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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-zinc-300 font-mono font-medium hover:border-white/[0.25] transition-all border ${
            clocks.isPaused
              ? "border-[#ffc01e]/60 bg-[#ffc01e]/10 text-[#ffc01e]"
              : isZenith 
                ? isTargetReached
                  ? "border-emerald-500/60 bg-[#18181b]/95 text-zinc-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "border-[#ffa116]/50 bg-[#18181b]/95 text-zinc-200 shadow-[0_0_15px_rgba(255,161,22,0.15)]"
                : "border-white/[0.12] bg-[#282828] hover:bg-[#333333]"
          } shadow-lg cursor-pointer`}
          title={session ? `Active: ${activeMinutes}m ${activeRem}s | Focus: ${clocks.focusScore}%` : "AlgoVault Practice Engine"}
        >
          <span className={`${clocks.isPaused ? 'text-[#ffc01e]' : isZenith ? (isTargetReached ? 'text-emerald-400' : 'text-[#ffa116]') : 'text-[#ffa116]'} text-xs`}>
            {clocks.isPaused ? '⏸️' : isZenith ? (isTargetReached ? '🎯' : '⚡') : '⚡'}
          </span>
          {isZenith && (
            <span className={`font-bold text-[10px] tracking-wider uppercase ${isTargetReached ? 'text-emerald-400' : 'text-[#ffa116]'}`}>
              {isTargetReached ? `${targetMinutes}M GOAL` : 'ZENITH'}
            </span>
          )}
          {session ? (
            <>
              <span className="tabular-nums font-bold">{activeMinutes}:{activeRem}</span>
              {targetMinutes ? (
                <span className="text-[10px] text-zinc-400 font-normal">/{targetMinutes}m</span>
              ) : (
                <span className="text-[10px] text-zinc-400 font-normal">/{elapsedMinutes}:{elapsedRem}</span>
              )}
              {isZenith && (
                <span className="text-[10px] text-emerald-400 font-bold ml-0.5">
                  {clocks.focusScore}%
                </span>
              )}
            </>
          ) : (
            <span className="font-bold text-zinc-400">Ready</span>
          )}
        </button>
      ) : (
        // Expanded Command Surface Layout
        <div className={`w-[220px] rounded-xl border bg-[#18181b] p-3 shadow-2xl transition-all duration-200 ${
          isZenith ? 'border-[#ffa116]/40 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,161,22,0.1)]' : 'border-white/[0.12]'
        }`}>
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
                <span className={`inline-flex rounded-full h-1.5 w-1.5 ${clocks.isPaused ? 'bg-[#ffc01e]' : isZenith ? 'bg-[#ffa116]' : session ? 'bg-[#ffa116]' : 'bg-zinc-600'}`}></span>
              </span>
              <span className="font-bold text-[10px] text-zinc-300 tracking-wider font-mono">
                {clocks.isPaused ? "AV:PAUSED" : isZenith ? "ZENITH:FOCUS" : "AV:SOLVING"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xs font-mono font-semibold tabular-nums ${clocks.isPaused ? 'text-[#ffc01e]' : isZenith ? 'text-[#ffa116]' : 'text-[#ffa116]'}`}>
                {activeMinutes}:{activeRem}
              </span>
              {isZenith && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (document.fullscreenElement) {
                      document.exitFullscreen().catch(() => {})
                    } else {
                      document.documentElement.requestFullscreen().catch(() => {})
                    }
                  }}
                  className="px-1 py-0.5 rounded border border-white/[0.08] bg-[#121214] text-[9px] font-mono text-zinc-400 hover:text-white cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                  {isFullscreen ? "🗗" : "⛶"}
                </button>
              )}
              <button
                onClick={togglePauseTimer}
                className="ml-0.5 px-1.5 py-0.5 rounded border border-white/[0.08] bg-[#121214] text-[9px] font-mono font-bold text-zinc-300 hover:text-white cursor-pointer"
                title={clocks.isPaused ? "Resume Timer" : "Pause Timer"}
              >
                {clocks.isPaused ? "▶️" : "⏸️"}
              </button>
            </div>
          </div>

          {/* Target Progress Bar if set */}
          {targetMinutes && targetProgress !== null && (
            <div className="mb-2 bg-[#121214] border border-white/[0.06] p-1.5 rounded">
              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 mb-1">
                <span>TARGET: {targetMinutes}M</span>
                <span className={isTargetReached ? "text-emerald-400 font-bold" : "text-[#ffa116] font-bold"}>
                  {isTargetReached ? "100% (DONE)" : `${targetProgress}%`}
                </span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${isTargetReached ? 'bg-emerald-400' : 'bg-[#ffa116]'}`}
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-zinc-400 mb-2">
            <div className="flex flex-col items-center bg-[#121214] border border-white/[0.06] py-1.5 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Active time
              </span>
              <span className="font-bold text-[#00b8a3] mt-0.5 tabular-nums">
                {activeMinutes}m {activeRem}s
              </span>
            </div>
            <div className="flex flex-col items-center bg-[#121214] border border-white/[0.06] py-1.5 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                {clocks.isSolved ? "Elapsed to AC" : "Elapsed time"}
              </span>
              <span className="font-bold text-sky-400 mt-0.5 tabular-nums">
                {elapsedMinutes}m {elapsedRem}s
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-zinc-400 mb-2.5">
            <div className="flex flex-col items-center bg-[#121214] border border-white/[0.06] py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Focus
              </span>
              <span className="font-bold mt-0.5 text-emerald-400">
                {clocks.focusScore}%
              </span>
            </div>
            <div className="flex flex-col items-center bg-[#121214] border border-white/[0.06] py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Tabs
              </span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">
                {session?.tabs ?? 0}
              </span>
            </div>
            <div className="flex flex-col items-center bg-[#121214] border border-white/[0.06] py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">
                Paste
              </span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">
                {session?.pastes ?? 0}
              </span>
            </div>
          </div>

          {/* Action: Unlock solutions if locked in Zenith */}
          {isZenith && !isZenithRevealed && (
            <button
              onClick={handleUnlockSolutions}
              className="w-full mb-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🔓</span> Unlock Solutions
            </button>
          )}

          {session && (
            <button
              onClick={handlePushTime}
              className="w-full mb-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>⏱️</span> Push Time to Log
            </button>
          )}

          {session && !clocks.isSolved && (
            <button
              onClick={handleMarkSolved}
              className="w-full mb-1.5 bg-[#00b8a3]/20 hover:bg-[#00b8a3]/30 text-[#00b8a3] border border-[#00b8a3]/40 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✓</span> Mark Solved & Log
            </button>
          )}

          {isZenith ? (
            <button
              onClick={handleExitZenith}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-medium text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer"
            >
              Exit Zenith Mode
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
