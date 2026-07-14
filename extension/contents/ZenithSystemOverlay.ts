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
    0%, 100% { box-shadow: 0 0 15px rgba(0, 240, 255, 0.4), inset 0 0 10px rgba(0, 240, 255, 0.1); }
    50% { box-shadow: 0 0 25px rgba(0, 240, 255, 0.7), inset 0 0 15px rgba(0, 240, 255, 0.3); }
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
    background: rgba(7, 15, 28, 0.95);
    border: 2px solid #00f0ff;
    border-radius: 4px;
    z-index: 2147483647;
    animation: soloFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards, pulseCyan 4s infinite;
    padding: 24px;
    color: #e2f1ff;
    font-family: 'Courier New', Courier, monospace;
    box-sizing: border-box;
  }

  .solo-quest-header {
    border: 1px solid rgba(0, 240, 255, 0.4);
    background: rgba(0, 240, 255, 0.05);
    padding: 8px 16px;
    text-align: center;
    font-weight: bold;
    font-size: 18px;
    letter-spacing: 2px;
    color: #00f0ff;
    text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
  }

  .solo-quest-subheader {
    font-size: 11px;
    text-align: center;
    color: #8ab4f8;
    margin-bottom: 20px;
    letter-spacing: 1px;
  }

  .solo-quest-section-title {
    font-size: 14px;
    font-weight: bold;
    color: #00f0ff;
    border-bottom: 1px solid rgba(0, 240, 255, 0.2);
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
    color: #c4d7f5;
  }

  .solo-quest-checkmark {
    color: #00f0ff;
    border: 1px solid rgba(0, 240, 255, 0.4);
    padding: 1px 4px;
    font-size: 9px;
    border-radius: 2px;
    background: rgba(0, 240, 255, 0.05);
  }

  .solo-quest-warning {
    margin-top: 24px;
    font-size: 11px;
    color: #8e9fae;
    text-align: center;
    line-height: 1.5;
  }

  .solo-quest-warning span.penalty {
    color: #ff0055;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(255, 0, 85, 0.3);
  }

  .solo-quest-confirm-btn {
    display: block;
    width: 60px;
    height: 60px;
    margin: 20px auto 0 auto;
    background: rgba(0, 240, 255, 0.05);
    border: 2px solid #00f0ff;
    border-radius: 4px;
    color: #00f0ff;
    font-size: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    outline: none;
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
  }

  .solo-quest-confirm-btn:hover {
    background: rgba(0, 240, 255, 0.15);
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.6);
    transform: scale(1.05);
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

export function showZenithQuestModal(onStart: () => void, onCancel: () => void) {
  injectStyle();
  
  const backdrop = document.createElement("div");
  backdrop.className = "solo-bg-blur";

  const card = document.createElement("div");
  card.className = "solo-quest-card";
  card.innerHTML = `
    <div class="solo-quest-header">
      <span>ℹ️</span> QUEST INFO
    </div>
    <div class="solo-quest-subheader">
      [Zenith Quest: Strength Training has arrived.]
    </div>
    
    <div class="solo-quest-section-title">GOAL</div>
    <div class="solo-quest-item">
      <span>Solve LeetCode Problem</span>
      <span class="solo-quest-checkmark">[0/1] ☑</span>
    </div>
    <div class="solo-quest-item">
      <span>Maintain active focus</span>
      <span class="solo-quest-checkmark">[100%] ☑</span>
    </div>
    <div class="solo-quest-item">
      <span>Obey all System constraints</span>
      <span class="solo-quest-checkmark">[Pure] ☑</span>
    </div>

    <div class="solo-quest-warning">
      WARNING: Failure to obey the system's rules will result in an appropriate <span class="penalty">penalty</span>.
    </div>

    <button class="solo-quest-confirm-btn" title="Begin Quest">
      ✓
    </button>
  `;

  // Prevent clicks from trickling down to LeetCode
  card.addEventListener("click", (e) => e.stopPropagation());

  // Clicking checkmark requests fullscreen and starts session
  card.querySelector(".solo-quest-confirm-btn")?.addEventListener("click", () => {
    backdrop.remove();
    card.remove();
    onStart();
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
      <span>⚠️</span> ALARM
    </div>
    <div class="solo-alarm-msg">
      [Warning: ${message}]
    </div>
    <div class="solo-alarm-msg">
      [Obeying is advised. Continuing triggers a <span class="penalty">penalty</span>: ${consequence}]
    </div>
    
    <div class="solo-alarm-buttons">
      <button class="solo-alarm-btn solo-alarm-btn-obey">Obey (Cancel)</button>
      <button class="solo-alarm-btn solo-alarm-btn-proceed">Proceed</button>
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
