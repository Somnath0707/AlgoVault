import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*", "https://leetcode.com/contest/*/problems/*"],
  run_at: "document_idle"
}

/**
 * Modern AlgoVault Zenith Focus Mode Overlay.
 * Clean, distraction-free UI matching AlgoVault dark theme.
 */

const overlayStyle = `
  @keyframes avFadeIn {
    from { opacity: 0; transform: scale(0.96) translate(-50%, -50%); }
    to { opacity: 1; transform: scale(1) translate(-50%, -50%); }
  }

  @keyframes avBgFadeIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(8px); }
  }

  @keyframes avToastSlide {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .av-zenith-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(9, 9, 11, 0.82);
    z-index: 2147483646;
    animation: avBgFadeIn 0.25s ease-out forwards;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .av-zenith-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 440px;
    max-width: 92vw;
    background: #18181b;
    border: 1px solid rgba(255, 161, 22, 0.35);
    border-radius: 14px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 161, 22, 0.12);
    z-index: 2147483647;
    animation: avFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    padding: 24px;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    box-sizing: border-box;
  }

  .av-zenith-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  .av-zenith-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: #f4f4f5;
    letter-spacing: -0.2px;
  }

  .av-zenith-badge {
    font-size: 10px;
    font-weight: 700;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    background: rgba(255, 161, 22, 0.15);
    color: #ffa116;
    padding: 2px 7px;
    border-radius: 9999px;
    border: 1px solid rgba(255, 161, 22, 0.3);
    letter-spacing: 0.5px;
  }

  .av-zenith-subtitle {
    font-size: 12px;
    color: #a1a1aa;
    line-height: 1.5;
    margin-bottom: 20px;
  }

  .av-zenith-features {
    background: #121214;
    border: 1px solid #27272a;
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .av-zenith-feature-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 12px;
    color: #d4d4d8;
    line-height: 1.4;
  }

  .av-zenith-feature-icon {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .av-zenith-feature-text strong {
    color: #f4f4f5;
    font-weight: 600;
  }

  .av-zenith-label {
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 8px;
  }

  .av-zenith-grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 18px;
  }

  .av-zenith-option-btn {
    border: 1px solid #27272a;
    background: #121214;
    border-radius: 8px;
    color: #a1a1aa;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    padding: 10px 8px;
    text-align: center;
    transition: all 0.15s ease;
  }

  .av-zenith-option-btn:hover {
    border-color: #3f3f46;
    color: #f4f4f5;
    background: #18181b;
  }

  .av-zenith-option-btn.is-active {
    border-color: rgba(255, 161, 22, 0.6);
    background: rgba(255, 161, 22, 0.1);
    color: #ffa116;
    font-weight: 600;
  }

  .av-zenith-actions {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .av-zenith-btn-primary {
    flex: 1;
    background: #ffa116;
    color: #09090b;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 11px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .av-zenith-btn-primary:hover {
    background: #ffb03a;
    box-shadow: 0 4px 12px rgba(255, 161, 22, 0.3);
  }

  .av-zenith-btn-secondary {
    background: transparent;
    color: #a1a1aa;
    border: 1px solid #27272a;
    border-radius: 8px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    padding: 11px 16px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .av-zenith-btn-secondary:hover {
    background: #27272a;
    color: #f4f4f5;
  }

  /* Toast Notification */
  .av-zenith-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: #18181b;
    border: 1px solid rgba(255, 161, 22, 0.4);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 161, 22, 0.15);
    border-radius: 8px;
    padding: 10px 16px;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: avToastSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    pointer-events: none;
  }

  /* Interruption Modal */
  .av-zenith-alert-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    max-width: 92vw;
    background: #18181b;
    border: 1px solid rgba(245, 158, 11, 0.4);
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.85);
    z-index: 2147483647;
    animation: avFadeIn 0.25s ease-out forwards;
    padding: 22px;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-sizing: border-box;
  }
`

let styleInjected = false
function injectStyle() {
  if (styleInjected) return
  const styleEl = document.createElement("style")
  styleEl.textContent = overlayStyle
  document.head.appendChild(styleEl)
  styleInjected = true
}

export type ZenithStartConfig = {
  intent: string
  targetMinutes: number | null
}

