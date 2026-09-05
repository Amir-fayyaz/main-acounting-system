# Module Structure Convention

This is the mandatory file-organization convention for every bounded context.
All new Markdown documentation and source-level names are written in English.

## Layer dependency rule

```text
presentation -> application -> domain
infrastructure -> application/domain
domain -> no framework or infrastructure dependency
```

Controllers never call repositories directly. Prisma models, migrations, HTTP
DTOs, and framework decorators stay outside the Domain layer. Prisma is an
infrastructure concern; see `architecture/technical-decisions-mvp.md` for the
ORM decision.

## Required module layout

```text
src/modules/{module}/
├── domain/
│   ├── entities/          # Entities and aggregate roots
│   ├── value-objects/     # Immutable domain values
│   ├── events/            # Domain events only
│   ├── errors/            # Domain-specific errors
│   ├── services/          # Stateless domain services
│   ├── repositories/      # Repository ports/interfaces
│   ├── providers/         # Domain ports for external capabilities
│   └── index.ts           # Public domain exports
├── application/
│   ├── commands/          # Write use-case input models
│   ├── queries/           # Read use-case input models
│   ├── handlers/          # Use-case orchestration
│   ├── dto/               # Application results, not HTTP DTOs
│   ├── ports/
│   │   ├── inbound/       # Use-case interfaces
│   │   └── outbound/      # Application-owned dependency ports
│   ├── errors/            # Application/orchestration errors
│   └── index.ts           # Public application exports
├── infrastructure/
│   ├── persistence/
│   │   ├── prisma/        # Prisma client wrapper, repositories, mappers
│   │   └── migrations/
│   ├── providers/         # Concrete external-service adapters
│   ├── messaging/         # Outbox and broker adapters
│   └── configuration/
└── presentation/
    └── http/
        ├── controllers/
        ├── dto/            # class-validator request/response DTOs
        ├── guards/
        ├── pipes/
        └── serializers/
```

## Naming rules

- Entities: `*.entity.ts` or aggregate-specific names such as `user.ts`.
- Value objects: `*.value-object.ts`.
- Events: `*.event.ts`, named in the past tense.
- Errors: `*.error.ts`.
- Repository ports: `*.repository.ts`.
- Provider ports: `*.provider.ts`.
- Prisma adapters: `*.prisma-repository.ts` and Prisma model files under
  `infrastructure/persistence/prisma/`.
- Application handlers: `*.handler.ts`.
- HTTP DTOs: `*.request.dto.ts` and `*.response.dto.ts`.

## Separation rules

- One primary type per file. Supporting types get their own file when reused.
- `events`, `value-objects`, `errors`, `providers`, and `repositories` are
  always separate directories; they must not be merged into `entities` files.
- Domain repositories and providers are interfaces only. Implementations live
  in Infrastructure.
- Application handlers may depend on Domain ports, but Domain never imports
  Application.
- Prisma models live under `infrastructure/persistence/prisma/` and map to
  Domain objects through explicit mappers; Domain code never imports Prisma.
- Cross-module references use IDs and ports, not direct infrastructure imports.

## Required review check

Every pull request must verify that each new file has one clear layer and
responsibility, no Domain import comes from NestJS/Prisma, and no controller
accesses a repository without an Application handler.

