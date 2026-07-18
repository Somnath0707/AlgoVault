import type { PlasmoCSConfig } from "plasmo"
import { getLeetCodeProblemSlug } from "../lib/leetcode-url"
import { showZenithQuestModal, showZenithAlarmModal, showZenithToast } from "./ZenithSystemOverlay"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_idle"
}

let openedAt = new Date()
chrome.storage.local.set({ "algovault.problemStartTime": openedAt.toISOString() })
let focusStartedAt = Date.now()
let focusSeconds = 0
let tabSwitches = 0
let pasteCount = 0
let lastUrl = location.href
let trackedSlug = currentSlug()
let trackedTitle = currentTitle()
let focusBaseline = 0
let tabSwitchBaseline = 0
let pasteBaseline = 0
let lastActivityTime = Date.now()
const IDLE_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes

let isSolved = false
let isWindowFocused = !document.hidden && document.hasFocus()

// Zenith Mode State
let isZenith = false
let currentGrade = "S_PLUS"
let gradeReason = "Pure Solve"
let copyHistory: Array<{ hash: string; timestamp: number }> = []

function simpleStringHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return String(hash)
}

function updateZenithGrade(newGrade: string, reason: string) {
  currentGrade = newGrade
  gradeReason = reason
  chrome.storage.local.set({ "algovault.zenithGrade": newGrade, "algovault.zenithReason": reason })
}

// Reset or recover solved sessionState on page load
const initialSlug = currentSlug()
if (initialSlug) {
  chrome.storage.local.get(["algovault.solvedSlugs", "algovault.sessionState", "algovault.isZenith", "algovault.zenithGrade", "algovault.zenithReason"], (result) => {
    const cached = result["algovault.solvedSlugs"] || {}
    const slugs = Array.isArray(cached?.slugs) ? cached.slugs : []
    if (slugs.includes(initialSlug)) {
      isSolved = true
      const existingState = result["algovault.sessionState"]
      if (!existingState || !existingState.isSolved) {
        chrome.storage.local.set({ "algovault.sessionState": { isSolved: true, finalSeconds: 0 } })
      }
    } else {
      chrome.storage.local.remove("algovault.sessionState")
    }

    isZenith = !!result["algovault.isZenith"]
    if (isZenith) {
      currentGrade = result["algovault.zenithGrade"] || "S_PLUS"
      gradeReason = result["algovault.zenithReason"] || "Pure Solve"
      showZenithToast(`Zenith Mode Active: [Grade: ${currentGrade}]`)
    }
  })
} else {
  chrome.storage.local.remove("algovault.sessionState")
}

// Storage listener to dynamically sync Zenith Mode state changes across script instances
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    if (changes["algovault.isZenith"]) {
      const active = !!changes["algovault.isZenith"].newValue
      isZenith = active
      if (active) {
        currentGrade = "S_PLUS"
        gradeReason = "Pure Solve"
        copyHistory = []
        openedAt = new Date()
        focusSeconds = 0
        tabSwitches = 0
        pasteCount = 0
        showZenithToast("Zenith Mode Activated: [Grade: S+]")
      } else {
        showZenithToast("Zenith Mode Deactivated.")
      }
    }
    if (changes["algovault.zenithGrade"]) {
      currentGrade = changes["algovault.zenithGrade"].newValue || "S_PLUS"
    }
    if (changes["algovault.zenithReason"]) {
      gradeReason = changes["algovault.zenithReason"].newValue || "Pure Solve"
    }
  }
})

// Listen to fullscreen changes to warn/penalize users escaping fullscreen in Zenith Mode
document.addEventListener("fullscreenchange", () => {
  if (isZenith && !document.fullscreenElement && !isSolved) {
    showZenithAlarmModal(
      "Fullscreen exited.",
      "No grade penalty is applied.",
      () => {
        showZenithToast("Continuing Zenith session with an interruption noted")
      },
      () => {
        document.documentElement.requestFullscreen().catch(() => {
          showZenithToast("Fullscreen remains off. Your session can continue.")
        })
      }
    )
  }
})

if ((window as any).__av_abort_controller) {
  (window as any).__av_abort_controller.abort();
}
const controller = new AbortController();
(window as any).__av_abort_controller = controller;
const signal = controller.signal;

function updateActivity() {
  lastActivityTime = Date.now()
}

let lastMouseMove = 0;
function throttledUpdateActivity(e: Event) {
  if (e.type === 'mousemove') {
    const now = Date.now();
    if (now - lastMouseMove < 500) return;
    lastMouseMove = now;
  }
  updateActivity();
}

document.addEventListener("mousemove", throttledUpdateActivity, { signal })
document.addEventListener("keydown", updateActivity, { signal })
document.addEventListener("scroll", updateActivity, { signal })

function currentSlug() {
  return getLeetCodeProblemSlug()
}

