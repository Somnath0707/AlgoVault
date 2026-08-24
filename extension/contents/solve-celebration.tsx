import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useState, useEffect, useRef } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"]
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
      victory: "text-[#dfa054] drop-shadow-[0_2px_10px_rgba(223,160,84,0.4)]",
      defeat: "text-red-500 drop-shadow-[0_2px_10px_rgba(220,38,38,0.4)]"
    },
    subColor: {
      victory: "text-zinc-100",
      defeat: "text-zinc-300"
    },
    titleClass: "font-serif tracking-[0.2em] font-extrabold uppercase",
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
      victory: "text-green-400 drop-shadow-[0_2px_10px_rgba(34,197,94,0.4)]",
      defeat: "text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.4)]"
    },
    subColor: {
      victory: "text-yellow-400",
      defeat: "text-zinc-400"
    },
    titleClass: "font-mono uppercase font-bold tracking-wider",
    subClass: "font-mono uppercase tracking-normal"
  }
}

// Preload audio files into memory so playback is instant on AC
const audioCache = new Map<string, HTMLAudioElement>()

function preloadAudio(url: string) {
  if (audioCache.has(url)) return
  try {
    const audio = new Audio()
    audio.preload = "auto"
    audio.src = url
    audio.volume = 0.5
    // Force browser to start fetching & decoding immediately
    audio.load()
    audioCache.set(url, audio)
  } catch {}
}

// Eagerly preload all theme audio assets on page load
Object.values(THEMES).forEach((theme) => {
  preloadAudio(theme.audio.victory)
  preloadAudio(theme.audio.defeat)
})

const playSound = (soundUrl: string) => {
  try {
    const cached = audioCache.get(soundUrl)
    if (cached) {
      // Clone the cached audio node for overlapping playback safety
      const clone = cached.cloneNode(true) as HTMLAudioElement
      clone.volume = 0.5
      clone.play().catch(() => {})
    } else {
      // Fallback: create fresh Audio if cache miss
      const audio = new Audio(soundUrl)
      audio.volume = 0.5
      audio.play().catch(() => {})
    }
  } catch {}
}

