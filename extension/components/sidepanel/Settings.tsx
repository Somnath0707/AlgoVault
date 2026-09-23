import React, { useEffect, useState } from "react"
import { Star, Bug, Settings2, RefreshCw, AlertTriangle, LockKeyhole, Globe2, CheckCircle2, XCircle } from "lucide-react"
import { Card } from "../ui/Card"
import {
  getUsername,
  setUsername as persistUsername,
  getGithubPat,
  setGithubPat as persistGithubPat,
  getGithubRepo,
  setGithubRepo as persistGithubRepo,
  getGithubUser,
  setGithubUser as persistGithubUser,
  getGithubBranch,
  setGithubBranch as persistGithubBranch,
  getGithubAutoSync,
  setGithubAutoSync as persistGithubAutoSync,
  clearGithubAuth,
  setJwtToken,
  clearJwtToken,
  getLastSync
} from "../../lib/storage"
import { fetchUserStatus } from "../../lib/api/leetcode"
import { getSettings, updateSettings, exportUserData, logout, authenticateGithubToken } from "../../lib/api/backend"
import {
  authenticateGithub,
  fetchUserGithubProfile,
  fetchUserGithubRepos,
  type GithubUser,
  type GithubRepoItem
} from "../../lib/api/github"
import { COMMUNITY_CONFIG } from "../../lib/community"

interface SyncStatus {
  message?: string;
  type?: "success" | "error" | "loading" | "info";
  status?: string;
  count?: number;
  subCount?: number;
  hasMore?: boolean;
  nextOffset?: number;
  success?: boolean;
  problem?: string;
  timestamp?: number;
}