function currentTitle() {
  const heading = document.querySelector("a[href*='/problems/']")?.textContent
  return heading?.replace(/^\d+\.\s*/, "").trim() || currentSlug()
}

function addFocusedTime(wasFocusActiveBefore = true) {
  if (isSolved) return
  if (wasFocusActiveBefore) {
    const now = Date.now()
    // Only add time if we are not idle
    if (now - lastActivityTime < IDLE_TIMEOUT_MS) {
      focusSeconds += Math.max(0, Math.floor((now - focusStartedAt) / 1000))
    }
  }
  focusStartedAt = Date.now()
}

let sessionStarted = false
const pendingEvents: Array<() => void> = []

function runWhenSessionReady(fn: () => void) {
  if (sessionStarted) {
    fn()
  } else {
    pendingEvents.push(fn)
  }
}

function sendEvent(
  eventType: string,
  metadata: Record<string, any> = {},
  titleSlug = trackedSlug,
  title = trackedTitle
) {
  if (!titleSlug) return
  runWhenSessionReady(() => {
    chrome.runtime.sendMessage({
      action: "session_event",
      payload: {
        eventType,
        titleSlug,
        title,
        timestamp: new Date().toISOString(),
        metadata
      }
    })
  })
}

const heartbeatEpoch = (typeof crypto !== "undefined" && crypto.randomUUID) 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2) + Date.now().toString(36);

function heartbeat(titleSlug = trackedSlug, title = trackedTitle) {
  if (isSolved) return
  addFocusedTime(isWindowFocused)
  if (!titleSlug) return

  if (isZenith) {
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - openedAt.getTime()) / 1000))
    const score = Math.min(100, Math.round((focusSeconds / elapsedSeconds) * 100))
    chrome.storage.local.set({ "algovault.zenithFocusScore": score })
  }
 
  runWhenSessionReady(() => {
    chrome.runtime.sendMessage({
      action: "session_heartbeat",
      payload: {
        titleSlug,
        title,
        openedAt: openedAt.toISOString(),
        focusSeconds,
        tabSwitches,
        pasteCount,
        problemFocusSeconds: Math.max(0, focusSeconds - focusBaseline),
        problemTabSwitches: Math.max(0, tabSwitches - tabSwitchBaseline),
        problemPasteCount: Math.max(0, pasteCount - pasteBaseline),
        heartbeatEpoch
      }
    })
  })
}

chrome.runtime.sendMessage({ action: "session_start" }, () => {
  sessionStarted = true
  pendingEvents.forEach(fn => fn())
  pendingEvents.length = 0
})
sendEvent("OPEN", { url: location.href })

function handleInactive(isTabSwitch = false) {
  if (isSolved) return
  if (isWindowFocused) {
    addFocusedTime(true)
    isWindowFocused = false
    if (isTabSwitch) {
      tabSwitches += 1
      sendEvent("TAB_SWITCH", { tabSwitches })
    }
  }
}

function handleActive() {
  if (isSolved) return
  if (!isWindowFocused) {
    focusStartedAt = Date.now()
    isWindowFocused = true
    sendEvent("FOCUS", {})
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    handleInactive(true)
  } else {
    handleActive()
  }
}, { signal })

window.addEventListener("blur", () => {
  handleInactive(false)
}, { signal })

window.addEventListener("focus", () => {
  handleActive()
}, { signal })

// Listen to copy and paste events in the capture phase to bypass Monaco editor blockages
document.addEventListener("paste", (event) => {
  if (isSolved) return
  const pasted = event.clipboardData?.getData("text") || ""
  const charCount = pasted.length

  if (isZenith && charCount > 0) {
    const textHash = simpleStringHash(pasted)
    const now = Date.now()
    // Verify against Copy Token history (valid within 2 hours)
    const isValid = copyHistory.some(h => h.hash === textHash && (now - h.timestamp < 2 * 60 * 60 * 1000))

    if (!isValid) {
      updateZenithGrade("D", "External paste recorded")
      showZenithToast("Zenith record updated: external paste observed")
    }
  }

  const classification = charCount < 20 ? "NATURAL" : charCount <= 100 ? "PARTIAL" : "FULL"
  pasteCount += 1
  sendEvent("PASTE", { charCount, classification, pasteCount })
}, { capture: true, signal })

document.addEventListener("copy", (event) => {
  if (isSolved) return
  const selectedText = window.getSelection()?.toString() || ""
  const charCount = selectedText.length

  if (isZenith && charCount > 0) {
    const token = Math.random().toString(36).substring(2, 7)
    const textHash = simpleStringHash(selectedText)
    copyHistory.push({ hash: textHash, timestamp: Date.now() })
    showZenithToast(`Copy Token [${token}] Registered`)
  }

  sendEvent("COPY", { charCount })
}, { capture: true, signal })

