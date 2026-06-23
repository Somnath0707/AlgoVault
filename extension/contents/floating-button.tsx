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
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const load = () => {
      chrome.storage.local.get("algovault.currentSession", (result) => {
        setSession(result["algovault.currentSession"] || null)
      })
    }
    load()
    const interval = window.setInterval(() => {
      load()
      setElapsed((value) => value + 1)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const handleClick = () => {
    chrome.runtime.sendMessage({ action: "open_side_panel" })
  }

  const seconds = session?.startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
    : elapsed
  const minutes = Math.floor(seconds / 60)
  const rem = String(seconds % 60).padStart(2, "0")

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[9999] min-w-[172px] rounded-lg bg-av-bg-card backdrop-blur-md text-av-text-primary shadow-xl hover:scale-[1.02] transition-transform border border-white/10 px-3 py-2 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-sm">AV {session?.mode || "LIVE"}</span>
        <span className="text-xs text-av-accent">{minutes}:{rem}</span>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2 text-[11px] text-av-text-secondary">
        <span>F {session?.focusScore ?? 100}</span>
        <span>Tab {session?.tabSwitches ?? 0}</span>
        <span>Paste {session?.pasteCount ?? 0}</span>
      </div>
    </button>
  )
}

export default FloatingButton
