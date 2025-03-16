/** @type { import("eslint").Linter.Config } */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jest/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint", "jest"],
  ignorePatterns: [
    "**/.eslintrc.cjs",
    "**/tsup.config.ts",
    "**/jest.config.js",
    "**/.prettierrc.js",
  ],
  rules: {
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/unbound-method": "off",
    "@typescript-eslint/no-empty-function": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "error",
    "jest/no-disabled-tests": "error",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
