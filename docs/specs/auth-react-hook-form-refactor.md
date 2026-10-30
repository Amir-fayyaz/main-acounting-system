# Spec: Auth forms refactor to React Hook Form

Status: Implemented — 2026-10-28

## Objective

Refactor the frontend authentication forms from the custom `useAuthForm` state manager to
`react-hook-form`, while keeping Zod as the runtime validation source and preserving the current
UI and user-visible behavior.

The refactor covers:

- `LoginForm`;
- `RegisterForm`;
- both steps of `ForgotForm`;
- client-side Zod validation;
- backend field errors produced by the shared `@repo/web/api` error-handling module.

The shared API layer remains responsible for normalizing transport errors. Each Auth form remains
responsible for deciding how those errors appear in its own fields and toast messages.

## Tech stack

- Next.js 16 and React 19;
- TypeScript strict mode;
- `react-hook-form` 7.91;
- `zod/mini` 4.4;
- Vitest, Testing Library and user-event;
- shared API error handling from `@repo/web/api`.

No new form or resolver dependency will be added. A small typed resolver for `zod/mini` will live
in `apps/frontend/src/core/lib/zod`.

## Commands

Run the focused tests:

```bash
pnpm --dir apps/frontend test \
  src/core/features/auth/test/auth-schemas.test.ts \
  src/core/features/auth/test/LoginForm.test.tsx \
  src/core/features/auth/test/RegisterForm.test.tsx \
  src/core/features/auth/test/ForgotForm.test.tsx
```

Run the complete frontend test suite:

```bash
pnpm --dir apps/frontend test
```

Run lint on the changed Auth files:

```bash
pnpm --dir apps/frontend exec eslint \
  src/core/features/auth \
  src/core/lib/zod/zod.ts
```

Build the frontend:

```bash
pnpm --dir apps/frontend build
```

## Project structure

```text
apps/frontend/src/core/lib/zod/zod.ts
  Shared Zod field helpers and the typed react-hook-form resolver.

apps/frontend/src/core/features/auth/lib/auth-schemas.ts
  Auth schemas composed from the shared helpers.

apps/frontend/src/core/features/auth/components/block/LoginForm.tsx
  Login form registration, submission and UI errors.

apps/frontend/src/core/features/auth/components/block/RegisterForm.tsx
  Registration form and backend field-error integration.

apps/frontend/src/core/features/auth/components/block/ForgotForm.tsx
  Independent react-hook-form state for recovery steps 1 and 2.

apps/frontend/src/core/features/auth/hook/useAuthForm.ts
  Removed after all consumers migrate.

apps/frontend/src/core/features/auth/test/*.test.tsx
  Existing behavior tests, extended only where React Hook Form integration needs coverage.
```

## Code style

Forms infer their value type from the schema and use `handleSubmit` instead of manually reading
and validating local state:

```ts
type LoginFormValues = z.infer<typeof loginFormSchema>;

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<LoginFormValues>({
  resolver: zodMiniResolver(loginFormSchema),
  defaultValues: { email: '', password: '', remember: true },
});

const submit = handleSubmit(async (values) => {
  await signIn(values);
});
```

Backend field errors are added through React Hook Form, not a second error state:

```ts
for (const [field, message] of Object.entries(result.fieldErrors)) {
  if (message) setError(field, { type: 'server', message });
}
```

## Testing strategy

- Keep every existing Auth form test and assertion.
- Verify empty and invalid values prevent API calls.
- Verify changing a field clears its own validation/server error without clearing unrelated fields.
- Verify the registration API never receives `password2`.
- Verify backend validation details are attached only to allowlisted registration fields.
- Verify 401, 409 and network failures still use the shared API error handling and current Persian
  UI messages.
- Verify double submission remains blocked and loading buttons remain disabled.
- Verify the two Forgot steps keep separate form state and Persian-digit normalization.
- Verify form-level validation failures prevent submission and nested/array field errors preserve
  their complete paths.
- Verify invalid OTP receives focus and its error message is accessible from the input.
- Run the full frontend suite and production build after focused tests pass.

## Boundaries

### Always

- Reuse the helpers already owned by `apps/frontend/src/core/lib/zod` where their behavior matches
  the Auth contract.
- Keep runtime validation at the form boundary and successful API-response validation at the API
  boundary.
- Catch API failures as `unknown` and use the existing shared API error helpers.
- Use `getFieldErrors`/the existing Auth mapper for backend field details.
- Preserve accessibility links between each input and its error message.

### Ask first

- Change authentication API payloads or response contracts.
- Add another form/resolver dependency.
- Change the visual design, routes or success redirects.
- Replace the simulated Forgot flow with new backend endpoints.

### Never

- Cast caught values with `as ApiError` or use `any` for errors.
- Duplicate a Zod schema inside a component.
- Send `password2` to the backend.
- Show raw unvalidated server bodies or technical stack information to the user.
- Remove or weaken an existing test to make the refactor pass.

## Success criteria

- Login, Register and both Forgot steps use `react-hook-form`.
- `useAuthForm` has no remaining consumer and is removed.
- Auth schemas reuse the shared Zod helpers where compatible.
- Zod errors and backend field errors appear through one React Hook Form error state.
- `apiRequest`, `normalizeApiError`, `getFieldErrors` and current Auth error mapping remain the only
  path from backend failures to the forms.
- Current UI text, validation behavior, loading states, redirects and accessibility behavior remain
  unchanged.
- Focused Auth tests, the full frontend test suite, lint and the production build pass.

## Resolved decisions

- `react-hook-auth` in the original request meant `react-hook-form`.
- `ForgotForm` was included while its backend flow remains simulated.
