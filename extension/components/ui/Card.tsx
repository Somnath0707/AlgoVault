import React from "react"

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`p-4 bg-av-bg-card rounded-xl border border-white/5 backdrop-blur-sm shadow-xl ${className}`}>
      {children}
    </div>
  )
}
