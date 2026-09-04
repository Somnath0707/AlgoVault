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

function editorCodeFallback() {
  const textarea = document.querySelector<HTMLTextAreaElement>("textarea.inputarea")
  if (textarea?.value?.trim()) return textarea.value
  // Use textContent to avoid synchronous forced reflow/layout freezes
  const lines = Array.from(document.querySelectorAll<HTMLElement>(".view-lines .view-line"))
    .map((line) => line.textContent || "")
    .filter(Boolean)
  return lines.length ? lines.join("\n") : undefined
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
    "transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    "opacity:0",
    "transform:scale(0.95) translateZ(0)",
    "will-change:opacity, transform"
  ].join(";")

  wrapper.innerHTML = `
    <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:#f3f4f6;display:flex;align-items:center;gap:6px;">
      <span style="font-size:16px;">🏆</span> Problem Solved! How clean was it?
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
      <button data-help="NONE" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.2s;outline:none;">Solo</button>
      <button data-help="HINT" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.2s;outline:none;">Hint</button>
      <button data-help="EDITORIAL" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.2s;outline:none;">Editorial</button>
      <button data-help="EXTERNAL" style="border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(31, 41, 55, 0.75);color:#e5e7eb;padding:10px 8px;font-weight:600;font-size:12px;cursor:pointer;transition:all 0.2s;outline:none;">External</button>
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
      wrapper.style.transform = "scale(0.95)"
      setTimeout(() => wrapper.remove(), 300)
    })
  })

  document.body.appendChild(wrapper)

  // Trigger entry animation
  requestAnimationFrame(() => {
    wrapper.style.opacity = "1"
    wrapper.style.transform = "scale(1)"
  })
}

let lastHandledAcTime = 0

function handleAcceptedVerdict(detail?: any) {
  const now = Date.now()
  if (now - lastHandledAcTime < 8000) return
  lastHandledAcTime = now

  const slug = currentSlug()
  if (!slug) return

  const code = detail?.code || editorCodeFallback()
  const codeLang = detail?.codeLang || detail?.lang || languageFallback()
  const runtimeMs = parseRuntimeMs(detail?.runtime)
  const memoryKb = parseMemoryKb(detail?.memory)

  const payload: SubmissionPayload = {
    submissionId: detail?.submissionId ? String(detail.submissionId) : undefined,
    titleSlug: slug,
    title: currentTitle(),
    statusCode: 10,
    statusDisplay: "Accepted",
    language: detail?.lang || codeLang,
    runtimeMs,
    memoryKb,
    totalCorrect: detail?.totalCorrect,
    totalTestcases: detail?.totalTestcases,
    submittedAt: new Date().toISOString(),
    code,
    codeLang
  }

  console.log("[AlgoVault Relay] Confirmed Accepted solve! Stopping timer and triggering celebration...", payload)

  // 1. Instantly stop the session timer
  chrome.runtime.sendMessage({ action: "session_finish_v2", language: payload.language })

  // 2. Instantly trigger celebration audio and visual overlay
  chrome.runtime.sendMessage({ action: "trigger_celebration", verdict: "Accepted", detail: payload })
  window.postMessage({ type: "AV_SUBMISSION_RESULT_CONFIRMED", detail: payload }, window.location.origin || "*")

  // 3. Dispatch to background for GitHub commit & backend telemetry
  chrome.runtime.sendMessage({ action: "submission_result", payload })

  // 4. Update local solved slugs cache
  chrome.storage.local.get("algovault.solvedSlugs", (result) => {
    const cached = result["algovault.solvedSlugs"] || {}
    const slugs = new Set<string>(Array.isArray(cached?.slugs) ? cached.slugs : [])
    slugs.add(slug)
    chrome.storage.local.set({ "algovault.solvedSlugs": { fetchedAt: Date.now(), slugs: Array.from(slugs) } })
  })

  // 5. Present post-solve self-report dialog
  showPostSolveDialog(slug)
}

// ─── Path 1: Listen for postMessage from MAIN world interceptor ───────
window.addEventListener("message", ((event: MessageEvent) => {
  if (event.origin !== window.location.origin || event.source !== window) return
  if (event.data?.type !== "AV_SUBMISSION_RESULT") return

  const detail = event.data.detail || {}

  // 1. submission id is numeric string when present
  if (detail.submissionId && !/^\d+$/.test(String(detail.submissionId))) {
    return
  }

  // 2. status code is known/expected
  const statusCode = detail.statusCode != null ? Number(detail.statusCode) : null
  const validStatusCodes = [10, 11, 14, 15, 20]
  if (statusCode !== null && !validStatusCodes.includes(statusCode)) {
    return
  }

  // 3. title slug comes from current URL, not trusted page payload
  const slug = currentSlug()
  if (!slug) return

  if (detail.submissionId) {
    const submissionId = String(detail.submissionId)
    if (relayedSubmissionIds.has(submissionId)) return
    relayedSubmissionIds.add(submissionId)
    if (relayedSubmissionIds.size > 100) relayedSubmissionIds.delete(relayedSubmissionIds.values().next().value!)
  }

  const statusDisplay = verdictFromCode(detail.statusCode, detail.statusDisplay)

  if (statusDisplay === "Accepted" || statusCode === 10) {
    handleAcceptedVerdict(detail)
    return
  }

  // Non-accepted submission (Wrong Answer, TLE, Runtime Error, etc.)
  const payload: SubmissionPayload = {
    submissionId: detail.submissionId ? String(detail.submissionId) : undefined,
    titleSlug: slug,
    title: currentTitle(),
    statusCode: detail.statusCode,
    statusDisplay,
    language: detail.lang,
    runtimeMs: parseRuntimeMs(detail.runtime),
    memoryKb: parseMemoryKb(detail.memory),
    totalCorrect: detail.totalCorrect,
    totalTestcases: detail.totalTestcases,
    submittedAt: new Date().toISOString(),
    code: detail.code || editorCodeFallback(),
    codeLang: detail.codeLang || detail.lang || languageFallback()
  }

  chrome.runtime.sendMessage({ action: "submission_result", payload })
  chrome.runtime.sendMessage({ action: "trigger_celebration", verdict: statusDisplay, detail: payload })
  window.postMessage({ type: "AV_SUBMISSION_RESULT_CONFIRMED", detail: payload }, window.location.origin || "*")
}))

let lastSubmitClickTime = 0

// Track user clicks to strictly differentiate "Submit" from "Run Code"
document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement | null
  const btn = target?.closest("button")
  if (!btn) return

  const isSubmitBtn =
    btn.getAttribute("data-e2e-locator") === "console-submit-button" ||
    btn.textContent?.trim().toLowerCase() === "submit"

  const isRunBtn =
    btn.getAttribute("data-e2e-locator") === "console-run-button" ||
    btn.textContent?.trim().toLowerCase() === "run" ||
    btn.textContent?.trim().toLowerCase() === "run code"

  if (isSubmitBtn) {
    lastSubmitClickTime = Date.now()
    console.log("[AlgoVault Relay] User clicked Submit button at", lastSubmitClickTime)
  } else if (isRunBtn) {
    lastSubmitClickTime = 0
    console.log("[AlgoVault Relay] User clicked Run button; disallowing solve trigger")
  }
}, true)

// Keyboard shortcut (Ctrl+Enter or Cmd+Enter initiates Submit on LeetCode)
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.shiftKey) {
    lastSubmitClickTime = Date.now()
  }
}, true)

// ─── Path 2: Bulletproof DOM MutationObserver Fallback ───────────────
// If network interception is blocked by Brave Shields or CSP, this guarantees
// timer stop, celebration sound, and GitHub commit when "Accepted" appears on screen.
// STRICTLY excludes "Run Code" / sample testcase results!
function setupDomAcObserver() {
  let debounceTimeout: any = null

  const checkDomForAc = () => {
    // 1. HARD GUARD: Must have clicked Submit within the last 45 seconds
    const timeSinceSubmit = Date.now() - lastSubmitClickTime
    if (timeSinceSubmit > 45000 || lastSubmitClickTime === 0) {
      return
    }

    // 2. Check for standard LeetCode submission result element
    const resultElement = document.querySelector('[data-e2e-locator="submission-result"]')
    if (resultElement && resultElement.textContent?.trim() === "Accepted") {
      // Must NOT be inside the test result panel
      if (!resultElement.closest('[data-layout-path*="testresult"], [class*="test-result"]')) {
        handleAcceptedVerdict()
        return
      }
    }

    // 3. Scan candidate result status elements, strictly excluding test results
    const candidates = document.querySelectorAll(
      'span[class*="text-green"], div[class*="text-green"], span[class*="text-success"], div[class*="text-success"]'
    )
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i]
      if (el.textContent?.trim() === "Accepted") {
        // Must NOT be inside the testcase/testresult console
        if (el.closest('[data-layout-path*="testresult"], [class*="test-result"], [data-cy="run-code-result"]')) {
          continue
        }
        const container = el.closest('[class*="submission"], [class*="result"], [data-layout-path*="submission"]') || el.parentElement?.parentElement
        if (container) {
          const containerText = container.textContent || ""
          // If container has "Case 1", "Testcase", or "Expected", it is Run Code, ignore it
          if (/Case\s*1|Testcase|Expected/i.test(containerText)) {
            continue
          }
          // Real submission contains "Beats" or "Runtime" without sample testcase labels
          if (/Beats\s+[\d.]+%|Runtime/i.test(containerText)) {
            handleAcceptedVerdict()
            return
          }
        }
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    if (debounceTimeout) return
    const hasRelevantMutation = mutations.some((m) => {
      const target = m.target instanceof Element ? m.target : m.target.parentElement
      return !target?.closest(".monaco-editor, .view-lines, #algovault-post-solve, plasmo-csui")
    })
    if (!hasRelevantMutation) return

    debounceTimeout = setTimeout(() => {
      debounceTimeout = null
      checkDomForAc()
    }, 250)
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

// Initialize DOM observer failsafe
setupDomAcObserver()


