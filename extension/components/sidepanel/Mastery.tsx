import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { ProgressBar } from "../ui/ProgressBar"
import { fetchMastery } from "../../lib/api/backend"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
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
        <Card className="p-0 overflow-hidden bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 border-zinc-800/60 shadow-lg">
          <h3 className="text-xs font-semibold text-zinc-400 p-4 pb-0 uppercase tracking-widest flex items-center justify-between">
            <span>Glicko-2 Tag Ratings</span>
            <span className="text-[9px] bg-zinc-800/50 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/50">Radar</span>
          </h3>
          <div className="h-[250px] w-full mt-1.5 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#dfa054]/5 via-transparent to-transparent pointer-events-none" />
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }} />
                <Radar name="Rating" dataKey="rating" stroke="#dfa054" strokeWidth={2} fill="url(#colorRating)" fillOpacity={1} />
                <defs>
                  <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dfa054" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#dfa054" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 20, 22, 0.95)', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: 12, fontFamily: 'monospace', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#dfa054', fontWeight: 'bold' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {data.length > 0 && (
        <Card className="p-0 overflow-hidden bg-gradient-to-br from-[#121820] to-[#0a0d14] border-sky-900/30 shadow-lg">
          <h3 className="text-xs font-semibold text-sky-400/80 p-4 pb-0 uppercase tracking-widest flex items-center justify-between">
            <span>Solved vs Attempted</span>
            <span className="text-[9px] bg-sky-900/30 text-sky-300 px-2 py-0.5 rounded-full border border-sky-800/40">Top 8</span>
          </h3>
          <div className="h-[220px] w-full mt-4 pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="tag" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '8px', fontSize: 11, fontFamily: 'monospace', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }} />
                <Bar dataKey="totalAttempted" name="Attempted" fill="#334155" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="totalSolved" name="Solved" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
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
