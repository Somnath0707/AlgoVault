import React from "react"
import { motion } from "framer-motion"

export const ProgressBar = ({ progress }: { progress: number }) => {
  const safeProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <div className="w-full h-1.5 mt-1.5 bg-[#333333] rounded-full overflow-hidden">
      <motion.div 
        className="h-full rounded-full bg-[#ffa116]"
        initial={{ width: 0 }}
        animate={{ width: `${safeProgress}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

