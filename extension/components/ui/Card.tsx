import React from "react"

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`p-3.5 elevated-card rounded-lg transition-[border-color,background-color,transform] duration-200 ease-out ${className}`}>
      {children}
    </div>
  )
}
