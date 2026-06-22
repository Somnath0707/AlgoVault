import React from "react"

export type Tab = 'Dashboard' | 'Heatmap' | 'Mastery' | 'Weakness' | 'Contest' | 'Vault' | 'Settings'

export const TabBar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const tabs: Tab[] = ['Dashboard', 'Heatmap', 'Mastery', 'Weakness', 'Contest', 'Vault', 'Settings']
  
  return (
    <div className="flex flex-wrap gap-1 bg-black/20 p-1 rounded-lg mb-4 border border-white/5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 min-w-[70px] text-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === tab 
              ? 'bg-[#2d3748] text-white shadow-sm' 
              : 'text-av-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
