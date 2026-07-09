import type { PlasmoCSConfig } from "plasmo"

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

// Reset solved sessionState on new page load
chrome.storage.local.remove("algovault.sessionState")

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
  const classification = charCount < 20 ? "NATURAL" : charCount <= 100 ? "PARTIAL" : "FULL"
  pasteCount += 1
  sendEvent("PASTE", { charCount, classification, pasteCount })
}, { capture: true, signal })

document.addEventListener("copy", (event) => {
  if (isSolved) return
  const selectedText = window.getSelection()?.toString() || ""
  const charCount = selectedText.length
  sendEvent("COPY", { charCount })
}, { capture: true, signal })

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
