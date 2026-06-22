import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"

export const Contest = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContests().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="grid gap-4">
      <Card className="bg-[#1e293b]">
        <h3 className="text-sm text-av-text-secondary mb-2">Average Finish Time</h3>
        <div className="text-3xl font-bold text-white mb-1">48 mins</div>
        <div className="text-xs text-green-400">Top 15% pace globally</div>
      </Card>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs text-av-text-secondary mb-1">Panic Index</h3>
          <div className="text-lg font-bold text-green-400">Low</div>
        </Card>
        <Card>
          <h3 className="text-xs text-av-text-secondary mb-1">Choking Index</h3>
          <div className="text-lg font-bold text-yellow-400">Normal</div>
        </Card>
      </div>

      <h3 className="text-sm text-av-text-secondary uppercase tracking-wider font-semibold mt-2">Contest History</h3>
      <div className="flex flex-col gap-3">
        {data.map((c, i) => (
          <Card key={i} className="py-3 px-4">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm truncate">{c.contestTitle}</span>
              <span className={`font-bold text-sm ${c.ratingDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {c.ratingDelta > 0 ? '+' : ''}{c.ratingDelta || 0}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-av-text-secondary">
              <span>Rank: {c.rank}</span>
              <span>{c.problemsSolved}/{c.totalProblems} Solved</span>
              <span>{c.finishTimeMinutes}m</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
