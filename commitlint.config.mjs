/**
 * Commit message rules (FND-014).
 *
 * The format is the one `CONTRIBUTING.md` already documents:
 *
 *     <type>(<scope>): <short summary>
 *
 * The rules are spelled out here rather than left to
 * `@commitlint/config-conventional`'s defaults, so that the accepted types are
 * exactly the ones the contribution guide lists — a change to either file is a
 * visible change, not a side effect of upgrading a preset.
 *
 * Merge commits and reverts are ignored (`defaultIgnores`), because git writes
 * those messages and a contributor cannot reformat them.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: true,
  rules: {
    // The allowed types, matching the branch/commit types in CONTRIBUTING.md.
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'refactor', 'perf', 'test', 'chore', 'build', 'ci'],
    ],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],

    // A scope is recommended but not required (`docs: ...` is valid).
    'scope-empty': [0],

    'subject-empty': [2, 'never'],
    // The guide does not impose a casing rule on the summary; several existing
    // commits summarise in Persian, which the preset's casing rule would reject.
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '.'],

    // Keeps the subject readable in `git log --oneline` and on a PR page.
    'header-max-length': [2, 'always', 100],

    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
