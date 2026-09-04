import type { PlasmoCSConfig } from "plasmo"
import { STUDY_LISTS } from "../lib/study-lists"
import { getLeetCodeProblemSlug } from "../lib/leetcode-url"
import { showZenithQuestModal } from "./ZenithSystemOverlay"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_idle"
}

let isZenithActive = false;
let isZenithRevealed = false;

const hideForbiddenTabs = () => {
  if (!isZenithActive || isZenithRevealed) return;

  // 1. Target via XPath text search for "Editorial", "Solutions", "Discussion"
  const xpathResult = document.evaluate(
    "//*[text()='Editorial' or text()='Solutions' or text()='Discussion']",
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < xpathResult.snapshotLength; i++) {
    const node = xpathResult.snapshotItem(i) as HTMLElement;
    if (node) {
      // Find closest tab container or interactive wrapper
      const tabContainer = node.closest('[role="tab"], a, button, div[class*="tab"]') || node;
      if (tabContainer && !tabContainer.textContent?.includes("Description") && !tabContainer.id?.includes("av-intentional-reveal")) {
        (tabContainer as HTMLElement).style.setProperty("display", "none", "important");
      }
    }
  }

  // 2. Target tablist children that are not Description
  const tablist = document.querySelectorAll('[role="tablist"] > *');
  tablist.forEach((child) => {
    const text = child.textContent?.trim() || "";
    if ((text.includes("Editorial") || text.includes("Solutions") || text.includes("Discussion") || text.includes("Discuss")) && !child.id?.includes("av-intentional-reveal")) {
      (child as HTMLElement).style.setProperty("display", "none", "important");
    }
  });
};

const injectIntentionalRevealButton = () => {
  if (!isZenithActive || isZenithRevealed) return;
  const tablist = document.querySelector('[role="tablist"]');
  if (tablist && !document.getElementById("av-intentional-reveal")) {
    const revealBtn = document.createElement("button");
    revealBtn.id = "av-intentional-reveal";
    revealBtn.className = "ml-auto text-xs px-3 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium flex items-center gap-1 cursor-pointer font-mono select-none";
    revealBtn.innerHTML = "<span>🔒</span> Yield & Reveal Solutions";
    revealBtn.title = "Hold for 2 seconds to yield and reveal solutions";

    let holdTimer: number | null = null;

    revealBtn.onmousedown = () => {
      revealBtn.innerHTML = "<span>🔓</span> Yielding...";
      revealBtn.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
      holdTimer = window.setTimeout(() => {
        chrome.storage.local.set({ 
          "algovault.zenithGrade": "D", 
          "algovault.zenithReason": "Intentional Reveal" 
        }, () => {
          isZenithRevealed = true;
          // Un-hide Editorial & Solutions tabs
          document.querySelectorAll('[role="tab"], a, button, div').forEach((el) => {
            const text = el.textContent?.trim() || "";
            if (text === "Editorial" || text === "Solutions" || text === "Discussion") {
              (el as HTMLElement).style.removeProperty("display");
              const parent = (el as HTMLElement).closest('[role="tab"]');
              if (parent) (parent as HTMLElement).style.removeProperty("display");
            }
          });
          revealBtn.innerHTML = "<span>✅</span> Solutions Revealed";
          revealBtn.disabled = true;
          revealBtn.style.opacity = "0.5";
          revealBtn.style.cursor = "default";
        });
      }, 2000);
    };

    revealBtn.onmouseup = revealBtn.onmouseleave = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        if (!revealBtn.disabled) {
          revealBtn.innerHTML = "<span>🔒</span> Yield & Reveal Solutions";
          revealBtn.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        }
      }
    };

    tablist.appendChild(revealBtn);
  }
};

