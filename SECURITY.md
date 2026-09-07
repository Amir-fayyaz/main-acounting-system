# Security Policy

## ⚠️ Project Status

**Accounting SaaS is under active MVP development and is NOT production-ready.**

Please do **not** deploy this software against real financial data, real
customer data, or any production environment. The codebase is being shaped
toward a future production release, but at this stage:

- Security hardening is incomplete
- Some attack surfaces have not been reviewed yet
- Operational safeguards (rate limiting, WAF, audit logging) are not yet in
  place
- The threat model is still being defined

We welcome vulnerability reports so we can fix issues before they reach
production — but please be patient, and please respect the disclosure
process below.

---

## Supported Versions

Use this table to understand which versions of the project currently receive
security updates.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | ✅ Active development |
| latest tagged release | ⚠️ Best effort   |
| older releases        | ❌ No support    |

Because the project has not yet published a 1.0 release, **only the `main`
branch receives security fixes**. Older commits and unmerged branches are
considered unsupported.

---

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, use one of the following **private** channels:

### Preferred: GitHub Security Advisories

Open a private security advisory:

> 👉 <https://github.com/<OWNER>/<REPO>/security/advisories/new>

GitHub Advisories let us discuss the issue, review a proposed fix, and
coordinate disclosure in a private workspace.

### Alternative: Email

If you cannot use GitHub Advisories, email the maintainers directly. The
current maintainer contact address is the one listed in the repository's
"People" or "Settings → People" tab.

---

## What to Include in Your Report

A good report helps us fix the issue faster. Please include as much of the
following as you can:

1. **Summary** — a one- or two-sentence description of the vulnerability
2. **Affected component(s)** — module, file, endpoint, or feature
3. **Affected version(s)** — commit SHA, branch, or tag
4. **Vulnerability type** — e.g. SQL injection, IDOR, auth bypass, RCE,
   information disclosure
5. **Severity assessment** — your own CVSS score, if you have one
6. **Attack scenario** — what does an attacker need, and what do they get?
7. **Reproduction steps** — minimal reproducible example, `curl` commands,
   screenshots — **with all real data anonymized or fictionalized**
8. **Impact** — what is the worst realistic outcome?
9. **Suggested fix** — if you have one, share it (we will still do our own
   analysis)
10. **Disclosure plans** — whether you plan to disclose publicly, and on
    what timeline
11. **Your contact info** — so we can follow up

> 🚫 **Never include real customer data, real financial records, real API
> tokens, or any non-public business information in your report.** Use
> obviously-fake values like `tenant_42`, `invoice_0001`, `555-0100`.

---

## Our Commitment

When you submit a report through the channels above, we commit to:

| Step | Our target |
| ---- | ---------- |
| **Acknowledge receipt** | within **3 business days** |
| **Initial triage** | within **10 business days** |
| **Status updates** | at least every **14 days** until resolution |
| **Patch in `main`** | as soon as a fix is verified |
| **Credit** | in the release notes / advisory, unless you ask to remain anonymous |
| **Coordinated disclosure** | we will agree on a disclosure date with you |

These targets are best-effort for an MVP-stage project and may slip. We will
keep you informed if they do.

---

## Disclosure Policy

We follow a **coordinated disclosure** model:

1. You report the issue privately.
2. We investigate, develop a fix, and prepare a release.
3. We agree on a disclosure date — typically **90 days** after the report,
   or sooner if a fix is ready.
4. After the fix is released, the advisory is published publicly with full
   credit to the reporter (unless they prefer anonymity).

We may shorten the timeline if:

- The vulnerability is being actively exploited
- The vulnerability is already publicly known
- The fix is trivial and low-risk to deploy

We may lengthen the timeline if:

- The fix requires significant architectural change
- A maintainer is unavailable for an extended period

---

## Out-of-Scope Issues

The following are generally **out of scope** for security advisories and are
better handled as regular bug reports:

- 🐛 Missing security headers that have no demonstrable impact (issues still
  welcome, just not as "security")
- 🐛 Rate limiting not enforced (planned feature, not yet implemented)
- 🐛 Lack of HTTPS enforcement in development tooling
- 🐛 UI/UX issues that don't expose data or enable privilege escalation
- 🐛 Theoretical attacks that require capabilities the attacker does not
  realistically have (e.g. physical access to a developer's machine)

If you're unsure, report it anyway — we'll triage.

---

## Recognition

We are grateful to security researchers who help us improve. With your
permission, we will:

- Credit you in the GitHub Security Advisory
- Credit you in the release notes
- Mention you in a future `SECURITY.md` acknowledgements section once the
  project matures

If you'd like to remain anonymous, just say so in your report — we will
respect that.

---

## Security-Related Configuration

A few notes for deployers and operators:

- 🔐 **Generate strong secrets with:** `openssl rand -base64 48`
- 🔐 **Never commit `.env` files.** They are git-ignored by default.
- 🔐 **Rotate `JWT_ACCESS_SECRET`** if you suspect it has been exposed.
- 🔐 **Run migrations only against isolated environments** in development.
  Never run untrusted migrations against production.

> 📖 See [`wiki/architecture/security.md`](wiki/architecture/security.md) for
> the full security model and
> [`wiki/operations/developer-runbook.md`](wiki/operations/developer-runbook.md)
> for the operational checklist.

---

## Contact Summary

| Channel | When to use |
| ------- | ----------- |
| 🔐 GitHub Security Advisories | All security reports (preferred) |
| ✉️ Maintainer email | If you can't use GitHub Advisories |
| 🐛 GitHub Issues | Non-security bugs only |
| 💬 GitHub Discussions | Questions, ideas, non-sensitive concerns |

---

Thank you for helping us ship a more secure product. 🙏

**Last updated:** 2026
