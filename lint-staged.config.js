/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  "client/**/*.{js,jsx,ts,tsx}": [`prettier --write`, `eslint --fix`],
  "server/**/*.{js,jsx,ts,tsx}": [`prettier --write`, `eslint --fix`],
  "packages/**/*.{js,jsx,ts,tsx}": [`prettier --write`, `eslint --fix`],
}
