/**
 * Commits a solution code file to the user's GitHub repository.
 *
 * @param pat GitHub Personal Access Token
 * @param repoPath Owner/Repo string (e.g. "Somnath0707/AlgoVault")
 * @param filePath Path inside the repo (e.g. "problems/shortest-bridge/Solution.java")
 * @param commitMessage Commit message
 * @param fileContent Raw text code content of the solution
 */
export async function commitToGithub(
  pat: string,
  repoPath: string,
  filePath: string,
  commitMessage: string,
  fileContent: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const cleanRepo = repoPath.trim().replace(/^https:\/\/github\.com\//, "");
    const [owner, repo] = cleanRepo.split("/");
    if (!owner || !repo) {
      return { ok: false, message: "Invalid repository path. Format must be 'owner/repo'." };
    }

    const headers: Record<string, string> = {
      Authorization: `token ${pat}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json"
    };

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    // 1. Get file SHA if it already exists
    let sha: string | undefined = undefined;
    try {
      const getRes = await fetch(apiUrl, { headers });
      if (getRes.ok) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }
    } catch (e) {
      console.warn("Failed to check if file exists on GitHub", e);
    }

    // 2. Base64 encode file contents. Since JavaScript btoa does not support UTF-8 natively,
    // we use a safe encode helper using TextEncoder/Uint8Array/fromCharCode.
    const utf8Bytes = new TextEncoder().encode(fileContent);
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64Content = btoa(binary);

    // 3. Commit the file
    const body: Record<string, any> = {
      message: commitMessage,
      content: base64Content
    };
    if (sha) {
      body.sha = sha;
    }

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });

    if (!putRes.ok) {
      const errorMsg = await putRes.text();
      return { ok: false, message: `GitHub API error: ${putRes.status} - ${errorMsg}` };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: error.message || "Failed to commit to GitHub" };
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
