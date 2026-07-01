import type { PlasmoCSConfig } from "plasmo"

// IMPORTANT: This runs in the ISOLATED world (default).
// Plasmo v0.89 silently drops world: "MAIN" scripts from the manifest.
// Instead, we inject our MAIN world code via a <script src> tag pointing
// to a static asset file. Chrome exempts extension resource URLs from CSP.
export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
  run_at: "document_start"
}

const script = document.createElement("script")
script.src = chrome.runtime.getURL("assets/main-world-interceptor.js")
script.onload = () => script.remove()
;(document.head || document.documentElement).appendChild(script)
