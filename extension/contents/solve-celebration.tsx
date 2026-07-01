import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useState, useEffect } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  return document.body
}

interface ThemeAssets {
  name: string
  images: {
    victory: string
    defeat: string
  }
  audio: {
    victory: string
    defeat: string
  }
  title: {
    victory: string
    defeat: string
  }
  subtitle: {
    victory: string
    defeat: string
  }
  titleColor: {
    victory: string
    defeat: string
  }
  subColor: {
    victory: string
    defeat: string
  }
  titleClass: string
  subClass: string
}

const THEMES: Record<string, ThemeAssets> = {
  gta: {
    name: "Grand Theft Auto",
    images: {
      victory: chrome.runtime.getURL("assets/gta-accepted-img.png"),
      defeat: chrome.runtime.getURL("assets/gta-rejected-img.png")
    },
    audio: {
      victory: chrome.runtime.getURL("assets/gta-accepted.mp3"),
      defeat: chrome.runtime.getURL("assets/gta-rejected.mp3")
    },
    title: {
      victory: "MISSION PASSED!",
      defeat: "WASTED"
    },
    subtitle: {
      victory: "RESPECT + 99",
      defeat: "YOU DIED"
    },
    titleColor: {
      victory: "text-[#dfa054] drop-shadow-[0_4px_16px_rgba(223,160,84,0.35)]",
      defeat: "text-red-600 drop-shadow-[0_4px_16px_rgba(220,38,38,0.35)]"
    },
    subColor: {
      victory: "text-zinc-100",
      defeat: "text-zinc-300"
    },
    titleClass: "font-serif tracking-[0.25em]",
    subClass: "font-mono tracking-widest"
  },
  minecraft: {
    name: "Minecraft",
    images: {
      victory: chrome.runtime.getURL("assets/minecraft-accepted-img.jpg"),
      defeat: chrome.runtime.getURL("assets/minecraft-rejected-img.jpg")
    },
    audio: {
      victory: chrome.runtime.getURL("assets/minecraft-accepted.mp3"),
      defeat: chrome.runtime.getURL("assets/minecraft-rejected.mp3")
    },
    title: {
      victory: "LEVEL UP!",
      defeat: "YOU DIED!"
    },
    subtitle: {
      victory: "Challenge Completed!",
      defeat: "Score: &e0"
    },
    titleColor: {
      victory: "text-green-500 drop-shadow-[0_4px_16px_rgba(34,197,94,0.35)]",
      defeat: "text-red-500 drop-shadow-[0_4px_16px_rgba(239,68,68,0.35)]"
    },
    subColor: {
      victory: "text-yellow-400",
      defeat: "text-zinc-400"
    },
    titleClass: "font-mono uppercase font-bold tracking-wider",
    subClass: "font-mono uppercase tracking-normal"
  }
}

const playSound = (soundUrl: string) => {
  const audio = new Audio(soundUrl)
  audio.volume = 0.4
  audio.play().catch(e => console.error("AlgoVault failed to play celebration sound", e))
}

export default function SolveCelebration() {
  const [isOpen, setIsOpen] = useState(false)
  const [problemTitle, setProblemTitle] = useState("")
  const [type, setType] = useState<"VICTORY" | "DEFEAT" | null>(null)
  const [themeName, setThemeName] = useState("gta")

  const currentTheme = THEMES[themeName] || THEMES.gta

  useEffect(() => {
    const handledSubmissionIds = new Set<string>()
    // 1. Fetch settings from storage
    chrome.storage.sync.get(["celebrationTheme"], (res) => {
      if (res.celebrationTheme !== undefined) setThemeName(res.celebrationTheme)
    })

    const handleSubmission = (event: MessageEvent) => {
      if (event.data?.type !== "AV_SUBMISSION_RESULT") return
      const detail = event.data.detail || {}
      if (detail.submissionId) {
        const submissionId = String(detail.submissionId)
        if (handledSubmissionIds.has(submissionId)) return
        handledSubmissionIds.add(submissionId)
      }
      const status = detail.statusCode

      let newType: "VICTORY" | "DEFEAT" | null = null
      if (status === 10) newType = "VICTORY"
      else if (status !== undefined && status !== null) newType = "DEFEAT"

      if (newType) {
        // Extract problem title
        const heading = document.querySelector("a[href*='/problems/']")?.textContent
        const title = heading?.replace(/^\d+\.\s*/, "").trim() || "Problem"
        setProblemTitle(title)
        setType(newType)

        chrome.storage.sync.get(["celebrationOverlay", "celebrationSound", "celebrationTheme"], (res) => {
          const isOverlay = res.celebrationOverlay !== undefined ? res.celebrationOverlay : true
          const isSound = res.celebrationSound !== undefined ? res.celebrationSound : true
          const theme = res.celebrationTheme || "gta"

          setThemeName(theme)
          const activeTheme = THEMES[theme] || THEMES.gta

          if (isOverlay) {
            setIsOpen(true)
          }

          if (isSound) {
            playSound(newType === "VICTORY" ? activeTheme.audio.victory : activeTheme.audio.defeat)
          }
        })
      }
    }

    window.addEventListener("message", handleSubmission)

    // Esc to close
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("message", handleSubmission)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Auto close after 5 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsOpen(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen || !type) return null

  const key = type.toLowerCase() as "victory" | "defeat"

  return (
    <div
      className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-[999999] flex flex-col items-center justify-center font-sans select-none animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="flex flex-col items-center text-center p-6 max-w-lg scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className={`text-5xl md:text-6xl mb-2 animate-bounce-slow ${currentTheme.titleClass} ${currentTheme.titleColor[key]}`}>
          {currentTheme.title[key]}
        </h1>

        <h2 className={`text-2xl md:text-3xl font-extrabold mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${currentTheme.subClass} ${currentTheme.subColor[key]}`}>
          {currentTheme.subtitle[key]}
        </h2>

        {/* Celebration Meme Image */}
        <div className="my-5 border border-zinc-800/85 rounded-xl overflow-hidden bg-zinc-900/30 p-2 shadow-2xl transition-colors hover:border-[#dfa054]/30 max-w-[360px]">
          <img 
            src={type === "VICTORY" ? currentTheme.images.victory : currentTheme.images.defeat} 
            className="w-full h-auto object-cover rounded-lg" 
            alt={type}
          /> 
        </div>

        {/* Problem details badge */}
        <div className="bg-zinc-900/60 border border-zinc-800 px-4 py-2 rounded-full text-xs text-zinc-400 font-mono tracking-wide mb-6">
          {type === "VICTORY" ? "🏆 SOLVED" : "❌ FAILED"}: <span className="text-zinc-200 font-semibold">{problemTitle}</span>
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
