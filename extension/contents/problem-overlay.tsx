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
  
  try {
    const res = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "get_prediction", slug }, resolve);
    });
    predictionData = res;
    injectAlgoVaultOverlay();
  } catch (e) {
    console.error("AlgoVault Prediction Error:", e);
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
  const difficultyTags = Array.from(document.querySelectorAll('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard')) as HTMLElement[];
  const diffTag = difficultyTags[0];
  
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
            diffTag.textContent = `Rating: ${rating}`;
            diffTag.className = "text-xs font-medium px-2 py-1 rounded-full";
            if (rating < 1400) diffTag.classList.add("bg-green-500/20", "text-green-500");
            else if (rating < 1600) diffTag.classList.add("bg-cyan-500/20", "text-cyan-500");
            else if (rating < 1900) diffTag.classList.add("bg-blue-500/20", "text-blue-500");
            else if (rating < 2100) diffTag.classList.add("bg-purple-500/20", "text-purple-500");
            else if (rating < 2400) diffTag.classList.add("bg-orange-500/20", "text-orange-500");
            else diffTag.classList.add("bg-red-500/20", "text-red-500");
          }
        }
      } else {
        console.error("AlgoVault: Failed to fetch ZeroTrac rating", data?.error);
      }
    });
  }

  // Early return if we don't have prediction data yet
  if (!predictionData || predictionData.error) return;

  // 3. Solve Probability
  if (!predictionInjected) {
    const titleArea = document.querySelector('a[href*="/problems/"]')?.parentElement?.parentElement;
    
    if (titleArea && !document.getElementById('av-prediction-line')) {
      const predLine = document.createElement('div');
      predLine.id = 'av-prediction-line';
      predLine.style.marginTop = '12px';
      predLine.style.marginBottom = '16px';
      predLine.style.paddingTop = '12px';
      predLine.style.borderTop = '1px solid var(--border-tertiary)';
      predLine.style.fontSize = '13px';
      predLine.style.color = 'var(--text-secondary)';
      
      const { solveChance, expectedTimeMinutes, confidence, breakdown = {} } = predictionData;
      const similarSolved = breakdown.similarSolvedCount ?? breakdown.similarSolved ?? "n/a";
      const tagStrength = breakdown.tagStrengthPercent ?? breakdown.tagStrength ?? "n/a";
      const ratingSuccess = breakdown.ratingBucketSuccessPercent ?? breakdown.historicalSuccessRate ?? "n/a";

      predLine.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <span style="color:#00d4aa;font-weight:600;">⚡ Solve: ${solveChance}%</span>
          <span>~${expectedTimeMinutes} min</span>
          <span>Confidence: ${confidence}</span>
        </div>
        <div style="font-size:12px;opacity:0.8;display:flex;gap:12px;">
          <span>Based on:</span>
          <span>${similarSolved} similar solved</span>
          <span>Tag strength ${tagStrength}${typeof tagStrength === "number" ? "%" : ""}</span>
          <span>Rating success ${ratingSuccess}${typeof ratingSuccess === "number" ? "%" : ""}</span>
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
