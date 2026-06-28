import React, { useEffect, useState } from "react"
import { Card } from "../ui/Card"
import { fetchContests } from "../../lib/api/backend"

import { getUsername, getCachedContests, setCachedContests } from "../../lib/storage"

export const Contest = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Try to load from cache
    getCachedContests().then((cached) => {
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    });

    // 2. Fetch in background
    fetchContests().then(async (backendData) => {
      const username = await getUsername();
      if (!username) {
        setData(backendData);
        setCachedContests(backendData);
        setLoading(false);
        return;
      }

      const formattedBackend = backendData.map((c: any) => {
        const slug = c.contestTitle.toLowerCase().replace(/ /g, '-');
        return {
          ...c,
          contestSlug: slug,
          predictedDelta: null
        };
      });

      const merged = [...formattedBackend];
      const backendSlugs = new Set(formattedBackend.map((c: any) => c.contestSlug));

      try {
        const ehRes: any = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            action: "get_entranthub_history",
            payload: { username }
          }, resolve);
        });

        if (ehRes && ehRes.ok && Array.isArray(ehRes.data)) {
          for (const item of ehRes.data) {
            const ehSlug = (item.contestSlug || item.titleSlug || item.slug || (item.contest && (item.contest.titleSlug || item.contest.slug)) || "").toLowerCase().replace(/ /g, '-');
            if (!ehSlug) continue;

            const ehTitle = item.contestTitle || item.title || item.contestName || (item.contest && (item.contest.title || item.contest.name)) || ehSlug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
            const ehRank = item.rank ?? item.ranking ?? null;
            const ehSolved = item.problemsSolved ?? item.solved ?? item.score ?? 0;
            const ehTotal = item.totalProblems ?? item.total ?? 4;

            let ehDate = null;
            if (item.contestDate) {
              ehDate = item.contestDate;
            } else if (item.date) {
              ehDate = item.date;
            } else if (item.contest && item.contest.startTime) {
              ehDate = new Date(item.contest.startTime * 1000).toISOString();
            } else if (item.contest && item.contest.date) {
              ehDate = item.contest.date;
            }

            let ehDelta = null;
            if (typeof item.delta === 'number') {
              ehDelta = item.delta;
            } else if (typeof item.ratingChange === 'number') {
              ehDelta = item.ratingChange;
            } else if (typeof item.predictedDelta === 'number') {
              ehDelta = item.predictedDelta;
            } else if (item.ratings && Array.isArray(item.ratings) && item.ratings.length >= 2) {
              ehDelta = item.ratings[item.ratings.length - 1] - item.ratings[0];
            } else if (item.predictedRating && item.currentRating) {
              ehDelta = item.predictedRating - item.currentRating;
            }

            let ehPredictedRating = item.predictedRating ?? item.newRating ?? null;
            let ehOldRating = item.currentRating ?? item.oldRating ?? null;
            if (ehPredictedRating === null && ehDelta !== null) {
              const baseRating = ehOldRating ?? 1500;
              ehPredictedRating = baseRating + ehDelta;
            }

            if (backendSlugs.has(ehSlug)) {
              const existing = merged.find((c: any) => c.contestSlug === ehSlug);
              if (existing) {
                if ((!existing.ratingDelta || existing.ratingDelta === 0) && ehDelta !== null) {
                  existing.predictedDelta = ehDelta;
                }
                if (!existing.ratingAfter && ehPredictedRating) {
                  existing.ratingAfter = ehPredictedRating;
                }
                if (!existing.ratingBefore && ehOldRating) {
                  existing.ratingBefore = ehOldRating;
                }
              }
            } else {
              merged.push({
                contestTitle: ehTitle,
                contestSlug: ehSlug,
                rank: ehRank,
                problemsSolved: ehSolved,
                totalProblems: ehTotal,
                ratingDelta: null,
                predictedDelta: ehDelta,
                contestDate: ehDate,
                ratingBefore: ehOldRating,
                ratingAfter: ehPredictedRating,
                finishTimeMinutes: null,
                panicIndex: "Unknown",
                chokingIndex: "Unknown",
                isUnofficial: true
              });
              backendSlugs.add(ehSlug);
            }
          }
        }
      } catch (e) {
        console.error("Failed to merge EntrantHub history in side panel", e);
      }

      // Sort merged contests descending by date or slug order
      merged.sort((a, b) => {
        const timeA = a.contestDate ? new Date(a.contestDate).getTime() : 0;
        const timeB = b.contestDate ? new Date(b.contestDate).getTime() : 0;
        if (timeA && timeB) {
          return timeB - timeA;
        }
        const getContestVal = (slug: string) => {
          const weeklyMatch = slug ? slug.match(/weekly-contest-(\d+)/) : null;
          if (weeklyMatch) return parseInt(weeklyMatch[1]) * 2;
          const biweeklyMatch = slug ? slug.match(/biweekly-contest-(\d+)/) : null;
          if (biweeklyMatch) return parseInt(biweeklyMatch[1]) * 2.8;
          return 0;
        };
        return getContestVal(b.contestSlug) - getContestVal(a.contestSlug);
      });

      // Try fallback predictions fetch for remaining unpredicted items
      const enhanced = await Promise.all(merged.map(async (c: any) => {
        if ((c.ratingDelta === null || c.ratingDelta === 0) && c.predictedDelta === null) {
          try {
            const predRes: any = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                action: "get_entranthub_prediction",
                payload: { contestSlug: c.contestSlug, username }
              }, resolve);
            });
            if (predRes && predRes.ok && predRes.data) {
              const ehData = predRes.data;
              let predictedDelta = null;
              if (ehData) {
                if (typeof ehData.delta === 'number') {
                  predictedDelta = ehData.delta;
                } else if (typeof ehData.ratingChange === 'number') {
                  predictedDelta = ehData.ratingChange;
                } else if (typeof ehData.predictedDelta === 'number') {
                  predictedDelta = ehData.predictedDelta;
                } else if (ehData.ratings && Array.isArray(ehData.ratings) && ehData.ratings.length >= 2) {
                  predictedDelta = ehData.ratings[ehData.ratings.length - 1] - ehData.ratings[0];
                } else if (ehData.predictedRating && ehData.currentRating) {
                  predictedDelta = ehData.predictedRating - ehData.currentRating;
                }
              }
              if (predictedDelta !== null) {
                c.predictedDelta = predictedDelta;
              }
            }
          } catch (e) {
            console.error("Failed to fetch fallback prediction in sidepanel", e);
          }
        }
        return c;
      }));

      setData(enhanced);
      setCachedContests(enhanced);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-center text-av-text-secondary text-sm">Loading contest statistics...</div>;

  const officialContests = data.filter(c => !c.isUnofficial && c.finishTimeMinutes != null);
  const avgFinish = officialContests.length ? Math.round(officialContests.reduce((a, c) => a + (c.finishTimeMinutes || 0), 0) / officialContests.length) : 0;
  
  const contestWithPanic = data.find(c => c.panicIndex && c.panicIndex !== 'Unknown');
  const recentPanic = contestWithPanic ? contestWithPanic.panicIndex : "Unknown";
  
  const contestWithChoking = data.find(c => c.chokingIndex && c.chokingIndex !== 'Unknown');
  const recentChoking = contestWithChoking ? contestWithChoking.chokingIndex : "Unknown";

  const getPanicColor = (v: string) => v === 'High' ? 'text-red-400' : (v === 'Medium' ? 'text-yellow-400' : 'text-green-400');
  const getChokingColor = (v: string) => v === 'High' ? 'text-red-400' : (v === 'Medium' ? 'text-yellow-400' : 'text-green-400');

  return (
    <div className="grid gap-3.5">
      <Card className="p-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Average Finish Time</h3>
        <div className="text-2xl font-extrabold text-zinc-100 font-mono tabular-nums">{avgFinish} <span className="text-xs text-zinc-500 font-normal font-sans">mins</span></div>
      </Card>
      
      <div className="grid grid-cols-2 gap-3.5">
        <Card className="p-3">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Panic Index</h3>
          <div className={`text-sm font-bold font-mono ${
            recentPanic === 'High' ? 'text-[#ef4444]' : recentPanic === 'Medium' ? 'text-[#dfa054]' : 'text-[#10b981]'
          }`}>{recentPanic}</div>
        </Card>
        <Card className="p-3">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Choking Index</h3>
          <div className={`text-sm font-bold font-mono ${
            recentChoking === 'High' ? 'text-[#ef4444]' : recentChoking === 'Medium' ? 'text-[#dfa054]' : 'text-[#10b981]'
          }`}>{recentChoking}</div>
        </Card>
      </div>

      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-2">Contest History</h3>
      <div className="flex flex-col gap-2">
        {data.map((c, i) => {
          const delta = c.ratingDelta ?? c.predictedDelta;
          const isPending = delta == null;
          const isPositive = delta > 0;

          let ratingDisplay = "";
          if (!isPending) {
            const finalRating = c.ratingAfter || (c.ratingBefore ? c.ratingBefore + delta : null);
            if (finalRating) {
              ratingDisplay = `${Math.round(finalRating)} (${isPositive ? '+' : ''}${Math.round(delta)})`;
            } else {
              ratingDisplay = `${isPositive ? '+' : ''}${Math.round(delta)}`;
            }
          } else {
            ratingDisplay = "Pending";
          }

          return (
            <Card key={i} className="py-2.5 px-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs text-zinc-200 truncate pr-2">{c.contestTitle}</span>
                <span className={`font-bold text-xs font-mono tabular-nums ${
                  isPending ? 'text-zinc-500' : isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'
                }`}>
                  {c.predictedDelta != null && (c.ratingDelta == null || c.ratingDelta === 0) ? (
                    <span className="text-zinc-500 text-[10px] mr-1 font-sans font-normal">Est:</span>
                  ) : null}
                  {ratingDisplay}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                <span>Rank: <span className="text-zinc-300 tabular-nums">{c.rank || "n/a"}</span></span>
                <span>{c.problemsSolved ?? 0}/{c.totalProblems ?? "?"} Solved</span>
                <span>{c.finishTimeMinutes != null ? `${Math.round(c.finishTimeMinutes)}m` : "Time n/a"}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  )
}
