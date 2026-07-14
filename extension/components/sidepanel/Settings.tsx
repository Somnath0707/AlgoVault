import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import {
  getUsername,
  setUsername as persistUsername,
  getGithubPat,
  setGithubPat as persistGithubPat,
  getGithubRepo,
  setGithubRepo as persistGithubRepo,
  getLastSync
} from "../../lib/storage"
import { fetchUserStatus } from "../../lib/api/leetcode"
import { BACKEND_URL } from "../../lib/constants"
import { getJwtToken, clearJwtToken } from "../../lib/storage"
import { getSettings, updateSettings, exportUserData } from "../../lib/api/backend"

export const Settings = () => {
  const [hideAccRate, setHideAccRate] = useState(true);
  const [celebrationOverlay, setCelebrationOverlay] = useState(true);
  const [celebrationSound, setCelebrationSound] = useState(true);
  const [celebrationTheme, setCelebrationTheme] = useState("gta");
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [username, setUsername] = useState<string>('');
  const [activeLcUser, setActiveLcUser] = useState<string | null>(null);
  const [loadingActiveUser, setLoadingActiveUser] = useState<boolean>(true);
  const [githubPat, setGithubPat] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');
  const [githubSaved, setGithubSaved] = useState<boolean>(false);
  const [gitSyncStatus, setGitSyncStatus] = useState<any>(null);
  const [syncHasMore, setSyncHasMore] = useState<any>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [hasJwt, setHasJwt] = useState<boolean>(false);
  const [settingsSynced, setSettingsSynced] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.sync.get(['hideAcceptanceRate', 'celebrationOverlay', 'celebrationSound', 'celebrationTheme'], (res) => {
      if (res.hideAcceptanceRate !== undefined) setHideAccRate(res.hideAcceptanceRate);
      if (res.celebrationOverlay !== undefined) setCelebrationOverlay(res.celebrationOverlay);
      if (res.celebrationSound !== undefined) setCelebrationSound(res.celebrationSound);
      if (res.celebrationTheme !== undefined) setCelebrationTheme(res.celebrationTheme);
    });

    chrome.storage.local.get("algovault.jwt", (res) => {
      if (res["algovault.jwt"]) {
        getSettings()
          .then((resp: any) => {
            if (resp && resp.preferences) {
              const prefs = resp.preferences;
              if (prefs.hideAcceptanceRate !== undefined) {
                setHideAccRate(prefs.hideAcceptanceRate);
                chrome.storage.sync.set({ hideAcceptanceRate: prefs.hideAcceptanceRate });
              }
              if (prefs.celebrationOverlay !== undefined) {
                setCelebrationOverlay(prefs.celebrationOverlay);
                chrome.storage.sync.set({ celebrationOverlay: prefs.celebrationOverlay });
              }
              if (prefs.celebrationSound !== undefined) {
                setCelebrationSound(prefs.celebrationSound);
                chrome.storage.sync.set({ celebrationSound: prefs.celebrationSound });
              }
              if (prefs.celebrationTheme !== undefined) {
                setCelebrationTheme(prefs.celebrationTheme);
                chrome.storage.sync.set({ celebrationTheme: prefs.celebrationTheme });
              }
              if (prefs.githubPat !== undefined) {
                setGithubPat(prefs.githubPat);
                persistGithubPat(prefs.githubPat);
              }
              if (prefs.githubRepo !== undefined) {
                setGithubRepo(prefs.githubRepo);
                persistGithubRepo(prefs.githubRepo);
              }
            }
          })
          .catch((e) => console.log("Failed to load settings from server:", e));
      }
    });

    getUsername().then((value) => setUsername(value || ""));
    getGithubPat().then((value) => setGithubPat(value || ""));
    getGithubRepo().then((value) => setGithubRepo(value || ""));
    getLastSync().then(setLastSync).catch(() => setLastSync(null));
    
    const parseGitSyncStatus = (raw: any) => {
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw || null;
    };

    chrome.storage.local.get("algovault.gitSyncStatus", (res) => {
      setGitSyncStatus(parseGitSyncStatus(res["algovault.gitSyncStatus"]));
    });

    const gitListener = (changes: any) => {
      if (changes["algovault.gitSyncStatus"]?.newValue) {
        setGitSyncStatus(parseGitSyncStatus(changes["algovault.gitSyncStatus"].newValue));
      }
    };
    chrome.storage.onChanged.addListener(gitListener);

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
      chrome.storage.local.get(['syncStatus', 'algovault.syncHasMore', 'algovault.jwt'], (res) => {
        if (res.syncStatus) setSyncStatus(res.syncStatus);
        getLastSync().then(setLastSync).catch(() => {});
        let hasMoreVal = res['algovault.syncHasMore'];
        if (typeof hasMoreVal === 'string') {
          try { hasMoreVal = JSON.parse(hasMoreVal) } catch (e) {}
        }
        setSyncHasMore(hasMoreVal || null);
        setHasJwt(!!res['algovault.jwt']);
      });
    };
    checkSync();
    const interval = setInterval(checkSync, 1000);
    return () => {
      clearInterval(interval);
      chrome.storage.onChanged.removeListener(gitListener);
    };
  }, []);

  const handleGithubLogin = () => {
    chrome.tabs.create({ url: `${BACKEND_URL}/oauth2/authorization/github` });
  };

  const handleLogout = () => {
    clearJwtToken().then(() => setHasJwt(false));
  };

  const toggleAccRate = () => {
    const val = !hideAccRate;
    setHideAccRate(val);
    chrome.storage.sync.set({ hideAcceptanceRate: val });
  };

  const toggleCelebrationOverlay = () => {
    const val = !celebrationOverlay;
    setCelebrationOverlay(val);
    chrome.storage.sync.set({ celebrationOverlay: val });
  };

  const toggleCelebrationSound = () => {
    const val = !celebrationSound;
    setCelebrationSound(val);
    chrome.storage.sync.set({ celebrationSound: val });
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCelebrationTheme(val);
    chrome.storage.sync.set({ celebrationTheme: val });
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

  const handleGithubSave = async () => {
    persistGithubPat(githubPat.trim());
    persistGithubRepo(githubRepo.trim());
    setGithubSaved(true);
    setTimeout(() => setGithubSaved(false), 2000);
    if (hasJwt) {
      try {
        await updateSettings({
          githubPat: githubPat.trim(),
          githubRepo: githubRepo.trim()
        });
      } catch (e) {
        console.error("Failed to sync github credentials to server:", e);
      }
    }
  };

  const handleSyncSettings = async () => {
    try {
      await updateSettings({
        hideAcceptanceRate: hideAccRate,
        celebrationOverlay,
        celebrationSound,
        celebrationTheme
      });
      setSettingsSynced(true);
      setTimeout(() => setSettingsSynced(false), 2000);
    } catch (e) {
      console.error("Failed to sync settings:", e);
      alert("Failed to sync settings to server.");
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const blob = await exportUserData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "algovault_export.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to export data:", e);
      alert("Failed to export data from server.");
    } finally {
      setExporting(false);
    }
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

        <div className="border-t border-zinc-800/50 my-2.5" />

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Celebration Overlay</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Show custom theme meme card on solving problems</div>
            </div>
            <button
                onClick={toggleCelebrationOverlay}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${celebrationOverlay ? 'bg-[#dfa054]' : 'bg-zinc-800'}`}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-zinc-950 absolute top-0.5 transition-all ${celebrationOverlay ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>

        <div className="border-t border-zinc-800/50 my-2.5" />

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Celebration Sound</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Play victory/defeat audio themes on submissions</div>
            </div>
            <button
                onClick={toggleCelebrationSound}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${celebrationSound ? 'bg-[#dfa054]' : 'bg-zinc-800'}`}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-zinc-950 absolute top-0.5 transition-all ${celebrationSound ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>

        <div className="border-t border-zinc-800/50 my-2.5" />

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Celebration Theme</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Choose Grand Theft Auto or Minecraft style</div>
            </div>
            <select
                value={celebrationTheme}
                onChange={handleThemeChange}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#dfa054]"
            >
                <option value="gta">Grand Theft Auto</option>
                <option value="minecraft">Minecraft</option>
            </select>
        </div>

        <div className="mt-3.5 pt-3.5 border-t border-zinc-800/50">
            <button
                onClick={handleSyncSettings}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-zinc-700 font-mono tracking-wider uppercase"
            >
                {settingsSynced ? "Synced to Server ✔" : "Sync Settings to Server"}
            </button>
        </div>
      </Card>

      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">AlgoVault Account</h3>
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mb-3">
          Authenticate using GitHub OAuth to protect your metrics and enable secure sync functions.
        </p>
        {hasJwt ? (
          <div className="space-y-2">
            <div className="text-[10px] text-emerald-400 font-mono bg-emerald-950/15 border border-emerald-900/25 rounded-lg px-3 py-2 flex items-center justify-between">
              <span>Authenticated via GitHub</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-zinc-700 font-mono tracking-wider uppercase"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleGithubLogin}
            className="w-full bg-[#dfa054] hover:bg-[#e5b376] text-zinc-950 font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-[#dfa054]/20 font-mono tracking-wider uppercase"
          >
            Log in with GitHub
          </button>
        )}
      </Card>

      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Data Synchronization</h3>
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mb-3.5">
            AlgoVault maps your entire LeetCode history once, then keeps new accepted submissions live through the extension.
        </p>
        {lastSync && (
          <div className="mb-3 text-[10px] text-emerald-400 font-mono bg-emerald-950/15 border border-emerald-900/25 rounded-lg px-3 py-2">
            Full sync valid since {new Date(lastSync).toLocaleString()}.
          </div>
        )}

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
                className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all"
            />
            {!loadingActiveUser && activeLcUser && username && activeLcUser.toLowerCase() !== username.trim().toLowerCase() && (
              <div className="text-[9px] text-amber-500 mt-1 font-mono">
                ⚠️ Click <span className="underline cursor-pointer text-[#dfa054] hover:text-white" onClick={() => { setUsername(activeLcUser); persistUsername(activeLcUser); }}>here</span> to align with logged-in user: "{activeLcUser}".
              </div>
            )}
            {!loadingActiveUser && !activeLcUser && (
              <div className="text-[9px] text-amber-500 mt-1 font-mono">
                ⚠️ Log in to LeetCode.com in your browser before running a sync.
              </div>
            )}
        </div>

        {syncStatus?.status === 'RUNNING' ? (
            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg font-mono text-[10px] text-zinc-400">
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
                Full Sync / Refresh
            </button>
        )}

        {syncStatus?.status === 'SUCCESS' && (
            <div className="mt-3 text-[10px] text-[#10b981] font-mono text-center flex items-center justify-center gap-1.5 bg-[#10b981]/5 border border-[#10b981]/15 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                SYNC COMPLETED SUCCESSFULLY
            </div>
        )}
        {syncStatus?.status !== 'RUNNING' && syncHasMore?.hasMore && (
            <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-col gap-2">
                <div className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                    LeetCode still reports older pages after the last run. Continue from the saved offset.
                </div>
                <button
                    onClick={() => {
                        chrome.runtime.sendMessage({ 
                            action: "sync_history", 
                            username: username, 
                            startOffset: syncHasMore.nextOffset 
                        });
                        setSyncStatus({ status: 'RUNNING', message: 'Resuming older sync...', count: 0, subCount: 0 });
                    }}
                    className="w-full bg-zinc-800 hover:bg-zinc-800 text-zinc-200 hover:text-white font-semibold text-[10px] py-1.5 px-3 rounded border border-zinc-700 font-mono tracking-wider uppercase"
                >
                    Sync Older Submissions (Offset: {syncHasMore.nextOffset})
                </button>
            </div>
        )}
        {syncStatus?.status === 'ERROR' && (
            <div className="mt-3 text-[10px] text-red-400 font-mono text-center flex items-center justify-center gap-1.5 bg-red-950/20 border border-red-900/30 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                SYNC ERROR: {syncStatus.message?.toUpperCase()}
            </div>
        )}

        <div className="mt-3.5 pt-3.5 border-t border-zinc-800/50">
            <button
                onClick={handleExportData}
                disabled={exporting}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-zinc-700 font-mono tracking-wider uppercase"
            >
                {exporting ? "Exporting..." : "Export Vault Data (JSON)"}
            </button>
        </div>
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
              className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1 font-mono">Repository Path</label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo (e.g. Somnath0707/AlgoVault)"
              className="w-full bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#dfa054] focus:ring-1 focus:ring-[#dfa054]/20 transition-all font-mono"
            />
          </div>

          <button
            onClick={handleGithubSave}
            className="w-full bg-[#dfa054] hover:bg-[#e5b376] text-zinc-950 font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-[#dfa054]/20 font-mono tracking-wider uppercase mt-2"
          >
            {githubSaved ? "Saved ✔" : "Save Credentials"}
          </button>

          {gitSyncStatus && (
            <div className={`mt-3 p-3 rounded-lg border text-[10px] font-mono leading-relaxed ${
              gitSyncStatus.success 
                ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                : 'bg-red-950/20 border-red-900/30 text-red-400'
            }`}>
              <div className="font-bold uppercase mb-0.5">
                {gitSyncStatus.success ? "Last Sync Succeeded ✓" : "Sync Failed ✗"}
              </div>
              <div className="truncate">Problem: {gitSyncStatus.problem}</div>
              {gitSyncStatus.message && gitSyncStatus.message !== "Success" && (
                <div className="mt-0.5 text-zinc-400 break-all">Error: {gitSyncStatus.message}</div>
              )}
              <div className="text-zinc-600 mt-1.5 text-[8px] text-right">
                {new Date(gitSyncStatus.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
