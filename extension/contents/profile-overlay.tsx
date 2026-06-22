import type { PlasmoCSConfig, PlasmoGetInlineAnchor } from "plasmo"
import cssText from "data-text:~style.css"
import { useState, useEffect } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://leetcode.com/u/*"],
  all_frames: true
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  return document.body
}

export default function ProfileOverlay() {
  const [isOpen, setIsOpen] = useState(true);
  const [username, setUsername] = useState<string>("");
  const [contests, setContests] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/u\/([^\/]+)/);
    if (match) {
      setUsername(match[1]);
    }
  }, []);

  const handleScan = async () => {
    setScanning(true);
    // Simulate fetching and analyzing replay data using historical contests
    setTimeout(() => {
      setContests([
        {
          id: 1,
          title: "Weekly Contest 505",
          ranking: "#5177",
          problems: [
            { title: "maximum-sum-of-m-non-overlapping-subarra...", status: "Skipped", type: "No Submission", color: "text-gray-500" },
            { title: "valid-binary-strings-with-cost-limit", status: "Manual Typing", type: "Tab Switch: 25x • Natural typing", color: "text-emerald-400" },
            { title: "sum-of-compatible-numbers-in-range-i", status: "Manual Typing", type: "Natural typing", color: "text-emerald-400" },
            { title: "maximum-sum-of-m-non-overlapping-subarra...", status: "Skipped", type: "No Submission", color: "text-gray-500" },
          ]
        },
        {
          id: 2,
          title: "Biweekly Contest 184",
          ranking: "#3271",
          problems: []
        },
        {
          id: 3,
          title: "Weekly Contest 504",
          ranking: "#5076",
          problems: []
        }
      ]);
      setScanning(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 w-[400px] bg-[#1a1c23] rounded-xl shadow-2xl border border-gray-700/50 z-[9999] overflow-hidden font-sans text-white">
      <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-[#1e2028]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-emerald-500/30 flex items-center justify-center bg-emerald-500/10">
            <span className="text-emerald-500 font-bold text-lg">⚡</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">AlgoVault</h1>
            <p className="text-xs text-emerald-400">@{username || 'Som_07'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-gray-400 tracking-wider">CONTEST HISTORY</span>
          <span className="text-xs text-gray-500">{contests.length > 0 ? contests.length : ''}</span>
        </div>

        <button 
          onClick={handleScan}
          disabled={scanning}
          className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-bold rounded-lg transition-all border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] mb-4"
        >
          {scanning ? 'Scanning...' : 'Scan Last 5 Contests'}
        </button>

        <div className="flex flex-col gap-2">
          {contests.map((contest, i) => (
            <div key={i} className={`rounded-xl border ${contest.problems.length > 0 ? 'border-[#3b82f6]/30 bg-[#1e293b]/50' : 'border-gray-700/50 bg-[#1e2028]'} overflow-hidden`}>
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                <div>
                  <h3 className="font-bold text-sm text-gray-200">{contest.title}</h3>
                  <p className="text-xs text-gray-500">Global Ranking</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-400">{contest.ranking}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500 hover:text-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>
              </div>
              
              {contest.problems.length > 0 && (
                <div className="px-4 pb-4 flex flex-col gap-3">
                  {contest.problems.map((prob: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <div className="flex-1">
                        <p className="text-gray-300 font-medium truncate w-[200px]">{prob.title}</p>
                        <p className="text-gray-500 mt-1">• {prob.type}</p>
                      </div>
                      <span className={`${prob.color} font-medium`}>{prob.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {contests.length > 0 && (
          <div className="mt-4 text-center text-[10px] text-gray-600">
            AlgoVault • v1.1
          </div>
        )}
      </div>
    </div>
  )
}
