import React from "react"

export type Tab = 'Dashboard' | 'Heatmap' | 'Mastery' | 'Weakness' | 'Contest' | 'Vault' | 'Settings'

export const TabBar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const tabs: Tab[] = ['Dashboard', 'Heatmap', 'Mastery', 'Weakness', 'Contest', 'Vault', 'Settings']
  
  return (
    <div className="flex flex-wrap gap-1 bg-zinc-900/60 p-1 rounded-lg mb-4 border border-zinc-800/80">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[70px] text-center px-1.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 relative ${
              isActive 
                ? 'bg-zinc-800 text-zinc-100' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            }`}
          >
            {tab}
            {isActive && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#dfa054] rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
