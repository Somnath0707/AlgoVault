import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
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

// Reset solved sessionState on new page load
chrome.storage.local.remove("algovault.sessionState")

function updateActivity() {
  lastActivityTime = Date.now()
}

document.addEventListener("mousemove", updateActivity)
document.addEventListener("keydown", updateActivity)
document.addEventListener("scroll", updateActivity)

function currentSlug() {
  return window.location.pathname.split("/")[2]
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

function sendEvent(
  eventType: string,
  metadata: Record<string, any> = {},
  titleSlug = trackedSlug,
  title = trackedTitle
) {
  if (!titleSlug) return
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
}

function heartbeat(titleSlug = trackedSlug, title = trackedTitle) {
  if (isSolved) return
  addFocusedTime(isWindowFocused)
  if (!titleSlug) return

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
      problemPasteCount: Math.max(0, pasteCount - pasteBaseline)
    }
  })
}

chrome.runtime.sendMessage({ action: "session_start" })
sendEvent("OPEN", { url: location.href })

function handleInactive() {
  if (isSolved) return
  if (isWindowFocused) {
    addFocusedTime(true)
    isWindowFocused = false
    tabSwitches += 1
    sendEvent("TAB_SWITCH", { tabSwitches })
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
    handleInactive()
  } else {
    handleActive()
  }
})

window.addEventListener("blur", () => {
  handleInactive()
})

window.addEventListener("focus", () => {
  handleActive()
})

// Listen to copy and paste events in the capture phase to bypass Monaco editor blockages
document.addEventListener("paste", (event) => {
  if (isSolved) return
  const pasted = event.clipboardData?.getData("text") || ""
  const charCount = pasted.length
  const classification = charCount < 20 ? "NATURAL" : charCount <= 100 ? "PARTIAL" : "FULL"
  pasteCount += 1
  sendEvent("PASTE", { charCount, classification, pasteCount })
}, true)

document.addEventListener("copy", (event) => {
  if (isSolved) return
  const selectedText = window.getSelection()?.toString() || ""
  const charCount = selectedText.length
  sendEvent("COPY", { charCount })
}, true)

// Stop timer immediately on Accepted submission
// Listen for postMessage from MAIN world (events cross world boundary, CustomEvents do NOT)
window.addEventListener("message", ((event: MessageEvent) => {
  if (event.data?.type !== "AV_SUBMISSION_RESULT") return
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

    // Save solving time to local storage so floating-button and overlay panel stop the timer
    const finalSeconds = Math.max(0, Math.floor((Date.now() - openedAt.getTime()) / 1000))
    chrome.storage.local.set({ 
      "algovault.sessionState": { isSolved: true, finalSeconds } 
    })
  }
}))

// Detect SPA route navigation instantly (every 1 second)
setInterval(() => {
  if (location.href !== lastUrl) {
    if (!isSolved) heartbeat(trackedSlug, trackedTitle)
    sendEvent("CLOSE", { url: lastUrl }, trackedSlug, trackedTitle)
    lastUrl = location.href
    trackedSlug = currentSlug()
    trackedTitle = currentTitle()
    openedAt = new Date()
    chrome.storage.local.set({ "algovault.problemStartTime": openedAt.toISOString() })
    focusBaseline = focusSeconds
    tabSwitchBaseline = tabSwitches
    pasteBaseline = pasteCount
    isSolved = false
    isWindowFocused = !document.hidden && document.hasFocus()
    chrome.storage.local.remove("algovault.sessionState")
    sendEvent("OPEN", { url: location.href })
    // Send immediate heartbeat for the new page
    heartbeat()
  }
}, 1000)

// Periodic heartbeat every 30 seconds
setInterval(() => {
  if (isSolved) return
  heartbeat()
}, 30_000)

window.addEventListener("beforeunload", () => {
  if (!isSolved) {
    heartbeat()
    sendEvent("CLOSE", { url: location.href })
  }
})
