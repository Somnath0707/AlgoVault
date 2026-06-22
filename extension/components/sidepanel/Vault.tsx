import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchVault } from "../../lib/api/backend"

export const Vault = () => {
  const [data, setData] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Debounce simple implementation
    const timer = setTimeout(() => {
        fetchVault(query).then(setData).catch(console.error).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid gap-4">
      <div className="relative">
        <input 
            type="text" 
            placeholder="Search patterns, notes, mistakes..." 
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white placeholder-av-text-secondary focus:outline-none focus:border-[#00d4aa] transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
        <div className="absolute right-3 top-2.5 opacity-50">🔍</div>
      </div>

      {loading ? <div className="text-center text-sm py-4">Searching...</div> : (
        <div className="flex flex-col gap-3">
          {data.length === 0 && <div className="text-sm text-av-text-secondary text-center py-4">No notes found.</div>}
          {data.map((v, i) => (
            <Card key={i} className="py-3 px-4">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm text-[#00d4aa]">{v.title}</span>
                <span className="text-xs px-2 py-0.5 bg-black/30 rounded border border-white/5">{v.entryType}</span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-3 mb-2 whitespace-pre-wrap font-mono text-xs opacity-80">{v.content}</p>
              <div className="flex gap-2 mt-2">
                {v.tags?.split(',').map((t: string, j: number) => (
                    <span key={j} className="text-xs text-av-text-secondary bg-white/5 px-1.5 py-0.5 rounded">#{t.trim()}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