const applyZenithMode = (isActive: boolean) => {
  let zenithStyle = document.getElementById("av-zenith-style");
  if (isActive) {
    if (!zenithStyle) {
      zenithStyle = document.createElement("style");
      zenithStyle.id = "av-zenith-style";
      // Cinematic Focus: Darker backgrounds, hiding extraneous information
      zenithStyle.textContent = `
        /* Hide Navbar to prevent navigation away */
        #navbar-root, nav, header { display: none !important; }
        
        /* Hide topics, companies, hints sections at the bottom */
        div[class*="topic-tags"], div.mt-6.flex.flex-col.gap-3 { display: none !important; }
        
        /* Hide LeetCode's own timer/session widgets if any */
        [data-track-load="timer"] { display: none !important; }
        
        /* Premium Background */
        body { background-color: #030303 !important; }
      `;
      document.head.appendChild(zenithStyle);
    }
    hideForbiddenTabs();
    injectIntentionalRevealButton();
  } else {
    isZenithRevealed = false;
    if (zenithStyle) zenithStyle.remove();
    const revealBtn = document.getElementById("av-intentional-reveal");
    if (revealBtn) revealBtn.remove();
    // Restore any hidden tabs if Zenith is turned off
    document.querySelectorAll('[role="tab"], a, button').forEach((el) => {
      if ((el as HTMLElement).style.display === "none") {
        (el as HTMLElement).style.removeProperty("display");
      }
    });
  }
}

// Listen for Zenith state changes to apply/remove blackout
chrome.storage.local.get("algovault.isZenith", (res) => {
  isZenithActive = !!res["algovault.isZenith"];
  applyZenithMode(isZenithActive);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes["algovault.isZenith"]) {
    isZenithActive = !!changes["algovault.isZenith"].newValue;
    applyZenithMode(isZenithActive);
  }
});

// Global state to prevent infinite loops from MutationObserver
let ratingInjected = false;
let acceptanceHidden = false;
let acceptancePreferenceLoaded = false;
let predictionInjected = false;
let predictionData: any = null;
let overlayInitializedForSlug: string | null = null;

function isSubmissionDetailPage() {
  return location.pathname.includes("/submissions/")
}

type CompanyEvidence = {
  companyName: string
  frequencyScore: number
  timeframeLabel: string
}

// Keep the large company index in the background worker. A problem page only
// receives the few records relevant to its current slug.
const companyEvidencesBySlug = new Map<string, CompanyEvidence[]>()
const companyEvidenceRequests = new Set<string>()

