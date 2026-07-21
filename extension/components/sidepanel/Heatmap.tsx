import React, { useEffect, useMemo, useState } from "react"
import { Card } from "../ui/Card"
import { BarChart3, CheckCircle2, Crosshair, Sparkles } from "lucide-react"
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

const CustomLegend = () => {
  return (
    <div className="flex justify-end gap-4 text-[10px] font-mono text-zinc-500 pb-4 pr-1 select-none">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#2d2d30] border border-zinc-700/50"></span>
        <span>Attempted</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#dfa054]"></span>
        <span>Solved</span>
      </div>
    </div>
  );
};

const NestedBarShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (width === 0) return null;

  const attempted = payload.attempted || 0;
  const solved = payload.solved || 0;
  const solvedWidth = attempted > 0 ? (solved / attempted) * width : 0;
  
  const barHeight = 10;
  const offset = (height - barHeight) / 2;
  const barY = y + offset;

  return (
    <g>
      {/* Attempted backdrop (Thicker) */}
      <rect
        x={x}
        y={barY}
        width={width}
        height={barHeight}
        rx={5}
        ry={5}
        fill="url(#attemptedGrad)"
      />
      {/* Solved overlay (Thinner, centered nested progress) */}
      {solvedWidth > 0 && (
        <rect
          x={x}
          y={barY + (barHeight - 4) / 2}
          width={solvedWidth}
          height={4}
          rx={2}
          ry={2}
          fill="url(#solvedGrad)"
        />
      )}
    </g>
  );
};

interface HeatmapDataPoint { date: string; count: number; }
interface DashboardDataSummary { totalSolved?: number; streak?: number; lastActive?: string; }

export const Heatmap = () => {
  const [data, setData] = useState<HeatmapDataPoint[]>([]);
  const [dashboard, setDashboard] = useState<DashboardDataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number | null>(null)

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

  // Sort by rating bucket ascending and filter out empty buckets to avoid bloat
  const sortedData = useMemo(() => {
    return [...data]
      .filter((d) => d.attempted > 0)
      .sort((a, b) => a.bucketRating - b.bucketRating);
  }, [data]);

  const achievements = useMemo(() => {
    return getAchievements(buildAchievementStats(dashboard || {}, sortedData))
  }, [dashboard, sortedData])

  // Dynamically calculate height to keep vertical rows perfectly spaced and prevent crowding
  const chartHeight = useMemo(() => {
    if (sortedData.length === 0) return 200;
    return Math.max(200, sortedData.length * 28 + 20);
  }, [sortedData]);

  const summary = useMemo(() => {
    const attempted = sortedData.reduce((total, bucket) => total + Number(bucket.attempted || 0), 0)
    const solved = sortedData.reduce((total, bucket) => total + Number(bucket.solved || 0), 0)
    const best = [...sortedData].filter((bucket) => bucket.solved > 0).sort((left, right) => right.bucketRating - left.bucketRating)[0]
    return {
      attempted,
      solved,
      conversion: attempted ? Math.round((solved / attempted) * 100) : 0,
      best: best?.bucketRating ?? null
    }
  }, [sortedData])

  const selectedBucket = selectedRating == null
    ? null
    : sortedData.find((bucket) => bucket.bucketRating === selectedRating) ?? null

  if (loading) return <div className="p-4 text-center text-zinc-500 text-sm font-mono animate-pulse">Loading heatmap analytics...</div>;
  if (!data || data.length === 0 || sortedData.length === 0) {
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
    <div className="grid gap-3.5 font-sans">
      <div className="flex items-end justify-between px-1">
        <div>
          <div className="flex items-center gap-2 panel-label"><BarChart3 size={13} className="text-[#dfa054]" /> Rating map</div>
          <p className="mt-1 text-[11px] text-zinc-500">Your attempts and accepted solves across ZeroTrac rating bands.</p>
        </div>
        <span className="text-[10px] font-mono text-zinc-600">{sortedData.length} bands</span>
      </div>

      <div className="grid grid-cols-4 divide-x divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/35">
        <div className="px-3 py-2.5"><div className="panel-label">Solved</div><div className="metric-value mt-1 text-lg font-semibold text-zinc-100">{summary.solved}</div></div>
        <div className="px-3 py-2.5"><div className="panel-label">Attempted</div><div className="metric-value mt-1 text-lg font-semibold text-zinc-100">{summary.attempted}</div></div>
        <div className="px-3 py-2.5"><div className="panel-label">Convert</div><div className="metric-value mt-1 text-lg font-semibold text-emerald-400">{summary.conversion}%</div></div>
        <div className="px-3 py-2.5"><div className="panel-label">Best solve</div><div className="metric-value mt-1 text-lg font-semibold text-[#dfa054]">{summary.best ?? "—"}</div></div>
      </div>

      <Card className="bg-[#111112] border border-zinc-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-start justify-between gap-3 px-1">
          <div>
            <h3 className="text-xs font-semibold text-zinc-200">Solve distribution</h3>
            <p className="mt-1 text-[10px] text-zinc-500 leading-relaxed">The amber line shows accepted solves inside your total attempt volume.</p>
          </div>
          <Sparkles size={14} className="mt-0.5 text-zinc-600" />
        </div>
        <CustomLegend />
        <div style={{ height: chartHeight }} className="w-full transition-all duration-300">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={sortedData} 
              layout="vertical" 
              margin={{ top: 0, right: 15, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="solvedGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#d97706" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#dfa054" stopOpacity={1} />
                </linearGradient>
                <linearGradient id="attemptedGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#1e1e20" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#2d2d30" stopOpacity={1} />
                </linearGradient>
              </defs>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="bucketRating" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 10, fontFamily: 'monospace' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                content={<CustomTooltip />} 
              />
              {/* Single Bar rendering both Attempted and Solved nested */}
              <Bar 
                dataKey="attempted" 
                shape={<NestedBarShape />} 
                name="Progress"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 panel-label"><Crosshair size={13} className="text-sky-400" /> Explore a band</div>
          {selectedBucket && <span className="text-[10px] font-mono text-zinc-500">{selectedBucket.attempted} attempts</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sortedData.map((bucket) => {
            const active = selectedRating === bucket.bucketRating
            const solvedAll = bucket.attempted > 0 && bucket.solved === bucket.attempted
            return (
              <button
                key={bucket.bucketRating}
                onClick={() => setSelectedRating(active ? null : bucket.bucketRating)}
                className={`rounded-md border px-2.5 py-1.5 text-[10px] font-mono transition-colors ${active ? "border-[#dfa054]/60 bg-[#dfa054]/10 text-[#dfa054]" : solvedAll ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-400" : "border-zinc-800 bg-zinc-950/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
              >
                {bucket.bucketRating}
              </button>
            )
          })}
        </div>
        {selectedBucket && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2.5 text-[11px]">
            <div className="flex items-center gap-2 text-zinc-300"><CheckCircle2 size={13} className="text-emerald-400" /> {selectedBucket.solved} accepted in the {selectedBucket.bucketRating} band</div>
            <span className="font-mono text-zinc-500">{selectedBucket.avgAttempts?.toFixed?.(1) ?? "—"} avg attempts</span>
          </div>
        )}
      </Card>

      <AchievementShowcase achievements={achievements} variant="gallery" />
    </div>
  )
}