export default function SolveCelebration() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [problemTitle, setProblemTitle] = useState("")
  const [type, setType] = useState<"VICTORY" | "DEFEAT" | null>(null)
  const [themeName, setThemeName] = useState("gta")
  const [zenithInsightPrompt, setZenithInsightPrompt] = useState(false)
  const [insightText, setInsightText] = useState("")

  const prefsRef = useRef({
    overlay: true,
    sound: true,
    theme: "gta"
  })
  const isShowingRef = useRef(false)
  const handledSubmissionsRef = useRef<Set<string>>(new Set())
  const closeTimeoutRef = useRef<any>(null)

  const currentTheme = THEMES[themeName] || THEMES.gta

  useEffect(() => {
    // 1. Preload settings on mount so submission path has ZERO storage latency
    chrome.storage.sync.get(["celebrationOverlay", "celebrationSound", "celebrationTheme"], (res) => {
      if (res.celebrationOverlay !== undefined) prefsRef.current.overlay = res.celebrationOverlay
      if (res.celebrationSound !== undefined) prefsRef.current.sound = res.celebrationSound
      if (res.celebrationTheme) {
        prefsRef.current.theme = res.celebrationTheme
        setThemeName(res.celebrationTheme)
      }
    })

    // Listen for live preferences changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "sync" || areaName === "local") {
        if (changes.celebrationOverlay) prefsRef.current.overlay = changes.celebrationOverlay.newValue
        if (changes.celebrationSound) prefsRef.current.sound = changes.celebrationSound.newValue
        if (changes.celebrationTheme) {
          prefsRef.current.theme = changes.celebrationTheme.newValue
          setThemeName(changes.celebrationTheme.newValue)
        }
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)

let lastCelebrationTimestamp = 0

    const handleSubmission = (event: MessageEvent) => {
      // Listen strictly to the confirmed and validated submission event once
      if (event.data?.type !== "AV_SUBMISSION_RESULT_CONFIRMED") return
      
      const expectedNonce = (window as any).__ALGOVAULT_ISOLATED_NONCE__
      if (!event.data?.nonce || !expectedNonce || event.data.nonce !== expectedNonce) {
        return
      }

      // Hard debounce guard: allow at most 1 celebration audio/overlay per 3.5 seconds
      const now = Date.now()
      if (now - lastCelebrationTimestamp < 3500) {
        return
      }
      lastCelebrationTimestamp = now

      const detail = event.data.detail || {}
      const submissionKey = detail.submissionId ? String(detail.submissionId) : `${detail.titleSlug || 'unknown'}-${detail.statusCode}-${detail.runtime || ''}`
      if (handledSubmissionsRef.current.has(submissionKey)) {
        return
      }
      handledSubmissionsRef.current.add(submissionKey)
      if (handledSubmissionsRef.current.size > 50) {
        const first = handledSubmissionsRef.current.values().next().value
        if (first) handledSubmissionsRef.current.delete(first)
      }

      const status = detail.statusCode != null ? Number(detail.statusCode) : null
      const verdict = String(detail.statusDisplay || "").toLowerCase()

      let newType: "VICTORY" | "DEFEAT" | null = null
      if (status === 10 || verdict === "accepted") newType = "VICTORY"
      else if (status !== null || verdict) newType = "DEFEAT"

      if (!newType) return

      const heading = document.querySelector("a[href*='/problems/']")?.textContent
      const title = heading?.replace(/^\d+\.\s*/, "").trim() || "Problem"
      setProblemTitle(title)
      setType(newType)

      const activeTheme = THEMES[prefsRef.current.theme] || THEMES.gta

      // Fast-path synchronous audio trigger (plays exactly once)
      if (prefsRef.current.sound) {
        playSound(newType === "VICTORY" ? activeTheme.audio.victory : activeTheme.audio.defeat)
      }

      // Check zenith async without blocking UI
      chrome.storage.local.get(["algovault.isZenith"], (localRes) => {
        const isZenith = !!localRes["algovault.isZenith"]
        if (newType === "VICTORY" && isZenith) {
          setZenithInsightPrompt(true)
        }

        if (prefsRef.current.overlay || (newType === "VICTORY" && isZenith)) {
          if (isShowingRef.current) return
          isShowingRef.current = true
          setMounted(true)
          
          requestAnimationFrame(() => {
            setVisible(true)
          })

          if (!(newType === "VICTORY" && isZenith)) {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = setTimeout(() => {
              setVisible(false)
              setTimeout(() => {
                setMounted(false)
                isShowingRef.current = false
              }, 300)
            }, 3800)
          }
        }
      })
    }

    window.addEventListener("message", handleSubmission)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false)
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
        setTimeout(() => {
          setMounted(false)
          isShowingRef.current = false
        }, 300)
      }
    }
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
      window.removeEventListener("message", handleSubmission)
      window.removeEventListener("keydown", handleKeyDown)
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  if (!mounted || !type) return null

  const key = type.toLowerCase() as "victory" | "defeat"

  return (
    <div
      className={`fixed inset-0 bg-zinc-950/90 z-[999999] flex flex-col items-center justify-center font-sans select-none pointer-events-auto transform-gpu will-change-[opacity,transform] transition-opacity duration-300 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={() => {
        setVisible(false)
        setTimeout(() => {
          setMounted(false)
          isShowingRef.current = false
        }, 300)
      }}
    >
      <div
        className={`flex flex-col items-center text-center p-6 max-w-lg transform-gpu will-change-transform transition-transform duration-300 ${
          visible ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {!zenithInsightPrompt ? (
          <>
            <h1 className={`text-4xl md:text-5xl mb-2 ${currentTheme.titleClass} ${currentTheme.titleColor[key]}`}>
              {currentTheme.title[key]}
            </h1>

            <h2 className={`text-xl md:text-2xl mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] ${currentTheme.subClass} ${currentTheme.subColor[key]}`}>
              {currentTheme.subtitle[key]}
            </h2>

            {/* Themed Banner Image - GPU Accelerated */}
            <div className="my-3 border-2 border-white/10 rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl max-w-[440px] w-full">
              <img 
                src={type === "VICTORY" ? currentTheme.images.victory : currentTheme.images.defeat} 
                className="w-full h-auto object-cover block" 
                loading="eager"
                decoding="async"
                alt={type}
              /> 
            </div>

            {/* Problem metadata details banner */}
            <div className="bg-zinc-900/90 border border-zinc-800 px-4 py-1.5 rounded-full text-[10px] text-zinc-400 font-mono tracking-wide mb-5 mt-3 select-text shadow-md">
              {type === "VICTORY" ? "🏆 ACCEPTED" : "❌ ATTEMPT FAILED"}: <span className="text-zinc-200 font-semibold">{problemTitle}</span>
            </div>

            <button
              onClick={() => {
                setVisible(false)
                setTimeout(() => {
                  setMounted(false)
                  isShowingRef.current = false
                }, 300)
              }}
              className="text-[9px] text-zinc-500 font-mono hover:text-[#dfa054] transition-colors uppercase tracking-widest outline-none cursor-pointer"
            >
              [ Click anywhere or press ESC to dismiss ]
            </button>
          </>
        ) : (
          <div className="bg-zinc-950 border border-[#dfa054]/50 shadow-[0_0_40px_rgba(223,160,84,0.2)] p-7 rounded-xl w-[440px]">
            <h1 className="text-2xl text-[#dfa054] font-serif font-bold mb-3 tracking-widest uppercase">Zenith Quest Complete</h1>
            <p className="text-zinc-300 text-xs mb-5 font-mono leading-relaxed">What was the key insight that unlocked this problem? Formulate it clearly to encode it into your long-term memory.</p>
            <textarea 
              autoFocus
              value={insightText}
              onChange={(e) => setInsightText(e.target.value)}
              className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-[#dfa054] transition-all mb-4 text-xs font-mono resize-none"
              placeholder="The key trick was realizing that..."
            />
            <button 
              onClick={() => {
                chrome.storage.local.set({
                  "algovault.isZenith": false,
                  "algovault.zenithGrade": "S_PLUS"
                }, () => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                  }
                  setVisible(false);
                  setTimeout(() => {
                    setMounted(false);
                    isShowingRef.current = false;
                    location.reload();
                  }, 300);
                });
              }}
              className="w-full bg-[#dfa054]/15 hover:bg-[#dfa054]/25 text-[#dfa054] border border-[#dfa054]/40 py-2.5 rounded-lg font-bold tracking-widest text-xs uppercase transition-all shadow-md cursor-pointer"
            >
              Commit Insight & Exit Zenith
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

