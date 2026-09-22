import React from "react"
import { BarChart3, BookOpen, CalendarDays, Crosshair, Flame, Layers3, Settings2, Trophy } from "lucide-react"

export type Tab = 'Dashboard' | 'Heatmap' | 'Mastery' | 'Weakness' | 'Contest' | 'Lists' | 'Resources' | 'Settings'

export const TabBar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const tabs: Tab[] = ['Dashboard', 'Heatmap', 'Mastery', 'Weakness', 'Contest', 'Lists', 'Resources', 'Settings']
  const tabMeta: Record<Tab, { label: string; icon: React.ElementType }> = {
    Dashboard: { label: "Today", icon: Crosshair },
    Heatmap: { label: "Progress", icon: BarChart3 },
    Mastery: { label: "Mastery", icon: Layers3 },
    Weakness: { label: "Practice", icon: Flame },
    Contest: { label: "Contest", icon: Trophy },
    Lists: { label: "Lists", icon: BookOpen },
    Resources: { label: "Learn", icon: CalendarDays },
    Settings: { label: "Settings", icon: Settings2 }
  }
  
  return (
    <nav aria-label="AlgoVault sections" className="flex gap-0.5 overflow-x-auto border-b border-white/[0.08] scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const Icon = tabMeta[tab].icon
        return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[11px] font-medium transition-colors duration-150 relative cursor-pointer select-none ${
              isActive 
                ? 'border-[#ffa116] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/[0.14]'
            }`}
          >
            <Icon size={13} strokeWidth={isActive ? 2 : 1.75} className={isActive ? "text-[#ffa116]" : "text-zinc-600"} />
            <span>{tabMeta[tab].label}</span>
          </button>
        )
      })}
    </nav>
  )
}