function loadCompanyEvidences(slug: string) {
  const key = slug.toLowerCase()
  if (companyEvidencesBySlug.has(key) || companyEvidenceRequests.has(key)) return

  companyEvidenceRequests.add(key)
  chrome.runtime.sendMessage({ action: "get_companies_for_problem", slug: key }, (response) => {
    companyEvidenceRequests.delete(key)
    if (chrome.runtime.lastError) return

    companyEvidencesBySlug.set(key, Array.isArray(response?.evidences) ? response.evidences : [])
    if (getLeetCodeProblemSlug()?.toLowerCase() === key) {
      injectAlgoVaultOverlay()
    }
  })
}

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
  if (isSubmissionDetailPage()) return
  const currentSlug = getLeetCodeProblemSlug()
  if (currentSlug) overlayInitializedForSlug = currentSlug

  // 1. Acceptance Rate & Global Accepted/Submissions
  if (!acceptanceHidden && !acceptancePreferenceLoaded) {
    chrome.storage.sync.get(['hideAcceptanceRate'], (result) => {
      acceptancePreferenceLoaded = true
      if (result.hideAcceptanceRate === false) return;

      // Hide global "Accepted" and "Submissions" numbers strictly inside problem description
      const descPane = document.querySelector('[data-track-load="description_content"], #qd-content') || document.querySelector('div[class*="content__"]');
      if (descPane) {
        const iterAccepted = document.evaluate(
          ".//*[text()='Accepted' or text()='Submissions']",
          descPane, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
        );
        for (let i = 0; i < iterAccepted.snapshotLength; i++) {
          const nextAcc = iterAccepted.snapshotItem(i) as HTMLElement;
          if (nextAcc && !nextAcc.closest('.monaco-editor, [class*="submission"], [class*="result"]')) {
            let valNode = nextAcc.nextElementSibling as HTMLElement;
            if (!valNode || !valNode.textContent?.match(/\d/)) {
              valNode = nextAcc.parentElement?.nextElementSibling as HTMLElement;
            }
            if (valNode) {
              valNode.style.display = 'none';
            }
            nextAcc.style.display = 'none';
          }
        }
      }

      // Find the acceptance rate label more robustly using XPath
      const accContext = descPane || document;
      const iter = document.evaluate(
        ".//*[text()='Acceptance' or text()='Acceptance Rate']",
        accContext, null, XPathResult.ANY_TYPE, null
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
  const findProblemHeaderElements = (): { diffTag: HTMLElement | null; metadataRow: HTMLElement | null } => {
    // 1. Check if already tagged by AlgoVault and validate it is strictly the difficulty tag
    const existingTagged = document.querySelector('[data-algovault-rating]') as HTMLElement | null
    if (existingTagged && existingTagged.parentElement) {
      const rawText = Array.from(existingTagged.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE || !(node as HTMLElement).classList?.contains("av-rating"))
        .map(node => node.textContent || "")
        .join("")
        .trim()
      if (rawText === "Easy" || rawText === "Medium" || rawText === "Hard") {
        return { diffTag: existingTagged, metadataRow: existingTagged.parentElement }
      } else {
        // Clean up wrong assignment on row container
        existingTagged.removeAttribute("data-algovault-rating")
        existingTagged.querySelectorAll(".av-rating").forEach(el => el.remove())
      }
    }

    // Scope DOM queries strictly to description / problem header area to avoid scanning Monaco editor & terminals
    const searchScope: HTMLElement = (document.querySelector('[data-track-load="description_content"], #qd-content, div[class*="content__"]') as HTMLElement) || document.body

    // Clean up any stray av-rating badges attached to wrong containers within scope
    searchScope.querySelectorAll(".av-rating").forEach(el => {
      const parentText = el.parentElement?.textContent?.replace(/\s*\(\d+\)\s*$/, "").trim() || ""
      if (parentText !== "Easy" && parentText !== "Medium" && parentText !== "Hard") {
        el.remove()
      }
    })

    // 2. Fast-path: search for elements with difficulty classes
    const difficultyCandidates = Array.from(searchScope.querySelectorAll(
      'div[class*="text-difficulty-"], div[class*="text-olive"], div[class*="text-yellow"], div[class*="text-pink"], span[class*="text-olive"], span[class*="text-yellow"], span[class*="text-pink"], [data-degree]'
    )) as HTMLElement[]

    for (const el of difficultyCandidates) {
      const text = el.textContent?.replace(/\s*\(\d+\)\s*$/, "").trim()
      if (text === "Easy" || text === "Medium" || text === "Hard") {
        return { diffTag: el, metadataRow: el.parentElement }
      }
    }

    // Fallback: Search innermost difficulty element inside scoped container only
    const allElements = Array.from(searchScope.querySelectorAll('div, span'))
    let bestDiffTag: HTMLElement | null = null

    for (const el of allElements) {
      // Exclude containers that have buttons, links, or other pills inside
      if (el.querySelector('button, [role="button"], a, input, #av-company-trigger-btn, #av-start-zenith-btn')) continue

      // Extract text excluding any existing av-rating badge
      const cloneText = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE || !(node as HTMLElement).classList?.contains("av-rating"))
        .map(node => node.textContent || "")
        .join("")
        .trim()

      if (cloneText === "Easy" || cloneText === "Medium" || cloneText === "Hard") {
        const parent = el.parentElement
        if (parent) {
          const parentText = parent.textContent || ""
          if (
            parentText.includes("Topics") ||
            parentText.includes("Companies") ||
            parentText.includes("Hint") ||
            parent.classList.toString().includes("flex") ||
            parent.classList.toString().includes("items-center") ||
            parent.parentElement?.classList.toString().includes("flex")
          ) {
            bestDiffTag = el as HTMLElement
            break
          }
        }
      }
    }

    if (bestDiffTag && bestDiffTag.parentElement) {
      return { diffTag: bestDiffTag, metadataRow: bestDiffTag.parentElement }
    }

    // 3. Fallback: find Topics or Companies button and locate the difficulty sibling
    const topicsOrCompanies = Array.from(searchScope.querySelectorAll('button, div[role="button"], a, div')).find(el => {
      const t = el.textContent?.trim() || ""
      return t === "Topics" || t === "Companies" || t.startsWith("Topics") || t.startsWith("Companies")
    })

    if (topicsOrCompanies && topicsOrCompanies.parentElement) {
      const row = topicsOrCompanies.parentElement as HTMLElement
      for (const child of Array.from(row.children)) {
        const text = Array.from(child.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE || !(node as HTMLElement).classList?.contains("av-rating"))
          .map(node => node.textContent || "")
          .join("")
          .trim()
        if (text === "Easy" || text === "Medium" || text === "Hard") {
          return { diffTag: child as HTMLElement, metadataRow: row }
        }
      }
      return { diffTag: null, metadataRow: row }
    }

    return { diffTag: null, metadataRow: null }
  }

  const { diffTag, metadataRow } = findProblemHeaderElements()
  const injectedSlug = diffTag?.getAttribute("data-algovault-rating")

  if (diffTag && currentSlug && injectedSlug !== currentSlug) {
    diffTag.setAttribute("data-algovault-rating", currentSlug)
    diffTag.querySelector(".av-rating")?.remove()

    const applyRating = (rating: number) => {
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

    chrome.runtime.sendMessage({ action: "get_problem_rating", slug: currentSlug }, (data) => {
      if (data && typeof data.Rating === "number") {
        applyRating(data.Rating)
      }
    })
  }

  // 3. Native Compact In-Page Companies Pill
  const targetRow = metadataRow || diffTag?.parentElement
  if (currentSlug && targetRow) {
    const existingCompanyBtn = document.getElementById("av-company-trigger-btn")
    const injectedForSlug = existingCompanyBtn?.getAttribute("data-slug")

    if (!existingCompanyBtn || injectedForSlug !== currentSlug) {
      existingCompanyBtn?.remove()

      const companySlug = currentSlug.toLowerCase()
      if (!companyEvidencesBySlug.has(companySlug)) {
        loadCompanyEvidences(currentSlug)
        return
      }

      const companyEvidences = companyEvidencesBySlug.get(companySlug) || []
      if (companyEvidences.length > 0) {
        // Look for LeetCode's native locked Companies button
        const searchScope = targetRow.parentElement || targetRow
        let nativeLockedBtn = Array.from(searchScope.querySelectorAll('button, div[role="button"], a')).find(el => {
          if (el.id === "av-company-trigger-btn" || el.closest("#av-company-trigger-btn")) return false
          const t = el.textContent?.trim() || ""
          return t === "Companies" || t.startsWith("Companies") || t.endsWith("Companies")
        }) as HTMLElement | null

        if (!nativeLockedBtn) {
          nativeLockedBtn = Array.from(searchScope.querySelectorAll('div, span, button, a')).find(el => {
            if (el.id === "av-company-trigger-btn" || el.closest("#av-company-trigger-btn")) return false
            const t = el.textContent?.trim() || ""
            return t === "Companies" || t.startsWith("Companies")
          }) as HTMLElement | null
        }

        if (!nativeLockedBtn) {
          const descScope = (document.querySelector('[data-track-load="description_content"], #qd-content, div[class*="content__"]') as HTMLElement) || searchScope
          nativeLockedBtn = Array.from(descScope.querySelectorAll('button, div[role="button"]')).find(el => {
            if (el.id === "av-company-trigger-btn" || el.closest("#av-company-trigger-btn")) return false
            const t = el.textContent?.trim() || ""
            return t === "Companies" || t.startsWith("Companies")
          }) as HTMLElement | null
        }

        // Create sleek native-styled unlocked pill button
        const btn = document.createElement("button")
        btn.id = "av-company-trigger-btn"
        btn.setAttribute("data-slug", currentSlug)
        btn.className = "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors"
        btn.title = `Asked by ${companyEvidences.length} companies in interviews (Click to explore)`
        
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.85; flex-shrink: 0;"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
          <span>Companies</span>
          <span style="font-size: 10px; color: #a1a1aa; font-family: ui-monospace, monospace; margin-left: 2px;">(${companyEvidences.length})</span>
        `

        Object.assign(btn.style, {
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 10px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          color: "#d1d5db",
          border: "none",
          cursor: "pointer",
          transition: "all 0.15s ease",
          userSelect: "none",
          marginLeft: nativeLockedBtn ? "0px" : "6px",
          verticalAlign: "middle",
          boxSizing: "border-box"
        })

        btn.onmouseenter = () => {
          btn.style.backgroundColor = "rgba(255, 255, 255, 0.15)"
          btn.style.color = "#ffffff"
        }
        btn.onmouseleave = () => {
          btn.style.backgroundColor = "rgba(255, 255, 255, 0.08)"
          btn.style.color = "#d1d5db"
        }

        btn.onclick = (e) => {
          e.preventDefault()
          e.stopPropagation()
          showCompanyModal(currentSlug, companyEvidences)
        }

        if (nativeLockedBtn && nativeLockedBtn.parentElement) {
          // Hide native locked button and insert our unlocked button in its place
          nativeLockedBtn.style.setProperty("display", "none", "important")
          if (!document.getElementById("av-company-trigger-btn")) {
            nativeLockedBtn.parentElement.insertBefore(btn, nativeLockedBtn)
          }
        } else {
          // Insert next to Hint or at the end of metadata row
          targetRow.appendChild(btn)
        }
      }
    }
  }

  // Helper: Floating Company Modal Popover
  function showCompanyModal(slug: string, evidences: any[]) {
    const existing = document.getElementById("av-company-modal")
    if (existing) {
      existing.remove()
      return
    }

    const backdrop = document.createElement("div")
    backdrop.id = "av-company-modal"
    Object.assign(backdrop.style, {
      position: "fixed",
      inset: "0",
      zIndex: "999999",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif"
    })

    const modal = document.createElement("div")
    Object.assign(modal.style, {
      width: "480px",
      maxWidth: "92vw",
      maxHeight: "80vh",
      backgroundColor: "#121214",
      border: "1px solid rgba(223, 160, 84, 0.3)",
      borderRadius: "14px",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(223, 160, 84, 0.15)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      color: "#e4e4e7"
    })

    const header = document.createElement("div")
    Object.assign(header.style, {
      padding: "14px 16px",
      borderBottom: "1px solid #27272a",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#18181b"
    })

    header.innerHTML = `
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 15px;">🏢</span>
          <span style="font-weight: 700; font-size: 13px; color: #f4f4f5;">Interview Companies</span>
          <span style="font-size: 10px; font-family: monospace; font-weight: 700; background: rgba(223, 160, 84, 0.15); color: #dfa054; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(223, 160, 84, 0.3);">${evidences.length} Companies</span>
        </div>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Verified LeetCode candidate submissions</div>
      </div>
      <button id="av-modal-close-btn" style="background: none; border: none; color: #a1a1aa; font-size: 16px; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
    `

    const searchContainer = document.createElement("div")
    Object.assign(searchContainer.style, {
      padding: "10px 16px",
      borderBottom: "1px solid #27272a",
      backgroundColor: "#121214"
    })
    const searchInput = document.createElement("input")
    searchInput.placeholder = "Search companies asking this question..."
    Object.assign(searchInput.style, {
      width: "100%",
      backgroundColor: "#1c1c1f",
      border: "1px solid #3f3f46",
      borderRadius: "8px",
      padding: "7px 12px",
      fontSize: "12px",
      color: "#f4f4f5",
      outline: "none",
      boxSizing: "border-box"
    })
    searchContainer.appendChild(searchInput)

    const list = document.createElement("div")
    Object.assign(list.style, {
      padding: "12px 16px",
      overflowY: "auto",
      flex: "1",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    })

    const renderList = (filter: string) => {
      list.innerHTML = ""
      const q = filter.toLowerCase().trim()
      const filtered = evidences.filter((e: any) => e.companyName.toLowerCase().includes(q))
      if (filtered.length === 0) {
        const emptyDiv = document.createElement("div")
        Object.assign(emptyDiv.style, {
          textAlign: "center",
          color: "#71717a",
          fontSize: "12px",
          padding: "24px"
        })
        emptyDiv.textContent = `No companies found matching "${filter}"`
        list.appendChild(emptyDiv)
        return
      }

      for (const ev of filtered) {
        const card = document.createElement("div")
        Object.assign(card.style, {
          padding: "10px 12px",
          borderRadius: "8px",
          backgroundColor: "#18181b",
          border: "1px solid #27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        })

        const freqColor = ev.frequencyScore >= 75 ? "#10b981" : ev.frequencyScore >= 50 ? "#dfa054" : "#a1a1aa"

        card.innerHTML = `
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 600; font-size: 12px; color: #f4f4f5;">${ev.companyName}</span>
              <span style="font-size: 9px; font-family: monospace; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.06); color: #a1a1aa; border: 1px solid #3f3f46;">${ev.timeframeLabel}</span>
            </div>
            <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 4px; background: #27272a; border-radius: 9999px; overflow: hidden;">
                <div style="width: ${ev.frequencyScore}%; height: 100%; background: ${freqColor}; border-radius: 9999px;"></div>
              </div>
              <span style="font-size: 10px; font-family: monospace; font-weight: 700; color: ${freqColor};">${Math.round(ev.frequencyScore)}% Freq</span>
            </div>
          </div>
        `
        list.appendChild(card)
      }
    }

    renderList("")
    searchInput.oninput = (e: any) => renderList(e.target.value)

    const footer = document.createElement("div")
    Object.assign(footer.style, {
      padding: "10px 16px",
      borderTop: "1px solid #27272a",
      backgroundColor: "#18181b",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "11px",
      color: "#a1a1aa"
    })
    footer.innerHTML = `
      <span>Source: LeetCode Verified Interview Records</span>
      <span style="color: #dfa054; font-family: monospace; font-weight: 700;">AlgoVault</span>
    `

    modal.appendChild(header)
    modal.appendChild(searchContainer)
    modal.appendChild(list)
    modal.appendChild(footer)
    backdrop.appendChild(modal)
    document.body.appendChild(backdrop)

    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove()
    }
    header.querySelector("#av-modal-close-btn")?.addEventListener("click", () => backdrop.remove())
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        backdrop.remove()
        window.removeEventListener("keydown", handleKey)
      }
    }
    window.addEventListener("keydown", handleKey)
  }

  // Remove Study Lists overlay button if present
  document.getElementById('av-lists-btn')?.remove();

  // Helper to make Zenith button freely draggable across the screen
  const makeElementDraggable = (el: HTMLElement, storageKey: string, onClickHandler: () => void) => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let hasMoved = false;

    // Restore saved position if present
    chrome.storage.local.get(storageKey, (res) => {
      const saved = res[storageKey];
      if (saved && typeof saved.left === "number" && typeof saved.top === "number") {
        el.style.bottom = "auto";
        el.style.left = `${saved.left}px`;
        el.style.top = `${saved.top}px`;
      }
    });

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = el.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      el.style.transition = "none";
      el.style.cursor = "grabbing";

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved = true;
        }

        let newLeft = Math.max(10, Math.min(window.innerWidth - rect.width - 10, initialLeft + dx));
        let newTop = Math.max(10, Math.min(window.innerHeight - rect.height - 10, initialTop + dy));

        el.style.bottom = "auto";
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        el.style.cursor = "pointer";
        el.style.transition = "all 0.3s ease";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        if (hasMoved) {
          const rect = el.getBoundingClientRect();
          chrome.storage.local.set({
            [storageKey]: { left: rect.left, top: rect.top }
          });
        } else {
          onClickHandler();
        }
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    el.addEventListener("mousedown", onMouseDown);
  };

  // Inject Start Zenith button if not already in Zenith session
  if (!document.getElementById('av-start-zenith-btn') && !isZenithActive) {
    const startZenithBtn = document.createElement('button');
    startZenithBtn.id = 'av-start-zenith-btn';
    startZenithBtn.innerHTML = '<span style="font-size: 12px; margin-right: 4px;">⚔️</span> ZENITH';
    
    // Positioned at bottom-left corner by default with compact, sleek pill styling
    Object.assign(startZenithBtn.style, {
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      zIndex: '9999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 10px',
      borderRadius: '9999px',
      backgroundColor: 'rgba(9, 9, 11, 0.85)',
      color: '#dfa054',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.8px',
      textTransform: 'uppercase',
      border: '1px solid rgba(223, 160, 84, 0.3)',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5), 0 0 12px rgba(223, 160, 84, 0.15)',
      backdropFilter: 'blur(8px)',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'all 0.2s ease'
    });

    startZenithBtn.onmouseover = () => {
      startZenithBtn.style.backgroundColor = 'rgba(24, 24, 27, 0.95)';
      startZenithBtn.style.borderColor = 'rgba(223, 160, 84, 0.6)';
      startZenithBtn.style.boxShadow = '0 0 25px rgba(223, 160, 84, 0.3)';
    };
    
    startZenithBtn.onmouseleave = () => {
      startZenithBtn.style.backgroundColor = 'rgba(9, 9, 11, 0.9)';
      startZenithBtn.style.borderColor = 'rgba(223, 160, 84, 0.3)';
      startZenithBtn.style.boxShadow = '0 0 15px rgba(223, 160, 84, 0.15)';
    };

    makeElementDraggable(startZenithBtn, "algovault.zenithBtnPos", () => {
      showZenithQuestModal(
        (intent) => {
          // Synchronously request fullscreen on user click
          document.documentElement.requestFullscreen().catch((err) => {
            console.warn("Fullscreen request rejected:", err);
          });
          // Zenith is an explicit user action, so it starts an APSE v2 focus session.
          const slug = getLeetCodeProblemSlug()
          if (slug) {
            chrome.runtime.sendMessage({ action: "session_start_v2", slug });
          }
          chrome.storage.local.set({
            "algovault.isZenith": true,
            "algovault.zenithGrade": "S_PLUS",
            "algovault.zenithReason": "Pure Solve",
            "algovault.zenithFocusScore": 100,
            "algovault.zenithIntent": intent
          }, () => {
            startZenithBtn.remove();
          });
        },
        () => {
          // Cancel
        }
      );
    });

    document.body.appendChild(startZenithBtn);
  } else if (isZenithActive && document.getElementById('av-start-zenith-btn')) {
    document.getElementById('av-start-zenith-btn')?.remove();
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
const observer = new MutationObserver((mutations) => {
  if (isSubmissionDetailPage()) return
  if (observerTimeout) return;

  const hasRelevantMutation = mutations.some((mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
    return !target?.closest(".monaco-editor, .view-lines, .CodeMirror, #algovault-post-solve, [id^='av-'], [class*='submission'], [data-track-load*='submission']")
  })
  if (!hasRelevantMutation) return;

  observerTimeout = window.setTimeout(() => {
    observerTimeout = null;
    const currentSlug = getLeetCodeProblemSlug()
    const slugChanged = Boolean(currentSlug && currentSlug !== overlayInitializedForSlug)
    const ratingGone = ratingInjected && !document.querySelector('.av-rating');
    const predictionGone = predictionInjected && !document.getElementById('av-solve-chance-bubble');
    if (!slugChanged && !ratingGone && !predictionGone && overlayInitializedForSlug) return;
    if (ratingGone) ratingInjected = false;
    if (predictionGone) predictionInjected = false;
    if (slugChanged) {
      ratingInjected = false;
      predictionInjected = false;
      predictionData = null;
      void fetchPrediction();
    }
    injectAlgoVaultOverlay();
    hideForbiddenTabs();
    injectIntentionalRevealButton();
  }, 500);
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener("beforeunload", () => {
  if (observerTimeout) clearTimeout(observerTimeout);
  observer.disconnect();
});

// Start process
setTimeout(() => {
    if (isSubmissionDetailPage()) return
    fetchPrediction();
    injectAlgoVaultOverlay();
}, 1000);
