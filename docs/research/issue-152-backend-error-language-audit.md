# Issue 152 — backend API error-language audit

Date: 2026-10-28

## Conclusion

The backend currently defines the public error contract in English. This is not limited to a few endpoints: every operation that exposes a documented `4xx` or `5xx` response can return an English `error.message`, an English `error.details[].message`, or both.

The running OpenAPI document contains **35 operations with documented error responses**. The widest causes are shared infrastructure messages, so translating those shared sources fixes many endpoints at once. Auth also has its own English domain messages and is the highest-priority module for the current frontend.

Machine fields must remain stable and language-neutral:

- keep `error.code`, `error.category`, `details[].code`, and `details[].field` unchanged;
- translate only `error.message` and `details[].message`;
- keep `correlationId` unchanged.

Primary sources:

- [running OpenAPI document](http://localhost:3000/api/docs-json)
- [shared API error registry](../../apps/backend/src/infrastructure/api/errors/api-error.registry.ts#L35-L81)
- [validation detail mapper](../../apps/backend/src/infrastructure/api/validation/validation-error.mapper.ts#L13-L51)
- [error-contract Swagger examples](../../apps/backend/src/infrastructure/api/errors/api-error.dto.ts#L11-L47)
- [authentication errors](../../apps/backend/src/modules/identity/domain/errors/authentication.errors.ts#L32-L126)
- [authentication HTTP mapping](../../apps/backend/src/modules/identity/presentation/http/authentication-error.mapper.ts#L36-L64)
- [authorization errors](../../apps/backend/src/modules/identity/domain/errors/authorization.errors.ts#L33-L121)
- [authorization HTTP mapping](../../apps/backend/src/modules/identity/presentation/http/authorization-error.mapper.ts#L31-L67)

## Confirmed against the running backend

These probes are GET-only and were read from the running API on `localhost:3000`.

| Endpoint | Status | Code | Actual English output |
| --- | ---: | --- | --- |
| `GET /api/v1/examples?page=0&limit=999` | 400 | `VALIDATION_FAILED` | `The request contains invalid values.`; details: `page is below the minimum allowed value`, `limit is above the maximum allowed value` |
| `GET /api/v1/examples/not-found` | 404 | `NOT_FOUND` | `The requested resource was not found.` |
| `GET /api/v1/examples/probe/server-error` | 500 | `INTERNAL_ERROR` | `An unexpected error occurred.` |
| `GET /api/v1/auth/session` without a token | 401 | `AUTHENTICATION_REQUIRED` | `Authentication is required for this operation.` |

The source of the first three messages is the shared registry and validation mapper. The session message is declared in the Identity domain and passed through verbatim by the authentication mapper.

## Highest priority: endpoints used by the current Auth frontend

### `POST /api/v1/auth/sign-up`

Documented statuses: `400`, `409`, `422`. Route: [authentication.controller.ts lines 78–109](../../apps/backend/src/modules/identity/presentation/controllers/authentication.controller.ts#L78-L109).

| Status | Response source | Current English message(s) | Suggested Persian output |
| ---: | --- | --- | --- |
| 400 | global DTO validation | `The request contains invalid values.` and English field details | `اطلاعات واردشده معتبر نیست.` plus Persian field details |
| 400 | password policy domain validation | `The password does not meet the minimum requirements.`; detail: `password must be a non-blank string of at least 12 and at most 128 characters` | `رمز عبور شرایط لازم را ندارد.`; detail: `رمز عبور باید بین ۱۲ تا ۱۲۸ کاراکتر و غیرخالی باشد.` |
| 409 | duplicate user | `A user with the given email already exists.`; detail currently includes the email value | `کاربری با این ایمیل از قبل وجود دارد.`; detail: `این ایمیل قبلاً استفاده شده است.` |
| 422 | other domain rules | English domain message passed through verbatim | Persian message owned by the corresponding domain error |

Sources: [credential.errors.ts lines 18–31](../../apps/backend/src/modules/identity/domain/errors/credential.errors.ts#L18-L31), [user.errors.ts lines 67–74](../../apps/backend/src/modules/identity/domain/errors/user.errors.ts#L67-L74), and [authentication-error.mapper.ts lines 51–64](../../apps/backend/src/modules/identity/presentation/http/authentication-error.mapper.ts#L51-L64).

### `POST /api/v1/auth/sign-in`

Documented statuses: `400`, `401`. Route: [authentication.controller.ts lines 112–136](../../apps/backend/src/modules/identity/presentation/controllers/authentication.controller.ts#L112-L136).

| Status | Code | Current English message | Suggested Persian output |
| ---: | --- | --- | --- |
| 400 | `VALIDATION_FAILED` | shared English validation message/details | `اطلاعات واردشده معتبر نیست.` plus Persian details |
| 401 | `INVALID_CREDENTIALS` | `The email or password is incorrect.` | `ایمیل یا رمز عبور نادرست است.` |
| 401 | `ACCOUNT_NOT_AUTHENTICATABLE` | `This account cannot sign in. Contact an administrator.` | `ورود برای این حساب امکان‌پذیر نیست. با مدیر سامانه تماس بگیرید.` |

Source: [authentication.errors.ts lines 32–55](../../apps/backend/src/modules/identity/domain/errors/authentication.errors.ts#L32-L55).

### `GET /api/v1/auth/session` and `POST /api/v1/auth/sign-out`

Routes: [authentication.controller.ts lines 138–184](../../apps/backend/src/modules/identity/presentation/controllers/authentication.controller.ts#L138-L184).

| Code | Current English message | Suggested Persian output |
| --- | --- | --- |
| `AUTHENTICATION_REQUIRED` | `Authentication is required for this operation.` | `برای انجام این عملیات باید وارد حساب شوید.` |
| `AUTHENTICATION_STATE_REJECTED` | `The authentication state is not valid.` | `نشست احراز هویت معتبر نیست.` |
| `SESSION_EXPIRED` | `The authentication session has expired. Sign in again.` | `نشست شما منقضی شده است. دوباره وارد شوید.` |
| `SESSION_REVOKED` | `The authentication session is no longer valid.` | `نشست شما دیگر معتبر نیست.` |
| `SESSION_ALREADY_REVOKED` | `The authentication session was already invalidated.` | `این نشست قبلاً باطل شده است.` |

Source: [authentication.errors.ts lines 65–126](../../apps/backend/src/modules/identity/domain/errors/authentication.errors.ts#L65-L126).

### `PUT /api/v1/users/{id}/credential`

Documented statuses: `400`, `401`, `403`, `404`, `409`, `422`. Route: [credential.controller.ts lines 51–90](../../apps/backend/src/modules/identity/presentation/controllers/credential.controller.ts#L51-L90).

This endpoint combines every shared language source: request validation, authentication, authorization, not-found, stale-write conflict, password policy, and inactive-user rules. It must be included in the Identity translation pass even if the current public registration UI does not call it.

## Shared messages that affect many endpoints

All messages below are defined once in [api-error.registry.ts lines 35–81](../../apps/backend/src/infrastructure/api/errors/api-error.registry.ts#L35-L81).

| Code | Current default | Suggested Persian default |
| --- | --- | --- |
| `VALIDATION_FAILED` | `The request contains invalid values.` | `درخواست شامل مقادیر نامعتبر است.` |
| `NOT_FOUND` | `The requested resource was not found.` | `منبع درخواستی پیدا نشد.` |
| `UNAUTHORIZED` | `Authentication is required.` | `برای ادامه باید وارد حساب شوید.` |
| `FORBIDDEN` | `The request is not allowed.` | `اجازه انجام این عملیات را ندارید.` |
| `CONFLICT` | `The request conflicts with the current state.` | `درخواست با وضعیت فعلی سامانه تداخل دارد.` |
| `REQUEST_FAILED` | `The request could not be processed.` | `پردازش درخواست ممکن نبود.` |
| `DOMAIN_ERROR` | `The request violates a business rule.` | `درخواست با یکی از قوانین کسب‌وکار سازگار نیست.` |
| `INTERNAL_ERROR` | `An unexpected error occurred.` | `خطایی غیرمنتظره رخ داد.` |
| `TENANT_REQUIRED` | `A tenant context is required for this operation.` | `برای انجام این عملیات، زمینهٔ شرکت الزامی است.` |

### Validation details

Every DTO validation failure currently uses English fragments from [validation-error.mapper.ts lines 13–30](../../apps/backend/src/infrastructure/api/validation/validation-error.mapper.ts#L13-L30):

`must be a string`, `must be an integer`, `must be a number`, `must be a boolean`, `must be an array`, `must be one of the allowed values`, `must be a valid identifier`, `must not be empty`, `is required`, `is below the minimum allowed value`, `is above the maximum allowed value`, `is shorter than the minimum length`, `is longer than the maximum length`, `has an invalid format`, `is not an accepted property`, and `is not a valid object`.

Recommended implementation detail: do not prepend the raw machine field name to the Persian `details[].message`. The response already has `details[].field` for machine mapping. For example:

```json
{
  "field": "email",
  "code": "isEmail",
  "message": "فرمت ایمیل معتبر نیست."
}
```

This keeps the message fully Persian while preserving `field: "email"` for the frontend.

### Authorization details

Every protected endpoint can also return English authorization messages. The main sources are:

- `AUTHORIZATION_DENIED`: `The authenticated principal is not authorized to perform this operation.`
- `TENANT_CONTEXT_REQUIRED`: `This operation requires a valid tenant context.`
- `TENANT_ACCESS_DENIED`: `The authenticated principal cannot access this tenant.`
- detail `PERMISSION_REQUIRED`: `the operation requires "<permission>"`

Source: [authorization.errors.ts lines 33–77](../../apps/backend/src/modules/identity/domain/errors/authorization.errors.ts#L33-L77). These errors are mapped to 403 and passed through verbatim by [authorization-error.mapper.ts lines 31–50](../../apps/backend/src/modules/identity/presentation/http/authorization-error.mapper.ts#L31-L50).

## Complete affected endpoint inventory

The following list is generated from the running OpenAPI contract. Every listed operation documents one or more error responses, and the corresponding message sources are currently English.

### Examples

| Method and path | Error statuses |
| --- | --- |
| `GET /api/v1/examples/probe/server-error` | 404, 500 |
| `POST /api/v1/examples` | 400 |
| `GET /api/v1/examples` | 400 |
| `GET /api/v1/examples/{id}` | 404 |

### Tenants

| Method and path | Error statuses |
| --- | --- |
| `POST /api/v1/tenants` | 400, 401, 403 |
| `GET /api/v1/tenants/{id}` | 401, 403, 404 |
| `PATCH /api/v1/tenants/{id}` | 400, 404, 409, 422 |
| `POST /api/v1/tenants/{id}/status` | 400, 404, 409, 422 |

### Users and credentials

| Method and path | Error statuses |
| --- | --- |
| `POST /api/v1/users` | 400, 401, 403, 409 |
| `GET /api/v1/users/{id}` | 401, 403, 404 |
| `PATCH /api/v1/users/{id}` | 400, 401, 403, 404, 409, 422 |
| `POST /api/v1/users/{id}/status` | 400, 401, 403, 404, 409, 422 |
| `PUT /api/v1/users/{id}/credential` | 400, 401, 403, 404, 409, 422 |

### Memberships

| Method and path | Error statuses |
| --- | --- |
| `POST /api/v1/tenants/{tenantId}/memberships` | 400, 401, 403, 404, 409 |
| `GET /api/v1/tenants/{tenantId}/memberships` | 400, 401, 403, 404 |
| `GET /api/v1/tenants/{tenantId}/memberships/{membershipId}` | 401, 403, 404 |
| `POST /api/v1/tenants/{tenantId}/memberships/{membershipId}/status` | 400, 401, 403, 404, 409, 422 |
| `GET /api/v1/users/{userId}/memberships` | 400, 401, 403, 404 |

### Roles and permissions

| Method and path | Error statuses |
| --- | --- |
| `POST /api/v1/tenants/{tenantId}/roles` | 400, 401, 403, 404 |
| `GET /api/v1/tenants/{tenantId}/roles` | 400, 401, 403, 404 |
| `GET /api/v1/tenants/{tenantId}/roles/{roleId}` | 401, 403, 404 |
| `PATCH /api/v1/tenants/{tenantId}/roles/{roleId}` | 400, 401, 403, 404, 409, 422 |
| `POST /api/v1/tenants/{tenantId}/roles/{roleId}/status` | 400, 401, 403, 404, 409, 422 |
| `POST /api/v1/tenants/{tenantId}/roles/{roleId}/permissions` | 400, 401, 403, 404, 409, 422 |
| `POST /api/v1/tenants/{tenantId}/roles/{roleId}/permissions/remove` | 400, 401, 403, 404, 409, 422 |
| `GET /api/v1/permissions` | 400, 401, 403 |
| `GET /api/v1/tenants/{tenantId}/memberships/{membershipId}/roles` | 400, 401, 403, 404 |
| `POST /api/v1/tenants/{tenantId}/memberships/{membershipId}/roles` | 400, 401, 403, 404, 409, 422 |
| `POST /api/v1/tenants/{tenantId}/memberships/{membershipId}/roles/{assignmentId}/remove` | 400, 401, 403, 404, 409, 422 |
| `GET /api/v1/tenants/{tenantId}/memberships/{membershipId}/effective-permissions` | 400, 401, 403, 404 |

### Authentication

| Method and path | Error statuses |
| --- | --- |
| `POST /api/v1/auth/sign-up` | 400, 409, 422 |
| `POST /api/v1/auth/sign-in` | 400, 401 |
| `GET /api/v1/auth/session` | 401 |
| `POST /api/v1/auth/sign-out` | 401 |

### Audit

| Method and path | Error statuses |
| --- | --- |
| `GET /api/v1/tenants/{tenantId}/audit-records` | 400, 401, 403, 404 |

## Backend handoff checklist

1. Translate the nine defaults in `api-error.registry.ts`.
2. Translate all validation constraints in `validation-error.mapper.ts`; keep `field` and `code` unchanged.
3. Translate the Identity messages used by sign-up, sign-in, session, sign-out, authorization, and credential management.
4. Translate all remaining module-owned `DomainError.message` and `ErrorDetail.message` values. These are serialized verbatim by the shared exception mapper.
5. Update the English examples in `api-error.dto.ts` and Swagger response descriptions where product documentation must also be Persian.
6. Add contract tests asserting Persian `message` and `details[].message` for at least 400, 401, 403, 404, 409, 422, and 500.
7. Do not translate or rename codes, categories, field identifiers, or correlation IDs.

If the product later supports more than one locale, the backend should instead keep returning stable codes and the client should localize by code. For the current Persian-only requirement, translating the backend's client-safe message fields is consistent as long as the stable machine fields remain unchanged.
