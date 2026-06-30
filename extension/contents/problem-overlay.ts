import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"],
  run_at: "document_idle"
}

// Global state to prevent infinite loops from MutationObserver
let ratingInjected = false;
let acceptanceHidden = false;
let predictionInjected = false;
let predictionData: any = null;

const fetchPrediction = async () => {
  const slug = window.location.pathname.split('/')[2];
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
  const diffTag = Array.from(document.querySelectorAll("*")).find(el => {
    const text = el.textContent?.trim();
    if (text !== "Easy" && text !== "Medium" && text !== "Hard") return false;
    const className = el.className || "";
    if (typeof className !== "string") return false;
    return className.includes("text-") || className.includes("difficulty") || className.includes("sd-");
  }) as HTMLElement;

  if (diffTag && !diffTag.hasAttribute('data-algovault-rating')) {
    diffTag.setAttribute('data-algovault-rating', 'true');

    // Fetch rating from zerotrac via background to bypass CSP
    chrome.runtime.sendMessage({ action: "get_zerotrac" }, (data) => {
      if (data && !data.error) {
        const urlPath = window.location.pathname;
        const slugMatch = urlPath.match(/\/problems\/([^\/]+)/);
        if (slugMatch) {
          const slug = slugMatch[1];
          const prob = data.find((p: any) => p.TitleSlug === slug);
          if (prob && prob.Rating) {
            const rating = Math.round(prob.Rating);
            if (!diffTag.querySelector(".av-rating")) {
              const badge = document.createElement("span");
              badge.className = "av-rating ml-2 font-mono font-bold opacity-90";
              badge.textContent = ` (${rating})`;
              diffTag.appendChild(badge);
            }
          }
        }
      } else {
        console.error("AlgoVault: Failed to fetch ZeroTrac rating", data?.error);
      }
    });
  }

  // 2.5 Add to Vault Button
  const titleH1 = document.querySelector('a[href*="/problems/"]')?.parentElement;
  if (titleH1 && !document.getElementById('av-vault-btn')) {
    const vaultBtn = document.createElement('button');
    vaultBtn.id = 'av-vault-btn';
    vaultBtn.textContent = '🔒 Vault';
    vaultBtn.className = 'ml-3 text-xs px-2 py-1 rounded bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20 hover:bg-[#00d4aa]/20 transition-colors font-medium';
    vaultBtn.onclick = () => {
      const note = window.prompt("Add a note to your AlgoVault for this problem:");
      if (note) {
        const titleSlug = window.location.pathname.split('/')[2];
        const heading = document.querySelector("a[href*='/problems/']")?.textContent || titleSlug;

        chrome.runtime.sendMessage({
          action: "add_to_vault",
          payload: {
            title: heading.replace(/^\d+\.\s*/, "").trim(),
            content: note,
            entryType: "NOTE",
            tags: "manual",
            problem: {
              titleSlug
            }
          }
        }, (res) => {
          if (res && res.ok) {
            vaultBtn.textContent = '✅ Saved';
            setTimeout(() => vaultBtn.textContent = '🔒 Vault', 2000);
          } else {
            alert("Failed to save to Vault");
          }
        });
      }
    };
    titleH1.appendChild(vaultBtn);
  }

  // Early return if we don't have prediction data yet
  if (!predictionData || predictionData.error) return;

  // 3. Solve Probability
  if (!predictionInjected) {
    const titleArea = document.querySelector('a[href*="/problems/"]')?.parentElement?.parentElement;
 
    if (titleArea && !document.getElementById('av-prediction-line')) {
      const predLine = document.createElement('div');
      predLine.id = 'av-prediction-line';
      predLine.style.marginTop = '16px';
      predLine.style.marginBottom = '16px';
      predLine.style.padding = '12px 16px';
      predLine.style.backgroundColor = '#141416';
      predLine.style.border = '1px solid #27272a';
      predLine.style.borderRadius = '8px';
      predLine.style.fontFamily = 'monospace, sans-serif';
      predLine.style.fontSize = '12px';
      predLine.style.color = '#a1a1aa';
      predLine.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
 
      const { solveChance, expectedTimeMinutes, confidence, breakdown = {} } = predictionData;
      const roundedSolveChance = typeof solveChance === 'number' ? Math.round(solveChance) : 0;
      
      let assessment = "No chance";
      let assessmentColor = "#ef4444";
      if (roundedSolveChance >= 80) {
        assessment = "Will get it";
        assessmentColor = "#00d4aa";
      } else if (roundedSolveChance >= 40) {
        assessment = "Try try try";
        assessmentColor = "#ff9800";
      }

      const similarSolved = breakdown.similarSolvedCount ?? breakdown.similarSolved ?? "0";
      const tagStrength = breakdown.tagStrengthPercent ?? breakdown.tagStrength ?? 0;
      const ratingSuccess = breakdown.ratingBucketSuccessPercent ?? breakdown.historicalSuccessRate ?? 0;

      const roundedTagStrength = typeof tagStrength === 'number' ? Math.round(tagStrength) : tagStrength;
      const roundedRatingSuccess = typeof ratingSuccess === 'number' ? Math.round(ratingSuccess) : ratingSuccess;
      const displayConfidence = confidence ? confidence.charAt(0).toUpperCase() + confidence.slice(1).toLowerCase() : "Medium";

      predLine.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-bottom:8px;font-weight:600;color:#f4f4f5;font-size:12px;">
          <span>⚡ Solve Chance: <strong style="color:${assessmentColor}; font-weight:700;">${assessment}</strong> <span style="color:#71717a; font-weight:normal; font-size:11px;">(${roundedSolveChance}%)</span></span>
          <span style="color:#27272a;">|</span>
          <span>Target: <span style="font-family:monospace; font-weight:bold;">~${Math.round(expectedTimeMinutes)}m</span></span>
          <span style="color:#27272a;">|</span>
          <span>Confidence: <span style="font-family:monospace; font-weight:bold;">${displayConfidence}</span></span>
        </div>
        <div style="font-size:11px;color:#71717a;display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px;font-family:monospace;">
          <span>Based on:</span>
          <span style="border:1px solid #27272a;background:rgba(255,255,255,0.02);padding:1px 6px;border-radius:4px;color:#a1a1aa;">${similarSolved} solved</span>
          <span style="border:1px solid #27272a;background:rgba(255,255,255,0.02);padding:1px 6px;border-radius:4px;color:#a1a1aa;">Tag Str: ${roundedTagStrength}%</span>
          <span style="border:1px solid #27272a;background:rgba(255,255,255,0.02);padding:1px 6px;border-radius:4px;color:#a1a1aa;">Success: ${roundedRatingSuccess}%</span>
        </div>
      `;
 
      titleArea.insertAdjacentElement('afterend', predLine);
      predictionInjected = true;
    }
  }
}

const observer = new MutationObserver(() => {
  if (ratingInjected && !document.querySelector('div[class*="text-difficulty"] span')) ratingInjected = false;
  if (predictionInjected && !document.getElementById('av-prediction-line')) predictionInjected = false;
  injectAlgoVaultOverlay();
});

observer.observe(document.body, { childList: true, subtree: true });

// Start process
setTimeout(() => {
    fetchPrediction();
    injectAlgoVaultOverlay();
}, 1000);
