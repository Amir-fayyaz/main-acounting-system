# Technology Decisions

تصمیم‌های تکنولوژیک تأییدشده MVP:

- Backend: NestJS + TypeScript
- Database: MySQL
- ORM/Data Access: Drizzle ORM + mysql2
- Frontend: Next.js + TypeScript
- UI: Desktop-first Web + Internal Design System
- Auth: Internal Authentication/Authorization با قابلیت اضافه‌کردن OIDC/LDAP/SSO در آینده
- Redis: Event Bus داخلی + Queue/Cache محدود
- File Storage: MinIO
- API: REST + OpenAPI
- Repository: Monorepo
- Containers: Docker + Local Compose
