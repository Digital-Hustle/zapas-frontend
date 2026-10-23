export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "refactor", "test", "docs", "ci", "chore", "contract", "perf", "revert"]],
    "scope-enum": [2, "always", ["web", "admin", "ui", "tokens", "api", "charts", "config", "contracts", "ci", "docs", "deps"]],
    "scope-empty": [2, "never"],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
    "zapas-requirement-id": [1, "always"],
    "zapas-human-authorship": [2, "always"],
  },
  plugins: [
    {
      rules: {
        "zapas-requirement-id": ({ subject, type }) => {
          if (["chore", "docs", "ci", "revert"].includes(type)) return [true];
          return [/\b(FR|NFR|T)-[A-Z0-9]+-\d{2}\b/.test(subject ?? ""), "добавьте ID требования/задачи, например FR-UI-02"];
        },
        "zapas-human-authorship": ({ raw }) => [
          !/(?:co-authored-by:.*(?:claude|codex|openai|anthropic|copilot|agent|\[bot\])|(?:generated|written|authored|made|built|assisted)\s+(?:by|with)\s+(?:ai\b|claude|codex|copilot|openai|anthropic|.*coding.?agent))/i.test(raw ?? ""),
          "коммит — от своего имени, без AI co-author/generated footer",
        ],
      },
    },
  ],
};