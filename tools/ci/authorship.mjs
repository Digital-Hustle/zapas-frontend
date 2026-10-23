// Reject assistance boilerplate/AI co-authors and verify personal PR authorship using GitHub attribution.
import { readFileSync } from "node:fs";

const eventFile = process.env.GITHUB_EVENT_PATH;
if (!eventFile) {
  console.log("PR authorship check: only applicable to GitHub pull_request events");
  process.exit(0);
}
const event = JSON.parse(readFileSync(eventFile, "utf8"));
const pr = event.pull_request;
if (!pr) {
  console.log("PR authorship check: no pull request in this event");
  process.exit(0);
}
const footer = /(?:co-authored-by:.*(?:claude|codex|openai|anthropic|copilot|agent|\[bot\])|(?:generated|written|authored|made|built|assisted)\s+(?:by|with)\s+(?:ai\b|claude|codex|copilot|openai|anthropic|.*coding.?agent))/i;
const errors = [];
if (footer.test(`${pr.title}\n${pr.body ?? ""}`)) errors.push("PR contains coding-agent/AI-author boilerplate");
const bot = ["dependabot[bot]", "renovate[bot]"].includes(pr.user.login);
if (!bot) {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("Read-only GitHub token required to validate commit attribution");
  let page = 1;
  while (true) {
    const res = await fetch(`https://api.github.com/repos/${event.repository.full_name}/pulls/${pr.number}/commits?per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`Cannot verify commit authorship: HTTP ${res.status}`);
    const commits = await res.json();
    for (const c of commits) {
      if (c.author?.login !== pr.user.login) errors.push(`${c.sha.slice(0, 8)} author is not the PR owner's verified GitHub account`);
      if (footer.test(c.commit.message)) errors.push(`${c.sha.slice(0, 8)} contains an AI co-author/generated footer`);
    }
    if (commits.length < 100) break;
    page += 1;
  }
}
if (errors.length) throw new Error(errors.join("\n"));
console.log(`Personal PR authorship verified for ${pr.user.login}`);
