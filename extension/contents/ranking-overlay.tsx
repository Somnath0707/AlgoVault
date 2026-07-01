import { useEffect } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { summarizeRealtimePrediction } from "../lib/api/entranthub"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/contest/*/ranking/*"]
}

const predictionCache = new Map<string, any>()

export default function RankingOverlay() {
  useEffect(() => {
    let disposed = false

    const injectPrediction = (container: Element, data: any) => {
      const prediction = summarizeRealtimePrediction(data)
      if (!prediction || container.querySelector(".av-prediction")) return
      const badge = document.createElement("span")
      badge.className = "av-prediction"
      badge.title = "EntrantHub realtime estimate"
      badge.style.display = "block"
      badge.style.marginTop = "2px"
      badge.style.fontSize = "11px"
      badge.style.fontWeight = "600"
      badge.style.color = prediction.predictedDelta >= 0 ? "#10b981" : "#ef4444"
      badge.textContent = `${Math.round(prediction.predictedRating)} (${prediction.predictedDelta >= 0 ? "+" : ""}${Math.round(prediction.predictedDelta)})`
      container.appendChild(badge)
    }

    const injectUnavailable = (container: Element, message: string) => {
      if (container.querySelector(".av-prediction")) return
      const badge = document.createElement("span")
      badge.className = "av-prediction"
      badge.title = message
      badge.style.display = "block"
      badge.style.marginTop = "2px"
      badge.style.fontSize = "10px"
      badge.style.fontWeight = "600"
      badge.style.color = "#71717a"
      badge.textContent = "prediction unavailable"
      container.appendChild(badge)
    }

    const scan = () => {
      const contestSlug = location.pathname.match(/\/contest\/([^/]+)\/ranking/)?.[1]
      if (!contestSlug || disposed) return
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/u/"]').forEach((userLink) => {
        const username = userLink.getAttribute("href")?.match(/\/u\/([^/?#]+)/)?.[1]
        const container = userLink.closest("td, [role=\"cell\"]") || userLink.parentElement
        if (!username || !container || container.querySelector(".av-prediction")) return

        const cacheKey = `${contestSlug}:US:${username.toLowerCase()}`
        const cached = predictionCache.get(cacheKey)
        if (cached) {
          injectPrediction(container, cached)
          return
        }
        if ((container as HTMLElement).dataset.algovaultPredictionLoading === "true") return
        ;(container as HTMLElement).dataset.algovaultPredictionLoading = "true"
        chrome.runtime.sendMessage({
          action: "get_entranthub_prediction",
          payload: { contestSlug, username, region: "US" }
        }, (response) => {
          delete (container as HTMLElement).dataset.algovaultPredictionLoading
          if (disposed) return
          if (!response?.ok || !response.data) {
            injectUnavailable(container, response?.error || "EntrantHub prediction unavailable")
            return
          }
          predictionCache.set(cacheKey, response.data)
          injectPrediction(container, response.data)
        })
      })
    }

    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [])

  return null
}
