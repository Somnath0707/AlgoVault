import "~style.css"
import { useState } from "react"
import { TabBar, type Tab } from "./components/ui/TabBar"
import { Dashboard } from "./components/sidepanel/Dashboard"
import { Heatmap } from "./components/sidepanel/Heatmap"
import { Mastery } from "./components/sidepanel/Mastery"
import { Weakness } from "./components/sidepanel/Weakness"
import { Contest } from "./components/sidepanel/Contest"
import { Vault } from "./components/sidepanel/Vault"
import { Settings } from "./components/sidepanel/Settings"

export default function SidePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard')

  return (
    <div className="min-h-screen bg-[#0f111a] text-gray-200 p-4 overflow-y-auto overflow-x-hidden font-sans">
      <header className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#1e293b] flex items-center justify-center border border-white/10">
            <span className="text-xl">⚡</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-white">AlgoVault</h1>
            <p className="text-xs text-gray-400">Som_07</p>
          </div>
        </div>
        <button 
          onClick={() => window.close()} 
          className="p-2 hover:bg-white/10 rounded-md transition-colors"
          title="Close Sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-white">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </header>
      
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="mt-4 pb-8">
        {activeTab === 'Dashboard' && <Dashboard />}
        {activeTab === 'Heatmap' && <Heatmap />}
        {activeTab === 'Mastery' && <Mastery />}
        {activeTab === 'Weakness' && <Weakness />}
        {activeTab === 'Contest' && <Contest />}
        {activeTab === 'Vault' && <Vault />}
        {activeTab === 'Settings' && <Settings />}
      </div>
    </div>
  )
}
