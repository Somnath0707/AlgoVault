import type { PlasmoCSConfig } from "plasmo"
import { getLeetCodeProblemSlug } from "../lib/leetcode-url"
import { showZenithAlarmModal, showZenithToast } from "./ZenithSystemOverlay"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_idle"
}

const ACTIVE_SESSION_KEY = "algovault.session.active"
const IDLE_TIMEOUT_MS = 8 * 60 * 1000 // 8 minutes idle threshold

// In-Memory Rolling Hash Ring Buffer for Copy-Paste Detection (Zero Storage Bloat)
const internalCopyHashes: string[] = []

function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16)
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, "").trim()
}

function getSelectionText(): string {
  const selection = window.getSelection()?.toString() || ""
  if (selection.length > 0) return selection

  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement) {
    return active.value.substring(active.selectionStart || 0, active.selectionEnd || 0)
  }
  if (active instanceof HTMLInputElement) {
    return active.value.substring(active.selectionStart || 0, active.selectionEnd || 0)
  }
  return ""
}

function handleInternalCopy(event?: ClipboardEvent) {
  let text = getSelectionText()
  if (!text && event && event.clipboardData) {
    try {
      text = event.clipboardData.getData("text") || ""
    } catch {
      // Ignored in non-readable contexts
    }
  }
  const normalized = normalizeText(text)
  if (normalized.length > 3) {
    const hash = fnv1aHash(normalized)
    if (!internalCopyHashes.includes(hash)) {
      internalCopyHashes.push(hash)
      if (internalCopyHashes.length > 20) {
        internalCopyHashes.shift()
      }
    }
  }
}

// Memory Copy & Cut Listeners: Add internal code copies/cuts to ring buffer
document.addEventListener("copy", (e) => handleInternalCopy(e), true)
document.addEventListener("cut", (e) => handleInternalCopy(e), true)

// Paste Listener: Only count external pastes
document.addEventListener("paste", (event) => {
  const pasted = event.clipboardData?.getData("text") || ""
  const normalized = normalizeText(pasted)
  if (normalized.length > 3) {
    const hash = fnv1aHash(normalized)
    const isInternal = internalCopyHashes.includes(hash)
    if (!isInternal) {
      // Increment external paste count in current session
      chrome.storage.local.get(ACTIVE_SESSION_KEY, (res) => {
        const session = res[ACTIVE_SESSION_KEY]
        if (session && session.st === "RUNNING") {
          chrome.storage.local.set({
            [ACTIVE_SESSION_KEY]: { ...session, pastes: (session.pastes || 0) + 1 }
          })
        }
      })
    }
  }
}, true)

// State Tracking
let currentSlug = getLeetCodeProblemSlug()
let lastActivityAt = Date.now()
let idleCheckInterval: NodeJS.Timeout | null = null

function updateActivity() {
  lastActivityAt = Date.now()
  // If we were auto-paused due to idle, resume on active interaction
  chrome.storage.local.get(ACTIVE_SESSION_KEY, (res) => {
    const session = res[ACTIVE_SESSION_KEY]
    if (session && session.st === "PAUSED" && session.pr === "IDLE" && currentSlug === session.slug) {
      chrome.runtime.sendMessage({ action: "session_resume_v2" })
    }
  })
}

// Activity Listeners (Throttled)
let lastMove = 0
document.addEventListener("mousemove", () => {
  const now = Date.now()
  if (now - lastMove > 1000) {
    lastMove = now
    updateActivity()
  }
}, { passive: true })

document.addEventListener("keydown", updateActivity, { passive: true })
document.addEventListener("scroll", updateActivity, { passive: true })

// Intelligent Idle Poller (Check every 10 seconds, zero storage writes unless state changes)
idleCheckInterval = setInterval(() => {
  const now = Date.now()
  if (now - lastActivityAt >= IDLE_TIMEOUT_MS) {
    chrome.storage.local.get(ACTIVE_SESSION_KEY, (res) => {
      const session = res[ACTIVE_SESSION_KEY]
      if (session && session.st === "RUNNING" && currentSlug === session.slug) {
        chrome.runtime.sendMessage({ action: "session_pause_v2", reason: "IDLE" })
      }
    })
  }
}, 10_000)

// Tab Ownership & Focus Handler
function handleFocus() {
  if (!currentSlug) return
  chrome.storage.local.get(ACTIVE_SESSION_KEY, (res) => {
    const session = res[ACTIVE_SESSION_KEY]
    if (!session || session.slug !== currentSlug) {
      // Start fresh or load per-slug session for new problem
      chrome.runtime.sendMessage({ action: "session_start_v2", slug: currentSlug })
    } else if (session.st === "PAUSED" && session.pr === "TAB") {
      // Resume session auto-paused by tab switch (DO NOT resume MANUAL pause!)
      chrome.runtime.sendMessage({ action: "claim_tab_ownership" })
    } else if (session.st === "RUNNING") {
      // Transfer tab ownership if returning from another tab
      chrome.runtime.sendMessage({ action: "claim_tab_ownership" })
    }
  })
}

function handleBlur() {
  if (!document.hidden) return

  chrome.storage.local.get(ACTIVE_SESSION_KEY, (res) => {
    const session = res[ACTIVE_SESSION_KEY]
    if (session && session.st === "RUNNING" && session.slug === currentSlug) {
      chrome.runtime.sendMessage({ action: "session_pause_v2", reason: "TAB" })
    }
  })
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    handleBlur()
  } else {
    handleFocus()
  }
})

window.addEventListener("focus", handleFocus)
window.addEventListener("blur", handleBlur)

// Page Lifecycle API (Sleep/Freeze recovery)
window.addEventListener("freeze", handleBlur)
window.addEventListener("pagehide", handleBlur)
window.addEventListener("resume", handleFocus)
window.addEventListener("pageshow", handleFocus)

// SPA Router Listener (Detect problem slug changes with zero typing overhead)
let lastObservedUrl = location.href
function checkUrlChange() {
  if (location.href !== lastObservedUrl) {
    lastObservedUrl = location.href
    const newSlug = getLeetCodeProblemSlug()
    if (newSlug && newSlug !== currentSlug) {
      currentSlug = newSlug
      handleFocus()
    }
  }
}

window.addEventListener("popstate", checkUrlChange)
window.addEventListener("hashchange", checkUrlChange)
const urlCheckInterval = setInterval(checkUrlChange, 500)
window.addEventListener("beforeunload", () => {
  clearInterval(urlCheckInterval)
  if (idleCheckInterval) clearInterval(idleCheckInterval)
})

// Initial check on load
handleFocus()
