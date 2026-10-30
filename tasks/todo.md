# Tasks: Auth React Hook Form refactor

- [x] Add the shared Zod Mini resolver and compose Auth schemas from compatible shared helpers.
  - Acceptance: React Hook Form receives first field-level Zod messages and parsed/transformed data.
  - Verify: Auth schema and Login form tests.
  - Files: `core/lib/zod/zod.ts`, `auth-schemas.ts`, relevant tests.

- [x] Migrate LoginForm to React Hook Form.
  - Acceptance: validation, remember-me, loading, API errors, redirects and password visibility are
    unchanged.
  - Verify: `LoginForm.test.tsx`.
  - Files: `LoginForm.tsx`, optional Login tests.

- [x] Migrate RegisterForm and connect backend errors with `setError`.
  - Acceptance: `password2` is never sent; 409 and validation details appear under allowlisted
    fields and clear when edited.
  - Verify: `RegisterForm.test.tsx`, `mapAuthError.test.ts`.
  - Files: `RegisterForm.tsx`, optional Register tests.

- [x] Migrate both ForgotForm steps.
  - Acceptance: separate step state, digit normalization, OTP control and redirect behavior remain
    unchanged.
  - Verify: `ForgotForm.test.tsx`.
  - Files: `ForgotForm.tsx`, optional Forgot tests.

- [x] Remove `useAuthForm` and run final verification.
  - Acceptance: no consumer remains; focused and complete checks pass.
  - Verify: full frontend tests, lint, formatting, type/build checks.
  - Files: `useAuthForm.ts`, documentation/task status only.

- [x] Resolve review findings for form-level errors, nested field paths and OTP focus.
  - Acceptance: invalid schemas cannot submit; nested/array errors stay on their own fields; OTP
    receives focus and exposes its error message accessibly.
  - Verify: resolver integration tests, ForgotForm behavior tests and final frontend checks.
