import { useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { buildZerotracRatingMap } from "../lib/zerotrac"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problemset/*", "https://leetcode.com/tag/*"]
}

function ratingColor(rating: number) {
  if (rating < 1400) return "#22c55e"
  if (rating < 1600) return "#06b6d4"
  if (rating < 1900) return "#3b82f6"
  if (rating < 2100) return "#a855f7"
  if (rating < 2400) return "#f59e0b"
  return "#ef4444"
}

export default function ProblemsetOverlay() {
  useEffect(() => {
    let ratings: Map<string, number> | null = null
    let disposed = false

    const injectRatings = () => {
      if (!ratings || disposed) return
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/problems/"]').forEach((link) => {
        const slug = link.getAttribute("href")?.match(/\/problems\/([^/?#]+)/)?.[1]
        const rating = slug ? ratings!.get(slug.toLowerCase()) : undefined
        if (!slug || rating === undefined || !Number.isFinite(rating)) return

        const row = link.closest<HTMLElement>('div[class*="group"], tr, [role="row"], div.flex')
        if (!row || row.querySelector(`[data-algovault-rating="${slug}"]`)) return
        const difficulty = Array.from(row.querySelectorAll<HTMLElement>("*")).find((node) => {
          if (node.children.length > 0) return false
          const text = node.textContent?.trim()
          return text === "Easy" || text === "Medium" || text === "Hard"
        })
        if (!difficulty) return

        const badge = document.createElement("span")
        badge.dataset.algovaultRating = slug
        badge.textContent = ` ${Math.round(rating)}`
        badge.title = "ZeroTrac contest rating"
        badge.style.marginLeft = "6px"
        badge.style.fontSize = "11px"
        badge.style.fontWeight = "600"
        badge.style.color = ratingColor(rating)
        difficulty.appendChild(badge)
      })
    }

    chrome.runtime.sendMessage({ action: "get_zerotrac" }, (response) => {
      if (disposed || response?.error) return
      ratings = buildZerotracRatingMap(response)
      injectRatings()
    })

    let injectTimeout: number | null = null;
    const observer = new MutationObserver((mutations) => {
      // Ignore rapid mutations coming from code editors if any
      if (mutations.every(m => (m.target as Element).closest?.('.monaco-editor, .view-lines, .CodeMirror'))) {
        return;
      }
      if (injectTimeout) window.clearTimeout(injectTimeout);
      injectTimeout = window.setTimeout(injectRatings, 250);
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      disposed = true
      if (injectTimeout) window.clearTimeout(injectTimeout);
      observer.disconnect()
    }
  }, [])

  return null
}