export const Settings = () => {
  const [hideAccRate, setHideAccRate] = useState(true);
  const [celebrationOverlay, setCelebrationOverlay] = useState(true);
  const [celebrationSound, setCelebrationSound] = useState(true);
  const [celebrationTheme, setCelebrationTheme] = useState("gta");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [username, setUsername] = useState<string>('');
  const [activeLcUser, setActiveLcUser] = useState<string | null>(null);
  const [loadingActiveUser, setLoadingActiveUser] = useState<boolean>(true);

  // GitHub State
  const [githubPat, setGithubPat] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');
  const [githubBranch, setGithubBranch] = useState<string>('main');
  const [githubUser, setGithubUser] = useState<GithubUser | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepoItem[]>([]);
  const [authenticating, setAuthenticating] = useState<boolean>(false);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [manualPatMode, setManualPatMode] = useState<boolean>(false);
  const [manualPatInput, setManualPatInput] = useState<string>('');
  const [manualRepoInput, setManualRepoInput] = useState<string>('');
  const [githubSaved, setGithubSaved] = useState<boolean>(false);
  const [gitSyncStatus, setGitSyncStatus] = useState<SyncStatus | null>(null);
  const [githubAutoSync, setGithubAutoSyncState] = useState<boolean>(true);

  const [syncHasMore, setSyncHasMore] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
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
            }
          })
          .catch((e) => console.log("Failed to load settings from server:", e));
      }
    });

    getUsername().then((value) => setUsername(value || ""));
    getGithubRepo().then((value) => setGithubRepo(value || ""));
    getGithubBranch().then((value) => setGithubBranch(value || "main"));
    getGithubUser().then((val) => setGithubUser(val || null));
    getGithubAutoSync().then((val) => setGithubAutoSyncState(val));
    try {
      chrome.runtime.sendMessage({ action: "get_github_auto_sync" }, (res) => {
        if (res && res.enabled !== undefined) {
          setGithubAutoSyncState(res.enabled);
        }
      });
    } catch {}
    getLastSync().then(setLastSync).catch(() => setLastSync(null));

    // Load token and fetch repos/profile if present
    getGithubPat().then((token) => {
      if (token) {
        setGithubPat(token);
        // Refresh GitHub profile & repos non-destructively
        fetchUserGithubProfile(token).then(async (res) => {
          if (res.revoked) {
            setAuthError("GitHub token appears invalid or expired. You can reconnect below.");
            return;
          }
          if (res.ok && res.user) {
            setGithubUser(res.user);
            persistGithubUser(res.user);
          }
        });
        setLoadingRepos(true);
        fetchUserGithubRepos(token).then(async (res) => {
          if (res.ok) {
            setGithubRepos(res.repos);
          }
          setLoadingRepos(false);
        }).catch(() => {
          setLoadingRepos(false);
        });
      } else {
        setGithubUser(null);
      }
    });
    
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
      if (changes["algovault.github.pat"]) {
        const newPat = changes["algovault.github.pat"].newValue;
        if (!newPat) {
          setGithubPat('');
          setGithubUser(null);
          setGithubRepo('');
          setGithubRepos([]);
        } else {
          setGithubPat(newPat);
        }
      }
      if (changes["algovault.github.user"]) {
        setGithubUser(changes["algovault.github.user"].newValue || null);
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
      });
    };
    checkSync();
    const interval = setInterval(checkSync, 1000);
    return () => {
      clearInterval(interval);
      chrome.storage.onChanged.removeListener(gitListener);
    };
  }, []);

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

  const handleForceFullSync = () => {
    if (!username) {
        alert("Please enter a username first.");
        return;
    }
    chrome.runtime.sendMessage({ action: "sync_history", username, forceFullSync: true });
    setSyncStatus({ status: 'RUNNING', message: 'Starting clean full sync (fetching all history from scratch)...', count: 0, subCount: 0 });
  };

  const handleResetSyncCache = () => {
    chrome.runtime.sendMessage({ action: "reset_sync_state" }, () => {
      setSyncStatus({ status: 'INFO', message: 'Sync checkpoint reset. Ready for fresh sync.', count: 0, subCount: 0 });
    });
  };

  const handleStopSync = () => {
    chrome.runtime.sendMessage({ action: "stop_sync" });
  };

  const handleConnectGithub = async () => {
    setAuthenticating(true);
    setAuthError(null);
    try {
      const res = await authenticateGithub();
      if (res.ok && res.token && res.jwt) {
        await setJwtToken(res.jwt);
        setGithubPat(res.token);
        await persistGithubPat(res.token);
        
        // Fetch profile & repos
        const profileRes = await fetchUserGithubProfile(res.token);
        if (profileRes.ok && profileRes.user) {
          setGithubUser(profileRes.user);
          await persistGithubUser(profileRes.user);
        }
        setLoadingRepos(true);
        const reposRes = await fetchUserGithubRepos(res.token);
        if (reposRes.ok) {
          setGithubRepos(reposRes.repos);
        }
        setLoadingRepos(false);

        // Auto-select first repo if none selected yet
        if (!githubRepo && reposRes.ok && reposRes.repos.length > 0) {
          setGithubRepo(reposRes.repos[0].full_name);
          await persistGithubRepo(reposRes.repos[0].full_name);
          setGithubBranch(reposRes.repos[0].default_branch || "main");
          await persistGithubBranch(reposRes.repos[0].default_branch || "main");
        }

      } else {
        setAuthError(res.message || "OAuth authentication failed");
      }
    } catch (e: any) {
      setAuthError(e.message || "Failed to start GitHub authorization");
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDisconnectGithub = async () => {
    await logout().catch(() => undefined);
    await clearGithubAuth();
    setGithubPat('');
    setGithubUser(null);
    setGithubRepo('');
    setGithubBranch('main');
    setGithubRepos([]);
    setGitSyncStatus(null);
    setManualPatInput('');
    setManualRepoInput('');
    setAuthError(null);
  };

  const handleRepoChange = async (selected: string) => {
    setGithubRepo(selected);
    await persistGithubRepo(selected);

    // Find default branch for this repo
    const found = githubRepos.find(r => r.full_name.toLowerCase() === selected.toLowerCase());
    if (found && found.default_branch) {
      setGithubBranch(found.default_branch);
      await persistGithubBranch(found.default_branch);
    }

  };

  const handleBranchChange = async (branchVal: string) => {
    setGithubBranch(branchVal);
    await persistGithubBranch(branchVal);
  };

  const handleGithubSaveManual = async () => {
    const manualToken = manualPatInput.trim();
    if (!manualToken) {
      setAuthError("Enter a fine-grained GitHub token first.");
      return;
    }
    const repo = (manualRepoInput || githubRepo).trim();
    if (repo && !repo.includes('/')) {
      setAuthError("Repository path must be in 'owner/repo' format (e.g. your-username/problems).");
      return;
    }
    setAuthenticating(true);
    setAuthError(null);
    try {
      const auth = await authenticateGithubToken(manualToken);
      await setJwtToken(auth.token);
      await persistGithubPat(manualToken);
      setGithubPat(manualToken);

      if (repo) {
        await persistGithubRepo(repo);
        setGithubRepo(repo);
      }
      await persistGithubBranch(githubBranch.trim());
      
      const profileRes = await fetchUserGithubProfile(manualToken);
      if (profileRes.ok && profileRes.user) {
        setGithubUser(profileRes.user);
        await persistGithubUser(profileRes.user);
      } else if (profileRes.revoked) {
        setAuthError("Personal Access Token is invalid, revoked, or expired.");
        return;
      }
      const reposRes = await fetchUserGithubRepos(manualToken);
      if (reposRes.ok) {
        setGithubRepos(reposRes.repos);
      }

      setGithubSaved(true);
      setManualPatMode(false);
      setManualPatInput('');
      setManualRepoInput('');
      setTimeout(() => setGithubSaved(false), 2000);
    } catch (err: any) {
      setAuthError(err?.message || "Failed to verify GitHub token.");
    } finally {
      setAuthenticating(false);
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

  const toggleGithubAutoSync = async () => {
    const next = !githubAutoSync;
    setGithubAutoSyncState(next);
    await persistGithubAutoSync(next);
    try {
      chrome.runtime.sendMessage({ action: "set_github_auto_sync", enabled: next });
    } catch {}
  };

  const isConnected = Boolean(githubPat);

  return (
    <div className="grid gap-3.5">
      <header className="flex items-end justify-between border-b border-white/[0.08] pb-3 px-1">
        <div className="flex items-start gap-2.5"><div className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-400/20 bg-zinc-400/10 text-zinc-300"><Settings2 size={16} /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">Control room</p><h1 className="mt-0.5 text-base font-semibold tracking-tight text-zinc-100">Settings & sync</h1><p className="mt-0.5 text-[10px] text-zinc-500">Connection, history import, and local behavior.</p></div></div>
        {lastSync && <span className="mb-0.5 text-[9px] font-mono text-emerald-400">Synced</span>}
      </header>
      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Preferences</h3>

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Hide Acceptance Rate</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Hide the native LeetCode rate to mitigate performance anxiety</div>
            </div>
            <button
                onClick={toggleAccRate}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${hideAccRate ? 'bg-[#ffa116]' : 'bg-[#333333]'}`}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-[#1a1a1a] absolute top-0.5 transition-all ${hideAccRate ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>

        <div className="border-t border-white/[0.06] my-2.5" />

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Celebration Overlay</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Show custom theme meme card on solving problems</div>
            </div>
            <button
                onClick={toggleCelebrationOverlay}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${celebrationOverlay ? 'bg-[#ffa116]' : 'bg-[#333333]'}`}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-[#1a1a1a] absolute top-0.5 transition-all ${celebrationOverlay ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>

        <div className="border-t border-white/[0.06] my-2.5" />

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Celebration Sound</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Play victory/defeat audio themes on submissions</div>
            </div>
            <button
                onClick={toggleCelebrationSound}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${celebrationSound ? 'bg-[#ffa116]' : 'bg-[#333333]'}`}
            >
                <div className={`w-3.5 h-3.5 rounded-full bg-[#1a1a1a] absolute top-0.5 transition-all ${celebrationSound ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>

        <div className="border-t border-white/[0.06] my-2.5" />

        <div className="flex justify-between items-center py-1">
            <div>
                <div className="text-xs font-medium text-zinc-200">Celebration Theme</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed font-mono">Choose Grand Theft Auto or Minecraft style</div>
            </div>
            <select
                value={celebrationTheme}
                onChange={handleThemeChange}
                className="bg-[#1a1a1a] border border-white/[0.08] rounded px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-[#ffa116]"
            >
                <option value="gta">Grand Theft Auto</option>
                <option value="minecraft">Minecraft</option>
            </select>
        </div>

        <div className="mt-3.5 pt-3.5 border-t border-white/[0.06]">
            <button
                onClick={handleSyncSettings}
                className="w-full bg-[#333333] hover:bg-[#3a3a3a] text-zinc-200 hover:text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-white/[0.08] font-mono tracking-wider uppercase"
            >
                {settingsSynced ? "Synced to Server" : "Sync Settings to Server"}
            </button>
        </div>
      </Card>

      <Card className="p-3.5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Data Synchronization</h3>
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mb-3.5">
            AlgoVault imports history in safe batches of up to 400 submissions, then keeps new submissions up to date.
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
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ffa116] focus:ring-1 focus:ring-[#ffa116]/20 transition-all"
            />
            {!loadingActiveUser && activeLcUser && username && activeLcUser.toLowerCase() !== username.trim().toLowerCase() && (
              <div className="text-[9px] text-amber-500 mt-1 font-mono">
                <AlertTriangle size={10} className="mr-1 inline text-amber-400" /> Click <span className="underline cursor-pointer text-[#ffa116] hover:text-white" onClick={() => { setUsername(activeLcUser); persistUsername(activeLcUser); }}>here</span> to align with logged-in user: "{activeLcUser}".
              </div>
            )}
            {!loadingActiveUser && !activeLcUser && (
              <div className="text-[9px] text-amber-500 mt-1 font-mono">
                <AlertTriangle size={10} className="mr-1 inline text-amber-400" /> Log in to LeetCode.com in your browser before running a sync.
              </div>
            )}
        </div>

        {syncStatus?.status === 'RUNNING' ? (
            <div className="bg-[#1a1a1a] border border-white/[0.08] p-3 rounded-lg font-mono text-[10px] text-zinc-400">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-white/[0.06]">
                    <span className="text-[#ffa116] animate-pulse">SYNCHRONIZING LOGGER</span>
                    <div className="flex items-center gap-2">
                        <button onClick={handleStopSync} className="text-red-400 hover:text-red-300 uppercase tracking-widest text-[9px] border border-red-900/50 bg-red-950/30 px-2 py-0.5 rounded transition-colors cursor-pointer">Stop</button>
                        <div className="w-3.5 h-3.5 rounded-full border border-[#ffa116] border-t-transparent animate-spin" />
                    </div>
                </div>
                <div className="space-y-1">
                  <div className="text-zinc-200">{syncStatus.message}</div>
                  {syncStatus.count ? <div>Solved Problems: {syncStatus.count}</div> : null}
                  {syncStatus.subCount ? <div>Submissions Processed: {syncStatus.subCount}</div> : null}
                </div>
            </div>
        ) : (
            <button
                onClick={handleSync}
                className="w-full bg-[#ffa116] hover:bg-[#ffa116]/90 text-[#1a1a1a] font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-[#ffa116]/20 font-mono tracking-wider uppercase cursor-pointer"
            >
                <RefreshCw size={12} className="inline mr-1.5" /> Quick Sync / Incremental Refresh
            </button>
        )}

        {syncStatus?.status !== 'RUNNING' && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={handleForceFullSync}
              className="flex-1 bg-[#1a1a1a] hover:bg-[#333333] text-zinc-300 hover:text-white font-mono text-[10px] py-1.5 px-3 rounded-lg border border-white/[0.08] transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              title="Pulls all historical submissions from scratch, ignoring cached checkpoints"
            >
              <span className="flex items-center gap-1"><RefreshCw size={11} /> Force Full Re-Sync</span>
            </button>
            <button
              onClick={handleResetSyncCache}
              className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#333333] text-zinc-400 hover:text-zinc-200 font-mono text-[10px] rounded-lg border border-white/[0.08] transition-colors cursor-pointer"
              title="Reset sync checkpoint if data was wiped on server"
            >
              Reset Cache
            </button>
          </div>
        )}

        {syncStatus?.status === 'SUCCESS' && (
            <div className="mt-3 text-[10px] text-[#00b8a3] font-mono text-center flex items-center justify-center gap-1.5 bg-[#00b8a3]/10 border border-[#00b8a3]/20 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00b8a3]"></span>
                SYNC COMPLETED SUCCESSFULLY
            </div>
        )}
        {syncStatus?.status !== 'RUNNING' && (syncHasMore as any)?.hasMore && (
            <div className="mt-3 p-3 bg-[#1a1a1a] border border-white/[0.08] rounded-lg flex flex-col gap-2">
                <div className="text-[10px] text-zinc-400 font-mono leading-relaxed">
                    LeetCode still reports older pages after the last run. Continue from the saved offset.
                </div>
                <button
                    onClick={() => {
                        chrome.runtime.sendMessage({ 
                            action: "sync_history", 
                            username: username, 
                            startOffset: (syncHasMore as any).nextOffset 
                        });
                        setSyncStatus({ status: 'RUNNING', message: 'Resuming older sync...', count: 0, subCount: 0 });
                    }}
                    className="w-full bg-[#333333] hover:bg-[#3a3a3a] text-zinc-200 hover:text-white font-semibold text-[10px] py-1.5 px-3 rounded border border-white/[0.08] font-mono tracking-wider uppercase"
                >
                    Sync next history batch (starting at {((syncHasMore as any).nextOffset || 0) + 1})
                </button>
            </div>
        )}
        {syncStatus?.status === 'ERROR' && (
            <div className="mt-3 text-[10px] text-red-400 font-mono text-center flex items-center justify-center gap-1.5 bg-red-950/20 border border-red-900/30 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                SYNC ERROR: {syncStatus.message?.toUpperCase()}
            </div>
        )}

        <div className="mt-3.5 pt-3.5 border-t border-white/[0.06]">
            <button
                onClick={handleExportData}
                disabled={exporting}
                className="w-full bg-[#333333] hover:bg-[#3a3a3a] text-zinc-200 hover:text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-white/[0.08] font-mono tracking-wider uppercase"
            >
                {exporting ? "Exporting..." : "Export Vault Data (JSON)"}
            </button>
        </div>
      </Card>

      {/* GitHub Integration Section */}
      <Card className="p-3.5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">GitHub Synchronization</h3>
          {isConnected && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Connected
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-500 font-mono leading-relaxed mb-3.5">
          Automatically sync your accepted LeetCode solutions to your personal GitHub repository.
        </p>

        {/* Connected View */}
        {isConnected && (
          <div className="space-y-3">
            {/* Account Profile Header */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.08] bg-[#1a1a1a]">
              <div className="flex items-center gap-2.5">
                {githubUser?.avatar_url ? (
                  <img src={githubUser.avatar_url} alt={githubUser.login} className="w-7 h-7 rounded-full border border-white/[0.1]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#333333] border border-white/[0.1] flex items-center justify-center text-xs text-zinc-300 font-mono font-bold">
                    {githubUser?.login?.charAt(0)?.toUpperCase() || "G"}
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    {githubUser?.name || githubUser?.login || "GitHub User"}
                    {githubUser?.html_url && (
                      <a href={githubUser.html_url} target="_blank" rel="noreferrer" className="text-[10px] text-zinc-500 hover:text-[#ffa116]">
                        @{githubUser.login}
                      </a>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono">
                    {githubUser?.login ? `Connected as @${githubUser.login}` : "GitHub Synchronization Active"}
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnectGithub}
                className="text-[10px] font-mono text-zinc-400 hover:text-red-400 bg-[#282828] hover:bg-[#333333] border border-white/[0.08] px-2.5 py-1 rounded transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Repository Selector */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 font-mono flex justify-between items-center">
                <span>Target Repository</span>
                {loadingRepos && <span className="text-[9px] text-sky-400 animate-pulse font-mono">Loading repos...</span>}
              </label>
              
              {githubRepos.length > 0 ? (
                <select
                  value={githubRepo}
                  onChange={(e) => void handleRepoChange(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#ffa116] transition-all font-mono"
                >
                  <option value="" disabled>-- Select a Repository --</option>
                  {githubRepos.map((repo) => (
                    <option key={repo.full_name} value={repo.full_name}>
                      <span className="inline-flex items-center gap-1">{repo.full_name} {repo.private ? <LockKeyhole size={10} className="text-amber-400" /> : <Globe2 size={10} className="text-sky-400" />}</span>
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => handleRepoChange(e.target.value)}
                  placeholder="owner/repo (e.g. username/problems)"
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ffa116] transition-all font-mono"
                />
              )}
              {githubRepo && !githubRepo.includes('/') && (
                <p className="mt-1 text-[9px] text-amber-400 font-mono">
                  ⚠️ Must include your username: e.g. <span className="underline font-bold">your-username/{githubRepo}</span>
                </p>
              )}
            </div>

            {/* Branch Selector */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1 font-mono">Target Branch</label>
              <input
                type="text"
                value={githubBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                placeholder="main"
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ffa116] transition-all font-mono"
              />
            </div>

            {/* Auto-Sync Toggle */}
            <div className="flex justify-between items-center p-2.5 rounded-lg border border-white/[0.08] bg-[#1a1a1a] mt-1">
              <div>
                <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                  <span>Auto-Sync Solutions</span>
                  <span className={`text-[8px] font-mono font-semibold px-1.5 py-0.2 rounded ${githubAutoSync ? 'bg-[#00b8a3]/15 text-[#00b8a3] border border-[#00b8a3]/30' : 'bg-[#333333] text-zinc-400'}`}>
                    {githubAutoSync ? 'ENABLED' : 'PAUSED'}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 leading-relaxed">
                  Automatically push accepted solutions & complexity stats to GitHub
                </div>
              </div>
              <button
                onClick={toggleGithubAutoSync}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${githubAutoSync ? 'bg-[#ffa116]' : 'bg-[#333333]'}`}
                title={githubAutoSync ? "Pause Auto-Sync" : "Enable Auto-Sync"}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-[#1a1a1a] absolute top-0.5 transition-all ${githubAutoSync ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Not Connected View */}
        {!isConnected && (
          <div className="space-y-3">
            {!manualPatMode ? (
              <div>
                <button
                  onClick={handleConnectGithub}
                  disabled={authenticating}
                  className="w-full bg-[#ffa116] hover:bg-[#ffa116]/90 text-[#1a1a1a] font-semibold text-xs py-2.5 px-4 rounded-lg transition-all border border-[#ffa116]/20 font-mono tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {authenticating ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1a1a1a] border-t-transparent animate-spin" />
                      Authorizing with GitHub...
                    </>
                  ) : (
                    <>
                      Connect GitHub Account (OAuth)
                    </>
                  )}
                </button>
                <p className="mt-2 text-[9px] text-zinc-500 font-mono leading-relaxed">
                  OAuth can write only public repositories. For a private repo, use a fine-grained PAT restricted to that repo.
                </p>
                <div className="mt-2.5 text-center">
                  <button
                    onClick={() => { setManualPatMode(true); setAuthError(null); }}
                    className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                  >
                    Or use manual Personal Access Token (PAT)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-lg border border-white/[0.08] bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-zinc-400">Fine-grained PAT (private repo)</span>
                  <button onClick={() => { setManualPatMode(false); setAuthError(null); }} className="text-[9px] font-mono text-[#ffa116] hover:underline">Use 1-Click OAuth</button>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 font-mono">Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    value={manualPatInput}
                    onChange={(e) => setManualPatInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#282828] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ffa116] transition-all font-mono"
                  />
                  <p className="mt-1 text-[9px] text-zinc-500 font-mono">Generate a token with repo (Contents: Read and write) permissions.</p>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1 font-mono">Repository Path</label>
                  <input
                    type="text"
                    value={manualRepoInput}
                    onChange={(e) => setManualRepoInput(e.target.value)}
                    placeholder="owner/repo (e.g. username/problems)"
                    className="w-full bg-[#282828] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ffa116] transition-all font-mono"
                  />
                  <p className="mt-1 text-[9px] text-zinc-500 font-mono">Must be in owner/repo format (e.g. your-github-username/problems).</p>
                </div>
                <button
                  onClick={handleGithubSaveManual}
                  disabled={authenticating}
                  className="w-full bg-[#333333] hover:bg-[#3a3a3a] text-zinc-200 font-semibold text-xs py-2 px-4 rounded-lg transition-colors border border-white/[0.08] font-mono tracking-wider uppercase disabled:opacity-50"
                >
                  <span className="flex items-center justify-center gap-1.5">{authenticating ? "Validating Token..." : (githubSaved ? <> <CheckCircle2 size={13} /> Saved </> : "Save Credentials")}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {authError && (
          <div className="mt-3 text-[10px] text-red-400 font-mono bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg">
            <span className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {authError}</span>
          </div>
        )}

        {/* Last Sync Status Box */}
        {gitSyncStatus && (
          <div className={`mt-3.5 p-3 rounded-lg border text-[10px] font-mono leading-relaxed ${
            gitSyncStatus.success 
              ? 'bg-[#00b8a3]/10 border-[#00b8a3]/20 text-[#00b8a3]' 
              : 'bg-red-950/20 border-red-900/30 text-red-400'
          }`}>
            <div className="font-bold uppercase mb-0.5 flex justify-between items-center">
              <span className="flex items-center gap-1.5">{gitSyncStatus.success ? <CheckCircle2 size={13} /> : <XCircle size={13} />}{gitSyncStatus.success ? "Last Sync Succeeded" : "Sync Failed"}</span>
              {gitSyncStatus.message && (
                <span className="text-[9px] font-normal text-zinc-400">[{gitSyncStatus.message}]</span>
              )}
            </div>
            <div className="truncate text-zinc-200">Problem: {gitSyncStatus.problem}</div>
            {gitSyncStatus.timestamp && (
              <div className="text-zinc-600 mt-1 text-[8px] text-right">
                {new Date(gitSyncStatus.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ─── ABOUT & OPEN SOURCE ─────────────────────────── */}
      <Card className="p-3.5 rounded-lg border border-white/[0.08] bg-[#282828]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-200">AlgoVault</span>
            <span className="text-[9px] font-mono text-zinc-500">{COMMUNITY_CONFIG.VERSION}</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Made with joy by{" "}
            <a
              href={COMMUNITY_CONFIG.AUTHOR_URL}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {COMMUNITY_CONFIG.AUTHOR_HANDLE}
            </a>
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed mb-3 font-sans">
          If AlgoVault helps your problem solving, consider supporting the project with a star on GitHub.
        </p>
        <div className="flex items-center gap-2">
          <a
            href={COMMUNITY_CONFIG.STAR_URL}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#1a1a1a] hover:bg-[#333333] border border-white/[0.08] text-zinc-300 hover:text-[#ffa116] text-[11px] font-medium transition-all font-mono"
          >
            <Star size={11} className="text-[#ffa116]" /> Star on GitHub
          </a>
          <a
            href={COMMUNITY_CONFIG.ISSUES_URL}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#1a1a1a] hover:bg-[#333333] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-all font-mono"
          >
            <Bug size={11} /> Report Issue
          </a>
        </div>
      </Card>
    </div>
  );
};
