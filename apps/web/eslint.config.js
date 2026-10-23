import base, { appRules } from "@zapas/config/eslint";

export default [
  ...base,
  ...appRules,
  {
    files: ["src/app/providers/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
];
