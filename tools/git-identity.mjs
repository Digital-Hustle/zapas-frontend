// Validate human commit identity. Does not rewrite it or impersonate another account.
import { execFileSync } from "node:child_process";
const identity = execFileSync("git", ["var", "GIT_AUTHOR_IDENT"], { encoding: "utf8" }).trim();
if (!identity || /(?:claude|codex|openai|anthropic|copilot|\[bot\]|coding.?agent|ai.?agent)\b/i.test(identity)) {
  console.error("Set your own verified git user.name/email locally. Agent/bot identity is not allowed for human work.");
  process.exit(1);
}
console.log(`Author identity: ${identity.replace(/ \d+ [+-]\d{4}$/, "")}`);
