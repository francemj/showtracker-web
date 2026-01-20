import { fileURLToPath } from "node:url"
import globals from "globals"
import eslint from "@eslint/js"
import { FlatCompat } from "@eslint/eslintrc"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import prettierPlugin from "eslint-plugin-prettier"
import prettierConfig from "eslint-config-prettier"
import unusedImportsPlugin from "eslint-plugin-unused-imports"

// Needed to adapt legacy configs
const compat = new FlatCompat({
  baseDirectory: fileURLToPath(new URL(".", import.meta.url)),
})

export default [
  // Global ignores
  {
    ignores: ["node_modules/**", "dist/**"],
  },

  // Base ESLint recommended config
  eslint.configs.recommended,

  // TypeScript configurations
  ...tseslint.configs.recommended,

  prettierConfig,

  // Legacy config compatibility
  ...compat.extends(
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended"
  ),

  // Main configuration
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      prettier: prettierPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "react/react-in-jsx-scope": "off",
      "prettier/prettier": "error",
      "react/no-unescaped-entities": "off",
      "react/no-unknown-property": "warn",
      "react/prop-types": "warn",
      "react-hooks/exhaustive-deps": "error",
      semi: ["error", "never"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/jsx-tag-spacing": [
        "error",
        {
          closingSlash: "never",
          beforeSelfClosing: "always",
          afterOpening: "never",
          beforeClosing: "never",
        },
      ],
      "react/jsx-indent": ["error", 2],
      "react/jsx-indent-props": ["error", 2],
      "react/jsx-curly-spacing": ["error", { when: "never", children: true }],
      "react/jsx-equals-spacing": ["error", "never"],
    },
  },

  // Override for specific files
  {
    files: ["**/client/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='fetch']",
          message:
            "Use 'apiRequest' from 'queryClient' instead of the basic 'fetch' API. This ensures proper error handling, authentication, and request wrapping.",
        },
        {
          selector:
            "CallExpression[callee.object.name='window'][callee.property.name='fetch']",
          message:
            "Use 'apiRequest' from 'queryClient' instead of the basic 'fetch' API. This ensures proper error handling, authentication, and request wrapping.",
        },
      ],
    },
  },
]