// Click interceptor to warning user when clicking on tags, hints, discussions, editorial
document.addEventListener("click", (event) => {
  if (!isZenith || isSolved) return

  const target = event.target as HTMLElement
  const link = target.closest("a")

  if (link) {
    const href = link.getAttribute("href") || ""
    const isEditorial = href.includes("/editorial") || href.includes("/solution")
    const isDiscussion = href.includes("/discussion") || href.includes("/discuss")

    if (isEditorial && currentGrade !== "D" && currentGrade !== "INVALID") {
      event.preventDefault()
      event.stopPropagation()
      showZenithAlarmModal(
        "Opening editorial.",
        "Your session record will note editorial use.",
        () => {
          updateZenithGrade("D", "Editorial opened")
          showZenithToast("Zenith record updated: editorial used")
          window.location.href = link.href
        },
        () => {
          showZenithToast("Returned to the problem")
        }
      )
      return
    }

    if (isDiscussion && !["C", "D", "INVALID"].includes(currentGrade)) {
      event.preventDefault()
      event.stopPropagation()
      showZenithAlarmModal(
        "Opening discussions.",
        "Your session record will note discussion use.",
        () => {
          updateZenithGrade("C", "Discussion opened")
          showZenithToast("Zenith record updated: discussion used")
          window.location.href = link.href
        },
        () => {
          showZenithToast("Returned to the problem")
        }
      )
      return
    }
  }

  // Intercept tags expand clicks (Topics / Companies headers)
  const isTagsBtn = target.textContent?.trim() === "Topics" || target.textContent?.trim() === "Companies" ||
                    target.closest("div")?.textContent?.trim() === "Topics" || target.closest("div")?.textContent?.trim() === "Companies"

  if (isTagsBtn && currentGrade === "S_PLUS") {
    const isExpanded = target.getAttribute("aria-expanded") === "true" || target.closest("div")?.getAttribute("aria-expanded") === "true"
    if (!isExpanded) {
      event.preventDefault()
      event.stopPropagation()
      showZenithAlarmModal(
        "Viewing topic tags.",
        "Your session record will note that you reviewed topic tags.",
        () => {
          updateZenithGrade("S", "Tags viewed")
          showZenithToast("Zenith record updated: topic tags viewed")
          const temp = isZenith
          isZenith = false
          target.click()
          isZenith = temp
        },
        () => {
          showZenithToast("Returned to focus")
        }
      )
      return
    }
  }

  // Intercept hints expansion clicks
  const hintText = target.textContent?.trim() || ""
  const isHintBtn = hintText.startsWith("Hint ") && hintText.length < 10
  if (isHintBtn) {
    const hintNum = hintText.split(" ")[1]
    const targetGrade = hintNum === "1" ? "A" : "B"
    const targetReason = hintNum === "1" ? "Used one hint" : "Used multiple hints"

    const gradeRanks = { S_PLUS: 0, S: 1, A: 2, B: 3, C: 4, D: 5, INVALID: 6 }
    const currentRank = gradeRanks[currentGrade as keyof typeof gradeRanks] || 0
    const targetRank = gradeRanks[targetGrade as keyof typeof gradeRanks] || 0

    if (targetRank > currentRank) {
      event.preventDefault()
      event.stopPropagation()
      showZenithAlarmModal(
        `Viewing ${hintText}.`,
        `Your session record will note ${targetReason.toLowerCase()}.`,
        () => {
          updateZenithGrade(targetGrade, targetReason)
          showZenithToast(`Zenith record updated: ${targetReason.toLowerCase()}`)
          const temp = isZenith
          isZenith = false
          target.click()
          isZenith = temp
        },
        () => {
          showZenithToast("Returned to focus")
        }
      )
      return
    }
  }
}, true)

// Stop timer immediately on Accepted submission
// Listen for postMessage from MAIN world (events cross world boundary, CustomEvents do NOT)
window.addEventListener("message", ((event: MessageEvent) => {
  if (event.data?.type !== "AV_SUBMISSION_RESULT" && event.data?.type !== "AV_SUBMISSION_RESULT_CONFIRMED") return
  if (!event.data?.nonce || event.data.nonce !== (window as any).__ALGOVAULT_ISOLATED_NONCE__) return
  if (isSolved) return
  const detail = event.data.detail || {}
  const statusNum = detail.statusCode != null ? Number(detail.statusCode) : null
  const verdict = statusNum === 10 ? "Accepted" : detail.statusDisplay
  if (verdict === "Accepted") {
    // Heartbeat finalizes the current focus segment before the timer is frozen.
    heartbeat()
    isSolved = true
    isWindowFocused = false
    sendEvent("SOLVED", { focusSeconds, tabSwitches, pasteCount })

    if (isZenith) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      showZenithToast("Quest Cleared! Zenith Mode Deactivated.")
    }

    // Save solving time to local storage so floating-button and overlay panel stop the timer
    const finalSeconds = Math.max(0, Math.floor((Date.now() - openedAt.getTime()) / 1000))
    chrome.storage.local.set({ 
      "algovault.sessionState": { isSolved: true, finalSeconds } 
    })
  }
}), { signal })

