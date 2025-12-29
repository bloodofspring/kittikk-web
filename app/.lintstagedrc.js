module.exports = {
  "*.{js,mjs,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    () => "tsc --project tsconfig.json --pretty --noEmit",
  ],
  "*.json": ["prettier --write"],
  "*.css": ["stylelint"],
};
