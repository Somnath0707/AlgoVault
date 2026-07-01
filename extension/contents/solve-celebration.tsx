import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useState, useEffect } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    :host(plasmo-csui) {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
  ` + cssText.replaceAll(':root', ':host(plasmo-csui)')
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
      victory: "text-[#dfa054] drop-shadow-[0_4px_16px_rgba(223,160,84,0.45)]",
      defeat: "text-red-650 drop-shadow-[0_4px_16px_rgba(220,38,38,0.45)]"
    },
    subColor: {
      victory: "text-zinc-100",
      defeat: "text-zinc-300"
    },
    titleClass: "font-serif tracking-[0.22em] font-extrabold uppercase",
    subClass: "font-mono tracking-widest uppercase font-semibold"
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
      victory: "text-green-500 drop-shadow-[0_4px_16px_rgba(34,197,94,0.45)]",
      defeat: "text-red-500 drop-shadow-[0_4px_16px_rgba(239,68,68,0.45)]"
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
  try {
    const audio = new Audio(soundUrl)
    audio.volume = 0.5
    audio.play().catch(e => console.error("AlgoVault failed to play celebration sound", e))
  } catch (err) {
    console.error("AlgoVault audio player error", err)
  }
}

export default function SolveCelebration() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [problemTitle, setProblemTitle] = useState("")
  const [type, setType] = useState<"VICTORY" | "DEFEAT" | null>(null)
  const [themeName, setThemeName] = useState("gta")

  const currentTheme = THEMES[themeName] || THEMES.gta

  useEffect(() => {
    const handledSubmissionIds = new Set<string>()

    chrome.storage.sync.get(["celebrationTheme"], (res) => {
      if (res.celebrationTheme !== undefined) setThemeName(res.celebrationTheme)
    })

    const handleSubmission = (event: MessageEvent) => {
      if (!["AV_SUBMISSION_RESULT", "AV_SUBMISSION_RESULT_CONFIRMED"].includes(event.data?.type)) return
      const detail = event.data.detail || {}
      if (detail.submissionId) {
        const submissionId = String(detail.submissionId)
        if (handledSubmissionIds.has(submissionId)) return
        handledSubmissionIds.add(submissionId)
      }
      const status = detail.statusCode != null ? Number(detail.statusCode) : null

      let newType: "VICTORY" | "DEFEAT" | null = null
      const verdict = String(detail.statusDisplay || "").toLowerCase()
      if (status === 10 || verdict === "accepted") newType = "VICTORY"
      else if (status !== null || verdict) newType = "DEFEAT"

      if (newType) {
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
            setMounted(true)
            setTimeout(() => setVisible(true), 50)
          }

          if (isSound) {
            playSound(newType === "VICTORY" ? activeTheme.audio.victory : activeTheme.audio.defeat)
          }

          // Auto-close overlay after 5 seconds
          setTimeout(() => {
            setVisible(false)
            setTimeout(() => setMounted(false), 500)
          }, 4500)
        })
      }
    }

    window.addEventListener("message", handleSubmission)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false)
        setTimeout(() => setMounted(false), 500)
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("message", handleSubmission)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  if (!mounted || !type) return null

  const key = type.toLowerCase() as "victory" | "defeat"

  return (
    <div
      className={`fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-[999999] flex flex-col items-center justify-center font-sans select-none pointer-events-auto transition-opacity duration-500 ease-in-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => {
        setVisible(false)
        setTimeout(() => setMounted(false), 500)
      }}
    >
      <div
        className={`flex flex-col items-center text-center p-6 max-w-lg transition-transform duration-500 ${
          visible ? "scale-100" : "scale-90"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className={`text-4xl md:text-5xl mb-2 ${currentTheme.titleClass} ${currentTheme.titleColor[key]}`}>
          {currentTheme.title[key]}
        </h1>

        <h2 className={`text-xl md:text-2xl mb-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${currentTheme.subClass} ${currentTheme.subColor[key]}`}>
          {currentTheme.subtitle[key]}
        </h2>

        {/* Themed Banner Image */}
        <div className="my-3.5 border-4 border-white/10 rounded-2xl overflow-hidden bg-zinc-900/50 shadow-2xl max-w-[480px] w-full">
          <img 
            src={type === "VICTORY" ? currentTheme.images.victory : currentTheme.images.defeat} 
            className="w-full h-auto object-cover" 
            alt={type}
          /> 
        </div>

        {/* Problem metadata details banner */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 px-4.5 py-2 rounded-full text-[10px] text-zinc-400 font-mono tracking-wide mb-6 mt-4 select-text">
          {type === "VICTORY" ? "🏆 ACCEPTED" : "❌ ATTEMPT FAILED"}: <span className="text-zinc-200 font-semibold">{problemTitle}</span>
        </div>

        <button
          onClick={() => {
            setVisible(false)
            setTimeout(() => setMounted(false), 500)
          }}
          className="text-[9px] text-zinc-550 font-mono hover:text-[#dfa054] transition-colors uppercase tracking-widest outline-none cursor-pointer"
        >
          [ Click anywhere or press ESC to dismiss ]
        </button>
      </div>
    </div>
  )
}
