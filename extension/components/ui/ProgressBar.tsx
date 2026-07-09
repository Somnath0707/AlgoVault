import React from "react"

export const ProgressBar = ({ progress, segments = 10 }: { progress: number, segments?: number }) => {
  const safeProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <div className="w-full flex gap-1 h-1.5 mt-2 rounded-full overflow-hidden">
      {Array.from({ length: segments }).map((_, i) => {
        const segmentStart = (i / segments) * 100
        const segmentEnd = ((i + 1) / segments) * 100
        const isFilled = safeProgress >= segmentEnd
        const isPartial = safeProgress > segmentStart && safeProgress < segmentEnd
        const partialWidth = isPartial ? ((safeProgress - segmentStart) / (segmentEnd - segmentStart)) * 100 : 0

        return (
          <div key={i} className="flex-1 bg-zinc-800/80 relative overflow-hidden h-full rounded-full">
            {isFilled && (
              <div className="absolute inset-0 bg-[#dfa054] opacity-90 transition-all duration-500 ease-out" />
            )}
            {isPartial && (
              <div 
                className="absolute inset-y-0 left-0 bg-[#dfa054] opacity-90 transition-all duration-500 ease-out" 
                style={{ width: `${partialWidth}%` }} 
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
