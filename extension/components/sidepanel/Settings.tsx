import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import {
  getUsername,
  setUsername as persistUsername,
  getGithubPat,
  setGithubPat as persistGithubPat,
  getGithubRepo,
  setGithubRepo as persistGithubRepo
} from "../../lib/storage"
import { fetchUserStatus } from "../../lib/api/leetcode"

export const Settings = () => {
  const [hideAccRate, setHideAccRate] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [username, setUsername] = useState<string>('');
  const [activeLcUser, setActiveLcUser] = useState<string | null>(null);
  const [loadingActiveUser, setLoadingActiveUser] = useState<boolean>(true);
  const [githubPat, setGithubPat] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');
  const [githubSaved, setGithubSaved] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.sync.get(['hideAcceptanceRate'], (res) => {
      if (res.hideAcceptanceRate !== undefined) setHideAccRate(res.hideAcceptanceRate);
    });
    getUsername().then((value) => setUsername(value || ""));
    getGithubPat().then((value) => setGithubPat(value || ""));
    getGithubRepo().then((value) => setGithubRepo(value || ""));

    fetchUserStatus()
      .then((res) => {
        const activeUser = res.data?.userStatus?.username;
        if (activeUser) {
          setActiveLcUser(activeUser);
          getUsername().then((storedVal) => {
            if (!storedVal) {
              setUsername(activeUser);
              persistUsername(activeUser);
            }
          });
        } else {
          setActiveLcUser(null);
        }
        setLoadingActiveUser(false);
      })
      .catch((err) => {
        console.error("Failed to fetch active LeetCode session:", err);
        setLoadingActiveUser(false);
      });

    const checkSync = () => {
      chrome.storage.local.get(['syncStatus'], (res) => {
        if (res.syncStatus) setSyncStatus(res.syncStatus);
      });
    };
    checkSync();
    const interval = setInterval(checkSync, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleAccRate = () => {
    const val = !hideAccRate;
    setHideAccRate(val);
    chrome.storage.sync.set({ hideAcceptanceRate: val });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    persistUsername(val.trim());
  };

  const handleSync = () => {
    if (!username) {
        alert("Please enter a username first.");
        return;
    }
    chrome.runtime.sendMessage({ action: "sync_history", username });
    setSyncStatus({ status: 'RUNNING', message: 'Starting sync...', count: 0, subCount: 0 });
  };

  const handleGithubSave = () => {
    persistGithubPat(githubPat.trim());
    persistGithubRepo(githubRepo.trim());
    setGithubSaved(true);
    setTimeout(() => setGithubSaved(false), 2000);
  };

  return (
    <div className="grid gap-3.5">
      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Preferences</h3>

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Hide Acceptance Rate</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Hide the native LeetCode rate to mitigate performance anxiety</div>
            </div>
            <button
                onClick={toggleAccRate}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${hideAccRate ? 'bg-[#dfa054]' : 'bg-zinc-800'}`}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-zinc-950 absolute top-0.5 transition-all ${hideAccRate ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>
      </Card>

      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Data Synchronization</h3>
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mb-3.5">
            AlgoVault maps your entire LeetCode history to build custom telemetry metrics. Syncing queries your historical submissions, problem tags, and contest records directly from LeetCode.
        </p>

        <div className="mb-4">
            <label className="text-[10px] text-zinc-400 block mb-1.5 flex justify-between items-center font-mono">
              <span>LeetCode Username</span>
              {loadingActiveUser ? (
                <span className="text-[9px] text-zinc-500 animate-pulse">Checking session...</span>
              ) : activeLcUser ? (
                <span className="text-[9px] text-[#10b981] flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#10b981]"></span>
                  Active: {activeLcUser}
                </span>
              ) : (
                <span className="text-[9px] text-amber-500 flex items-center gap-1 font-mono">
                  <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                  Not logged in to LeetCode
                </span>
              )}
            </label>
            <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter username"
                className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all"
            />
            {!loadingActiveUser && activeLcUser && username && activeLcUser.toLowerCase() !== username.trim().toLowerCase() && (
              <div className="text-[9px] text-amber-550 mt-1 font-mono">
                ⚠️ Click <span className="underline cursor-pointer text-[#dfa054] hover:text-white" onClick={() => { setUsername(activeLcUser); persistUsername(activeLcUser); }}>here</span> to align with logged-in user: "{activeLcUser}".
              </div>
            )}
            {!loadingActiveUser && !activeLcUser && (
              <div className="text-[9px] text-amber-550 mt-1 font-mono">
                ⚠️ Log in to LeetCode.com in your browser before running a sync.
              </div>
            )}
        </div>

        {syncStatus?.status === 'RUNNING' ? (
            <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg font-mono text-[10px] text-zinc-400">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-zinc-900/50">
                    <span className="text-[#dfa054] animate-pulse">SYNCHRONIZING LOGGER</span>
                    <div className="w-3.5 h-3.5 rounded-full border border-[#dfa054] border-t-transparent animate-spin" />
                </div>
                <div className="space-y-1">
                  <div>{syncStatus.message}</div>
                  {syncStatus.count ? <div>Processed {syncStatus.count} submissions...</div> : null}
                </div>
            </div>
        ) : (
            <button
                onClick={handleSync}
                className="w-full bg-[#dfa054] hover:bg-[#e5b376] text-zinc-950 font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-[#dfa054]/20 font-mono tracking-wider uppercase"
            >
                Sync Now
            </button>
        )}

        {syncStatus?.status === 'SUCCESS' && (
            <div className="mt-3 text-[10px] text-[#10b981] font-mono text-center flex items-center justify-center gap-1.5 bg-[#10b981]/5 border border-[#10b981]/15 py-1.5 rounded-lg">
                <span className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse"></span>
                SYNC COMPLETED SUCCESSFULLY
            </div>
        )}
        {syncStatus?.status === 'ERROR' && (
            <div className="mt-3 text-[10px] text-red-400 font-mono text-center flex items-center justify-center gap-1.5 bg-red-950/20 border border-red-900/30 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                SYNC ERROR: {syncStatus.message?.toUpperCase()}
            </div>
        )}
      </Card>

      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">GitHub Synchronization</h3>
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mb-3.5">
          Sync your accepted LeetCode solutions directly to your personal GitHub repository.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1 font-mono">Personal Access Token (PAT)</label>
            <input
              type="password"
              value={githubPat}
              onChange={(e) => setGithubPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1 font-mono">Repository Path</label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo (e.g. Somnath0707/AlgoVault)"
              className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all font-mono"
            />
          </div>

          <button
            onClick={handleGithubSave}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-250 hover:text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-zinc-750 font-mono tracking-wider uppercase mt-1"
          >
            {githubSaved ? "Saved ✔" : "Save Credentials"}
          </button>
        </div>
      </Card>
    </div>
  );
};
