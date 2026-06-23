import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
  run_at: "document_idle"
}

const openedAt = new Date()
let focusStartedAt = Date.now()
let focusSeconds = 0
let tabSwitches = 0
let pasteCount = 0
let lastUrl = location.href

function currentSlug() {
  return window.location.pathname.split("/")[2]
}

function currentTitle() {
  const heading = document.querySelector("a[href*='/problems/']")?.textContent
  return heading?.replace(/^\d+\.\s*/, "").trim() || currentSlug()
}

function addFocusedTime() {
  if (!document.hidden && document.hasFocus()) {
    focusSeconds += Math.max(0, Math.floor((Date.now() - focusStartedAt) / 1000))
  }
  focusStartedAt = Date.now()
}

function sendEvent(eventType: string, metadata: Record<string, any> = {}) {
  const titleSlug = currentSlug()
  if (!titleSlug) return
  chrome.runtime.sendMessage({
    action: "session_event",
    payload: {
      eventType,
      titleSlug,
      title: currentTitle(),
      timestamp: new Date().toISOString(),
      metadata
    }
  })
}

function heartbeat() {
  addFocusedTime()
  const titleSlug = currentSlug()
  if (!titleSlug) return

  chrome.runtime.sendMessage({
    action: "session_heartbeat",
    payload: {
      titleSlug,
      title: currentTitle(),
      openedAt: openedAt.toISOString(),
      focusSeconds,
      tabSwitches,
      pasteCount
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
    lastUrl = location.href
    sendEvent("OPEN", { url: location.href })
  }
  heartbeat()
}, 30_000)

window.addEventListener("beforeunload", () => {
  heartbeat()
  sendEvent("CLOSE", { url: location.href })
})
