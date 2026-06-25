import React from "react"

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`p-3.5 elevated-card rounded-lg hover:border-zinc-800 transition-all duration-150 ease-in-out ${className}`}>
      {children}
    </div>
  )
}
