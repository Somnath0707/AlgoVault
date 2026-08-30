import { exchangeGithubCode, getGithubOAuthState } from "./backend";
import { getGithubAutoSync } from "../storage";

// Client IDs identify an OAuth app and are public by design. The client
// secret is deliberately backend-only and must never be bundled here.
export const GITHUB_CLIENT_ID = process.env.PLASMO_PUBLIC_GITHUB_CLIENT_ID || '';

export interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GithubRepoItem {
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
  html_url: string;
}

const base64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const createPkcePair = async (): Promise<{ verifier: string; challenge: string }> => {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const verifier = base64Url(random);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
};

export interface GithubProfileResult {
  ok: boolean;
  user?: GithubUser;
  revoked?: boolean;
  error?: string;
}

export interface GithubReposResult {
  ok: boolean;
  repos: GithubRepoItem[];
  revoked?: boolean;
  error?: string;
}

/**
 * Fetches authenticated user's profile from GitHub API.
 * Detects 401/403 indicating a revoked or expired token.
 */
export async function fetchUserGithubProfile(token: string): Promise<GithubProfileResult> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, revoked: true, error: "GitHub token was revoked or expired" };
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `GitHub error ${res.status}: ${errText}` };
    }
    const user = await res.json();
    return { ok: true, user };
  } catch (e: any) {
    console.error("Failed to fetch GitHub profile:", e);
    return { ok: false, error: e.message || "Network error fetching GitHub profile" };
  }
}

/**
 * Fetches accessible repositories for the authenticated GitHub user.
 */
export async function fetchUserGithubRepos(token: string): Promise<GithubReposResult> {
  try {
    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, repos: [], revoked: true, error: "GitHub token was revoked or expired" };
    }
    if (!res.ok) {
      return { ok: false, repos: [], error: `GitHub error ${res.status}` };
    }
    const repos = await res.json();
    if (!Array.isArray(repos)) return { ok: true, repos: [] };
    const mapped = repos.map((r: any) => ({
      full_name: r.full_name,
      name: r.name,
      owner: { login: r.owner?.login || "" },
      default_branch: r.default_branch || "main",
      private: !!r.private,
      html_url: r.html_url
    }));
    return { ok: true, repos: mapped };
  } catch (e: any) {
    console.error("Failed to fetch GitHub repositories:", e);
    return { ok: false, repos: [], error: e.message || "Network error" };
  }
}

/**
 * Commits a solution code file to the user's GitHub repository.
 * Handles existing file SHA check and branch target.
 */
