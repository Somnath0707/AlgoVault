import type { PlasmoCSConfig } from "plasmo"

// This runs in the ISOLATED world at document_start. The actual interception
// is registered by Chrome in MAIN world; dynamically injecting a second script
// races with that registration and can install stale interception logic.
export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_start"
}

// Generate a security nonce for cross-world message validation
const nonce = (typeof crypto !== "undefined" && crypto.randomUUID) 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2) + Date.now().toString(36);

(window as any).__ALGOVAULT_ISOLATED_NONCE__ = nonce;

// Keep the nonce for this document; it identifies this navigation to sibling
// content scripts without exposing a reusable credential.
document.documentElement.setAttribute("data-algovault-nonce", nonce);
