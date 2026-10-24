import base from "@zapas/config/eslint";

export default [
  ...base,
  // HTTP transports пакета — единственные места, где разрешён fetch.
  { files: ["src/http.ts", "src/browser.ts"], rules: { "no-restricted-globals": "off" } },
];
