import base from "@zapas/config/eslint";

export default [
  ...base,
  // Единственное место, где разрешён fetch.
  { files: ["src/http.ts"], rules: { "no-restricted-globals": "off" } },
];
