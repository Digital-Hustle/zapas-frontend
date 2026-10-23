import base from "@zapas/config/eslint";

export default [
  ...base,
  // Пакет UI — единственное место, где можно импортировать lucide-react напрямую.
  { files: ["src/icons.ts"], rules: { "no-restricted-imports": "off" } },
  // Библиотека, а не приложение: компоненты экспортируются вместе с хелперами (buttonVariants, notify).
  { rules: { "react-refresh/only-export-components": "off" } },
];
