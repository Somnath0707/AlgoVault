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
  
  return response.json();
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
  const url = `https://leetcode.com/api/submissions/?offset=${offset}&limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
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
          startTime
        }
      }
    }
  `;
  return fetchGraphQL(query, { username });
};