export async function commitToGithub(
  pat: string,
  repoPath: string,
  filePath: string,
  commitMessage: string,
  fileContent: string,
  branch?: string
): Promise<{ ok: boolean; message?: string; alreadySynced?: boolean; revoked?: boolean }> {
  try {
    const isAutoSync = await getGithubAutoSync();
    if (!isAutoSync) {
      console.log("[AlgoVault] commitToGithub aborted: Auto-sync is disabled.");
      return { ok: true, alreadySynced: true, message: "Auto-sync disabled by user" };
    }

    const cleanRepo = repoPath.trim()
      .replace(/^https:\/\/github\.com\//, "")
      .replace(/\.git$/, "");
    const [owner, repo] = cleanRepo.split("/");
    if (!owner || !repo) {
      return { ok: false, message: "Invalid repository path. Format must be 'owner/repo'." };
    }

    const headers: Record<string, string> = {
      Authorization: `token ${pat}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    };

    const branchQuery = branch ? `?ref=${encodeURIComponent(branch)}` : "";
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}${branchQuery}`;

    // 1. Get file SHA if it already exists
    let sha: string | undefined = undefined;
    let existingContent: string | undefined = undefined;
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          ...headers,
          "Cache-Control": "no-cache"
        }
      });
      if (getRes.status === 401 || getRes.status === 403) {
        return { ok: false, revoked: true, message: "GitHub token was revoked or expired. Please reconnect in Settings." };
      }
      if (getRes.ok) {
        const getJson = await getRes.json();
        sha = getJson.sha;
        if (getJson.content) {
          existingContent = getJson.content.replace(/\n/g, "");
        }
      }
    } catch (e) {
      console.warn("Failed to check if file exists on GitHub", e);
    }

    // 2. Base64 encode file contents
    const utf8Bytes = new TextEncoder().encode(fileContent);
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64Content = btoa(binary);

    // Duplicate protection check: if existing base64 content matches exactly, skip commit
    if (sha && existingContent && existingContent === base64Content) {
      return { ok: true, alreadySynced: true, message: "File is already up to date on GitHub" };
    }

    // 3. Commit the file
    const body: Record<string, any> = {
      message: commitMessage,
      content: base64Content
    };
    if (sha) {
      body.sha = sha;
    }
    if (branch) {
      body.branch = branch;
    }

    let putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });

    // If failed due to missing or mismatched SHA (409 Conflict or 422 Unprocessable Entity), re-fetch latest SHA with no-cache and retry once
    if (!putRes.ok && (putRes.status === 409 || putRes.status === 422)) {
      try {
        const retryGetRes = await fetch(apiUrl, {
          headers: {
            ...headers,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache"
          }
        });
        if (retryGetRes.ok) {
          const retryJson = await retryGetRes.json();
          if (retryJson.sha) {
            body.sha = retryJson.sha;
            putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
              method: "PUT",
              headers,
              body: JSON.stringify(body)
            });
          }
        }
      } catch (retryErr) {
        console.warn("Retry SHA fetch failed:", retryErr);
      }
    }

    if (!putRes.ok) {
      const errorMsg = await putRes.text();
      const isRevoked = putRes.status === 401 || putRes.status === 403;
      return {
        ok: false,
        revoked: isRevoked,
        message: isRevoked
          ? "GitHub token was revoked or expired. Please reconnect in Settings."
          : `GitHub API error (${putRes.status}): ${errorMsg}`
      };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: error.message || "Failed to commit to GitHub" };
  }
}

export interface BatchFileWrite {
  path: string
  message: string
  content: string
}

/**
 * Commits multiple files in a single atomic Git commit using the Git Trees API.
 * This reduces N sequential API roundtrips down to ~4 total requests regardless
 * of file count: (1) get branch ref, (2) create tree, (3) create commit, (4) update ref.
 *
 * Falls back to sequential single-file commits if the Trees API fails (e.g.
 * fine-grained token without "Contents: read & write" permission).
 */
