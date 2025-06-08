export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module"
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      "no-unused-vars": "warn",
      "semi": ["error", "always"]
    }
  }
];
