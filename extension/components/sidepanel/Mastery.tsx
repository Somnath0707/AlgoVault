import React, { useEffect, useState, useMemo } from "react"
import { Card } from "../ui/Card"
import { fetchMastery } from "../../lib/api/backend"
import { getCachedMastery, setCachedMastery } from "../../lib/storage"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Target, Shield, Zap, TrendingUp, Trophy, Activity, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

/* ── Mastery Tiers (Competitive Programming Style) ── */
const getTier = (score: number) => {
  if (score >= 2200) return { name: "Grandmaster", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" }
  if (score >= 1900) return { name: "Master", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" }
  if (score >= 1600) return { name: "Expert", color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" }
  if (score >= 1400) return { name: "Specialist", color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)" }
  if (score >= 1200) return { name: "Pupil", color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" }
  return { name: "Newbie", color: "#a1a1aa", bg: "rgba(161,161,170,0.08)", border: "rgba(161,161,170,0.2)" }
}

const TIER_ORDER = ["Grandmaster", "Master", "Expert", "Specialist", "Pupil", "Newbie"];

/* ── Intuitive Metrics ── */
const getConfidence = (rd: number) => {
  if (rd <= 120) return { label: "High Confidence", Icon: Target, color: "text-emerald-400", bg: "bg-emerald-400/10" }
  if (rd <= 200) return { label: "Medium Confidence", Icon: Target, color: "text-amber-400", bg: "bg-amber-400/10" }
  return { label: "Needs Data", Icon: Target, color: "text-zinc-500", bg: "bg-zinc-500/10" }
}

const getConsistency = (vol: number) => {
  if (vol <= 0.05) return { label: "Highly Stable", Icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10" }
  if (vol <= 0.07) return { label: "Stable", Icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10" }
  return { label: "Volatile", Icon: Zap, color: "text-rose-400", bg: "bg-rose-400/10" }
}

/* ── Ring Gauge Component ── */
const RingGauge = ({ score, size = 52, strokeWidth = 3.5 }: { score: number; size?: number; strokeWidth?: number }) => {
  const percent = Math.max(5, Math.min(100, Math.round((Number(score) / 2500) * 100)))
  const tier = getTier(score)
  const r = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#27272a" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tier.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-zinc-100 tabular-nums leading-none" style={{ fontSize: size * 0.28 }}>{Math.round(score)}</span>
      </div>
    </div>
  )
}

export const Mastery = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    getCachedMastery().then((cached) => {
      if (live && cached && cached.length > 0) {
        setData(cached);
        setLoading(false);
      }
    });

    fetchMastery()
      .then((fresh) => {
        if (!live) return;
        setData(fresh);
        setCachedMastery(fresh);
      })
      .catch(console.error)
      .finally(() => {
        if (live) setLoading(false);
      });
    
    return () => { live = false; };
  }, []);

  const { groupedData, peakTopic, topTags } = useMemo(() => {
    const sorted = [...data].sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0));
    const groups: Record<string, any[]> = {};
    
    sorted.forEach(item => {
      const tierName = getTier(item.masteryScore || 1500).name;
      if (!groups[tierName]) groups[tierName] = [];
      groups[tierName].push(item);
    });

    return {
      groupedData: groups,
      peakTopic: sorted.length > 0 ? sorted[0] : null,
      topTags: sorted.slice(0, 3)
    };
  }, [data]);

  if (loading) return (
    <div className="grid h-48 place-items-center">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
        <RefreshCw size={14} className="animate-spin" /> Analyzing mastery
      </div>
    </div>
  );

  if (data.length === 0) return (
    <Card className="grid min-h-56 place-items-center border-dashed border-zinc-800 bg-zinc-950/40 p-7 text-center">
      <div>
        <Trophy className="mx-auto h-7 w-7 text-zinc-600" />
        <h2 className="mt-3 text-sm font-semibold text-zinc-200">No mastery data yet.</h2>
        <p className="mx-auto mt-1 max-w-xs text-[11px] leading-relaxed text-zinc-500">
          Solve problems to generate your Glicko-2 skill ratings and unlock detailed mastery analytics.
        </p>
      </div>
    </Card>
  );

  const peakScore = peakTopic ? Math.round(peakTopic.masteryScore || 1500) : 1500;
  const peakTier = getTier(peakScore);

  const radarData = data.filter(d => d.totalAttempted >= 3).sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0)).slice(0, 8).map(d => ({
    subject: d.tag,
    rating: Math.round(d.masteryScore || 1500),
    fullMark: 2500,
  }));

  return (
    <div className="grid gap-5 pb-6">
      
      {/* ═══════════ HERO: OVERALL MASTERY ═══════════ */}
      <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-zinc-900 to-black px-5 py-5 shadow-2xl" style={{ borderColor: peakTier.border }}>
        {/* Glow Effects */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full blur-[60px]" style={{ backgroundColor: peakTier.color, opacity: 0.2 }} />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full blur-[60px]" style={{ backgroundColor: peakTier.color, opacity: 0.15 }} />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
              <Trophy size={13} style={{ color: peakTier.color }} /> Peak Rating
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h2 className="text-4xl font-bold font-mono tracking-tight text-white drop-shadow-md">
                {peakScore}
              </h2>
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm" style={{ backgroundColor: peakTier.bg, color: peakTier.color, border: `1px solid ${peakTier.border}` }}>
                {peakTier.name}
              </span>
            </div>
          </div>
        </div>

        {/* Top 3 Strongest Topics */}
        <div className="relative mt-5 pt-4 border-t border-zinc-800/60">
          <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-2.5">Top Strengths</div>
          <div className="flex gap-2">
            {topTags.map((tag, idx) => {
              const tagTier = getTier(tag.masteryScore || 1500);
              return (
                <div key={idx} className="flex-1 rounded-lg border px-2.5 py-2" style={{ backgroundColor: 'rgba(24, 24, 27, 0.4)', borderColor: tagTier.border }}>
                  <div className="truncate text-[10px] font-semibold text-zinc-200">{tag.tag}</div>
                  <div className="mt-1 font-mono text-xs font-bold" style={{ color: tagTier.color }}>{Math.round(tag.masteryScore || 1500)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ RADAR CHART (GLASSMORPHISM) ═══════════ */}
      {radarData.length >= 3 && (
        <section className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-400/80 mb-2">
            <Activity size={13} /> Skill Profile
          </div>
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'monospace', fontWeight: 600 }} />
                <Radar name="Rating" dataKey="rating" stroke={peakTier.color} strokeWidth={2} fill={peakTier.color} fillOpacity={0.15} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.95)', border: '1px solid #27272a', borderRadius: '8px', fontSize: 11, fontFamily: 'monospace', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: peakTier.color, fontWeight: 'bold' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ═══════════ TIERED BREAKDOWN ═══════════ */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
            <TrendingUp size={13} /> Topic Breakdown
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {TIER_ORDER.map(tierName => {
            const items = groupedData[tierName];
            if (!items || items.length === 0) return null;
            const tierStyle = getTier(items[0].masteryScore || 1500);

            return (
              <div key={tierName} className="space-y-2">
                {/* Tier Header */}
                <div className="flex items-center gap-2 px-1">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-zinc-800" />
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 rounded-full border" style={{ color: tierStyle.color, backgroundColor: tierStyle.bg, borderColor: tierStyle.border }}>
                    {tierName}
                  </span>
                  <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-zinc-800" />
                </div>

                {/* Topics in Tier */}
                <div className="grid gap-2">
                  {items.map((m, i) => {
                    const score = m.masteryScore || 1500;
                    const rd = m.rd || 350;
                    const vol = m.volatility || 0.06;
                    const winRate = m.totalAttempted > 0 ? Math.round((m.totalSolved / m.totalAttempted) * 100) : 0;
                    
                    const confidence = getConfidence(rd);
                    const consistency = getConsistency(vol);

                    return (
                      <motion.div 
                        key={m.tag}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50"
                      >
                        <RingGauge score={score} size={48} strokeWidth={3} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="truncate text-[13px] font-bold text-zinc-100">{m.tag}</span>
                            <span className="text-[10px] font-mono text-zinc-400 tabular-nums shrink-0 bg-black/40 px-1.5 py-0.5 rounded border border-zinc-800">{winRate}% WR</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${confidence.bg}`}>
                              <confidence.Icon size={10} className={confidence.color} />
                              <span className={`text-[9px] font-semibold tracking-wide ${confidence.color}`}>{confidence.label}</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-md ${consistency.bg}`}>
                              <consistency.Icon size={10} className={consistency.color} />
                              <span className={`text-[9px] font-semibold tracking-wide ${consistency.color}`}>{consistency.label}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
