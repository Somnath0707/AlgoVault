import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchWeakness } from "../../lib/api/backend"

export const Weakness = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeakness().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center">Loading...</div>;

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
      <h3 className="text-sm text-av-text-secondary uppercase tracking-wider font-semibold">Weak Tags</h3>
      <div className="grid gap-3">
        {data.weakTags.map((w: any, i: number) => (
          <Card key={i} className="flex justify-between items-center py-3">
            <span className="font-medium text-sm">{w.tag}</span>
            <span className="text-red-400 font-bold text-sm">{Math.round(w.masteryScore)}%</span>
          </Card>
        ))}
      </div>
      
      <h3 className="text-sm text-av-text-secondary uppercase tracking-wider font-semibold mt-4">Recommended Problems</h3>
      <div className="grid gap-3">
        {data?.recommendations?.length === 0 && <div className="text-sm text-av-text-secondary">No recommendations available yet.</div>}
        {data?.recommendations?.map((r: any, i: number) => (
          <Card key={i} className="py-3 cursor-pointer hover:bg-white/5 transition-colors">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm truncate pr-2">{r.title}</span>
              <span className="text-xs px-2 py-1 bg-black/30 rounded">{r.actualRating || r.difficulty}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
