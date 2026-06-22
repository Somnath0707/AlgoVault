import React from "react"

export const Skeleton = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`animate-pulse bg-white/5 rounded-md ${className}`}></div>
  )
}
