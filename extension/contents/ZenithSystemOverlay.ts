/**
 * Solo Leveling themed System Overlay UI for Zenith Focus Mode.
 */

const overlayStyle = `
  @keyframes soloFadeIn {
    from { opacity: 0; transform: scale(0.95) translate(-50%, -50%); }
    to { opacity: 1; transform: scale(1) translate(-50%, -50%); }
  }

  @keyframes bgFadeIn {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to { opacity: 1; backdrop-filter: blur(12px); }
  }

  @keyframes pulseCyan {
    0%, 100% { box-shadow: 0 0 15px rgba(223, 160, 84, 0.22), inset 0 0 10px rgba(223, 160, 84, 0.05); }
    50% { box-shadow: 0 0 25px rgba(223, 160, 84, 0.38), inset 0 0 15px rgba(223, 160, 84, 0.12); }
  }

  @keyframes pulseRed {
    0%, 100% { box-shadow: 0 0 15px rgba(255, 0, 85, 0.4), inset 0 0 10px rgba(255, 0, 85, 0.1); }
    50% { box-shadow: 0 0 25px rgba(255, 0, 85, 0.7), inset 0 0 15px rgba(255, 0, 85, 0.3); }
  }

  @keyframes slideToast {
    from { transform: translateY(100px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .solo-bg-blur {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(2, 6, 12, 0.85);
    z-index: 2147483646;
    animation: bgFadeIn 0.3s ease-out forwards;
  }

  .solo-quest-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 380px;
    background: rgba(14, 15, 19, 0.97);
    border: 1px solid rgba(223, 160, 84, 0.68);
    border-radius: 8px;
    z-index: 2147483647;
    animation: soloFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseCyan 4s infinite;
    padding: 24px;
    color: #f4f4f5;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    box-sizing: border-box;
  }

  .solo-quest-header {
    border: 1px solid rgba(223, 160, 84, 0.24);
    background: rgba(223, 160, 84, 0.06);
    padding: 8px 16px;
    text-align: center;
    font-weight: bold;
    font-size: 18px;
    letter-spacing: 2px;
    color: #f2c27b;
    text-shadow: 0 0 8px rgba(223, 160, 84, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .solo-quest-subheader {
    font-size: 11px;
    text-align: center;
    color: #a1a1aa;
    margin-bottom: 20px;
    letter-spacing: 1px;
  }

  .solo-quest-section-title {
    font-size: 14px;
    font-weight: bold;
    color: #f2c27b;
    border-bottom: 1px solid rgba(223, 160, 84, 0.16);
    padding-bottom: 4px;
    margin-bottom: 12px;
    letter-spacing: 1px;
  }

  .solo-quest-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 8px;
    color: #d4d4d8;
  }

  .solo-quest-checkmark {
    color: #f2c27b;
    border: 1px solid rgba(223, 160, 84, 0.28);
    padding: 1px 4px;
    font-size: 9px;
    border-radius: 2px;
    background: rgba(223, 160, 84, 0.06);
  }

  .solo-quest-warning {
    margin-top: 24px;
    font-size: 11px;
    color: #a1a1aa;
    text-align: center;
    line-height: 1.5;
  }

  .solo-quest-warning span.penalty {
    color: #f2c27b;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(255, 0, 85, 0.3);
  }

  .solo-quest-confirm-btn {
    display: block;
    width: 60px;
    height: 60px;
    margin: 20px auto 0 auto;
    background: rgba(223, 160, 84, 0.08);
    border: 1px solid #dfa054;
    border-radius: 6px;
    color: #f2c27b;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    outline: none;
    box-shadow: 0 0 10px rgba(223, 160, 84, 0.18);
  }

  .solo-quest-confirm-btn:hover {
    background: rgba(223, 160, 84, 0.16);
    box-shadow: 0 0 20px rgba(223, 160, 84, 0.3);
    transform: scale(1.05);
  }

  .solo-quest-intents {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 10px 0 4px;
  }

  .solo-intent {
    border: 1px solid rgba(255,255,255,0.09);
    background: rgba(255,255,255,0.02);
    border-radius: 6px;
    color: #a1a1aa;
    cursor: pointer;
    font: inherit;
    font-size: 10px;
    padding: 9px 6px;
    transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
  }

  .solo-intent:hover, .solo-intent.is-active {
    border-color: rgba(223,160,84,0.56);
    background: rgba(223,160,84,0.10);
    color: #f4f4f5;
  }

  /* Alarm warning dialog styles */
  .solo-alarm-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 380px;
    background: rgba(22, 10, 16, 0.95);
    border: 2px solid #ff0055;
    border-radius: 4px;
    z-index: 2147483647;
    animation: soloFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseRed 4s infinite;
    padding: 24px;
    color: #ffd8e2;
    font-family: 'Courier New', Courier, monospace;
    box-sizing: border-box;
  }

  .solo-alarm-header {
    border: 1px solid rgba(255, 0, 85, 0.4);
    background: rgba(255, 0, 85, 0.05);
    padding: 8px 16px;
    text-align: center;
    font-weight: bold;
    font-size: 18px;
    letter-spacing: 2px;
    color: #ff0055;
    text-shadow: 0 0 8px rgba(255, 0, 85, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .solo-alarm-msg {
    font-size: 13px;
    text-align: center;
    color: #ffb3c5;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  .solo-alarm-msg span.penalty {
    color: #ff0055;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(255, 0, 85, 0.3);
  }

  .solo-alarm-buttons {
    display: flex;
    gap: 16px;
    margin-top: 24px;
  }

  .solo-alarm-btn {
    flex: 1;
    padding: 10px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    font-weight: bold;
    border-radius: 4px;
    cursor: pointer;
    background: transparent;
    transition: all 0.2s;
    outline: none;
  }

  .solo-alarm-btn-obey {
    border: 1px solid #00f0ff;
    color: #00f0ff;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.1);
  }

  .solo-alarm-btn-obey:hover {
    background: rgba(0, 240, 255, 0.1);
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
  }

  .solo-alarm-btn-proceed {
    border: 1px solid #ff0055;
    color: #ff0055;
    box-shadow: 0 0 10px rgba(255, 0, 85, 0.1);
  }

  .solo-alarm-btn-proceed:hover {
    background: rgba(255, 0, 85, 0.1);
    box-shadow: 0 0 15px rgba(255, 0, 85, 0.4);
  }

  /* Toast message styles */
  .solo-toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: rgba(7, 15, 28, 0.9);
    border: 1px solid #00f0ff;
    box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
    border-radius: 4px;
    padding: 10px 16px;
    color: #aaeaff;
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    letter-spacing: 0.5px;
    animation: slideToast 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    pointer-events: none;
  }
`;

