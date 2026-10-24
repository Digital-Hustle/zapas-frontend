import process from "node:process";
import { pathToFileURL } from "node:url";

export function assertCommit(sha) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? "")) throw new Error("Expected a full immutable commit SHA");
  return sha;
}
export function checksPassed(checks) {
  const latest = new Map();
  for (const check of checks) {
    if ((latest.get(check.name)?.id ?? -1) < check.id) latest.set(check.name, check);
  }
  return ["frontend", "summary", "security"].every((name) => latest.get(name)?.status === "completed" && latest.get(name)?.conclusion === "success");
}
export async function requireGreen({ sha, token, fetcher = fetch, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), attempts = 25 }) {
  assertCommit(sha);
  if (!token) throw new Error("GitHub checks token is required");
  const request = async (path) => {
    const response = await fetcher(`https://api.github.com/repos/Digital-Hustle/zapas-frontend/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (!response.ok) throw new Error(`Cannot verify GitHub checks: HTTP ${response.status}`);
    return response.json();
  };
  for (let attempt = 0; attempt < attempts; attempt++) {
    const main = await request("git/ref/heads/main");
    if (main.object.sha !== sha) throw new Error("Commit is no longer current main; deploy the newer checked revision");
    const checks = await request(`commits/${sha}/check-runs?per_page=100`);
    if (checksPassed(checks.check_runs)) return;
    if (attempt < attempts - 1) await wait(5000);
  }
  throw new Error("Required frontend/summary/security checks are not all successful");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await requireGreen({ sha: process.env.PREVIEW_COMMIT, token: process.env.GH_TOKEN });
  console.log("Current main has successful frontend, summary and security checks.");
}
