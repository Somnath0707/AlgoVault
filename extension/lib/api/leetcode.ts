import { LEETCODE_GRAPHQL_URL } from "../constants"

export const fetchGraphQL = async (query: string, variables: any = {}) => {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://leetcode.com',
      'Referer': 'https://leetcode.com/',
    },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });
  
  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
  }
  
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error: any) => error.message).join("; "));
  }
  return payload;
};

export const fetchUserProfile = async (username: string) => {
  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          userAvatar
          ranking
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;
  return fetchGraphQL(query, { username });
};

export const fetchUserStatus = async () => {
  const query = `
    query globalData {
      userStatus {
        isSignedIn
        username
      }
    }
  `;
  return fetchGraphQL(query);
};

export const fetchSolvedProblems = async (skip: number, limit: number) => {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        totalNum
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          topicTags {
            name
            id
            slug
          }
        }
      }
    }
  `;
  return fetchGraphQL(query, { categorySlug: "", skip, limit, filters: { status: "AC" } });
};

export const fetchProblemMetadata = async (titleSlugs: string[]) => {
  if (titleSlugs.length === 0) return [];

  const aliases = titleSlugs.map((slug, index) => `
    q${index}: question(titleSlug: ${JSON.stringify(slug)}) {
      frontendQuestionId: questionFrontendId
      title
      titleSlug
      difficulty
      topicTags {
        name
        slug
      }
    }
  `).join("\n");

  const response = await fetchGraphQL(`query attemptedProblemMetadata { ${aliases} }`);
  return Object.values(response.data || {}).filter(Boolean);
};

export const fetchAllSubmissions = async (offset: number, limit: number) => {
  // LeetCode REST API requires CSRF token in headers (unlike GraphQL which is more lenient)
  const cookie = await chrome.cookies.get({ url: "https://leetcode.com", name: "csrftoken" });
  const csrfToken = cookie?.value || "";
  const url = `https://leetcode.com/api/submissions/?offset=${offset}&limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'X-CSRFToken': csrfToken,
      'Referer': 'https://leetcode.com/',
    },
  });
  
  if (!response.ok) {
    throw new Error(`LeetCode API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export const fetchContestHistory = async (username: string) => {
  const query = `
    query userContestRankingInfo($username: String!) {
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
        globalRanking
        topPercentage
      }
      userContestRankingHistory(username: $username) {
        attended
        rating
        ranking
        problemsSolved
        totalProblems
        finishTimeInSeconds
        contest {
          title
          titleSlug
          startTime
        }
      }
    }
  `;
  return fetchGraphQL(query, { username });
};

export const fetchContestQuestions = async (contestSlug: string) => {
  const query = `
    query contestQuestionList($contestSlug: String!) {
      contestQuestionList(contestSlug: $contestSlug) {
        title
        titleSlug
        questionId
      }
    }
  `;
  const response = await fetchGraphQL(query, { contestSlug });
  return response.data?.contestQuestionList ?? [];
};

export const fetchReplayEvents = async (username: string, contestSlug: string, questionSlug: string) => {
  const query = `
    query UserContestReplayEvents($contestSlug: String!, $questionSlug: String!, $username: String) {
      userContestReplayEvents(
        contestSlug: $contestSlug
        questionSlug: $questionSlug
        username: $username
      ) {
        eventType
        eventData
        timestamp
      }
    }
  `;
  const response = await fetchGraphQL(query, { contestSlug, questionSlug, username });
  return response.data?.userContestReplayEvents ?? [];
};

export type AnalysisStatus = 'CLEAN' | 'MILD_PASTE' | 'HEAVY_PASTE' | 'SKIPPED';

export interface CheatReport {
  status: AnalysisStatus;
  label: string; 
  color: string;
  details: string[];
  pasteCount: number;
  focusLoss: number;
}

export function analyzeEvents(events: any[]): CheatReport {
  if (!events || events.length === 0) {
    return { status: 'SKIPPED', label: 'No Data', color: 'text-zinc-500', details: ['No data'], pasteCount: 0, focusLoss: 0 };
  }
  let isAccepted = false;
  let attemptStatus = null;
  for (const e of events) {
    const type = parseInt(e.eventType, 10);
    if (type === 5) {
        try {
            const data = JSON.parse(e.eventData);
            if (data.result && data.result.status === 10) { isAccepted = true; break; }
            else if (data.result) { attemptStatus = data.result.status; }
        } catch (err) {}
    }
  }
  if (!isAccepted) {
      const msg = attemptStatus ? `Not Accepted (Status ${attemptStatus})` : `No Submission`;
      return { status: 'SKIPPED', label: 'Skipped', color: 'text-zinc-500', details: [msg], pasteCount: 0, focusLoss: 0 };
  }

  let pasteCount = 0;
  let focusLoss = 0;
  const HEAVY_THRESHOLD = 500; 
  const MILD_THRESHOLD = 100;

  const detectedPastes: string[] = [];

  events.forEach((e) => {
    const type = parseInt(e.eventType, 10);

    if (type === 3) {
      if (e.eventData.includes('"val": false') || e.eventData.includes('"val":false')) focusLoss++;
    }

    if ((type === 7 || type === 10) && e.eventData) {
      try {
        const data = JSON.parse(e.eventData);
        const isInternal = data.isFromInside === true; 

        if (data.change && data.change.changes) {
          data.change.changes.forEach((change: any) => {
            const insertedLen = (change.insert || "").length;
            if (insertedLen > 0) {
              if (isInternal) return; 

              if (insertedLen > MILD_THRESHOLD) {
                if (type === 10) { 
                   pasteCount++;
                   if (insertedLen > HEAVY_THRESHOLD) {
                     detectedPastes.push(`Large Ext. Paste: ${insertedLen} chars`);
                   } else {
                     detectedPastes.push(`Small Ext. Paste: ${insertedLen} chars`);
                   }
                } 
              }
            }
          });
        }
      } catch (err) {}
    }
  });

  let status: AnalysisStatus = 'CLEAN';
  let label = 'Manual Typing';
  let color = 'text-emerald-500';
  const details: string[] = [];

  const hasHeavyPaste = detectedPastes.some(d => d.includes('Large Ext. Paste'));
  
  if (hasHeavyPaste) {
    status = 'HEAVY_PASTE';
    label = 'Large Paste'; 
    color = 'text-rose-500';
    details.push(...detectedPastes);
  } 
  else if (pasteCount > 0) {
    status = 'MILD_PASTE';
    label = 'Small Paste'; 
    color = 'text-amber-500'; 
    details.push(...detectedPastes);
  }

  if (focusLoss > 10) {
     details.push(`Tab Switch: ${focusLoss}x`);
  }

  if (status === 'CLEAN') {
    details.push(`Natural typing`);
  }

  return { status, label, color, details, pasteCount, focusLoss };
}
