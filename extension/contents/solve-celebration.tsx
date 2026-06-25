import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useState, useEffect } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
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

export default function SolveCelebration() {
  const [isOpen, setIsOpen] = useState(false)
  const [problemTitle, setProblemTitle] = useState("")

  useEffect(() => {
    const handleSubmission = (event: CustomEvent) => {
      const detail = event.detail || {}
      if (detail.statusDisplay === "Accepted") {
        // Extract problem title
        const heading = document.querySelector("a[href*='/problems/']")?.textContent
        const title = heading?.replace(/^\d+\.\s*/, "").trim() || "Problem"
        setProblemTitle(title)
        setIsOpen(true)
      }
    }

    window.addEventListener("AV_SUBMISSION_RESULT", handleSubmission as EventListener)

    // Esc to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("AV_SUBMISSION_RESULT", handleSubmission as EventListener)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Auto close after 6 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(false)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-[999999] flex flex-col items-center justify-center font-sans select-none animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="flex flex-col items-center text-center p-6 max-w-lg scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* GTA Mission Passed style header */}
        <h1 className="text-5xl md:text-6xl font-black text-[#dfa054] tracking-[0.25em] uppercase drop-shadow-[0_4px_16px_rgba(223,160,84,0.35)] mb-2 animate-bounce-slow">
          MISSION PASSED!
        </h1>

        <h2 className="text-2xl md:text-3xl font-extrabold text-zinc-100 tracking-widest font-mono mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
          RESPECT + 99
        </h2>

        {/* Celebration Media Block (Leave space/placeholder for their custom GIF or Video) */}
        <div className="my-5 border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30 p-2.5 shadow-2xl hover:border-[#dfa054]/30 transition-colors">
          
          {/* PLACEHOLDER: Put your custom GIF or Video URL here! */}
          {/* Example image element:
          <img 
            src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../giphy.gif" 
            className="w-[320px] h-[180px] object-cover rounded-lg" 
          /> 
          */}
          
          {/* Premium UI Placeholder */}
          <div className="w-[320px] h-[180px] bg-gradient-to-br from-[#dfa054]/10 to-zinc-950 flex flex-col items-center justify-center border border-zinc-850 rounded-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-[#dfa054]/5 animate-pulse"></div>
            
            {/* Visual simulation of respect bars */}
            <div className="flex gap-1.5 items-end mb-4 h-8">
              <span className="w-1.5 bg-[#dfa054]/30 h-3 rounded-full"></span>
              <span className="w-1.5 bg-[#dfa054]/40 h-5 rounded-full"></span>
              <span className="w-1.5 bg-[#dfa054]/60 h-7 rounded-full"></span>
              <span className="w-1.5 bg-[#dfa054] h-8 rounded-full animate-pulse"></span>
              <span className="w-1.5 bg-[#dfa054]/60 h-6 rounded-full"></span>
              <span className="w-1.5 bg-[#dfa054]/40 h-4 rounded-full"></span>
            </div>

            <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">CELEBRATION COMPANION ACTIVE</span>
            <span className="text-[8px] text-zinc-600 font-mono mt-1 uppercase">[Replace with your GIF / Video URL]</span>
          </div>

        </div>

        {/* Problem details badge */}
        <div className="bg-zinc-900/60 border border-zinc-800 px-4 py-2 rounded-full text-xs text-zinc-400 font-mono tracking-wide mb-6">
          🏆 SOLVED: <span className="text-zinc-200 font-semibold">{problemTitle}</span>
        </div>

        {/* Quiet ESC guide */}
        <button
          onClick={() => setIsOpen(false)}
          className="text-[10px] text-zinc-500 font-mono hover:text-[#dfa054] transition-colors uppercase tracking-widest outline-none"
        >
          [ Click anywhere or press ESC to dismiss ]
        </button>
      </div>
    </div>
  )
}