export function showZenithFocusModal(
  onStart: (config: ZenithStartConfig) => void,
  onCancel: () => void
) {
  injectStyle()

  const backdrop = document.createElement("div")
  backdrop.className = "av-zenith-backdrop"

  const card = document.createElement("div")
  card.className = "av-zenith-card"
  card.innerHTML = `
    <div class="av-zenith-header">
      <div class="av-zenith-title">
        <span>⚡</span> Zenith Focus Mode
      </div>
      <span class="av-zenith-badge">DEEP WORK</span>
    </div>
    <div class="av-zenith-subtitle">
      A distraction-free environment to build independent problem-solving skills under interview conditions.
    </div>

    <div class="av-zenith-features">
      <div class="av-zenith-feature-item">
        <span class="av-zenith-feature-icon">🛡️</span>
        <div class="av-zenith-feature-text">
          <strong>Distraction Shield:</strong> Editorials, community solutions, discussions, topic tags, and hints are locked.
        </div>
      </div>
      <div class="av-zenith-feature-item">
        <span class="av-zenith-feature-icon">⏱️</span>
        <div class="av-zenith-feature-text">
          <strong>Practice Engine:</strong> Active coding time, elapsed time, tab blur audits, and focus ratio are recorded.
        </div>
      </div>
      <div class="av-zenith-feature-item">
        <span class="av-zenith-feature-icon">🖥️</span>
        <div class="av-zenith-feature-text">
          <strong>Fullscreen Immersion:</strong> Navigation headers and browser toolbars are hidden for full focus.
        </div>
      </div>
    </div>

    <div class="av-zenith-label">Target Duration</div>
    <div class="av-zenith-grid-3 av-zenith-durations">
      <button class="av-zenith-option-btn is-active" data-minutes="0">Stopwatch</button>
      <button class="av-zenith-option-btn" data-minutes="25">25 min (Sprint)</button>
      <button class="av-zenith-option-btn" data-minutes="45">45 min (Interview)</button>
    </div>

    <div class="av-zenith-label">Session Mode</div>
    <div class="av-zenith-grid-3 av-zenith-intents">
      <button class="av-zenith-option-btn is-active" data-intent="SOLO_SOLVE">Solo Solve</button>
      <button class="av-zenith-option-btn" data-intent="INTERVIEW_SIM">Interview Sim</button>
      <button class="av-zenith-option-btn" data-intent="SPEED_DRILL">Speed Drill</button>
    </div>

    <div class="av-zenith-actions">
      <button class="av-zenith-btn-secondary" id="av-zenith-cancel-btn">Cancel</button>
      <button class="av-zenith-btn-primary" id="av-zenith-start-btn">
        <span>⚡</span> Start Zenith Session
      </button>
    </div>
  `

  card.addEventListener("click", (e) => e.stopPropagation())

  let selectedMinutes: number | null = null
  card.querySelectorAll<HTMLButtonElement>(".av-zenith-durations .av-zenith-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      card.querySelectorAll(".av-zenith-durations .av-zenith-option-btn").forEach((b) => b.classList.remove("is-active"))
      btn.classList.add("is-active")
      const val = parseInt(btn.dataset.minutes || "0", 10)
      selectedMinutes = val > 0 ? val : null
    })
  })

  let selectedIntent = "SOLO_SOLVE"
  card.querySelectorAll<HTMLButtonElement>(".av-zenith-intents .av-zenith-option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      card.querySelectorAll(".av-zenith-intents .av-zenith-option-btn").forEach((b) => b.classList.remove("is-active"))
      btn.classList.add("is-active")
      selectedIntent = btn.dataset.intent || "SOLO_SOLVE"
    })
  })

  const closeModal = () => {
    backdrop.remove()
    card.remove()
  }

  card.querySelector("#av-zenith-start-btn")?.addEventListener("click", () => {
    closeModal()
    onStart({
      intent: selectedIntent,
      targetMinutes: selectedMinutes
    })
  })

  card.querySelector("#av-zenith-cancel-btn")?.addEventListener("click", () => {
    closeModal()
    onCancel()
  })

  backdrop.addEventListener("click", () => {
    closeModal()
    onCancel()
  })

  document.body.appendChild(backdrop)
  document.body.appendChild(card)
}

// Aliased for backward compatibility with previous calls
export function showZenithQuestModal(
  onStart: (intent: string) => void,
  onCancel: () => void
) {
  showZenithFocusModal(
    (cfg) => onStart(cfg.intent),
    onCancel
  )
}

