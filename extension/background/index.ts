import { fetchUserProfile, fetchSolvedProblems, fetchAllSubmissions, fetchContestHistory } from "../lib/api/leetcode"

export {}

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open_side_panel" && sender.tab) {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }

  if (message.action === "get_prediction") {
    // 1L is temporary for testing without auth
    fetch(`http://localhost:8080/api/predictions/${message.slug}?userId=1`)
      .then(res => {
          if (!res.ok) throw new Error("Failed to fetch prediction");
          return res.json();
      })
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open
  }

  if (message.action === "sync_history") {
    runSync(message.username).catch(console.error);
    return true;
  }

  if (message.action === "get_zerotrac") {
    fetch("https://zerotrac.github.io/leetcode_problem_rating/data.json")
      .then(res => res.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function runSync(username: string) {
    const updateStatus = (status: string, msg: string, count = 0, subCount = 0) => {
        chrome.storage.local.set({ syncStatus: { status, message: msg, count, subCount } });
    };

    try {
        updateStatus("RUNNING", "Fetching user profile...");
        const profileRes = await fetchUserProfile(username);
        if (!profileRes.data?.matchedUser) throw new Error("User not found on LeetCode");
        const profile = profileRes.data.matchedUser;

        updateStatus("RUNNING", "Fetching solved problems...", 0, 0);
        // LeetCode's API returns all solved problems if limit is large enough
        const problemsRes = await fetchSolvedProblems(0, 5000);
        const problems = problemsRes.data?.problemsetQuestionList?.questions || [];

        updateStatus("RUNNING", "Fetching submissions...", problems.length, 0);
        const subsRes = await fetchAllSubmissions(0, 2000);
        const rawSubs = subsRes.submissions_dump || [];
        const submissions = rawSubs.map((s: any) => ({
            id: s.id,
            title: s.title,
            titleSlug: s.title_slug,
            statusDisplay: s.status_display,
            lang: s.lang,
            timestamp: s.timestamp.toString(),
        }));

        updateStatus("RUNNING", "Fetching contest history...", problems.length, submissions.length);
        const contestRes = await fetchContestHistory(username);
        const contestHistory = contestRes.data?.userContestRankingHistory || [];
        const contestRanking = contestRes.data?.userContestRanking || null;

        updateStatus("RUNNING", "Pushing to AlgoVault backend...", problems.length, submissions.length);

        const payload = {
            username: username,
            profile: profile.profile,
            solvedProblems: problems,
            submissions: submissions,
            contestHistory: contestHistory,
            contestRanking: contestRanking
        };

        const response = await fetch("http://localhost:8080/api/sync/leetcode", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Backend sync failed: ${errBody}`);
        }

        updateStatus("SUCCESS", "Sync completed successfully!", problems.length, submissions.length);
    } catch (e: any) {
        console.error("Sync Error:", e);
        updateStatus("ERROR", e.message || "An unknown error occurred during sync");
    }
}