export async function batchCommitToGithub(
  pat: string,
  repoPath: string,
  writes: BatchFileWrite[],
  branch?: string
): Promise<{ ok: boolean; message?: string; revoked?: boolean }> {
  if (!writes.length) return { ok: true }

  const cleanRepo = repoPath.trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  const [owner, repo] = cleanRepo.split("/");
  if (!owner || !repo) {
    return { ok: false, message: "Invalid repository path. Format must be 'owner/repo'." };
  }

  const headers: Record<string, string> = {
    Authorization: `token ${pat}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };

  const targetBranch = branch || "main";

  try {
    // Step 1: Get the latest commit SHA for the branch
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(targetBranch)}`,
      { headers }
    );

    if (refRes.status === 401 || refRes.status === 403) {
      return { ok: false, revoked: true, message: "GitHub token was revoked or expired. Please reconnect in Settings." };
    }

    if (!refRes.ok) {
      // Trees API not available or branch missing -- fall back to sequential
      return sequentialFallback(pat, repoPath, writes, branch);
    }

    const refData = await refRes.json();
    const latestCommitSha: string = refData.object?.sha;
    if (!latestCommitSha) {
      return sequentialFallback(pat, repoPath, writes, branch);
    }

    // Step 2: Fetch the latest commit object to obtain its true tree SHA
    const commitObjRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      { headers }
    );
    if (!commitObjRes.ok) {
      return sequentialFallback(pat, repoPath, writes, branch);
    }
    const commitObjData = await commitObjRes.json();
    const baseTreeSha: string = commitObjData.tree?.sha;
    if (!baseTreeSha) {
      return sequentialFallback(pat, repoPath, writes, branch);
    }

    // Step 3: Create blobs for each file and build the tree entries
    const treeEntries: Array<{ path: string; mode: string; type: string; content: string }> = [];
    for (const write of writes) {
      treeEntries.push({
        path: write.path,
        mode: "100644",
        type: "blob",
        content: write.content
      });
    }

    // Step 4: Create a new tree based on the latest commit's tree SHA
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: treeEntries
        })
      }
    );

    if (!treeRes.ok) {
      // If tree creation fails, fall back to sequential contents API
      return sequentialFallback(pat, repoPath, writes, branch);
    }

    const treeData = await treeRes.json();
    const newTreeSha: string = treeData.sha;

    // Step 5: Create a new commit pointing to the new tree
    const commitMessage = writes.length === 1
      ? writes[0].message
      : `${writes[0].message} (+${writes.length - 1} files) - AlgoVault`;

    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: newTreeSha,
          parents: [latestCommitSha]
        })
      }
    );

    if (!commitRes.ok) {
      return sequentialFallback(pat, repoPath, writes, branch);
    }

    const commitData = await commitRes.json();
    const newCommitSha: string = commitData.sha;

    // Step 6: Update the branch ref to point to the new commit
    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(targetBranch)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ sha: newCommitSha, force: true })
      }
    );

    if (!updateRes.ok) {
      // If ref update fails, try sequential fallback before failing
      const fallback = await sequentialFallback(pat, repoPath, writes, branch);
      if (fallback.ok) return fallback;

      const errText = await updateRes.text().catch(() => "");
      const isRevoked = updateRes.status === 401 || updateRes.status === 403;
      return {
        ok: false,
        revoked: isRevoked,
        message: isRevoked
          ? "GitHub token was revoked or expired. Please reconnect in Settings."
          : `Failed to update branch ref (${updateRes.status}): ${errText}`
      };
    }

    return { ok: true };
  } catch (error: any) {
    // Network error on Trees API -- fall back to sequential
    try {
      return await sequentialFallback(pat, repoPath, writes, branch);
    } catch (fallbackErr: any) {
      return { ok: false, message: fallbackErr.message || "Failed to commit to GitHub" };
    }
  }
}

async function sequentialFallback(
  pat: string,
  repoPath: string,
  writes: BatchFileWrite[],
  branch?: string
): Promise<{ ok: boolean; message?: string; revoked?: boolean }> {
  for (const write of writes) {
    const result = await commitToGithub(pat, repoPath, write.path, write.message, write.content, branch);
    if (!result.ok) return result;
  }
  return { ok: true };
}

/**
 * Scans the entire file tree of a GitHub repository using the Git Trees API
 * with recursive=1. Returns a flat Set<string> of all file paths in the repo.
 *
 * This is exactly 2 API calls regardless of repo size:
 *   1. GET /repos/{owner}/{repo}/git/ref/heads/{branch}  → resolve branch SHA
 *   2. GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1 → flat tree
 *
 * Used by the GitHub backfill feature to diff what's already on GitHub vs
 * what LeetCode shows as solved, so we only commit missing files.
 */