export function showZenithToast(message: string) {
  injectStyle()
  document.querySelectorAll(".av-zenith-toast").forEach((el) => el.remove())

  const toast = document.createElement("div")
  toast.className = "av-zenith-toast"
  toast.innerHTML = `<span>🛡️</span> <span>${message}</span>`
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.transition = "all 0.3s ease-in"
    toast.style.opacity = "0"
    toast.style.transform = "translateY(15px)"
    setTimeout(() => toast.remove(), 350)
  }, 3500)
}

export function showZenithAlarmModal(
  message: string,
  consequence: string,
  onProceed: () => void,
  onCancel: () => void
) {
  injectStyle()

  const backdrop = document.createElement("div")
  backdrop.className = "av-zenith-backdrop"

  const card = document.createElement("div")
  card.className = "av-zenith-alert-card"
  card.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <span style="font-size:18px;">⚠️</span>
      <span style="font-weight:700; font-size:15px; color:#f4f4f5;">Focus Interruption</span>
    </div>
    <div style="font-size:12px; color:#d4d4d8; line-height:1.5; margin-bottom:16px;">
      ${message}
    </div>
    <div style="font-size:11px; color:#a1a1aa; margin-bottom:20px; padding:8px 10px; background:#121214; border-radius:6px; border:1px solid #27272a;">
      Note: ${consequence}
    </div>
    <div style="display:flex; gap:10px;">
      <button id="av-zenith-alert-return" class="av-zenith-btn-primary" style="font-size:12px; padding:9px 12px;">
        Return to Focus
      </button>
      <button id="av-zenith-alert-continue" class="av-zenith-btn-secondary" style="font-size:12px; padding:9px 12px;">
        Continue
      </button>
    </div>
  `

  card.addEventListener("click", (e) => e.stopPropagation())

  const close = () => {
    backdrop.remove()
    card.remove()
  }

  card.querySelector("#av-zenith-alert-return")?.addEventListener("click", () => {
    close()
    onCancel()
  })

  card.querySelector("#av-zenith-alert-continue")?.addEventListener("click", () => {
    close()
    onProceed()
  })

  backdrop.addEventListener("click", () => {
    close()
    onCancel()
  })

  document.body.appendChild(backdrop)
  document.body.appendChild(card)
}

export function showZenithUnlockConfirmModal(
  onUnlock: () => void,
  onCancel: () => void
) {
  injectStyle()

  const backdrop = document.createElement("div")
  backdrop.className = "av-zenith-backdrop"

  const card = document.createElement("div")
  card.className = "av-zenith-alert-card"
  card.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
      <span style="font-size:18px;">🔓</span>
      <span style="font-weight:700; font-size:15px; color:#f4f4f5;">Unlock Solutions?</span>
    </div>
    <div style="font-size:12px; color:#d4d4d8; line-height:1.5; margin-bottom:16px;">
      This will reveal the Editorial, Solutions, Discussions, Topic Tags, and Hints for this problem.
    </div>
    <div style="font-size:11px; color:#a1a1aa; margin-bottom:20px; padding:8px 10px; background:#121214; border-radius:6px; border:1px solid #27272a;">
      Note: Your practice log will record that solutions were unlocked during this session.
    </div>
    <div style="display:flex; gap:10px;">
      <button id="av-zenith-confirm-keep-focus" class="av-zenith-btn-secondary" style="font-size:12px; padding:9px 12px; flex:1;">
        Keep Focusing
      </button>
      <button id="av-zenith-confirm-unlock" class="av-zenith-btn-primary" style="font-size:12px; padding:9px 12px; flex:1;">
        Unlock Solutions
      </button>
    </div>
  `

  card.addEventListener("click", (e) => e.stopPropagation())

  const close = () => {
    backdrop.remove()
    card.remove()
  }

  card.querySelector("#av-zenith-confirm-keep-focus")?.addEventListener("click", () => {
    close()
    onCancel()
  })

  card.querySelector("#av-zenith-confirm-unlock")?.addEventListener("click", () => {
    close()
    onUnlock()
  })

  backdrop.addEventListener("click", () => {
    close()
    onCancel()
  })

  document.body.appendChild(backdrop)
  document.body.appendChild(card)
}

