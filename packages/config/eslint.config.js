import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import query from "@tanstack/eslint-plugin-query";
import globals from "globals";

const restrictedImports = {
  paths: [
    { name: "framer-motion", message: "Импортируйте из motion/react" },
    { name: "react-spring", message: "Только motion/react" },
    { name: "gsap", message: "Только motion/react" },
    { name: "axios", message: "HTTP только через @zapas/api" },
    { name: "lucide-react", message: "Иконки через @zapas/ui/icons" },
  ],
  patterns: [
    { group: ["@zapas/*/src/*", "@zapas/*/dist/*"], message: "Импорт только из публичного API пакета" },
    {
      group: ["../../*"],
      message: "Глубокие относительные импорты запрещены — используйте @/ и публичный API слайса",
    },
  ],
};

/** Базовая конфигурация для приложений и пакетов. `appRules` добавляет FSD-ограничения. */
export const base = tseslint.config(
  { ignores: ["dist", "coverage", "**/generated/**", "playwright-report", "test-results"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
      parserOptions: { projectService: true },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "@tanstack/query": query,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      ...query.configs["flat/recommended"].at(-1)?.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
      "no-restricted-imports": ["error", restrictedImports],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "HTTP только через @zapas/api (http.ts)" },
        { name: "alert", message: "notify из @zapas/ui" },
        { name: "confirm", message: "confirmDialog из @zapas/ui" },
        { name: "prompt", message: "Dialog из @zapas/ui" },
      ],
      "no-restricted-syntax": [
        "error",
        { selector: "JSXOpeningElement[name.name='select']", message: "Select из @zapas/ui" },
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Запрещено (XSS)" },
        {
          selector:
            "JSXOpeningElement[name.name='input'] > JSXAttribute[name.name='type'][value.value=/^(date|datetime-local|time|month|week|number|color|range)$/]",
          message: "Нативные пикеры запрещены — DatePicker/MoneyInput/Slider из @zapas/ui",
        },
        {
          selector:
            "MemberExpression[object.name='localStorage'][property.name=/^(setItem|getItem)$/] > Literal[value=/token|jwt|refresh/i]",
          message: "Токены не храним в localStorage",
        },
        {
          selector: "CallExpression[callee.object.name='console'][callee.property.name='log']",
          message: "console.log не мёржим",
        },
      ],
      eqeqeq: ["error", "always"],
      // autoFocus нужен в диалогах подтверждения и на экране входа (одно поле на экране)
      "jsx-a11y/no-autofocus": "off",
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { boolean: true } }],
    },
  },
  {
    files: ["**/*.config.{js,ts,mjs}", "scripts/**", "**/*.test.{ts,tsx}", "e2e/**"],
    rules: { "no-restricted-globals": "off", "no-restricted-syntax": "off" },
  },
  { files: ["**/*.{js,mjs}"], ...tseslint.configs.disableTypeChecked },
);

/** FSD: слой может импортировать только нижележащие слои. Проверяется также zapas-check (публичный API слайса). */
const layers = ["app", "pages", "widgets", "features", "entities", "shared"];
export const appRules = layers.slice(1).map((layer, i) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        ...restrictedImports,
        patterns: [
          ...restrictedImports.patterns,
          {
            group: layers.slice(0, i + 1).map((l) => `@/${l}/*`),
            message: `Слой ${layer} не импортирует вышележащие слои (FSD)`,
          },
        ],
      },
    ],
  },
}));

export default base;