export async function fetchRepoFileTree(
  pat: string,
  repoPath: string,
  branch: string
): Promise<{ ok: boolean; paths: Set<string>; revoked?: boolean; error?: string }> {
  const cleanRepo = repoPath.trim()
    .replace(/^https:\/\/github\.com\//, "")
    .replace(/\.git$/, "");
  const [owner, repo] = cleanRepo.split("/");
  if (!owner || !repo) {
    return { ok: false, paths: new Set(), error: "Invalid repository path. Format must be 'owner/repo'." };
  }

  const headers: Record<string, string> = {
    Authorization: `token ${pat}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    // Step 1: Resolve the branch to a commit SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      { headers }
    );
    if (refRes.status === 401 || refRes.status === 403) {
      return { ok: false, paths: new Set(), revoked: true, error: "GitHub token was revoked or expired." };
    }
    if (refRes.status === 404) {
      // Empty or new repo with no commits yet — treat as empty tree
      return { ok: true, paths: new Set() };
    }
    if (!refRes.ok) {
      return { ok: false, paths: new Set(), error: `GitHub API error ${refRes.status} resolving branch ref` };
    }
    const refData = await refRes.json();
    const commitSha: string = refData.object?.sha;
    if (!commitSha) {
      return { ok: true, paths: new Set() };
    }

    // Step 2: Fetch the full recursive tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
      { headers }
    );
    if (treeRes.status === 401 || treeRes.status === 403) {
      return { ok: false, paths: new Set(), revoked: true, error: "GitHub token was revoked or expired." };
    }
    if (!treeRes.ok) {
      return { ok: false, paths: new Set(), error: `GitHub API error ${treeRes.status} fetching repo tree` };
    }
    const treeData = await treeRes.json();

    // Build a Set of all file paths (blobs only — skip trees/directories)
    const paths = new Set<string>();
    if (Array.isArray(treeData.tree)) {
      for (const item of treeData.tree) {
        if (item.type === "blob" && typeof item.path === "string") {
          paths.add(item.path);
        }
      }
    }

    return { ok: true, paths };
  } catch (e: any) {
    return { ok: false, paths: new Set(), error: e.message || "Network error scanning GitHub repo" };
  }
}

/**
 * Maps LeetCode language string to standard file extension.
 */
export function getExtensionForLanguage(lang?: string): string {
  if (!lang) return "txt";
  const l = lang.toLowerCase();
  if (l.includes("cpp") || l === "c++") return "cpp";
  if (l.includes("java")) return "java";
  if (l.includes("python") || l === "py") return "py";
  if (l.includes("javascript") || l === "js") return "js";
  if (l.includes("typescript") || l === "ts") return "ts";
  if (l === "c") return "c";
  if (l.includes("csharp") || l === "c#") return "cs";
  if (l.includes("golang") || l === "go") return "go";
  if (l.includes("kotlin")) return "kt";
  if (l.includes("rust")) return "rs";
  if (l.includes("ruby")) return "rb";
  if (l.includes("scala")) return "scala";
  if (l.includes("swift")) return "swift";
  if (l.includes("php")) return "php";
  if (l.includes("bash") || l === "sh") return "sh";
  if (l.includes("sql")) return "sql";
  return "txt";
}

/**
 * Initiates the GitHub OAuth flow using the Chrome Identity API,
 * retrieves the authorization code, and exchanges it via the backend.
 */
export async function authenticateGithub(): Promise<{ ok: boolean; token?: string; jwt?: string; message?: string }> {
  try {
    if (!GITHUB_CLIENT_ID) return { ok: false, message: "GitHub OAuth client ID is not configured." };
    const redirectUri = chrome.identity.getRedirectURL();
    const state = await getGithubOAuthState();
    const pkce = await createPkcePair();
    // `public_repo` is intentionally narrower than GitHub's broad `repo`
    // scope. A private repository requires a user-created fine-grained token
    // restricted to that specific repository.
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_repo&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(pkce.challenge)}&code_challenge_method=S256`;
    
    return new Promise((resolve) => {
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          return resolve({ ok: false, message: chrome.runtime.lastError?.message || "OAuth flow was canceled or failed" });
        }
        
        try {
          const urlParams = new URLSearchParams(new URL(responseUrl).search);
          const code = urlParams.get('code');
          const returnedState = urlParams.get('state');
          if (!code) {
            return resolve({ ok: false, message: "No authorization code returned from GitHub" });
          }
          if (returnedState !== state) {
            return resolve({ ok: false, message: "OAuth state validation failed. Please try again." });
          }

          // The backend validates both the authorization code and GitHub identity.
          const res = await exchangeGithubCode(code, state, pkce.verifier, redirectUri);
          if (res.token && res.githubToken) {
            resolve({ ok: true, token: res.githubToken, jwt: res.token });
          } else {
            resolve({ ok: false, message: res.error || "Backend did not return a valid token" });
          }
        } catch (err: any) {
          resolve({ ok: false, message: err.message || "Failed to exchange authorization code" });
        }
      });
    });
  } catch (e: any) {
    return { ok: false, message: e.message || "Failed to start OAuth flow" };
  }
}
