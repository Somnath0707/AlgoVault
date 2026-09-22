import "~style.css"
import { useEffect, useState, useMemo } from "react"
import { CircleX, Settings2, Star } from "lucide-react"
import { TabBar, type Tab } from "./components/ui/TabBar"
import { Dashboard } from "./components/sidepanel/Dashboard"
import { Heatmap } from "./components/sidepanel/Heatmap"
import { Mastery } from "./components/sidepanel/Mastery"
import { Weakness } from "./components/sidepanel/Weakness"
import { Contest } from "./components/sidepanel/Contest"
import { Lists } from "./components/sidepanel/Lists"
import { Resources } from "./components/sidepanel/Resources"
import { Settings } from "./components/sidepanel/Settings"
import { getUsername } from "./lib/storage"
import { COMMUNITY_CONFIG, getRandomTagline } from "./lib/community"
import { ErrorBoundary } from "./components/ui/ErrorBoundary"
import { motion, AnimatePresence } from "framer-motion"
import { usePracticeSession } from "./hooks/usePracticeSession"

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard')
  const [username, setUsername] = useState<string>("")
  const { session, clocks } = usePracticeSession()
  const tagline = useMemo(() => getRandomTagline(), [])

  useEffect(() => {
    chrome.storage.local.get(["algovault.requestedTab", "algovault.lastActiveTab"], (result) => {
      if (result["algovault.requestedTab"] === "Lists") {
        setActiveTab("Lists")
        chrome.storage.local.remove("algovault.requestedTab")
      } else if (result["algovault.lastActiveTab"]) {
        setActiveTab(result["algovault.lastActiveTab"])
      }
    })
    getUsername().then((value) => setUsername(value || "Set username"))
    
    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local") {
        if (changes["algovault.username"]) {
          setUsername(changes["algovault.username"].newValue || "Set username")
        }
        if (changes["algovault.requestedTab"]?.newValue === "Lists") {
          setActiveTab("Lists")
          chrome.storage.local.remove("algovault.requestedTab")
        }
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    chrome.storage.local.set({ "algovault.lastActiveTab": tab })
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-zinc-200 p-4 overflow-y-auto overflow-x-hidden font-sans selection:bg-white/10">
      <div>
        {/* ─── LEETCODE-NATIVE HEADER ────────────────────────── */}
        <header className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 overflow-hidden rounded-lg border border-white/10 bg-[#202020] shadow-sm flex items-center justify-center p-0.5">
              <img src={chrome.runtime.getURL("assets/logo.png")} alt="AlgoVault" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none text-white font-sans">AlgoVault</h1>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">LeetCode workspace · @{username || "Guest"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {/* Minimal Star Icon */}
            <a
              href={COMMUNITY_CONFIG.STAR_URL}
              target="_blank"
              rel="noreferrer"
              title="Star on GitHub"
              className="p-1.5 text-zinc-400 hover:text-[#ffa116] hover:bg-[#282828] rounded-md transition-colors"
            >
              <Star size={14} />
            </a>

            {/* Session Indicator */}
            {session ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.08] bg-[#282828] text-[10px] text-zinc-300 font-mono">
                <span className={`h-1.5 w-1.5 rounded-full ${session.st === "RUNNING" ? "bg-[#00b8a3]" : "bg-zinc-500"}`} />
                <span>{session.st === "RUNNING" ? "ACTIVE" : session.st}</span>
                <span className="text-zinc-600">|</span>
                <span className="tabular-nums text-white font-medium">{clocks.focusScore ?? 100}%</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/[0.08] bg-[#282828] text-[10px] text-zinc-400 font-mono">
                <Settings2 size={11} className="text-zinc-500" /> Ready
              </div>
            )}
            
            <button 
              onClick={() => window.close()} 
              className="p-1.5 hover:bg-[#282828] rounded-md transition-colors text-zinc-400 hover:text-white ml-0.5"
              title="Close Sidebar"
            >
              <CircleX size={15} />
            </button>
          </div>
        </header>
        
        {/* ─── TAB NAVIGATION ────────────────────────────────── */}
        <TabBar activeTab={activeTab} setActiveTab={handleTabChange} />
        
        {/* ─── VIEWPORT ──────────────────────────────────────── */}
        <div className="mt-4 pb-4 relative min-w-0 w-full max-w-full overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <ErrorBoundary>
                {activeTab === 'Dashboard' && <Dashboard />}
                {activeTab === 'Heatmap' && <Heatmap />}
                {activeTab === 'Mastery' && <Mastery />}
                {activeTab === 'Weakness' && <Weakness />}
                {activeTab === 'Contest' && <Contest />}
                {activeTab === 'Lists' && <Lists />}
                {activeTab === 'Resources' && <Resources />}
                {activeTab === 'Settings' && <Settings />}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  )
}
