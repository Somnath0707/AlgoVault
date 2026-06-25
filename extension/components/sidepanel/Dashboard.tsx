import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchDashboard, fetchPotd, fetchRevisionQueue, fetchVault } from "../../lib/api/backend"
import { getCachedDashboard, setCachedDashboard } from "../../lib/storage"

export const Dashboard = () => {
  const [data, setData] = useState<any>(null);
  const [potd, setPotd] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [vault, setVault] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try to load from local storage cache first
    getCachedDashboard().then((cached: any) => {
      if (cached && cached.data) {
        setData(cached.data);
        setPotd(cached.potd || []);
        setQueue(cached.queue || []);
        setVault(cached.vault || []);
        setLoading(false);
      }
    });

    // 2. Fetch fresh data in the background
    Promise.all([
      fetchDashboard().catch(() => null),
      fetchPotd().catch(() => []),
      fetchRevisionQueue().catch(() => []),
      fetchVault().catch(() => [])
    ]).then(([freshData, freshPotd, freshQueue, freshVault]) => {
      if (freshData) {
        setData(freshData);
        setPotd(freshPotd);
        setQueue(freshQueue);
        setVault(freshVault);
        // Update cache
        setCachedDashboard({
          data: freshData,
          potd: freshPotd,
          queue: freshQueue,
          vault: freshVault
        } as any);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
      <div className="grid gap-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" /><Skeleton className="h-20" />
            <Skeleton className="h-20" /><Skeleton className="h-20" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
  );

  if (!data || data.totalSolved === 0) return (
      <Card className="text-center py-10">
          <div className="text-4xl mb-4 opacity-50">⚡</div>
          <h3 className="font-bold text-white mb-2">No Data Available</h3>
          <p className="text-sm text-gray-400 px-4">
              Head over to the Settings tab to start your first LeetCode history sync.
          </p>
      </Card>
  );

  return (
    <div className="grid gap-3.5">
      {/* Hero Telemetry Card */}
      <Card className="flex flex-col items-center justify-center p-5 bg-zinc-900/60 border border-zinc-800">
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-1.5">Virtual Rating</span>
        <div className="text-5xl font-extrabold text-zinc-100 tabular-nums font-mono tracking-tight">
          {data.virtualRating}
        </div>
      </Card>
      
      {/* Supporting Metrics Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card className="p-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Reviews Due</h3>
          <div className="text-xl font-bold text-zinc-100 tabular-nums font-mono">{queue.length}</div>
        </Card>
        <Card className="p-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-0.5">POTD Available</h3>
          <div className="text-xl font-bold text-[#dfa054] tabular-nums font-mono">{potd.length}</div>
        </Card>
        <Card className="p-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Total Solved</h3>
          <div className="text-xl font-bold text-zinc-100 tabular-nums font-mono">{data.totalSolved}</div>
        </Card>
        <Card className="p-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Vault Notes</h3>
          <div className="text-xl font-bold text-zinc-300 tabular-nums font-mono">{vault.length}</div>
        </Card>
        <Card className="p-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Solved Today</h3>
          <div className="text-xl font-bold text-zinc-100 tabular-nums font-mono">{data.todaySolves}</div>
          <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{data.todaySubmissions} submissions</div>
        </Card>
        <Card className="p-3">
          <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Current Streak</h3>
          <div className="text-xl font-bold text-zinc-100 tabular-nums font-mono">{data.currentStreak} <span className="text-xs text-zinc-500 font-normal">days</span></div>
        </Card>
      </div>

      {/* Live Session Control Box */}
      <Card className="p-3.5">
        <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Live Session</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/30 text-zinc-400">{data.currentMode}</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center">
          <div><div className="text-sm font-bold text-zinc-200 tabular-nums font-mono">{Math.floor(data.sessionTimeSeconds / 60)}m</div><div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">Elapsed</div></div>
          <div><div className="text-sm font-bold text-zinc-200 tabular-nums font-mono">{data.focusScore}</div><div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">Focus</div></div>
          <div><div className="text-sm font-bold text-zinc-200 tabular-nums font-mono">{data.tabSwitches}</div><div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">Switches</div></div>
          <div><div className="text-sm font-bold text-zinc-200 tabular-nums font-mono">{data.pasteCount}</div><div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">Pastes</div></div>
        </div>
      </Card>

      {/* Daily Selection */}
      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Daily Selection</h3>
        <div className="flex flex-col gap-2">
            {potd.length === 0 && <div className="text-xs text-zinc-500 py-1 font-mono">No POTD recommendations available.</div>}
            {potd.map((p: any, i: number) => {
                let badgeClass = "border border-zinc-800 bg-zinc-900/40 text-zinc-400";
                if (p.type === "WEAKNESS") {
                  badgeClass = "border border-[#dfa054]/20 bg-[#dfa054]/5 text-[#dfa054]";
                } else if (p.type === "REVISION") {
                  badgeClass = "border border-zinc-700 bg-zinc-850 text-zinc-200";
                }
                return (
                  <div key={i} className="flex justify-between items-start text-sm border-b border-zinc-800/50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex flex-col truncate pr-3">
                          <span className="truncate font-medium text-zinc-200 text-xs">{p.title}</span>
                          <span className="text-[10px] text-zinc-500 truncate mt-0.5">{p.reason}</span>
                      </div>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full shrink-0 ${badgeClass}`}>{p.type}</span>
                  </div>
                );
            })}
        </div>
      </Card>
    </div>
  )
}
