import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_start"
}

// Runs natively in the page's MAIN execution world at document_start.
// Completely immune to LeetCode's CSP and Brave Shields (no <script> tags needed).
;(function initAlgoVaultInterceptor() {
  const w = window as any
  if (w.__ALGOVAULT_FETCH_PATCHED__) return
  w.__ALGOVAULT_FETCH_PATCHED__ = true

  // Establish or read cross-world validation nonce without removing it from DOM
  function getOrSetNonce(): string {
    let nonce = document.documentElement.getAttribute("data-algovault-nonce")
    if (!nonce) {
      nonce = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36)
      document.documentElement.setAttribute("data-algovault-nonce", nonce)
    }
    return nonce
  }

  let lastSeenSubmissionId: string | undefined
  let submitResetTimer: any = null
  const originalFetch = window.fetch
  w.__ALGOVAULT_IS_SUBMITTING__ = false

  function normalizeUrl(input: any): string {
    if (typeof input === "string") return input
    if (input) {
      if (typeof input.url === "string") return input.url
      if (typeof input.href === "string") return input.href
      if (typeof input.toString === "function") return input.toString()
    }
    return ""
  }

  function emitSubmissionResult(url: string, data: any) {
    const body = data && data.data ? data.data : data
    if (!body || body.state !== "SUCCESS") return

    // Only fire if the submit action was actively initiated (ignores run code)
    if (!w.__ALGOVAULT_IS_SUBMITTING__) return

    const match = String(url).match(/\/submissions\/detail\/(\d+)\/check/)
    const submissionId = match ? match[1] : (body.submission_id ? String(body.submission_id) : undefined)
    if (submissionId && submissionId === lastSeenSubmissionId) return
    if (submissionId) lastSeenSubmissionId = submissionId

    // Reset submit state once the terminal SUCCESS state is captured
    w.__ALGOVAULT_IS_SUBMITTING__ = false
    if (submitResetTimer) {
      clearTimeout(submitResetTimer)
      submitResetTimer = null
    }

    const nonce = getOrSetNonce()
    const captured = w.__ALGOVAULT_LAST_SUBMITTED_CODE__ || {}
    const rawCode = body.code || body.typed_code || captured.code
    const code = typeof rawCode === "string" && rawCode.length <= 250_000 ? rawCode : undefined

    window.postMessage({
      type: "AV_SUBMISSION_RESULT",
      nonce,
      detail: {
        submissionId,
        statusCode: body.status_code,
        statusDisplay: body.status_msg || body.status_runtime || body.state || undefined,
        runtime: body.status_runtime,
        memory: body.status_memory,
        totalCorrect: body.total_correct,
        totalTestcases: body.total_testcases,
        lang: body.lang || captured.lang,
        code,
        codeLang: body.lang || captured.lang
      }
    }, window.location.origin || "*")
  }

  // 1. Monkey-patch window.fetch
  window.fetch = function(input: any, init?: any) {
    const url = normalizeUrl(input)
    const isSubmit = /\/submit(\/|\?|$)/.test(url)

    if (isSubmit) {
      w.__ALGOVAULT_IS_SUBMITTING__ = true
      if (submitResetTimer) clearTimeout(submitResetTimer)
      submitResetTimer = setTimeout(() => {
        w.__ALGOVAULT_IS_SUBMITTING__ = false
      }, 90_000)

      try {
        if (init && init.body) {
          const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body
          if (body && (body.typed_code || body.code)) {
            w.__ALGOVAULT_LAST_SUBMITTED_CODE__ = {
              code: body.typed_code || body.code,
              lang: body.lang
            }
          }
        }
      } catch {}
    }

    return originalFetch.apply(this, arguments as any).then((response: Response) => {
      if (/\/submissions\/detail\/\d+\/check/.test(url) || (typeof url === "string" && url.indexOf("/check") !== -1)) {
        try {
          response.clone().json().then((data) => {
            emitSubmissionResult(url, data)
          }).catch(() => {})
        } catch {}
      }
      return response
    })
  }

  // 2. Monkey-patch XMLHttpRequest
  const originalXhrOpen = XMLHttpRequest.prototype.open
  const originalXhrSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function(method: string, url: any) {
    ;(this as any)._avUrl = typeof url === "string" ? url : (url && url.href ? url.href : String(url))
    ;(this as any)._avMethod = method
    return originalXhrOpen.apply(this, arguments as any)
  }

  XMLHttpRequest.prototype.send = function(body: any) {
    const url = (this as any)._avUrl || ""
    const isSubmit = /\/submit(\/|\?|$)/.test(url)
    if (isSubmit) {
      w.__ALGOVAULT_IS_SUBMITTING__ = true
      if (submitResetTimer) clearTimeout(submitResetTimer)
      submitResetTimer = setTimeout(() => {
        w.__ALGOVAULT_IS_SUBMITTING__ = false
      }, 90_000)

      if (body) {
        try {
          const payload = typeof body === "string" ? JSON.parse(body) : body
          if (payload && (payload.typed_code || payload.code)) {
            w.__ALGOVAULT_LAST_SUBMITTED_CODE__ = {
              code: payload.typed_code || payload.code,
              lang: payload.lang
            }
          }
        } catch {}
      }
    }

    if (/\/submissions\/detail\/\d+\/check/.test(url) || url.indexOf("/check") !== -1) {
      this.addEventListener("loadend", function() {
        try {
          if (this.status < 200 || this.status >= 300 || !this.responseText) return
          emitSubmissionResult(url, JSON.parse(this.responseText))
        } catch {}
      }, { once: true })
    }
    return originalXhrSend.apply(this, arguments as any)
  }
})()
