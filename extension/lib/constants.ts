export const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';
export const ZEROTRAC_URL = 'https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/data.json';
export const BACKEND_URL = process.env.PLASMO_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export const STORAGE_KEYS = {
  USERNAME: "algovault.username",
  JWT_TOKEN: "algovault.jwt",
  ZEROTRAC_DATA: "algovault.zerotrac.data.v2",
  ZEROTRAC_LAST_FETCHED: "algovault.zerotrac.last_fetched.v2",
  LAST_SYNC: "algovault.lastSync",
  USER_SETTINGS: "algovault.userSettings",
  CACHED_DASHBOARD: "algovault.cache.dashboard",
  CACHED_MASTERY: "algovault.cache.mastery",
  CACHED_HEATMAP: "algovault.cache.heatmap",
  CACHED_CONTESTS: "algovault.cache.contests",
  CACHED_WEAKNESS: "algovault.cache.weakness",
  CURRENT_SESSION: "algovault.currentSession",
  GITHUB_PAT: "algovault.github.pat",
  GITHUB_REPO: "algovault.github.repo"
} as const;
