// Biome does lint and format. ESLint only runs the type-aware promise rules
// Biome cannot check without the TypeScript type checker.
import { defineConfig } from "eslint/config"
import tseslint from "typescript-eslint"

export default defineConfig({
  files: ["**/*.ts"],
  extends: [tseslint.configs.base],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
  },
})
