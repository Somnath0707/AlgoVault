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

function addFocusedTime() {
  if (!document.hidden && document.hasFocus()) {
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
  addFocusedTime()
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

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    addFocusedTime()
    tabSwitches += 1
    sendEvent("TAB_SWITCH", { hidden: true, tabSwitches })
  } else {
    focusStartedAt = Date.now()
    sendEvent("FOCUS", { visible: true })
  }
})

window.addEventListener("blur", () => {
  addFocusedTime()
  sendEvent("BLUR", { tabSwitches })
})

window.addEventListener("focus", () => {
  focusStartedAt = Date.now()
  sendEvent("FOCUS", {})
})

document.addEventListener("paste", (event) => {
  const pasted = event.clipboardData?.getData("text") || ""
  const charCount = pasted.length
  const classification = charCount < 20 ? "NATURAL" : charCount <= 100 ? "PARTIAL" : "FULL"
  pasteCount += 1
  sendEvent("PASTE", { charCount, classification, pasteCount })
})

setInterval(() => {
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
    sendEvent("OPEN", { url: location.href })
  }
  heartbeat()
}, 30_000)

window.addEventListener("beforeunload", () => {
  heartbeat()
  sendEvent("CLOSE", { url: location.href })
})
