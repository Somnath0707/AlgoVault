import { useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"

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
        const rating = slug ? ratings!.get(slug) : undefined
        if (!slug || !rating) return

        const row = link.closest<HTMLElement>('[role="row"], tr')
        if (!row || row.querySelector(`[data-algovault-rating="${slug}"]`)) return
        const difficulty = Array.from(row.querySelectorAll<HTMLElement>("span, div")).find((node) =>
          ["Easy", "Medium", "Hard"].includes(node.textContent?.trim() || "")
        )
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
      if (disposed || !Array.isArray(response)) return
      ratings = new Map(
        response
          .filter((item: any) => item?.TitleSlug && Number.isFinite(item?.Rating))
          .map((item: any) => [item.TitleSlug, Number(item.Rating)])
      )
      injectRatings()
    })

    const observer = new MutationObserver(injectRatings)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [])

  return null
}
