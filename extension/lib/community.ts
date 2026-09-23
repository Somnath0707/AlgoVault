export const COMMUNITY_CONFIG = {
  REPO_URL: "https://github.com/Somnath0707/AlgoVault",
  STAR_URL: "https://github.com/Somnath0707/AlgoVault",
  ISSUES_URL: "https://github.com/Somnath0707/AlgoVault/issues/new?template=bug_report.md",
  FEATURE_REQUEST_URL: "https://github.com/Somnath0707/AlgoVault/issues/new?template=feature_request.md",
  AUTHOR_URL: "https://github.com/Somnath0707",
  AUTHOR_NAME: "Som_07",
  AUTHOR_HANDLE: "@Som_07",
  VERSION: "v0.1.1",
  TAGLINES: [
    "Made with joy by @Som_07",
    "Made with joy for competitive programmers",
    "Crafted with joy & mathematical precision",
    "100% free & open source • Made with joy"
  ]
} as const;

export function getRandomTagline(): string {
  const index = Math.floor(Math.random() * COMMUNITY_CONFIG.TAGLINES.length);
  return COMMUNITY_CONFIG.TAGLINES[index];
}
