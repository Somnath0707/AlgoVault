import type { PlasmoCSConfig } from "plasmo"

// This file runs natively in the MAIN world context at document_start via Chrome MV3.
// Because it runs with world: "MAIN", it is NOT blocked by page CSP or Brave Shields.
export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_start"
}

;(function () {
  if ((window as any).__ALGOVAULT_FETCH_PATCHED__) return
  ;(window as any).__ALGOVAULT_FETCH_PATCHED__ = true

  let lastSeenSubmissionId: string | undefined
  const originalFetch = window.fetch
  ;(window as any).__ALGOVAULT_IS_SUBMITTING__ = false

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

    // 1. HARD GUARD AGAINST RUN CODE / TESTCASE RUNNER:
    // When running code, LeetCode responses always contain run_success, code_answer,
    // expected_code_answer, or correct_answers. Real submissions never contain these.
    if (
      body.run_success !== undefined ||
      body.code_answer !== undefined ||
      body.expected_code_answer !== undefined ||
      body.correct_answers !== undefined
    ) {
      return
    }

    // 2. Only emit if a submit action was genuinely initiated by the user
    if (!(window as any).__ALGOVAULT_IS_SUBMITTING__) return

    const match = String(url).match(/\/submissions\/detail\/(\d+)\/check/)
    const submissionId = match ? match[1] : (body.submission_id ? String(body.submission_id) : undefined)

    // Ignore run code (run code IDs start with "runcode_")
    if (submissionId && !/^\d+$/.test(submissionId)) return

    if (submissionId && submissionId === lastSeenSubmissionId) return
    if (submissionId) lastSeenSubmissionId = submissionId

    // Reset submit state once terminal result is captured
    ;(window as any).__ALGOVAULT_IS_SUBMITTING__ = false

    const captured = (window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__ || {}
    const statusCode = body.status_code != null ? Number(body.status_code) : undefined
    const statusDisplay = body.status_msg || body.status_runtime || (statusCode === 10 ? "Accepted" : body.state)

    console.log("[AlgoVault MAIN Interceptor] Genuine submission result captured:", {
      submissionId,
      statusCode,
      statusDisplay
    })

    window.postMessage(
      {
        type: "AV_SUBMISSION_RESULT",
        detail: {
          submissionId,
          statusCode,
          statusDisplay,
          runtime: body.status_runtime,
          memory: body.status_memory,
          totalCorrect: body.total_correct,
          totalTestcases: body.total_testcases,
          lang: body.lang || captured.lang,
          code: body.code || body.typed_code || captured.code,
          codeLang: body.lang || captured.lang
        }
      },
      window.location.origin || "*"
    )
  }

  // Monkey-patch window.fetch
  window.fetch = function (input: any, init?: any) {
    const url = normalizeUrl(input)
    const isSubmit = /\/submit(\/|\?|$)/.test(url)
    const isInterpret = /\/interpret_solution(\/|\?|$)/.test(url)

    if (isInterpret) {
      ;(window as any).__ALGOVAULT_IS_SUBMITTING__ = false
    }

    if (isSubmit) {
      ;(window as any).__ALGOVAULT_IS_SUBMITTING__ = true
      if (init?.body) {
        try {
          const payload = typeof init.body === "string" ? JSON.parse(init.body) : init.body
          if (payload && (payload.typed_code || payload.code)) {
            ;(window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__ = {
              code: payload.typed_code || payload.code,
              lang: payload.lang
            }
          }
        } catch {}
      }
    }

    return originalFetch.apply(this, arguments as any).then((response) => {
      if (/\/submissions\/detail\/\d+\/check/.test(url) || (typeof url === "string" && url.includes("/check"))) {
        try {
          response
            .clone()
            .json()
            .then((data) => {
              emitSubmissionResult(url, data)
            })
            .catch(() => {})
        } catch {}
      }
      return response
    })
  }

  // Monkey-patch XMLHttpRequest
  const originalXhrOpen = XMLHttpRequest.prototype.open
  const originalXhrSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (method: string, url: any) {
    ;(this as any)._avUrl = typeof url === "string" ? url : (url && url.href ? url.href : String(url))
    return originalXhrOpen.apply(this, arguments as any)
  }

  XMLHttpRequest.prototype.send = function (body?: any) {
    const url = (this as any)._avUrl || ""
    const isSubmit = /\/submit(\/|\?|$)/.test(url)
    const isInterpret = /\/interpret_solution(\/|\?|$)/.test(url)

    if (isInterpret) {
      ;(window as any).__ALGOVAULT_IS_SUBMITTING__ = false
    }

    if (isSubmit) {
      ;(window as any).__ALGOVAULT_IS_SUBMITTING__ = true
      if (body) {
        try {
          const payload = typeof body === "string" ? JSON.parse(body) : body
          if (payload && (payload.typed_code || payload.code)) {
            ;(window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__ = {
              code: payload.typed_code || payload.code,
              lang: payload.lang
            }
          }
        } catch {}
      }
    }

    if (/\/submissions\/detail\/\d+\/check/.test(url) || url.includes("/check")) {
      this.addEventListener("loadend", function () {
        try {
          if (this.status < 200 || this.status >= 300 || !this.responseText) return
          emitSubmissionResult(url, JSON.parse(this.responseText))
        } catch {}
      })
    }

    return originalXhrSend.apply(this, arguments as any)
  }
})()

