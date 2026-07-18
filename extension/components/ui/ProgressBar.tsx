import React from "react"
import { motion } from "framer-motion"

export const ProgressBar = ({ progress }: { progress: number }) => {
  const safeProgress = Math.max(0, Math.min(100, progress))
  
  return (
    <div className="w-full h-2 mt-2 bg-zinc-900/60 rounded-full overflow-hidden border border-[#ffffff05] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
      <motion.div 
        className="h-full relative rounded-full"
        style={{
          background: "linear-gradient(90deg, #99621e 0%, #dfa054 50%, #f6ce8e 100%)",
          boxShadow: "0 0 10px rgba(223, 160, 84, 0.4)"
        }}
        initial={{ width: 0 }}
        animate={{ width: `${safeProgress}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)", backgroundSize: "1rem 1rem" }}></div>
        <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white opacity-40 blur-[2px]"></div>
      </motion.div>
    </div>
  )
}

