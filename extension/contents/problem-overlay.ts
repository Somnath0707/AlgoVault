import type { PlasmoCSConfig } from "plasmo"
import { STUDY_LISTS } from "../lib/study-lists"
import { getLeetCodeProblemSlug } from "../lib/leetcode-url"
import { showZenithQuestModal } from "./ZenithSystemOverlay"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_idle"
}

// Global state to prevent infinite loops from MutationObserver
let ratingInjected = false;
let acceptanceHidden = false;
let predictionInjected = false;
let predictionData: any = null;

const fetchPrediction = async () => {
  const slug = getLeetCodeProblemSlug()
  if (!slug) return;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res: any = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "get_prediction", slug }, resolve);
      });
      if (!res?.error) {
        predictionData = res;
        injectAlgoVaultOverlay();
        return;
      }
    } catch (e) {
      console.error("AlgoVault Prediction Error:", e);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const injectAlgoVaultOverlay = () => {
  // 1. Acceptance Rate & Global Accepted/Submissions
  if (!acceptanceHidden) {
    chrome.storage.sync.get(['hideAcceptanceRate'], (result) => {
      if (result.hideAcceptanceRate === false) return;

      // Hide global "Accepted" and "Submissions" numbers
      const iterAccepted = document.evaluate(
        "//*[text()='Accepted' or text()='Submissions']",
        document, null, XPathResult.ANY_TYPE, null
      );
      let nextAcc = iterAccepted.iterateNext() as HTMLElement;
      while (nextAcc) {
        let valNode = nextAcc.nextElementSibling as HTMLElement;
        if (!valNode || !valNode.textContent?.match(/\d/)) {
            valNode = nextAcc.parentElement?.nextElementSibling as HTMLElement;
        }
        if (valNode) {
            valNode.style.display = 'none';
        }
        nextAcc.style.display = 'none';
        nextAcc = iterAccepted.iterateNext() as HTMLElement;
      }

      // Find the acceptance rate label more robustly using XPath
      const iter = document.evaluate(
        "//*[text()='Acceptance' or text()='Acceptance Rate']",
        document, null, XPathResult.ANY_TYPE, null
      );
      const accLabel = iter.iterateNext() as HTMLElement;

      if (accLabel) {
        let accValue = accLabel.nextElementSibling as HTMLElement;
        if (!accValue || !accValue.textContent?.includes('%')) {
            accValue = accLabel.parentElement?.nextElementSibling as HTMLElement;
        }

        if (accValue && accValue.style.display !== 'none' && accValue.textContent?.includes('%')) {
          const originalValue = accValue.textContent || '';
          accValue.style.display = 'none';

          const toggleWrapper = document.createElement('div');
          toggleWrapper.className = 'text-label-1 dark:text-dark-label-1 font-medium flex items-center gap-2';

          const hiddenDots = document.createElement('span');
          hiddenDots.textContent = 'Hidden';

          const eyeBtn = document.createElement('button');
          eyeBtn.textContent = '👁 Show';
          eyeBtn.style.cursor = 'pointer';
          eyeBtn.style.color = '#00d4aa';
          eyeBtn.style.fontSize = '12px';

          let isShowing = false;
          eyeBtn.onclick = () => {
            isShowing = !isShowing;
            hiddenDots.textContent = isShowing ? originalValue : 'Hidden';
            eyeBtn.textContent = isShowing ? '👁 Hide' : '👁 Show';
          };

          toggleWrapper.appendChild(hiddenDots);
          toggleWrapper.appendChild(eyeBtn);

          accLabel.parentElement?.appendChild(toggleWrapper);
          acceptanceHidden = true;
        }
      }
    });
  }

  // 2. Inject Rating (Replacing Difficulty Tag)
  const diffTag = Array.from(document.querySelectorAll('div[class*="text-difficulty"]')).find(el => {
    const text = el.textContent?.trim();
    return text === "Easy" || text === "Medium" || text === "Hard";
  }) as HTMLElement;

  const currentSlug = getLeetCodeProblemSlug();
  const injectedSlug = diffTag?.getAttribute("data-algovault-rating");

  if (diffTag && currentSlug && injectedSlug !== currentSlug) {
    diffTag.setAttribute("data-algovault-rating", currentSlug);
    diffTag.querySelector(".av-rating")?.remove();

    const applyRating = (rating: number) => {
      // LeetCode is a SPA. Ignore async responses whose page context is stale.
      if (getLeetCodeProblemSlug() !== currentSlug) return
      if (!Number.isFinite(rating)) return

      const rounded = Math.round(Number(rating))
      const existing = diffTag.querySelector(".av-rating")
      if (existing) existing.remove()

      const badge = document.createElement("span")
      badge.className = "av-rating ml-2 font-mono font-bold opacity-90"
      badge.dataset.algovaultRating = currentSlug
      badge.textContent = ` (${rounded})`
      badge.title = "ZeroTrac contest rating"
      diffTag.appendChild(badge)
      ratingInjected = true
    }

    // Fetch rating for current problem via background to bypass CSP.
    chrome.runtime.sendMessage({ action: "get_problem_rating", slug: currentSlug }, (data) => {
      if (data && typeof data.Rating === "number") {
        applyRating(data.Rating)
      }
    })
  }

  // Compact study-list membership entry point.
  const titleH1 = document.querySelector('a[href*="/problems/"]')?.parentElement;
  if (titleH1 && !document.getElementById('av-lists-btn')) {
    const slug = getLeetCodeProblemSlug();
    const memberships = STUDY_LISTS.filter((list) => list.problems.some((problem) => problem.slug === slug));
    const listsBtn = document.createElement('button');
    listsBtn.id = 'av-lists-btn';
    listsBtn.textContent = memberships.length ? memberships.map((list) => list.name.replace("NeetCode ", "NC ").replace("Striver ", "Striver ")).join(" · ") : 'Study Lists';
    listsBtn.title = memberships.length ? `Included in ${memberships.map((list) => list.name).join(" and ")}` : "Open study lists";
    listsBtn.className = 'ml-3 text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium';
    listsBtn.onclick = () => {
      chrome.storage.local.set({ "algovault.requestedTab": "Lists" }, () => {
        chrome.runtime.sendMessage({ action: "open_side_panel" });
      });
    };
    titleH1.appendChild(listsBtn);
  }

  // Inject Start Zenith button if not already in Zenith session
  if (titleH1 && !document.getElementById('av-start-zenith-btn')) {
    chrome.storage.local.get("algovault.isZenith", (res) => {
      const active = !!res["algovault.isZenith"];
      if (active) return;

      const startZenithBtn = document.createElement('button');
      startZenithBtn.id = 'av-start-zenith-btn';
      startZenithBtn.textContent = '⚔️ Start Zenith';
      startZenithBtn.className = 'ml-3 text-xs px-2.5 py-1 rounded bg-[#dfa054]/10 text-[#dfa054] border border-[#dfa054]/25 hover:bg-[#dfa054]/20 transition-colors font-medium cursor-pointer';
      startZenithBtn.onclick = () => {
        showZenithQuestModal(
          (intent) => {
            // Synchronously request fullscreen on user click
            document.documentElement.requestFullscreen().catch((err) => {
              console.warn("Fullscreen request rejected:", err);
            });
            chrome.storage.local.set({
              "algovault.isZenith": true,
              "algovault.zenithGrade": "S_PLUS",
              "algovault.zenithReason": "Pure Solve",
              "algovault.zenithFocusScore": 100,
              "algovault.zenithIntent": intent,
              "algovault.problemStartTime": new Date().toISOString()
            }, () => {
              startZenithBtn.remove();
            });
          },
          () => {
            // Cancel
          }
        );
      };
      titleH1.appendChild(startZenithBtn);
    });
  }

  // Early return if we don't have prediction data yet
  if (!predictionData || predictionData.error) return;

  // 3. Solve Probability (Injected as Inline Bubbles/Pills next to difficulty tag)
  if (!predictionInjected && diffTag && diffTag.parentElement) {
    const container = diffTag.parentElement;
    if (!document.getElementById('av-solve-chance-bubble')) {
      const { solveChance, expectedTimeMinutes, confidence } = predictionData;
      const roundedSolveChance = typeof solveChance === 'number' ? Math.round(solveChance) : 0;
      
      let assessment = "Stretch";
      let assessmentBg = "rgba(239, 68, 68, 0.08)";
      let assessmentBorder = "rgba(239, 68, 68, 0.2)";
      let assessmentColor = "#ef4444";
      
      if (roundedSolveChance >= 80) {
        assessment = "Accessible";
        assessmentBg = "rgba(16, 185, 129, 0.08)";
        assessmentBorder = "rgba(16, 185, 129, 0.2)";
        assessmentColor = "#10b981";
      } else if (roundedSolveChance >= 40) {
        assessment = "Uncertain";
        assessmentBg = "rgba(245, 158, 11, 0.08)";
        assessmentBorder = "rgba(245, 158, 11, 0.2)";
        assessmentColor = "#f59e0b";
      }

      const displayConfidence = confidence ? confidence.charAt(0).toUpperCase() + confidence.slice(1).toLowerCase() : "Medium";

      // 1. Solve Chance Bubble
      const chanceBubble = document.createElement('div');
      chanceBubble.id = 'av-solve-chance-bubble';
      chanceBubble.className = 'flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full';
      chanceBubble.style.display = 'inline-flex';
      chanceBubble.style.whiteSpace = 'nowrap';
      chanceBubble.style.backgroundColor = assessmentBg;
      chanceBubble.style.border = `1px solid ${assessmentBorder}`;
      chanceBubble.style.color = assessmentColor;
      chanceBubble.style.marginLeft = '8px';
      chanceBubble.innerHTML = `⚡ Practice estimate: <strong style="font-weight:700; margin-left:2px; margin-right:2px;">${assessment}</strong> (${roundedSolveChance}%)`;
      container.appendChild(chanceBubble);

      // 2. Confidence Bubble
      const confBubble = document.createElement('div');
      confBubble.id = 'av-confidence-bubble';
      confBubble.className = 'flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full';
      confBubble.style.display = 'inline-flex';
      confBubble.style.whiteSpace = 'nowrap';
      confBubble.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
      confBubble.style.border = '1px solid rgba(255, 255, 255, 0.08)';
      confBubble.style.color = '#c2c2c2';
      confBubble.style.marginLeft = '8px';
      confBubble.innerHTML = `🎯 Confidence: <strong style="font-weight:700; margin-left:2px;">${displayConfidence}</strong>`;
      container.appendChild(confBubble);

      predictionInjected = true;
    }
  }
}

let observerTimeout: number | null = null;
const observer = new MutationObserver(() => {
  if (ratingInjected && !document.querySelector('div[class*="text-difficulty"] span')) ratingInjected = false;
  if (predictionInjected && !document.getElementById('av-solve-chance-bubble')) predictionInjected = false;
  
  if (observerTimeout) window.clearTimeout(observerTimeout);
  observerTimeout = window.setTimeout(() => {
    injectAlgoVaultOverlay();
  }, 100);
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener("beforeunload", () => observer.disconnect());

// Start process
setTimeout(() => {
    fetchPrediction();
    injectAlgoVaultOverlay();
}, 1000);
