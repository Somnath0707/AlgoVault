import React from "react"

interface CrestProps {
  size?: number
  className?: string
  color?: string
}

/** Authentic LeetCode Knight Helm Crest */
export const KnightCrest = ({ size = 16, className = "", color = "#ffc01e" }: CrestProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path
      d="M12 2L4 5V11C4 16.5 7.4 21.6 12 22.8C16.6 21.6 20 16.5 20 11V5L12 2Z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Visor & Crest Details */}
    <path
      d="M9 10H15M8 13H16M10 7L12 4.5L14 7M12 13V17"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Authentic LeetCode Guardian Crown Crest */
export const GuardianCrest = ({ size = 16, className = "", color = "#ef4743" }: CrestProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path
      d="M12 2L19 6V11C19 16.5 16 21 12 22C8 21 5 16.5 5 11V6L12 2Z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 9L9.5 13.5L12 9.5L14.5 13.5L17 9V15.5H7V9Z"
      fill={color}
      fillOpacity="0.6"
      stroke={color}
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
)

/** Minimalist Vector Crossed Blades (Replaces raw ⚔️ emoji) */
export const CrossedBladesEmblem = ({ size = 14, className = "", color = "#fb7185" }: CrestProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
  >
    <path
      d="M14.5 17.5L3 6V3H6L17.5 14.5M14.5 17.5L19 22L22 19L17.5 14.5M14.5 17.5L17.5 14.5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 17.5L21 6V3H18L6.5 14.5M9.5 17.5L5 22L2 19L6.5 14.5M9.5 17.5L6.5 14.5"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Royal Grandmaster Crest */
export const GrandmasterCrest = ({ size = 16, className = "", color = "#ef4743" }: CrestProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
    <path
      d="M12 2L3.5 7V13C3.5 18 7.5 22 12 23C16.5 22 20.5 18 20.5 13V7L12 2Z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.8"
    />
    <path d="M12 6L14.5 11H9.5L12 6Z" fill={color} />
    <circle cx="12" cy="15" r="2.5" fill={color} />
  </svg>
)

/** Royal Master Crest */
export const MasterCrest = ({ size = 16, className = "", color = "#a855f7" }: CrestProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
    <path
      d="M12 2L4 6.5V12C4 17 7.5 21 12 22C16.5 21 20 17 20 12V6.5L12 2Z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.8"
    />
    <path d="M12 7L16 11L12 15L8 11L12 7Z" stroke={color} strokeWidth="1.6" fill={color} fillOpacity="0.4" />
  </svg>
)

/** Expert Crest */
export const ExpertCrest = ({ size = 16, className = "", color = "#ffc01e" }: CrestProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
    <path
      d="M12 2L4.5 6V11.5C4.5 16.5 8 20.5 12 21.5C16 20.5 19.5 16.5 19.5 11.5V6L12 2Z"
      fill={color}
      fillOpacity="0.16"
      stroke={color}
      strokeWidth="1.8"
    />
    <path
      d="M12 7.5L13.2 10.2L16 10.5L13.9 12.3L14.5 15L12 13.6L9.5 15L10.1 12.3L8 10.5L10.8 10.2L12 7.5Z"
      fill={color}
    />
  </svg>
)

/** Specialist Crest */
export const SpecialistCrest = ({ size = 16, className = "", color = "#38bdf8" }: CrestProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
    <path
      d="M12 2L5 6V12C5 16.5 8.2 20.2 12 21.2C15.8 20.2 19 16.5 19 12V6L12 2Z"
      fill={color}
      fillOpacity="0.16"
      stroke={color}
      strokeWidth="1.8"
    />
    <path d="M8.5 10L12 13.5L15.5 10M8.5 13L12 16.5L15.5 13" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Pupil Crest */
export const PupilCrest = ({ size = 16, className = "", color = "#00b8a3" }: CrestProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
    <path
      d="M12 2L5 6V12C5 16.5 8.2 20.2 12 21.2C15.8 20.2 19 16.5 19 12V6L12 2Z"
      fill={color}
      fillOpacity="0.16"
      stroke={color}
      strokeWidth="1.8"
    />
    <path d="M8.5 11.5L11 14L15.5 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Newbie Crest */
export const NewbieCrest = ({ size = 16, className = "", color = "#94a3b8" }: CrestProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`shrink-0 ${className}`}>
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={color} fillOpacity="0.12" />
    <circle cx="12" cy="12" r="3" fill={color} />
  </svg>
)

export const getRankCrest = (tierName: string) => {
  const lower = (tierName || "").toLowerCase()
  if (lower.includes("grandmaster")) return GrandmasterCrest
  if (lower.includes("master")) return MasterCrest
  if (lower.includes("expert") || lower.includes("guardian")) return ExpertCrest
  if (lower.includes("specialist") || lower.includes("knight")) return SpecialistCrest
  if (lower.includes("pupil")) return PupilCrest
  return NewbieCrest
}
