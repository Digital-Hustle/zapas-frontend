// Verify personal attribution, including authorized maintainer conflict resolutions.
import { readFileSync } from "node:fs";
import { verifyAuthorship } from "./authorship-policy.mjs";

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
const token = process.env.GH_TOKEN;
if (!token) throw new Error("Read-only GitHub token required to validate commit attribution");
async function request(path) {
  const response = await fetch(`https://api.github.com/repos/${event.repository.full_name}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`Cannot verify commit authorship: HTTP ${response.status}`);
  return response.json();
}
const commits = [];
for (let page = 1; ; page += 1) {
  const batch = await request(`pulls/${pr.number}/commits?per_page=100&page=${page}`);
  commits.push(...batch);
  if (batch.length < 100) break;
}
const errors = await verifyAuthorship({
  pr,
  repository: event.repository,
  commits,
  getPermission: async (login) =>
    (await request(`collaborators/${encodeURIComponent(login)}/permission`)).permission,
});
if (errors.length) throw new Error(errors.join("\n"));
console.log(`Personal commit attribution verified for PR ${pr.number}`);
