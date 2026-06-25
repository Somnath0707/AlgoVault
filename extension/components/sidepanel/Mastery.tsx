import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { ProgressBar } from "../ui/ProgressBar"
import { fetchMastery } from "../../lib/api/backend"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { getCachedMastery, setCachedMastery } from "../../lib/storage"

export const Mastery = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try to load from cache
    getCachedMastery().then((cached) => {
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });

    // 2. Fetch in background
    fetchMastery()
      .then((fresh) => {
        setData(fresh);
        setCachedMastery(fresh);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center text-av-text-secondary text-sm">Loading mastery analytics...</div>;

  // Filter out low volume tags for the radar chart to keep it clean
  const radarData = data.filter(d => d.totalAttempted >= 3).slice(0, 8).map(d => ({
    subject: d.tag,
    rating: Math.round(d.masteryScore || 1500),
    fullMark: 2500,
    volatility: d.volatility || 0.06
  }));

  return (
    <div className="grid gap-4">
      {radarData.length >= 3 && (
        <Card className="p-0 overflow-hidden">
          <h3 className="text-xs font-semibold text-zinc-400 p-4 pb-0 uppercase tracking-widest">Glicko-2 Tag Ratings</h3>
          <div className="h-[250px] w-full mt-1.5">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9, fontFamily: 'monospace' }} />
                <Radar name="Rating" dataKey="rating" stroke="#dfa054" fill="#dfa054" fillOpacity={0.12} />
                <Tooltip contentStyle={{ backgroundColor: '#141416', border: '1px solid #27272a', borderRadius: '8px', fontSize: 11, fontFamily: 'monospace' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center mt-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Topic Breakdown</h3>
        <span className="text-[10px] text-zinc-500 font-mono">Based on last 400 submissions</span>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((m, i) => {
          const score = Math.round(m.masteryScore || 1500);
          const volClass = (m.volatility || 0.06) > 0.08 ? 'text-red-400/80' : 'text-zinc-400';
          return (
            <Card key={i} className="py-3 px-4">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm text-zinc-200">{m.tag}</span>
                <span className="font-bold text-sm text-zinc-100 font-mono tabular-nums">{score} <span className="text-xs text-zinc-500 font-normal font-sans">Rating</span></span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 mb-2 font-mono">
                <span>{m.totalSolved}/{m.totalAttempted} Solved</span>
                <span>RD: <span className="tabular-nums">{Math.round(m.rd || 350)}</span></span>
                <span className={volClass}>Vol: <span className="tabular-nums">{(m.volatility || 0.06).toFixed(3)}</span></span>
              </div>
              <ProgressBar progress={(score / 2500) * 100} />
            </Card>
          )
        })}
      </div>
    </div>
  )
}
