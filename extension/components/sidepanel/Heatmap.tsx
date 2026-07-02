import React, { useEffect, useMemo, useState } from "react"
import { Card } from "../ui/Card"
import { fetchDashboard, fetchHeatmap } from "../../lib/api/backend"
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { getCachedDashboard, getCachedHeatmap, setCachedDashboard, setCachedHeatmap } from "../../lib/storage"
import { AchievementShowcase } from "./AchievementShowcase"
import { buildAchievementStats, getAchievements } from "../../lib/achievements"

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
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try to load from cache
    Promise.all([
      getCachedHeatmap().catch(() => null),
      getCachedDashboard().catch(() => null)
    ]).then(([cachedHeatmap, cachedDashboard]) => {
      if (cachedHeatmap) setData(cachedHeatmap);
      if (cachedDashboard) setDashboard(cachedDashboard);
      if (cachedHeatmap || cachedDashboard) setLoading(false);
    });

    // 2. Fetch in background
    Promise.all([
      fetchHeatmap(),
      fetchDashboard().catch(() => null)
    ])
      .then(([freshHeatmap, freshDashboard]) => {
        setData(freshHeatmap);
        setCachedHeatmap(freshHeatmap);
        if (freshDashboard) {
          setDashboard(freshDashboard);
          setCachedDashboard(freshDashboard);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Sort by rating bucket ascending
  const sortedData = [...data].sort((a, b) => a.bucketRating - b.bucketRating);
  const achievements = useMemo(() => {
    return getAchievements(buildAchievementStats(dashboard || {}, sortedData))
  }, [dashboard, sortedData])

  if (loading) return <div className="p-4 text-center text-zinc-500 text-sm font-mono animate-pulse">Loading heatmap analytics...</div>;
  if (!data || data.length === 0) {
    return (
      <div className="grid gap-4 font-sans">
        <Card className="text-center py-10">
          <h3 className="font-bold text-zinc-200 mb-2">No Submissions Logged</h3>
          <p className="text-sm text-zinc-500 px-4">
            Please run a sync in the Settings tab to populate your historical problem rating metrics.
          </p>
        </Card>
        <AchievementShowcase achievements={achievements} variant="gallery" />
      </div>
    );
  }

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

      <AchievementShowcase achievements={achievements} variant="gallery" />
    </div>
  )
}
