import React from "react"

export const ProgressBar = ({ progress, colorClass = "from-av-accent-primary to-blue-500" }: { progress: number, colorClass?: string }) => {
  return (
    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mt-2">
      <div 
        className={`h-full bg-gradient-to-r ${colorClass} transition-all duration-1000 ease-out`} 
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
