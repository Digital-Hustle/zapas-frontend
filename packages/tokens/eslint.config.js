import base from "@zapas/config/eslint";

export default [
  ...base,
  {
    files: ["scripts/**"],
    languageOptions: { globals: { process: "readonly" } },
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "no-constant-binary-expression": "off",
    },
  },
];
