# 13 — API Conventions

How the REST/OpenAPI baseline of FND-006 is applied. The decisions themselves
are in ADR-013 and TECH-010; this document describes their implementation so a
new module can follow them without inventing its own rules.

## Scope

Applies to every HTTP endpoint served by the backend. The mechanism is installed
once in `apps/backend/src/bootstrap.ts`; a module adds only a controller, DTOs
and use cases.

## Base route and versioning

- Global prefix: `BACKEND_API_PREFIX` (default `/api`).
- Versioning: URI segments, default version `v1`, applied globally
  (`API_VERSION` in `infrastructure/api/api.constants.ts`).
- A business endpoint is therefore `/api/v1/<resource>`.

A controller must **not** hardcode a version segment:

```ts
// Correct — served as /api/v1/examples
@Controller('examples')
export class ExampleController {}
```

Operational endpoints (liveness/readiness) are not part of the public contract
and are declared `VERSION_NEUTRAL`, so they stay at `/api/health` — the path
Docker Compose and the frontend health panel depend on.

## Naming

- Resource paths are plural, lower-case and kebab-case (`/sales-invoices`).
- A use-case/command endpoint is a verb on a resource
  (`POST /api/v1/purchases/{id}/approve`), per ADR-013 section 3.
- A request/response DTO is separate from any domain entity (ADR-013 section 14);
  an entity is never serialized directly.

## Request validation

Validation runs at the boundary through one global pipe
(`infrastructure/api/validation/api-validation.pipe.ts`):

- unknown properties are rejected instead of silently dropped;
- the request is transformed into the DTO class, so defaults and `@Type`
  coercion apply;
- a failure becomes the standard error contract (below), never a raw validator
  message or a stack trace;
- submitted values are never echoed back.

Validation at this boundary does **not** replace a domain invariant: the domain
remains the final authority (ADR-013 section 7).

## Response conventions

- A successful response returns the resource representation directly — there is
  no success envelope.
- Status codes: `200` for a read, `201` for a create, `204` for a successful
  command with no body.
- Identifiers are UUID strings.
- Date-times are ISO-8601 in UTC (`toIsoDateTime`); a calendar date is
  `YYYY-MM-DD` with no time or timezone (`toIsoDate`).
- Money is `{ "amount": "<decimal string>", "currency": "<ISO 4217>" }`
  (`MoneyDto`). Money is never a JSON number.
- Enums are serialized as their string value.
- A nullable field is present with `null`, never omitted.
- A collection uses the pagination envelope below.

## Error contract

Every failure leaving the HTTP boundary has this shape
(`infrastructure/api/errors/`):

```jsonc
{
  "error": {
    "code": "VALIDATION_FAILED",
    "category": "validation",
    "message": "The request contains invalid values.",
    "correlationId": "2f0a4b1c-9c3d-4f2a-8b7e-0d1c2a3b4c5d",
    "details": [{ "field": "message", "code": "isString", "message": "message must be a string" }]
  }
}
```

- `code` is stable and switchable. Infrastructure codes are closed
  (`VALIDATION_FAILED`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`,
  `REQUEST_FAILED`, `DOMAIN_ERROR`, `INTERNAL_ERROR`); a business failure keeps
  the owning module's own code.
- `category` is `validation`, `client`, `domain` or `technical`, so a client can
  tell a business outcome from a bug.
- `correlationId` is echoed in the `x-correlation-id` response header and in the
  server-side log line for the same failure.
- A `5xx` never contains the exception message or a stack trace: the detail is
  logged server-side, redacted through the app's secret redactor. A `4xx` may
  carry an author-written client message.

A module raises a business failure by throwing a `DomainError` subclass from
`src/shared/errors/` (an allowed shared-kernel error primitive, ADR-002
section 10). It must be thrown from the domain/application layer, never from a
controller, and maps to `422` with `category: "domain"`.

Status mapping: `400` request failed / validation, `401` unauthorized, `403`
forbidden, `404` not found, `409` conflict, `422` domain error, `5xx` internal
error (generic).

## Pagination

List endpoints reuse `PaginationQueryDto` (`page`, `limit`; default `1` and
`20`, maximum `100`) and return the shared envelope:

```jsonc
{
  "data": [ /* items */ ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

`paginate()` / `paginationMeta()` build it. A module must not invent a different
shape; a concrete response class (for example `PaginatedExamplesDto`) is added
only so the generated OpenAPI document can describe the generic envelope.

## OpenAPI

- The document is generated from the running application (controllers,
  decorators, DTO metadata) — there is no hand-written spec.
- It is served in **development and test only**; a production installation
  returns the normal `404`. Publishing an internal contract is part of the API
  hardening work, not the baseline.
- UI: `/api/docs`; JSON: `/api/docs-json`; YAML: `/api/docs-yaml`.
- Endpoints and DTOs describe themselves with `@ApiTags`, `@ApiOperation`,
  `@ApiProperty` and the response decorators, so the contract stays synchronized
  with the implementation.

## Reference example

`ExampleController` (`/api/v1/examples`) is a non-business reference resource that
exercises validation, a success response, the error contract, pagination and the
OpenAPI document. It is replaced by the first real module, and exists so a new
module has a working template to copy.

## What a new module does

1. Add a controller under the module's `presentation/` with a plain
   `@Controller('<resource>')` (no version segment).
2. Declare request/response DTOs with validation and `@ApiProperty` metadata.
3. Reuse `PaginationQueryDto` for list endpoints.
4. Throw `ApiErrorException` for infrastructure failures and a `DomainError`
   subclass for business failures.
5. Add the endpoints to the module and import the module in `AppModule`.
6. Nothing else: prefix, versioning, validation, the error filter and the
   OpenAPI document are already applied globally.
