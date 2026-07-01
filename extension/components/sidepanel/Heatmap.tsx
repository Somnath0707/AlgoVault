import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchHeatmap } from "../../lib/api/backend"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getCachedHeatmap, setCachedHeatmap } from "../../lib/storage"

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const solveRate = data.attempted > 0 ? ((data.solved / data.attempted) * 100).toFixed(1) : "0.0";
    const firstAcRate = data.solved > 0 ? ((data.firstAcCount / data.solved) * 100).toFixed(1) : "0.0";

    return (
      <div className="elevated-floating p-3 rounded-lg text-xs text-zinc-300 flex flex-col gap-1.5 min-w-[200px]">
        <div className="font-bold text-zinc-100 border-b border-zinc-800 pb-1.5 mb-1.5 text-sm flex items-center justify-between font-mono">
          <span>Rating Bucket</span>
          <span className="text-[#dfa054]">{data.bucketRating}</span>
        </div>
        <div className="flex justify-between items-center font-mono">
          <span className="text-zinc-400">Attempted:</span>
          <span className="font-semibold text-zinc-300 tabular-nums">{data.attempted}</span>
        </div>
        <div className="flex justify-between items-center font-mono">
          <span className="text-zinc-400">Solved:</span>
          <span className="font-semibold text-[#dfa054] tabular-nums">{data.solved}</span>
        </div>
        <div className="flex justify-between items-center font-mono border-t border-zinc-800/40 pt-1 mt-1">
          <span className="text-zinc-400">Solve Rate:</span>
          <span className="font-semibold text-zinc-200 tabular-nums">{solveRate}%</span>
        </div>
        <div className="flex justify-between items-center font-mono">
          <span className="text-zinc-400">First-Try AC:</span>
          <span className="font-semibold text-zinc-200 tabular-nums">{data.firstAcCount} <span className="text-[10px] text-zinc-500 font-normal">({firstAcRate}%)</span></span>
        </div>
        <div className="flex justify-between items-center font-mono">
          <span className="text-zinc-400">Avg Attempts:</span>
          <span className="font-semibold text-zinc-200 tabular-nums">{(data.avgAttempts || 1.0).toFixed(1)}</span>
        </div>
        {data.avgSolveTime > 0 && (
          <div className="flex justify-between items-center font-mono">
            <span className="text-zinc-400">Avg Solve Time:</span>
            <span className="font-semibold text-zinc-200 tabular-nums">{Math.round(data.avgSolveTime)} min</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const Heatmap = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try to load from cache
    getCachedHeatmap().then((cached) => {
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });

    // 2. Fetch in background
    fetchHeatmap()
      .then((fresh) => {
        setData(fresh);
        setCachedHeatmap(fresh);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center text-zinc-500 text-sm font-mono animate-pulse">Loading heatmap analytics...</div>;
  if (!data || data.length === 0) {
    return (
      <Card className="text-center py-10">
        <h3 className="font-bold text-zinc-200 mb-2">No Submissions Logged</h3>
        <p className="text-sm text-zinc-500 px-4">
          Please run a sync in the Settings tab to populate your historical problem rating metrics.
        </p>
      </Card>
    );
  }

  // Sort by rating bucket ascending
  const sortedData = [...data].sort((a, b) => a.bucketRating - b.bucketRating);

  return (
    <div className="grid gap-4 font-sans">
      <Card>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Solve vs Attempted Heatmap</h3>
        <p className="text-[11px] text-zinc-500 mb-4 font-mono leading-relaxed">
          Compare unique solved count against overall attempted problems across rating categories.
        </p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} layout="vertical" margin={{ top: 0, right: 10, left: -25, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="bucketRating" type="category" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontFamily: 'monospace'}} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.01)'}} content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={32} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, color: '#a1a1aa', fontFamily: 'monospace' }} />
              <Bar dataKey="attempted" fill="#27272a" radius={[0, 3, 3, 0]} barSize={6} name="Attempted" />
              <Bar dataKey="solved" fill="#dfa054" radius={[0, 3, 3, 0]} barSize={6} name="Solved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* 🏆 PS5-Style Trophy Cabinet */}
      <div className="flex flex-col gap-3 mt-1">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span>🏆</span> Trophy Cabinet
          </h3>
          <span className="text-[9px] text-zinc-500 font-mono">Progress: 60% (3/5 Trophies)</span>
        </div>

        {/* Trophies List */}
        <div className="flex flex-col gap-2.5">
          {/* Trophy 1: Masters of the Multiverse (Platinum) */}
          <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#0e0e11]/80 border border-zinc-900 hover:border-zinc-800 transition-all duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <img 
                src={chrome.runtime.getURL("assets/masters_multiverse.jpg")} 
                className="w-11 h-11 rounded-lg object-cover border border-indigo-500/20 shrink-0" 
                alt="Masters of the Multiverse"
              />
              <div>
                <h4 className="font-bold text-xs text-zinc-100 tracking-tight">Masters of the Multiverse</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-indigo-400">💍 Platinum</span>
                  <span className="text-zinc-700 text-[9px] font-mono">|</span>
                  <span className="text-[9px] font-mono text-zinc-500">▲ Ultra Rare | 4.2% earned</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[100px]">
              <span className="text-[9px] text-zinc-555 font-mono block">LOCKED</span>
              <span className="text-[10px] text-zinc-450 mt-1 block">Master all 17 topics</span>
            </div>
          </div>

          {/* Trophy 2: The Knight's Gambit (Gold) */}
          <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#0e0e11]/80 border border-zinc-900 hover:border-zinc-800 transition-all duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <img 
                src={chrome.runtime.getURL("assets/knights_gambit.jpg")} 
                className="w-11 h-11 rounded-lg object-cover border border-[#dfa054]/30 shrink-0 shadow-[0_0_8px_rgba(223,160,84,0.15)]" 
                alt="The Knight's Gambit"
              />
              <div>
                <h4 className="font-bold text-xs text-zinc-100 tracking-tight">The Knight's Gambit</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-[#dfa054]">🥇 Gold</span>
                  <span className="text-zinc-700 text-[9px] font-mono">|</span>
                  <span className="text-[9px] font-mono text-zinc-500">▲ Rare | 12.4% earned</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[100px]">
              <span className="text-[9px] text-zinc-555 font-mono block">📅 05/14/2026 14:15</span>
              <span className="text-[10px] text-zinc-450 mt-1 block">Reach Knight rating</span>
            </div>
          </div>

          {/* Trophy 3: Pure Intention (Silver) */}
          <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#0e0e11]/80 border border-zinc-900 hover:border-zinc-800 transition-all duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <img 
                src={chrome.runtime.getURL("assets/pure_intention.jpg")} 
                className="w-11 h-11 rounded-lg object-cover border border-zinc-500/20 shrink-0" 
                alt="Pure Intention"
              />
              <div>
                <h4 className="font-bold text-xs text-zinc-100 tracking-tight">Pure Intention</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-zinc-400">🥈 Silver</span>
                  <span className="text-zinc-700 text-[9px] font-mono">|</span>
                  <span className="text-[9px] font-mono text-zinc-500">▲ Rare | 22.1% earned</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[100px]">
              <span className="text-[9px] text-zinc-555 font-mono block">📅 06/11/2026 09:22</span>
              <span className="text-[10px] text-zinc-450 mt-1 block">Solve with zero hints</span>
            </div>
          </div>

          {/* Trophy 4: Out of the Mud (Bronze) */}
          <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#0e0e11]/80 border border-zinc-900 hover:border-zinc-800 transition-all duration-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <img 
                src={chrome.runtime.getURL("assets/out_of_mud.jpg")} 
                className="w-11 h-11 rounded-lg object-cover border border-amber-800/25 shrink-0" 
                alt="Out of the Mud"
              />
              <div>
                <h4 className="font-bold text-xs text-zinc-100 tracking-tight">Out of the Mud</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-amber-700">🥉 Bronze</span>
                  <span className="text-zinc-700 text-[9px] font-mono">|</span>
                  <span className="text-[9px] font-mono text-zinc-500">▲ Common | 90.4% earned</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[100px]">
              <span className="text-[9px] text-zinc-555 font-mono block">📅 03/01/2026 18:30</span>
              <span className="text-[10px] text-zinc-450 mt-1 block">Solve first 10 cases</span>
            </div>
          </div>

          {/* Trophy 5: The Compiler Blinked First (Gold - Locked) */}
          <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#0e0e11]/40 border border-zinc-950 opacity-60 transition-all duration-200 hover:opacity-80">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Locked Gold Badge */}
              <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0 relative">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5">
                  <rect x="5" y="11" width="14" height="10" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              {/* Title & Info */}
              <div>
                <h4 className="font-bold text-xs text-zinc-400 tracking-tight">The Compiler Blinked First</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold text-zinc-500">🥇 Gold</span>
                  <span className="text-zinc-700 text-[9px] font-mono">|</span>
                  <span className="text-[9px] font-mono text-zinc-550">▲ Ultra Rare | 1.8% earned</span>
                </div>
              </div>
            </div>
            {/* Req & Date */}
            <div className="text-right shrink-0 min-w-[100px]">
              <span className="text-[9px] text-zinc-650 font-mono block">LOCKED</span>
              <span className="text-[10px] text-zinc-550 mt-1 block">Solve Hard under 15m</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
