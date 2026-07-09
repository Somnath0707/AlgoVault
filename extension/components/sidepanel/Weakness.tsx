import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchWeakness } from "../../lib/api/backend"
import { getCachedWeakness, setCachedWeakness } from "../../lib/storage"

export const Weakness = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // 1. Try to load from cache
    getCachedWeakness().then((cached) => {
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });

    // 2. Fetch in background
    fetchWeakness()
      .then((fresh) => {
        setData(fresh);
        setCachedWeakness(fresh);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Add a query param to bypass backend cache if supported, or just rely on backend cache eviction.
      const fresh = await fetchWeakness(true);
      setData(fresh);
      setCachedWeakness(fresh);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-av-text-secondary text-sm">Loading weakness data...</div>;

  if (!data || !data.weakTags || data.weakTags.length === 0) {
      return (
          <Card className="text-center py-10">
              <h3 className="font-bold text-white mb-2">No Data Available</h3>
              <p className="text-sm text-gray-400 px-4">
                  Please sync your LeetCode history in the Settings tab to generate weakness analytics.
              </p>
          </Card>
      );
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Training Priorities</h3>
        <span className="text-[10px] text-zinc-500 font-mono">Based on last 400 submissions</span>
      </div>
      <div className="grid gap-2">
        {data.weakTags.map((w: any, i: number) => (
          <Card key={i} className="flex justify-between items-center py-2.5 px-3">
            <span className="font-semibold text-xs text-zinc-300">{w.tag}</span>
            <span className="text-zinc-200 font-bold text-xs font-mono tabular-nums">
              {Math.round(w.masteryScore)} <span className="text-[10px] text-zinc-500 font-normal font-sans">Rating</span>
            </span>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Recommended Training Problems</h3>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[9px] px-2 py-0.5 border border-zinc-700 hover:bg-zinc-800 rounded font-mono text-zinc-300 disabled:opacity-50 flex items-center gap-1 transition-colors"
        >
          <span className={refreshing ? "animate-spin" : ""}>⟳</span>
          Shuffle
        </button>
      </div>
      <div className="grid gap-2 mt-1">
        {data?.recommendations?.length === 0 && <div className="text-xs text-zinc-500 font-mono py-2">No recommendations available yet.</div>}
        {data?.recommendations?.map((r: any, i: number) => (
          <a key={i} href={`https://leetcode.com/problems/${r.titleSlug}/`} target="_blank" rel="noreferrer">
            <Card className="py-2.5 px-3 cursor-pointer hover:bg-zinc-800/30 transition-all duration-200 border border-zinc-800/50 hover:border-zinc-700">
              <div className="flex justify-between items-center">
                <span className="font-medium text-xs text-zinc-300 truncate pr-2">{r.title}</span>
                <span className="text-[10px] font-mono shrink-0 px-2 py-0.5 bg-zinc-900/30 rounded border border-zinc-800 text-zinc-400">
                  {r.actualRating ? Math.round(r.actualRating) : r.difficulty}
                </span>
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}
