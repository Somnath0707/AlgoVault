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
    <div className="grid gap-3.5">
      <div className="relative">
        <input 
            type="text" 
            placeholder="Search patterns, notes, mistakes..." 
            className="w-full bg-zinc-900/30 border border-zinc-800/80 rounded-lg py-2 px-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
        />
        <div className="absolute right-3 top-2 opacity-40 text-xs">🔍</div>
      </div>

      {loading ? <div className="text-center text-xs text-zinc-500 font-mono py-4 animate-pulse">Searching notes...</div> : (
        <div className="flex flex-col gap-2.5">
          {data.length === 0 && <div className="text-xs text-zinc-500 font-mono text-center py-4">No vault notes found.</div>}
          {data.map((v, i) => (
            <Card key={i} className="py-2.5 px-3">
              <div className="flex justify-between items-start mb-2 border-b border-zinc-800/50 pb-1.5">
                <span className="font-semibold text-xs text-[#dfa054]">{v.title}</span>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-zinc-900/30 rounded border border-zinc-850 text-zinc-400">{v.entryType}</span>
              </div>
              <p className="text-[11px] text-zinc-300 line-clamp-3 mb-2 whitespace-pre-wrap font-mono opacity-90 leading-relaxed">{v.content}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {v.tags?.split(',').map((t: string, j: number) => (
                    <span key={j} className="text-[9px] font-mono text-zinc-500 bg-zinc-900/40 border border-zinc-850 px-1.5 py-0.5 rounded-md">#{t.trim()}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
