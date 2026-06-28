import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
  run_at: "document_idle"
}

let openedAt = new Date()
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
window.addEventListener("AV_SUBMISSION_RESULT", ((event: CustomEvent) => {
  if (isSolved) return
  const detail = event.detail || {}
  const verdict = detail.statusCode === 10 ? "Accepted" : detail.statusDisplay
  if (verdict === "Accepted") {
    isSolved = true
    addFocusedTime(isWindowFocused)
    isWindowFocused = false
    
    // Force final heartbeat and solved event
    heartbeat()
    sendEvent("SOLVED", { focusSeconds, tabSwitches, pasteCount })
  }
}) as EventListener)

setInterval(() => {
  if (isSolved) return
  if (location.href !== lastUrl) {
    heartbeat(trackedSlug, trackedTitle)
    sendEvent("CLOSE", { url: lastUrl }, trackedSlug, trackedTitle)
    lastUrl = location.href
    trackedSlug = currentSlug()
    trackedTitle = currentTitle()
    openedAt = new Date()
    focusBaseline = focusSeconds
    tabSwitchBaseline = tabSwitches
    pasteBaseline = pasteCount
    isSolved = false // Reset solved flag for new page
    isWindowFocused = !document.hidden && document.hasFocus()
    sendEvent("OPEN", { url: location.href })
  }
  heartbeat()
}, 30_000)

window.addEventListener("beforeunload", () => {
  if (!isSolved) {
    heartbeat()
    sendEvent("CLOSE", { url: location.href })
  }
})
