import type { PlasmoMessaging } from "@plasmohq/messaging"
import { 
  fetchUserProfile, 
  fetchSolvedProblems, 
  fetchAllSubmissions,
  fetchContestHistory 
} from "../../lib/api/leetcode"
import { BACKEND_URL } from "../../lib/constants"

const setStatus = (status: string, message: string, count: number = 0, subCount: number = 0) => {
    chrome.storage.local.set({ syncStatus: { status, message, count, subCount }});
};

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { action, username } = req.body || {}

  if (action === "sync_history" && username) {
    console.log(`Starting LeetCode history sync for user: ${username}`)
    setStatus('RUNNING', 'Fetching profile...', 0, 0);
    
    try {
      const profileData = await fetchUserProfile(username);
      const totalSolved = profileData.data?.matchedUser?.submitStats?.acSubmissionNum?.find((s: any) => s.difficulty === "All")?.count || 0;
      
      const solvedProblems = [];
      let problemSkip = 0;
      const problemLimit = 50;
      
      while (problemSkip < totalSolved) {
        setStatus('RUNNING', `Fetching problems (${problemSkip}/${totalSolved})...`, solvedProblems.length, 0);
        const problemData = await fetchSolvedProblems(problemSkip, problemLimit);
        const questions = problemData.data?.problemsetQuestionList?.questions || [];
        solvedProblems.push(...questions);
        problemSkip += problemLimit;
        await new Promise(r => setTimeout(r, 500));
      }

      const submissions = [];
      let subOffset = 0;
      const subLimit = 20; 
      let hasNext = true;
      const MAX_SUBMISSIONS_FETCH = 2000; 

      while (hasNext && submissions.length < MAX_SUBMISSIONS_FETCH) {
        setStatus('RUNNING', `Fetching historical submissions...`, solvedProblems.length, submissions.length);
        const subData = await fetchAllSubmissions(subOffset, subLimit);
        const subList = subData.submissions_dump;
        if (subList && subList.length > 0) {
          // Map REST response format to our expected format
          const mapped = subList.map((s: any) => ({
            id: s.id,
            title: s.title,
            titleSlug: s.title_slug,
            statusDisplay: s.status_display,
            lang: s.lang,
            timestamp: s.timestamp.toString(),
          }));
          submissions.push(...mapped);
          hasNext = subData.has_next;
          subOffset += subLimit;
        } else {
          hasNext = false;
        }
        await new Promise(r => setTimeout(r, 500));
      }

      setStatus('RUNNING', 'Fetching contest history...', solvedProblems.length, submissions.length);
      const contestData = await fetchContestHistory(username);
      const contestHistory = contestData.data?.userContestRankingHistory || [];
      const contestRanking = contestData.data?.userContestRanking;

      setStatus('RUNNING', 'Pushing data to AlgoVault backend...', solvedProblems.length, submissions.length);
      const payload = {
        username: username,
        profile: profileData.data?.matchedUser?.profile,
        solvedProblems: solvedProblems,
        submissions: submissions,
        contestRanking: contestRanking,
        contestHistory: contestHistory
      };

      const backendResponse = await fetch(`${BACKEND_URL}/api/sync/leetcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!backendResponse.ok) {
        throw new Error(`Backend rejected sync payload: ${backendResponse.status}`);
      }

      setStatus('SUCCESS', 'Data synced successfully!', solvedProblems.length, submissions.length);
      res.send({ status: "success", count: solvedProblems.length, subCount: submissions.length });

    } catch (error) {
      console.error("Sync failed:", error);
      setStatus('ERROR', `Sync failed: ${error.toString()}`);
      res.send({ status: "error", message: error.toString() });
    }
  } else {
    res.send({ error: "Unknown action or missing username" });
  }
}

export default handler
