import { useState, useEffect } from "react";
import {
  getUserContestHistory,
  getContestQuestions,
  getReplayEvents,
} from "./api";
import { analyzeEvents, CheatReport } from "./analysis";
import FloatingButton from "./components/FloatingButton";
import ContestCard from "./components/ContestCard";
import detectiveLogo from "../assets/logo.png";
import SettingsView from "./components/SettingsView";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedContest, setExpandedContest] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<
    Record<string, CheatReport>
  >({});
  const [analyzing, setAnalyzing] = useState(false);

  const [activeTab, setActiveTab] = useState<"scan" | "settings">("scan");

  useEffect(() => {
    const checkUser = () => {
      const pathParts = window.location.pathname.split("/");
      if (pathParts[1] === "u" && pathParts[2]) {
        setUsername(pathParts[2]);
      } else {
        setUsername(null);
        setIsOpen(false);
      }
    };
    checkUser();
    window.addEventListener("popstate", checkUser);
    return () => window.removeEventListener("popstate", checkUser);
  }, []);

  const handleScan = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const contests = await getUserContestHistory(username);
      setHistory(contests);
      setExpandedContest(null);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAnalyzeContest = async (contestSlug: string) => {
    if (expandedContest === contestSlug) {
      setExpandedContest(null);
      return;
    }
    setExpandedContest(contestSlug);
    setAnalyzing(true);
    setAnalysisResults({});

    try {
      const questions = await getContestQuestions(contestSlug);
      const results: Record<string, CheatReport> = {};

      await Promise.all(
        questions.map(async (q: any) => {
          const events = await getReplayEvents(
            username!,
            contestSlug,
            q.titleSlug
          );
          results[q.titleSlug] = analyzeEvents(events);
        })
      );
      setAnalysisResults(results);
    } catch (err) {
      console.error(err);
    }
    setAnalyzing(false);
  };

  if (!username) return null;

  if (!isOpen) return <FloatingButton onClick={() => setIsOpen(true)} />;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end animate-fade-in-up font-sans">
      <div
        className="
    w-[26rem] max-h-[80vh]
    rounded-2xl
    bg-gradient-to-br from-gray-900/90 to-gray-800/90
    backdrop-blur-xl
    border border-gray-700/60
    shadow-[0_20px_60px_rgba(0,0,0,0.6)]
    flex flex-col overflow-hidden
  "
      >
        {/* Header */}
        <div className="px-4 py-3 flex justify-between items-center shrink-0 border-b border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-green-500/40 shadow-[0_0_12px_rgba(34,197,94,0.6)]">
              <img
                src={detectiveLogo}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="leading-tight flex flex-col">
              <h2 className="font-xl mb-0 text-lg text-gray-100">CodeLeet</h2>
              <p className="text-xs text-green-400 font-mono">@{username}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Settings */}
            <button
              onClick={() =>
                setActiveTab(activeTab === "scan" ? "settings" : "scan")
              }
              title="Settings"
              className={`
  w-9 h-9 flex items-center justify-center rounded-lg transition cursor-pointer
  ${
    activeTab === "settings"
      ? "bg-green-600 text-white shadow-[0_0_12px_rgba(34,197,94,0.6)]"
      : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
  }
`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="
  w-9 h-9 flex items-center justify-center rounded-lg
  bg-gray-800 text-gray-300
  hover:bg-red-600 hover:text-white
  transition cursor-pointer
"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="
    px-4 py-4 flex-1 overflow-y-auto
    scrollbar-thin
    scrollbar-thumb-gray-700/60
    scrollbar-track-transparent
  "
        >
          {activeTab === "scan" ? (
            <>
              {/* Contest Scanner */}
              <div className="mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                    Contest History
                  </h3>
                  {history.length > 0 && (
                    <span className="text-xs text-gray-500 font-mono">
                      {history.length}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleScan}
                  disabled={loading}
                  className={`
                w-full py-2 rounded-lg text-sm font-semibold transition
                ${
                  loading
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.6)] cursor-pointer"
                }
              `}
                >
                  {loading ? "Processing..." : "Scan Last 5 Contests"}
                </button>
              </div>

              {/* Contest List */}
              <div className="space-y-2">
                {history.map((item: any) => (
                  <ContestCard
                    key={item.contest.titleSlug}
                    contest={item.contest}
                    ranking={item.ranking}
                    isExpanded={expandedContest === item.contest.titleSlug}
                    analyzing={analyzing}
                    results={analysisResults}
                    onExpand={() =>
                      handleAnalyzeContest(item.contest.titleSlug)
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <SettingsView />
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 text-center text-[10px] text-gray-500 border-t border-gray-800 font-mono">
          CodeLeet • v1.1
        </div>
      </div>
    </div>
  );
}

export default App;
