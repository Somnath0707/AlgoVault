import type { PlasmoCSConfig } from "plasmo"

// This runs in the ISOLATED world at document_start.
// It injects a <script src="..."> tag pointing to our web_accessible_resource
// interceptor.js file. Chrome exempts extension web_accessible_resources from
// the page's CSP, and script[src] loads from extension URLs are synchronous
// when prepended to <html> before <head>.
export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_start"
}

// Generate a security nonce for cross-world message validation
const nonce = (typeof crypto !== "undefined" && crypto.randomUUID) 
  ? crypto.randomUUID() 
  : Math.random().toString(36).substring(2) + Date.now().toString(36);

(window as any).__ALGOVAULT_ISOLATED_NONCE__ = nonce;

// Set the nonce as a DOM attribute so the MAIN world script can read it
document.documentElement.setAttribute("data-algovault-nonce", nonce);

// Inject the interceptor script from web_accessible_resources
const script = document.createElement("script");
script.src = chrome.runtime.getURL("assets/interceptor.js");
script.onload = () => script.remove();
(document.documentElement || document).prepend(script);
