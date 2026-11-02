/**
 * Staged-file checks (FND-014).
 *
 * Runs from the `pre-commit` hook, on the files this commit actually changes, so
 * a formatting or lint slip is caught in about a second instead of in a CI run.
 *
 * The two commands below are the ones CI runs (`pnpm lint`, `pnpm format`), on a
 * narrower file set. Nothing here introduces a rule that CI does not enforce —
 * the rules stay in `eslint.config.mjs` and `.prettierrc.json`.
 *
 * `--fix`/`--write` update the staged content as well, so the commit that lands
 * is the fixed one rather than a commit that would fail CI.
 */
export default {
  // `eslint --fix` reads the file; lint-staged then re-stages the result.
  '*.{ts,tsx,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
