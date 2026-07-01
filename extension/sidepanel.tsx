import "~style.css"
import { useEffect, useState } from "react"
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
      storage.get("algovault.currentSession").then((value) => setSession(value || null))
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
    <div className="min-h-screen bg-av-bg-primary text-zinc-300 p-4 overflow-y-auto overflow-x-hidden font-sans">
      <header className="flex items-center justify-between mb-5 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800">
            <span className="text-base text-[#dfa054]">⚡</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-none tracking-tight text-zinc-100">AlgoVault</h1>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">@{username}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-400 font-mono">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#dfa054] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#dfa054]"></span>
              </span>
              <span>{session.mode}</span>
              <span className="text-zinc-700">|</span>
              <span className="tabular-nums">F {session.focusScore ?? 100}</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 rounded border border-zinc-800/80 bg-zinc-900/20 text-[10px] text-zinc-500 font-mono">
              STANDBY
            </div>
          )}
          
          <button 
            onClick={() => window.close()} 
            className="p-1.5 hover:bg-zinc-800/60 rounded-md transition-colors text-zinc-500 hover:text-zinc-200"
            title="Close Sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </header>
      
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="mt-4 pb-8">
        {activeTab === 'Dashboard' && <Dashboard />}
        {activeTab === 'Heatmap' && <Heatmap />}
        {activeTab === 'Mastery' && <Mastery />}
        {activeTab === 'Weakness' && <Weakness />}
        {activeTab === 'Contest' && <Contest />}
        {activeTab === 'Lists' && <Lists />}
        {activeTab === 'Resources' && <Resources />}
        {activeTab === 'Settings' && <Settings />}
      </div>
    </div>
  )
}
