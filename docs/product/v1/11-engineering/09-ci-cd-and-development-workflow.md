# 09 — CI/CD و Development Workflow

## Workflow

```text
Issue
→ Branch
→ Implementation
→ Tests
→ Review
→ CI
→ Merge
→ Build Artifact
→ Deploy
```

## CI حداقل

- Formatting/Lint
- Type Check
- Unit Tests
- Integration Tests
- Contract Tests
- Build
- Dependency/Security Checks

## Review

تغییرات مربوط به Accounting، Security، Tenant Isolation، Migration و Agent Execution باید Review عمیق‌تری داشته باشند.

## Branch

Branch کوتاه‌عمر و مرتبط با Issue باشد.

## Merge

Merge بدون CI موفق و Review لازم مجاز نیست.

## Deployment

Image immutable و versioned ساخته می‌شود. Configuration و Secret خارج از Image باقی می‌مانند.
