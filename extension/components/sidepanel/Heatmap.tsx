import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchHeatmap } from "../../lib/api/backend"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export const Heatmap = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmap().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-center">No data</div>;

  return (
    <div className="grid gap-4">
      <Card>
        <h3 className="text-sm text-av-text-secondary mb-4">Difficulty Heatmap</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="bucketRating" type="category" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px'}} />
              <Bar dataKey="solved" fill="#00d4aa" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
