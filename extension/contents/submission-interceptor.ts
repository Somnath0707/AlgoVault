import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
  world: "MAIN",
  run_at: "document_start"
}

// In MAIN world, we patch window.fetch directly to bypass CSP blocks on inline script injections.
// IMPORTANT: We use window.postMessage() to relay events because CustomEvent dispatched
// in MAIN world CANNOT be heard by content scripts in ISOLATED world.
// window.postMessage crosses the world boundary.
if (typeof window !== "undefined" && !(window as any).__ALGOVAULT_FETCH_PATCHED__) {
  (window as any).__ALGOVAULT_FETCH_PATCHED__ = true
  let lastSeenSubmissionId: string | undefined = undefined

  const originalFetch = window.fetch
  const normalizeUrl = (input: any) => {
    if (typeof input === "string") return input
    if (input && typeof input.url === "string") return input.url
    return ""
  }

  window.fetch = async function(...args) {
    const url = normalizeUrl(args[0])

    // Intercept submission code POST payload
    if (/\/submit\/?$/.test(url) || /\/problems\/[^\/]+\/submit\/?/.test(url)) {
      try {
        const init = args[1]
        if (init && init.body) {
          const body = JSON.parse(init.body as string)
          if (body && body.typed_code) {
            (window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__ = {
              code: body.typed_code,
              lang: body.lang
            }
          }
        }
      } catch (e) {
        console.error("AlgoVault failed to intercept submit body", e)
      }
    }

    const response = await originalFetch.apply(this, args)
    if (/\/submissions\/detail\/\d+\/check/.test(url)) {
      response.clone().json().then((data) => {
        const body = data && data.data ? data.data : data
        if (!body || body.state !== "SUCCESS") return
        const match = url.match(/\/submissions\/detail\/(\d+)\/check/)
        const submissionId = match ? match[1] : undefined
        // Deduplicate: LeetCode polls /check repeatedly; only fire once per submission
        if (submissionId && submissionId === lastSeenSubmissionId) return
        lastSeenSubmissionId = submissionId
        const detail = {
          submissionId,
          statusCode: body.status_code,
          statusDisplay: body.status_msg || body.status_runtime || undefined,
          runtime: body.status_runtime,
          memory: body.status_memory,
          totalCorrect: body.total_correct,
          totalTestcases: body.total_testcases,
          lang: body.lang,
          code: (window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__ ? (window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__.code : undefined,
          codeLang: (window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__ ? (window as any).__ALGOVAULT_LAST_SUBMITTED_CODE__.lang : undefined
        }
        // Use postMessage to cross MAIN→ISOLATED world boundary
        window.postMessage({ type: "AV_SUBMISSION_RESULT", detail }, "*")
      }).catch(() => {})
    }
    return response
  }
}
