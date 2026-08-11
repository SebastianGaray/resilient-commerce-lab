import eslint from "@eslint/js"
import astro from "eslint-plugin-astro"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  { ignores: ["dist/**", ".astro/**", "node_modules/**"] },
  { languageOptions: { globals: globals.browser } },
)
