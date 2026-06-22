import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { Skeleton } from "../ui/Skeleton"
import { fetchDashboard, fetchPotd, fetchRevisionQueue, fetchVault } from "../../lib/api/backend"

export const Dashboard = () => {
  const [data, setData] = useState<any>(null);
  const [potd, setPotd] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [vault, setVault] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchDashboard().then(setData).catch(() => setData(null)),
      fetchPotd().then(setPotd).catch(() => setPotd([])),
      fetchRevisionQueue().then(setQueue).catch(() => setQueue([])),
      fetchVault().then(setVault).catch(() => setVault([]))
    ]).finally(() => setLoading(false));
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
    <div className="grid gap-4">
      <Card className="flex flex-col items-center justify-center p-6 bg-[#1e293b]">
        <span className="text-av-text-secondary text-sm font-medium uppercase tracking-wider mb-2">Virtual Rating</span>
        <div className="text-6xl font-bold text-white">
          {data.virtualRating}
        </div>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm text-av-text-secondary mb-1">Reviews Due</h3>
          <div className="text-2xl font-bold text-orange-400">{queue.length}</div>
        </Card>
        <Card>
          <h3 className="text-sm text-av-text-secondary mb-1">POTD Available</h3>
          <div className="text-2xl font-bold text-[#00d4aa]">{potd.length}</div>
        </Card>
        <Card>
          <h3 className="text-sm text-av-text-secondary mb-1">Total Solved</h3>
          <div className="text-2xl font-bold">{data.totalSolved}</div>
        </Card>
        <Card>
          <h3 className="text-sm text-av-text-secondary mb-1">Vault Notes</h3>
          <div className="text-2xl font-bold text-purple-400">{vault.length}</div>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm text-av-text-secondary mb-3">Daily Selection</h3>
        <div className="flex flex-col gap-2">
            {potd.length === 0 && <div className="text-sm text-gray-400">No POTD available.</div>}
            {potd.map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                    <div className="flex flex-col truncate pr-4">
                        <span className="truncate text-white">{p.title}</span>
                        <span className="text-xs text-av-text-secondary truncate">{p.reason}</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-black/30 rounded border border-white/10 shrink-0 text-white">{p.type}</span>
                </div>
            ))}
        </div>
      </Card>
      <div className="text-xs text-center text-av-text-secondary mt-4">
        Last Sync: {data.lastSyncTime ? new Date(data.lastSyncTime).toLocaleString() : 'Never'}
      </div>
    </div>
  )
}
