import type { PlasmoCSConfig } from "plasmo"
import { getLeetCodeProblemSlug } from "../lib/leetcode-url"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_idle"
}

type SubmissionPayload = {
  submissionId?: string
  titleSlug: string
  title?: string
  statusDisplay?: string
  statusCode?: number
  language?: string
  runtimeMs?: number
  memoryKb?: number
  totalCorrect?: number
  totalTestcases?: number
  submittedAt: string
  code?: string
  codeLang?: string
}

const relayedSubmissionIds = new Set<string>()

function currentSlug() {
  return getLeetCodeProblemSlug()
}

function currentTitle() {
  const heading = document.querySelector("a[href*='/problems/']")?.textContent
  return heading?.replace(/^\d+\.\s*/, "").trim() || currentSlug() || "Problem"
}

// Zero-Reflow Editor Fallback: Only reads value property if already present in textarea, never iterates DOM lines
function editorCodeFastFallback() {
  const textarea = document.querySelector<HTMLTextAreaElement>("textarea.inputarea")
  return textarea?.value?.trim() || undefined
}

function languageFallback() {
  const selected = document.querySelector<HTMLElement>("[data-cy='lang-select'], button[id*='headlessui-listbox-button']")
  return selected?.innerText?.trim() || undefined
}

function parseRuntimeMs(runtime?: string) {
  if (!runtime) return undefined
  const match = runtime.match(/\d+/)
  const val = match ? Number(match[0]) : undefined
  if (val !== undefined && (val < 0 || val > 1_000_000)) return undefined
  return val
}

function parseMemoryKb(memory?: string) {
  if (!memory) return undefined
  const value = Number(memory.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(value)) return undefined
  const val = memory.toLowerCase().includes("mb") ? Math.round(value * 1024) : Math.round(value)
  if (val < 0 || val > 10_000_000) return undefined
  return val
}

function verdictFromCode(statusCode?: any, fallback?: string) {
  if (fallback && ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compile Error"].includes(fallback)) {
    return fallback
  }
  const codeVal = statusCode != null ? Number(statusCode) : null
  switch (codeVal) {
    case 10:
      return "Accepted"
    case 11:
      return "Wrong Answer"
    case 14:
      return "Time Limit Exceeded"
    case 15:
      return "Runtime Error"
    case 20:
      return "Compile Error"
    default:
      return fallback
  }
}

function showPostSolveDialog(titleSlug: string) {
  if (document.getElementById("algovault-post-solve")) return

  const wrapper = document.createElement("div")
  wrapper.id = "algovault-post-solve"
  wrapper.style.cssText = [
    "position:fixed",
    "right:24px",
    "bottom:92px",
    "z-index:2147483647",
    "background:#111827",
    "color:#f9fafb",
    "border:1px solid rgba(255, 255, 255, 0.12)",
    "box-shadow:0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255,255,255,0.1)",
    "border-radius:14px",
    "padding:16px",
    "font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",
    "width:270px",
    "transition:opacity 0.2s ease, transform 0.2s ease",
    "opacity:0",
    "transform:translate3d(0, 8px, 0)",
    "will-change:opacity, transform",
    "contain:content"
  ].join(";")

  wrapper.innerHTML = `
    <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:#f3f4f6;display:flex;align-items:center;gap:6px;">
      <span style="font-size:16px;">🏆</span> Problem Solved! How clean was it?
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <button data-help="NONE" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.15s;outline:none;">Solo</button>
      <button data-help="HINT" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.15s;outline:none;">Hint</button>
      <button data-help="EDITORIAL" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.15s;outline:none;">Editorial</button>
      <button data-help="EXTERNAL" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.15s;outline:none;">External</button>
    </div>
  `

  const buttonColors: Record<string, string> = {
    NONE: "#10b981",       // emerald green
    HINT: "#f59e0b",       // amber orange
    EDITORIAL: "#3b82f6",  // cobalt blue
    EXTERNAL: "#8b5cf6"    // royal purple
  }

  wrapper.querySelectorAll("button").forEach((button) => {
    const el = button as HTMLButtonElement
    const helpType = el.dataset.help || "NONE"
    const accentColor = buttonColors[helpType] || "#3b82f6"

    el.addEventListener("mouseenter", () => {
      el.style.background = accentColor
      el.style.borderColor = accentColor
      el.style.color = "#ffffff"
      el.style.transform = "translateY(-1px)"
      el.style.boxShadow = `0 6px 14px ${accentColor}4d`
    })

    el.addEventListener("mouseleave", () => {
      el.style.background = "rgba(31, 41, 55, 0.75)"
      el.style.borderColor = "rgba(255,255,255,0.06)"
      el.style.color = "#e5e7eb"
      el.style.transform = "translateY(0)"
      el.style.boxShadow = "none"
    })

    el.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        action: "post_solve_report",
        payload: { titleSlug, helpType }
      })
      chrome.runtime.sendMessage({ action: "session_finish_v2" })
      wrapper.style.opacity = "0"
      wrapper.style.transform = "translate3d(0, 8px, 0)"
      setTimeout(() => wrapper.remove(), 250)
    })
  })

  document.body.appendChild(wrapper)

  requestAnimationFrame(() => {
    wrapper.style.opacity = "1"
    wrapper.style.transform = "translate3d(0, 0, 0)"
  })
}

