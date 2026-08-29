# Accounting SaaS Backend

NestJS modular monolith for the MVP. The code follows Clean Architecture and
Hexagonal boundaries so selected workers can be extracted to Go later.

## Run

```bash
npm install
npm run start:dev
```

## Structure

Each business module is organized as `domain`, `application`,
`infrastructure`, and `presentation`. Domain code must not import NestJS,
Prisma, HTTP, or provider SDKs. Controllers call application use cases; they
do not call repositories directly.

See `../wiki/architecture/evolutionary-architecture.md` and
`../wiki/architecture/technical-decisions-mvp.md` for the architectural
decisions.
