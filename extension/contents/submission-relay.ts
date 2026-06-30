import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
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

function currentSlug() {
  return window.location.pathname.split("/")[2]
}

function currentTitle() {
  const heading = document.querySelector("a[href*='/problems/']")?.textContent
  return heading?.replace(/^\d+\.\s*/, "").trim() || currentSlug()
}

function parseRuntimeMs(runtime?: string) {
  if (!runtime) return undefined
  const match = runtime.match(/\d+/)
  return match ? Number(match[0]) : undefined
}

function parseMemoryKb(memory?: string) {
  if (!memory) return undefined
  const value = Number(memory.replace(/[^0-9.]/g, ""))
  if (!Number.isFinite(value)) return undefined
  return memory.toLowerCase().includes("mb") ? Math.round(value * 1024) : Math.round(value)
}

function verdictFromCode(statusCode?: number, fallback?: string) {
  if (fallback && ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compile Error"].includes(fallback)) {
    return fallback
  }
  switch (statusCode) {
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
    "background:rgba(17, 24, 39, 0.95)",
    "backdrop-filter:blur(16px)",
    "color:#f9fafb",
    "border:1px solid rgba(255, 255, 255, 0.08)",
    "box-shadow:0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.05)",
    "border-radius:14px",
    "padding:16px",
    "font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",
    "width:270px",
    "transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    "opacity:0",
    "transform:scale(0.95)"
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

// Listen for postMessage from MAIN world (CustomEvents do NOT cross MAIN→ISOLATED boundary)
window.addEventListener("message", ((event: MessageEvent) => {
  if (event.data?.type !== "AV_SUBMISSION_RESULT") return
  const slug = currentSlug()
  if (!slug) return
  const detail = event.data.detail || {}
  const payload: SubmissionPayload = {
    submissionId: detail.submissionId,
    titleSlug: slug,
    title: currentTitle(),
    statusCode: detail.statusCode,
    statusDisplay: verdictFromCode(detail.statusCode, detail.statusDisplay),
    language: detail.lang,
    runtimeMs: parseRuntimeMs(detail.runtime),
    memoryKb: parseMemoryKb(detail.memory),
    totalCorrect: detail.totalCorrect,
    totalTestcases: detail.totalTestcases,
    submittedAt: new Date().toISOString(),
    code: detail.code,
    codeLang: detail.codeLang
  }

  chrome.runtime.sendMessage({ action: "submission_result", payload })
  if (payload.statusDisplay === "Accepted") {
    showPostSolveDialog(slug)
  }
}))
