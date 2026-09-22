/**
 * Deliberately separated hues for competitive-programming ranks.  These are
 * page-local accents, never a global app theme: a Master sees violet only in
 * the Mastery experience, while the rest of AlgoVault stays LeetCode-neutral.
 */
export const RANK_THEME = {
  newbie:       { name: "Newbie",       floor: 0,    color: "#94a3b8", soft: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.30)" },
  pupil:        { name: "Pupil",        floor: 1200, color: "#00b8a3", soft: "rgba(0,184,163,0.12)",   border: "rgba(0,184,163,0.32)" },
  specialist:   { name: "Specialist",   floor: 1400, color: "#38bdf8", soft: "rgba(56,189,248,0.12)",  border: "rgba(56,189,248,0.32)" },
  expert:       { name: "Expert",       floor: 1600, color: "#ffc01e", soft: "rgba(255,192,30,0.12)",  border: "rgba(255,192,30,0.32)" },
  master:       { name: "Master",       floor: 1900, color: "#a855f7", soft: "rgba(168,85,247,0.14)",  border: "rgba(168,85,247,0.36)" },
  grandmaster:  { name: "Grandmaster",  floor: 2200, color: "#ef4743", soft: "rgba(239,71,67,0.14)",   border: "rgba(239,71,67,0.36)" }
} as const

export const RANK_THEMES_ASCENDING = [
  RANK_THEME.newbie,
  RANK_THEME.pupil,
  RANK_THEME.specialist,
  RANK_THEME.expert,
  RANK_THEME.master,
  RANK_THEME.grandmaster
] as const

/** The one source of truth for numeric rating-band colour and meaning. */
export const rankThemeForRating = (rating: number) => {
  if (rating >= RANK_THEME.grandmaster.floor) return RANK_THEME.grandmaster
  if (rating >= RANK_THEME.master.floor) return RANK_THEME.master
  if (rating >= RANK_THEME.expert.floor) return RANK_THEME.expert
  if (rating >= RANK_THEME.specialist.floor) return RANK_THEME.specialist
  if (rating >= RANK_THEME.pupil.floor) return RANK_THEME.pupil
  return RANK_THEME.newbie
}
