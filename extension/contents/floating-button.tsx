import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText.replaceAll(':root', ':host(plasmo-csui)')
  return style
}

const FloatingButton = () => {
  const [session, setSession] = useState<any>(null)
  const [sessionState, setSessionState] = useState<any>(null)
  const [problemStartTime, setProblemStartTime] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const load = () => {
      chrome.storage.local.get(["algovault.currentSession", "algovault.sessionState", "algovault.problemStartTime"], (result) => {
        let sess = result["algovault.currentSession"]
        if (typeof sess === "string") {
          try { sess = JSON.parse(sess) } catch (e) {}
        }
        let state = result["algovault.sessionState"]
        if (typeof state === "string") {
          try { state = JSON.parse(state) } catch (e) {}
        }
        setSession(sess || null)
        setSessionState(state || null)
        setProblemStartTime(result["algovault.problemStartTime"] || null)
      })
    }
    load()
    const interval = window.setInterval(() => {
      load()
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (sessionState?.isSolved) return
    const interval = window.setInterval(() => {
      setElapsed((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [sessionState])

  const handleOpenPanel = (e: React.MouseEvent) => {
    e.stopPropagation()
    chrome.runtime.sendMessage({ action: "open_side_panel" })
  }

  let seconds = 0
  if (sessionState?.isSolved) {
    seconds = sessionState.finalSeconds
  } else if (problemStartTime) {
    seconds = Math.max(0, Math.floor((Date.now() - new Date(problemStartTime).getTime()) / 1000))
  }
  const minutes = Math.floor(seconds / 60)
  const rem = String(seconds % 60).padStart(2, "0")

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed bottom-6 right-6 z-[9999] transition-all duration-150 ease-in-out font-sans"
    >
      {!expanded ? (
        // Collapsed Pill Button
        <button
          onClick={handleOpenPanel}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full elevated-card text-xs text-zinc-300 font-mono font-medium hover:border-zinc-700 transition-all border border-zinc-805 shadow-lg cursor-pointer"
        >
          <span className="text-[#dfa054] text-xs">⚡</span>
          <span className="tabular-nums">{minutes}:{rem}</span>
        </button>
      ) : (
        // Expanded Command Surface Layout (Level 3 Elevation)
        <div className="w-[190px] rounded-xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl p-3 shadow-2xl transition-all duration-150">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${session ? 'bg-[#dfa054]' : 'bg-zinc-600'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${session ? 'bg-[#dfa054]' : 'bg-zinc-700'}`}></span>
              </span>
              <span className="font-bold text-[10px] text-zinc-300 tracking-wider font-mono">AV:{session?.mode || "IDLE"}</span>
            </div>
            <span className="text-xs font-mono text-[#dfa054] font-semibold tabular-nums">{minutes}:{rem}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-zinc-400 mb-2.5">
            <div className="flex flex-col items-center bg-zinc-900/30 border border-zinc-900 py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">Focus</span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">{session?.focusScore ?? 100}</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-900/30 border border-zinc-900 py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">Tabs</span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">{session?.tabSwitches ?? 0}</span>
            </div>
            <div className="flex flex-col items-center bg-zinc-900/30 border border-zinc-900 py-1 rounded">
              <span className="text-zinc-500 text-[8px] uppercase tracking-wider font-semibold">Paste</span>
              <span className="font-bold text-zinc-200 mt-0.5 tabular-nums">{session?.pasteCount ?? 0}</span>
            </div>
          </div>

          <button
            onClick={handleOpenPanel}
            className="w-full bg-[#dfa054] hover:bg-[#eab308] text-zinc-950 font-bold text-[10px] py-1.5 rounded transition-all text-center tracking-wider uppercase shadow-sm cursor-pointer"
          >
            Open Dashboard
          </button>
        </div>
      )}
    </div>
  )
}

export default FloatingButton
