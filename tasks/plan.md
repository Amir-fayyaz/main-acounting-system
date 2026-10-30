# Plan: Auth React Hook Form refactor

Approved spec: `docs/specs/auth-react-hook-form-refactor.md`

## Implementation order

1. Add a typed `zod/mini` resolver to the existing shared Zod module and prove it through form
   behavior rather than resolver internals.
2. Migrate Login to React Hook Form while preserving validation, remember-me, loading and Auth API
   error behavior.
3. Migrate Register and map backend field errors into React Hook Form with `setError`.
4. Migrate both Forgot steps, using `Controller` only for the non-native OTP component.
5. Remove the unused custom `useAuthForm`, then run focused tests, the full frontend suite, lint,
   type checking and a production build.

## Risks and mitigations

- Zod Mini is not supported by the external resolver package used in many examples. Use a small
  local typed resolver over `z.safeParse` and avoid a new dependency.
- React Hook Form clears client errors differently from the old hook. Keep the existing tests for
  per-field clearing and add a server-error clearing assertion.
- OTP is controlled. Use `Controller`; use `register` for ordinary native inputs.
- Existing dependency/lockfile changes belong to the user. Do not rewrite or reinstall packages.

## Verification checkpoints

- After Login: Login tests pass.
- After Register: Register and API-error mapping tests pass.
- After Forgot: Forgot and schema tests pass.
- Final: all frontend tests, lint, direct type check/build and formatting pass.
