import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { ProgressBar } from "../ui/ProgressBar"
import { fetchMastery } from "../../lib/api/backend"

export const Mastery = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMastery().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="grid gap-3">
      {data.map((m, i) => {
        const score = Math.round(m.masteryScore || 0);
        const color = score >= 80 ? 'from-green-500 to-green-400' : score >= 50 ? 'from-yellow-500 to-yellow-400' : 'from-red-500 to-red-400';
        return (
          <Card key={i} className="py-3 px-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">{m.tag}</span>
              <span className="font-bold text-sm">{score}%</span>
            </div>
            <ProgressBar progress={score} colorClass={color} />
          </Card>
        )
      })}
    </div>
  )
}