if ((window as any).__av_session_intervals) {
  (window as any).__av_session_intervals.forEach((id: number) => clearInterval(id));
}
(window as any).__av_session_intervals = [];

// Detect SPA route navigation instantly (every 1 second)
const routeInterval = setInterval(() => {
  if (location.href !== lastUrl) {
    const newSlug = currentSlug()
    const oldSlug = trackedSlug
    lastUrl = location.href

    if (newSlug !== oldSlug) {
      if (!isSolved && oldSlug) heartbeat(oldSlug, trackedTitle)
      if (oldSlug) sendEvent("CLOSE", { url: lastUrl }, oldSlug, trackedTitle)

      trackedSlug = newSlug
      trackedTitle = currentTitle()

      if (newSlug) {
        openedAt = new Date()
        chrome.storage.local.set({ "algovault.problemStartTime": openedAt.toISOString() })

        // Check if this new problem is already solved
        chrome.storage.local.get("algovault.solvedSlugs", (result) => {
          const cached = result["algovault.solvedSlugs"] || {}
          const slugs = Array.isArray(cached?.slugs) ? cached.slugs : []
          if (slugs.includes(newSlug)) {
            isSolved = true
            chrome.storage.local.set({ "algovault.sessionState": { isSolved: true, finalSeconds: 0 } })
          } else {
            isSolved = false
            chrome.storage.local.remove("algovault.sessionState")
          }
        })

        focusBaseline = focusSeconds
        tabSwitchBaseline = tabSwitches
        pasteBaseline = pasteCount
        isWindowFocused = !document.hidden && document.hasFocus()
        sendEvent("OPEN", { url: location.href })
        heartbeat()
      } else {
        chrome.storage.local.remove("algovault.problemStartTime")
        chrome.storage.local.remove("algovault.sessionState")
        isSolved = false
      }
    } else {
      // Same problem slug, just updated the sub-URL (description/editorial/submissions/etc.)
      const newTitle = currentTitle()
      if (newTitle && newTitle !== trackedTitle) {
        trackedTitle = newTitle
      }

      // Check if Zenith Mode is active and they navigated directly to a prohibited path
      if (isZenith) {
        const path = location.pathname
        if (path.includes("/solutions")) {
          if (currentGrade !== "D" && currentGrade !== "INVALID") {
            showZenithAlarmModal(
              "Accessing solutions page.",
              "Your session record will note solution use.",
              () => {
                updateZenithGrade("D", "Solutions page opened")
                showZenithToast("Zenith record updated: solutions used")
              },
              () => {
                const safeUrl = window.location.href.replace(/\/solutions.*|\/editorial.*|\/discuss.*|\/comments.*/, "/description/")
                window.location.href = safeUrl
                showZenithToast("Returned to the problem")
              }
            )
          }
        } else if (path.includes("/editorial")) {
          if (currentGrade !== "D" && currentGrade !== "INVALID") {
            showZenithAlarmModal(
              "Accessing editorial page.",
              "Your session record will note editorial use.",
              () => {
                updateZenithGrade("D", "Editorial page opened")
                showZenithToast("Zenith record updated: editorial used")
              },
              () => {
                const safeUrl = window.location.href.replace(/\/solutions.*|\/editorial.*|\/discuss.*|\/comments.*/, "/description/")
                window.location.href = safeUrl
                showZenithToast("Returned to the problem")
              }
            )
          }
        } else if (path.includes("/discuss") || path.includes("/discussion")) {
          if (!["C", "D", "INVALID"].includes(currentGrade)) {
            showZenithAlarmModal(
              "Accessing discussions page.",
              "Your session record will note discussion use.",
              () => {
                updateZenithGrade("C", "Discussions page opened")
                showZenithToast("Zenith record updated: discussion used")
              },
              () => {
                const safeUrl = window.location.href.replace(/\/solutions.*|\/editorial.*|\/discuss.*|\/comments.*/, "/description/")
                window.location.href = safeUrl
                showZenithToast("Returned to the problem")
              }
            )
          }
        }
      }
    }
  }
}, 1000)

// Periodic heartbeat every 30 seconds
const heartbeatInterval = setInterval(() => {
  if (isSolved) return
  heartbeat()
}, 30_000);

(window as any).__av_session_intervals.push(routeInterval, heartbeatInterval);

window.addEventListener("beforeunload", () => {
  if (!isSolved) {
    heartbeat()
    sendEvent("CLOSE", { url: location.href })
  }
}, { signal })
