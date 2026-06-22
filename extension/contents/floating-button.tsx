import cssText from "data-text:~style.css"
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/problems/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText.replaceAll(':root', ':host(plasmo-csui)')
  return style
}

const FloatingButton = () => {
  const handleClick = () => {
    chrome.runtime.sendMessage({ action: "open_side_panel" })
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-av-bg-card backdrop-blur-md text-av-text-primary shadow-xl hover:scale-105 transition-transform flex items-center justify-center font-bold text-sm border border-white/10"
    >
      ⚡ AV
    </button>
  )
}

export default FloatingButton
