import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"

export const Settings = () => {
  const [hideAccRate, setHideAccRate] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  useEffect(() => {
    chrome.storage.sync.get(['hideAcceptanceRate'], (res) => {
      if (res.hideAcceptanceRate !== undefined) setHideAccRate(res.hideAcceptanceRate);
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

  const handleSync = () => {
    // Note: The username should be retrieved from storage or injected script
    // For this prototype, we'll hardcode or pull from a known source
    chrome.storage.sync.get(['lcUsername'], (res) => {
        const username = res.lcUsername || 'Som_07'; // Fallback
        chrome.runtime.sendMessage({ action: "sync_history", username });
        setSyncStatus({ status: 'RUNNING', message: 'Starting sync...', count: 0, subCount: 0 });
    });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <h3 className="text-sm font-semibold mb-4 text-white">Preferences</h3>
        
        <div className="flex justify-between items-center py-2 border-b border-white/5">
            <div>
                <div className="text-sm text-gray-200">Hide Acceptance Rate</div>
                <div className="text-xs text-gray-500">Hide the native LC acceptance rate to avoid intimidation</div>
            </div>
            <button 
                onClick={toggleAccRate}
                className={`w-10 h-5 rounded-full relative transition-colors ${hideAccRate ? 'bg-[#00d4aa]' : 'bg-gray-600'}`}
            >
                <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-all ${hideAccRate ? 'right-1' : 'left-1'}`} />
            </button>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold mb-4 text-white">Data Synchronization</h3>
        <p className="text-xs text-gray-400 mb-4">
            AlgoVault requires your full LeetCode history to build accurate analytics. Syncing fetches your submissions, problem tags, and contest history directly from LeetCode.
        </p>
        
        {syncStatus?.status === 'RUNNING' ? (
            <div className="bg-black/30 p-4 rounded-md border border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#00d4aa] animate-pulse">Syncing in progress...</span>
                    <div className="w-4 h-4 rounded-full border-2 border-[#00d4aa] border-t-transparent animate-spin" />
                </div>
                <div className="text-xs text-gray-400 font-mono">
                    <div>{syncStatus.message}</div>
                    <div className="mt-1 flex justify-between">
                        <span>Problems: {syncStatus.count || 0}</span>
                        <span>Submissions: {syncStatus.subCount || 0}</span>
                    </div>
                </div>
            </div>
        ) : (
            <button 
                onClick={handleSync}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm py-2 px-4 rounded transition-colors border border-white/10"
            >
                Sync Now
            </button>
        )}
        
        {syncStatus?.status === 'SUCCESS' && (
            <div className="mt-3 text-xs text-green-400 text-center">Sync completed successfully!</div>
        )}
        {syncStatus?.status === 'ERROR' && (
            <div className="mt-3 text-xs text-red-400 text-center">{syncStatus.message}</div>
        )}
      </Card>
    </div>
  )
}