let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  const styleEl = document.createElement("style");
  styleEl.textContent = overlayStyle;
  document.head.appendChild(styleEl);
  styleInjected = true;
}

export function showZenithQuestModal(onStart: (intent: string) => void, onCancel: () => void) {
  injectStyle();
  
  const backdrop = document.createElement("div");
  backdrop.className = "solo-bg-blur";

  const card = document.createElement("div");
  card.className = "solo-quest-card";
  card.innerHTML = `
    <div class="solo-quest-header">
      <span>✦</span> ZENITH EXPEDITION
    </div>
    <div class="solo-quest-subheader">
      A deliberate practice session. Your record is private and yours.
    </div>
    
    <div class="solo-quest-section-title">GOAL</div>
    <div class="solo-quest-item">
      <span>Set a clear intent</span>
      <span class="solo-quest-checkmark">Ready</span>
    </div>
    <div class="solo-quest-item">
      <span>Work the problem honestly</span>
      <span class="solo-quest-checkmark">Observed</span>
    </div>
    <div class="solo-quest-item">
      <span>Record help when you use it</span>
      <span class="solo-quest-checkmark">Reflect</span>
    </div>

    <div class="solo-quest-section-title" style="margin-top:18px">SESSION INTENT</div>
    <div class="solo-quest-intents">
      <button class="solo-intent is-active" data-intent="FOCUSED_SOLVE">Focused solve</button>
      <button class="solo-intent" data-intent="INTERVIEW_SIM">Interview</button>
      <button class="solo-intent" data-intent="RECOVERY">Recovery</button>
    </div>

    <div class="solo-quest-warning">
      Zenith records continuity and help signals so you can review how you practiced. It does not judge you.
    </div>

    <button class="solo-quest-confirm-btn" title="Begin Quest">
      BEGIN
    </button>
  `;

  // Prevent clicks from trickling down to LeetCode
  card.addEventListener("click", (e) => e.stopPropagation());

  let selectedIntent = "FOCUSED_SOLVE"
  card.querySelectorAll<HTMLButtonElement>(".solo-intent").forEach((button) => {
    button.addEventListener("click", () => {
      selectedIntent = button.dataset.intent || "FOCUSED_SOLVE"
      card.querySelectorAll(".solo-intent").forEach((intentButton) => intentButton.classList.remove("is-active"))
      button.classList.add("is-active")
    })
  })

  // Begin the user's chosen deliberate-practice session.
  card.querySelector(".solo-quest-confirm-btn")?.addEventListener("click", () => {
    backdrop.remove();
    card.remove();
    onStart(selectedIntent);
  });

  // Clicking backdrop closes modal
  backdrop.addEventListener("click", () => {
    backdrop.remove();
    card.remove();
    onCancel();
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(card);
}

export function showZenithAlarmModal(
  message: string,
  consequence: string,
  onProceed: () => void,
  onCancel: () => void
) {
  injectStyle();

  const backdrop = document.createElement("div");
  backdrop.className = "solo-bg-blur";

  const card = document.createElement("div");
  card.className = "solo-alarm-card";
  card.innerHTML = `
    <div class="solo-alarm-header">
      <span>◇</span> CONTINUITY CHECK
    </div>
    <div class="solo-alarm-msg">
      ${message}
    </div>
    <div class="solo-alarm-msg">
      Your private session record will note this interruption. <span class="penalty">${consequence}</span>
    </div>
    
    <div class="solo-alarm-buttons">
      <button class="solo-alarm-btn solo-alarm-btn-obey">Return to focus</button>
      <button class="solo-alarm-btn solo-alarm-btn-proceed">Continue session</button>
    </div>
  `;

  card.addEventListener("click", (e) => e.stopPropagation());

  card.querySelector(".solo-alarm-btn-obey")?.addEventListener("click", () => {
    backdrop.remove();
    card.remove();
    onCancel();
  });

  card.querySelector(".solo-alarm-btn-proceed")?.addEventListener("click", () => {
    backdrop.remove();
    card.remove();
    onProceed();
  });

  // Click backdrop works as Obey
  backdrop.addEventListener("click", () => {
    backdrop.remove();
    card.remove();
    onCancel();
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(card);
}

export function showZenithToast(message: string) {
  injectStyle();

  // Remove existing toasts
  document.querySelectorAll(".solo-toast-container").forEach((el) => el.remove());

  const toast = document.createElement("div");
  toast.className = "solo-toast-container";
  toast.textContent = `[System: ${message}]`;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all 0.5s ease-in";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}
