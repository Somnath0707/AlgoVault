import React from "react"
import { Card } from "../ui/Card"
import { ExternalLink } from "lucide-react"

const RESOURCES = [
  {
    name: "clist.by",
    description: "The longest-running and most comprehensive coding contest aggregator, tracking 100+ platforms",
    url: "https://clist.by/",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" },
      { text: "Community", color: "bg-purple-950/30 text-purple-400 border border-purple-500/20" }
    ]
  },
  {
    name: "CP Algorithms",
    description: "The go-to reference for algorithms and data structures in competitive programming",
    url: "https://cp-algorithms.com/",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" },
      { text: "Reference", color: "bg-emerald-950/30 text-emerald-450 border border-emerald-500/20" }
    ]
  },
  {
    name: "USACO Guide",
    description: "Free curated competitive programming curriculum with problem sets by topic",
    url: "https://usaco.guide/",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" },
      { text: "Reference", color: "bg-emerald-950/30 text-emerald-450 border border-emerald-500/20" }
    ]
  },
  {
    name: "CSES Problem Set",
    description: "Classic algorithmic problems sorted by topic, the standard practice set",
    url: "https://cses.fi/problemset/",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" }
    ]
  },
  {
    name: "Advent of Code",
    description: "Annual December programming challenge with 25 days of puzzles and a massive global community",
    url: "https://adventofcode.com/",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" },
      { text: "Community", color: "bg-purple-950/30 text-purple-400 border border-purple-500/20" }
    ]
  },
  {
    name: "AtCoder Problems",
    description: "Track AtCoder progress with difficulty estimates, streaks, and recommendations",
    url: "https://kenkoooo.com/atcoder/",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" }
    ]
  },
  {
    name: "CP Handbook",
    description: "Free book by Antti Laaksonen covering essential competitive programming techniques",
    url: "https://cses.fi/book/book.pdf",
    tags: [
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" },
      { text: "Reference", color: "bg-emerald-950/30 text-emerald-450 border border-emerald-500/20" }
    ]
  },
  {
    name: "OEIS",
    description: "Look up integer sequences, essential for combinatorics and number theory",
    url: "https://oeis.org/",
    tags: [
      { text: "Math", color: "bg-sky-950/30 text-sky-400 border border-sky-500/20" },
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" }
    ]
  },
  {
    name: "Project Euler",
    description: "Challenging mathematical and algorithmic problems that require more than just programming skills",
    url: "https://projecteuler.net/",
    tags: [
      { text: "Math", color: "bg-sky-950/30 text-sky-400 border border-sky-500/20" },
      { text: "Algorithms", color: "bg-blue-950/30 text-blue-400 border border-blue-500/20" }
    ]
  }
]

export const Resources = () => {
  return (
    <div className="grid gap-4">
      <Card className="p-4 bg-zinc-900/10 border-zinc-800">
        <h2 className="text-xs font-bold uppercase text-zinc-400 font-mono tracking-widest mb-1">Reputable CP Resources</h2>
        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
          A hand-picked directory of English competitive programming aggregators, guides, textbooks, and mathematical platforms.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {RESOURCES.map((resource) => (
          <a
            key={resource.name}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group focus:outline-none"
          >
            <Card className="p-3 bg-zinc-950/20 border-zinc-850 hover:border-zinc-700/80 hover:bg-zinc-900/10 transition-all flex flex-col justify-between h-[90px] select-none">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-zinc-200 group-hover:text-[#dfa054] transition-colors">{resource.name}</span>
                  <ExternalLink size={11} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
                <p className="text-[10px] text-zinc-550 leading-snug line-clamp-2">{resource.description}</p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {resource.tags.map((tag) => (
                  <span
                    key={tag.text}
                    className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded ${tag.color}`}
                  >
                    {tag.text.toUpperCase()}
                  </span>
                ))}
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  )
}
