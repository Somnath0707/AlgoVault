import React from "react"
import { BarChart3, BookOpen, CalendarDays, Crosshair, Flame, Layers3, Settings2, Trophy } from "lucide-react"
import { motion } from "framer-motion"

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
    <div className="flex gap-1 overflow-x-auto bg-zinc-950/60 p-1 rounded-lg mb-4 border border-zinc-800/80 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const Icon = tabMeta[tab].icon
        return (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-all duration-150 relative cursor-pointer ${
              isActive 
                ? 'bg-zinc-800 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Icon size={12} className={isActive ? "text-[#dfa054]" : "text-zinc-500"} />
            {tabMeta[tab].label}
            {isActive && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#dfa054] rounded-full" />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
