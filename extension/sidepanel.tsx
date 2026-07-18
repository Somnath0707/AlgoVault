import "~style.css"
import { useEffect, useState } from "react"
import { Bolt, CircleX, Settings2 } from "lucide-react"
import { TabBar, type Tab } from "./components/ui/TabBar"
import { Dashboard } from "./components/sidepanel/Dashboard"
import { Heatmap } from "./components/sidepanel/Heatmap"
import { Mastery } from "./components/sidepanel/Mastery"
import { Weakness } from "./components/sidepanel/Weakness"
import { Contest } from "./components/sidepanel/Contest"
import { Lists } from "./components/sidepanel/Lists"
import { Resources } from "./components/sidepanel/Resources"
import { Settings } from "./components/sidepanel/Settings"
import { getUsername, storage } from "./lib/storage"
import { ErrorBoundary } from "./components/ui/ErrorBoundary"
import { motion, AnimatePresence } from "framer-motion"

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard')
  const [username, setUsername] = useState<string>("")
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    chrome.storage.local.get("algovault.requestedTab", (result) => {
      if (result["algovault.requestedTab"] === "Lists") {
        setActiveTab("Lists")
        chrome.storage.local.remove("algovault.requestedTab")
      }
    })
    getUsername().then((value) => setUsername(value || "Set username"))
    const loadSession = () => {
      storage.get("algovault.currentSession").then((value) => {
        setSession((prev: any) => {
          if (JSON.stringify(prev) === JSON.stringify(value)) return prev
          return value || null
        })
      })
    }
    loadSession()
    const interval = window.setInterval(loadSession, 2000)

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === "local" && changes["algovault.username"]) {
        setUsername(changes["algovault.username"].newValue || "Set username");
      }
      if (areaName === "local" && changes["algovault.requestedTab"]?.newValue === "Lists") {
        setActiveTab("Lists")
        chrome.storage.local.remove("algovault.requestedTab")
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      window.clearInterval(interval)
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  return (
    <div className="min-h-screen bg-av-bg-primary text-zinc-300 p-4 overflow-y-auto overflow-x-hidden font-sans selection:bg-amber-400/20">
      <header className="flex items-center justify-between mb-4 border-b border-zinc-800/70 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-700/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Bolt size={17} className="text-[#dfa054]" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-none tracking-tight text-zinc-100">AlgoVault</h1>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">@{username}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] text-[10px] text-zinc-300 font-mono">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dfa054] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#dfa054]"></span>
              </span>
              <span>{session.mode}</span>
              <span className="text-emerald-500/40">|</span>
              <span className="tabular-nums">{session.focusScore ?? 100}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-zinc-800 bg-zinc-900/30 text-[9px] text-zinc-500 font-mono uppercase tracking-wide">
              <Settings2 size={10} /> Ready
            </div>
          )}
          
          <button 
            onClick={() => window.close()} 
            className="p-1.5 hover:bg-zinc-800/60 rounded-md transition-colors text-zinc-500 hover:text-zinc-200"
            title="Close Sidebar"
          >
            <CircleX size={16} />
          </button>
        </div>
      </header>
      
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="mt-4 pb-8 relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -7 }}
            transition={{ duration: 0.12, ease: "easeInOut" }}
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
  )
}
