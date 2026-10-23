/** @type {import("prettier").Config} */
export default {
  printWidth: 110,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  arrowParens: "always",
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["cn", "cva"],
};
