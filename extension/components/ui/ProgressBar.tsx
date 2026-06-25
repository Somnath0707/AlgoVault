import React from "react"

export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
      <div 
        className="h-full bg-gradient-to-r from-[#dfa054] to-[#c5944e] transition-all duration-500 ease-out" 
        style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
      />
    </div>
  )
}
