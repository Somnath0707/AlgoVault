import type { PlasmoCSConfig } from "plasmo"

// This file is intentionally a no-op.
// The fetch/XHR monkey-patching is now done via inline <script> injection
// from submission-interceptor.ts, which guarantees it runs before any
// page scripts (Plasmo's Parcel module bundler was delaying execution).
export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_start"
}

// No-op: the interceptor logic is now injected inline via submission-interceptor.ts