// Listen for postMessage from MAIN world (CustomEvents do NOT cross MAIN→ISOLATED boundary)
window.addEventListener("message", ((event: MessageEvent) => {
  if (event.origin !== window.location.origin || event.source !== window) return
  if (event.data?.type !== "AV_SUBMISSION_RESULT") return

  const expectedNonce = (window as any).__ALGOVAULT_ISOLATED_NONCE__
  if (expectedNonce && event.data.nonce && event.data.nonce !== expectedNonce) {
    return
  }

  const detail = event.data.detail || {}

  // 1. Validate submission ID format
  if (detail.submissionId && !/^\d+$/.test(String(detail.submissionId))) {
    return
  }

  // 2. Validate status code
  const statusCode = detail.statusCode != null ? Number(detail.statusCode) : null
  const validStatusCodes = [10, 11, 14, 15, 20]
  if (statusCode !== null && !validStatusCodes.includes(statusCode)) {
    return
  }

  // 3. Problem slug from URL
  const slug = currentSlug()
  if (!slug) return

  if (detail.submissionId) {
    const submissionId = String(detail.submissionId)
    if (relayedSubmissionIds.has(submissionId)) return
    relayedSubmissionIds.add(submissionId)
    if (relayedSubmissionIds.size > 100) relayedSubmissionIds.delete(relayedSubmissionIds.values().next().value!)
  }

  const runtimeMs = parseRuntimeMs(detail.runtime)
  const memoryKb = parseMemoryKb(detail.memory)

  // Use captured code from network payload; never scan .view-lines DOM
  const code = detail.code || editorCodeFastFallback()

  const payload: SubmissionPayload = {
    submissionId: detail.submissionId ? String(detail.submissionId) : undefined,
    titleSlug: slug,
    title: currentTitle(),
    statusCode: detail.statusCode,
    statusDisplay: verdictFromCode(detail.statusCode, detail.statusDisplay),
    language: detail.lang,
    runtimeMs: runtimeMs,
    memoryKb: memoryKb,
    totalCorrect: detail.totalCorrect,
    totalTestcases: detail.totalTestcases,
    submittedAt: new Date().toISOString(),
    code: code,
    codeLang: detail.codeLang || detail.lang || languageFallback()
  }

  // Fire the background telemetry immediately without blocking main thread
  chrome.runtime.sendMessage({ action: "submission_result", payload })

  const triggerCelebration = () => {
    window.dispatchEvent(new CustomEvent("AV_SUBMISSION_RESULT_CONFIRMED", { detail: payload }))
    window.postMessage({ type: "AV_SUBMISSION_RESULT_CONFIRMED", detail: payload }, window.location.origin || "*")
  }

  if (payload.statusDisplay === "Accepted") {
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "session_finish_v2", language: payload.language })
      triggerCelebration()
      
      // Async storage update in background
      chrome.storage.local.get("algovault.solvedSlugs", (result) => {
        const cached = result["algovault.solvedSlugs"] || {}
        const slugs = new Set<string>(Array.isArray(cached?.slugs) ? cached.slugs : [])
        slugs.add(slug)
        chrome.storage.local.set({ "algovault.solvedSlugs": { ...cached, fetchedAt: Date.now(), slugs: Array.from(slugs) } })
      })

      showPostSolveDialog(slug)
    }, 300)
  } else if (payload.statusDisplay) {
    // Non-accepted (Wrong Answer, TLE, Runtime Error, etc.) trigger defeat celebration promptly
    setTimeout(() => {
      triggerCelebration()
    }, 200)
  }
}))
