# Security Documentation — Index

Audits and remediation plans for the accounting monorepo, produced 2026-11-08 from static review of
`apps/backend`, `apps/frontend` and `packages/web`.

| Document | What it is | Audience |
| --- | --- | --- |
| [backend-security-audit-2026-11-08.md](./backend-security-audit-2026-11-08.md) | Findings `B1`–`B14` with file/line evidence, severity and impact | Backend devs, reviewer |
| [backend-remediation-plan.md](./backend-remediation-plan.md) | The fix for each backend finding: shape, tests, acceptance criteria | Backend devs |
| [frontend-security-audit-2026-11-08.md](./frontend-security-audit-2026-11-08.md) | Findings `F1`–`F14`, plus what is already correct | Frontend devs, reviewer |
| [frontend-remediation-plan.md](./frontend-remediation-plan.md) | The fix for each frontend finding, with acceptance criteria | Frontend devs |
| [architecture-remediation-patterns.md](./architecture-remediation-patterns.md) | `PR-1`…`PR-9`: the structural changes that prevent the next batch of findings | Tech lead, architect |

## Read this first

Two findings are release blockers on their own:

- **`B1`** — any tenant administrator can reset the password of a user in another company and sign in as them.
  The identity endpoints are declared as platform capabilities, and platform evidence is the union of the
  caller's memberships.
- **`F1` + `F2`** — the whole `/panel` tree is declared public in `src/proxy.ts`, and password recovery is a
  simulation that reports success.

## Status of this documentation

These documents describe the code as of the 2026-11-08 audit commit. They are not a certification: no dynamic
testing, penetration testing, `pnpm audit`, infrastructure, TLS, backup or frontend-visual review was performed.
Suggested next steps, in order: dependency/CVE scan, an e2e authentication matrix run against a real database,
and a review of the deployment topology for the proxy/CORS decisions (`B4`, `B9`, `F3`).

## Conventions

- Finding ids are stable: `B*` backend, `F*` frontend, `PR-*` shared pattern. Refer to them in commit messages
  and PR descriptions so a fix can be traced back to the evidence.
- Every remediation item names the test that proves it. A fix without that test is not done.
- `docs/product/v1/11-engineering/06-security-engineering.md` remains the normative engineering standard;
  where these plans propose a change to a standard, the change should be reflected there too.
