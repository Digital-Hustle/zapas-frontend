const footer =
  /(?:co-authored-by:.*(?:claude|codex|openai|anthropic|copilot|agent|\[bot\])|(?:generated|written|authored|made|built|assisted)\s+(?:by|with)\s+(?:ai\b|claude|codex|copilot|openai|anthropic|.*coding.?agent))/i;

export async function verifyAuthorship({ pr, repository, commits, getPermission = async () => undefined }) {
  const errors = [];
  if (footer.test(`${pr.title}\n${pr.body ?? ""}`))
    errors.push("PR contains coding-agent/AI-author boilerplate");
  const automated = ["dependabot[bot]", "renovate[bot]"].includes(pr.user.login);
  const sameRepo = Number.isSafeInteger(repository.id) && pr.head?.repo?.id === repository.id;
  const permissions = new Map();
  for (const commit of commits) {
    const sha = commit.sha.slice(0, 8);
    if (footer.test(commit.commit.message)) errors.push(`${sha} contains an AI co-author/generated footer`);
    if (automated) continue;
    const author = commit.author;
    if (!author?.login || author.type !== "User" || !Number.isSafeInteger(author.id)) {
      errors.push(`${sha} has no attributed personal GitHub account`);
      continue;
    }
    if (author.login === pr.user.login) continue;
    if (!sameRepo) {
      errors.push(`${sha} foreign author is not accepted for a fork PR`);
      continue;
    }
    // Maintainer fixes keep their own author instead of impersonating the PR owner.
    if (!permissions.has(author.login)) permissions.set(author.login, await getPermission(author.login));
    if (!["admin", "write", "maintain"].includes(permissions.get(author.login))) {
      errors.push(`${sha} additional author ${author.login} lacks verified write access`);
    }
  }
  return errors;
}
