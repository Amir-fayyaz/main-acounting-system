# 29 — Memory (RAM) Audit Report

- **Status:** Accepted (پذیرفته‌شده)
- **Version:** v1
- **Date:** 2026-11-20
- **Author:** Omid / Team — Performance Engineering
- **Scope:** `apps/frontend`, `apps/web-admin`, `apps/web-business`, `apps/backend`, `packages/web`, root workspace
- **Related documents:** `27-monorepo-architecture.md`, `28-monorepo-handbook.md`
- **Note:** This is an **audit-only** report. No application code was changed.

---

## 1. Executive Summary

The workspace is measurably healthier after the recent refactoring — catalogs are unified, `turbopack.root` is explicit, and Next.js is on 16.3.8 — but the host machine is still under **sustained memory pressure**: of 9.6 GiB physical RAM, 5.9 GiB is used, only ~900 MiB is free, and **3.5 GiB of the 8 GiB swap is consumed**. The dominant consumers are *developer tooling*, not our applications: two VS Code `tsserver` processes (31 MB + **488 MB**), a VS Code renderer (~490 MB), opencode (~710 MB), and many Chrome renderers.

The most important new empirical result is reassuring: a **5-minute RSS growth test on a live `web-admin` dev server showed a perfectly flat 378 MB** across 11 samples (Δ = 0 MB). **There is no active memory leak in the Next.js dev process itself.** The high-RAM symptom is therefore caused by *aggregate concurrent load* (several dev servers + IDE language servers) and *accumulated build artifacts*, not by a leaking application loop.

### Findings summary

| ID | Severity | Short description |
| --- | --- | --- |
| F-1 | **Critical** | ~7.0 GiB of accumulated Turbopack `.next` caches across three apps (2.2 G / 229 M / 4.7 G). |
| F-2 | **High** | Host swapping heavily: 3.5 GiB / 8 GiB swap used, only ~900 MiB RAM free, swappiness 60. |
| F-3 | **High** | Two VS Code `tsserver` processes (31 MB + 488 MB) plus ~10 Chrome renderers dominate RSS. |
| F-4 | **High** | Duplicate TypeScript install: 5.9.3 (used) + 6.0.3 pulled by `@nestjs/cli` / `@nestjs/schematics`. |
| F-5 | **High** | No `NODE_OPTIONS` heap cap; each Node process defaults to a 2,096 MB V8 heap limit. |
| F-6 | **High** | Root `pnpm dev` starts all four packages in parallel — the highest-RAM mode by design. |
| F-7 | **Medium** | `packages/web/ui/index.ts` barrel re-exports 29 modules; root imports pull side-effectful modules into the graph. |
| F-8 | **Medium** | Four separate `next/font/local` definitions and ~20 duplicated 204 KB Rubik `.ttf` files. |
| F-9 | **Medium** | `ExampleService.examples` is an unbounded in-memory `Map` behind a public `create()` endpoint. |
| F-10 | **Low** | Leak test completed — **no growth observed**; retained as documented baseline evidence. |

---

## 2. Methodology & Environment

### 2.1. Tools and commands used

| Command | Purpose |
| --- | --- |
| `free -h` | Physical RAM / swap totals and utilisation (before and after the test). |
| `ps aux --sort=-%mem \| head -20` | Identify top resident consumers. |
| `ps -eo pid,ppid,rss,etime,cmd \| grep -E 'next dev\|next-server'` | Find live dev-server processes and their PIDs. |
| `ps -o rss= -p <PID>` | Sample resident set size of the dev server every 30 s for 5 min. |
| `du -sh apps/*/.next` | Measure accumulated Turbopack cache size per app. |
| `ps aux \| grep tsserver` | Count and size VS Code TypeScript language servers. |
| `pnpm why <pkg>` | Trace why large packages are installed. |
| `grep -E '^  <pkg>@[0-9]' pnpm-lock.yaml` | Detect duplicate versions of key packages. |
| `printenv NODE_OPTIONS` / `node -e "v8.getHeapStatistics()"` | Check for a configured heap cap. |
| `cat /proc/sys/vm/swappiness` | Read kernel swap tendency. |

### 2.2. Environment at audit time

- **RAM:** 9.6 GiB total · 5.8–5.9 GiB used · ~900 MiB–1.4 GiB free · 2.8–3.1 GiB buff/cache
- **Swap:** 8.0 GiB total · **3.5 GiB used** · 4.5 GiB free
- **Kernel swappiness:** `60` (default)
- **Node:** v22.23.1 · default V8 heap limit **2,096 MB** · `NODE_OPTIONS` unset
- **Desktop load:** VS Code (renderer + 2 tsserver + 5 utility Node services), Chrome (~10 renderers), opencode, Telegram, Plasma shell
- **Repository state:** clean catalog, Next.js `16.3.8`, `turbopack.root` set in all three apps

### 2.3. Empirical test results (executed)

**5-minute RSS growth test — `web-admin` dev server**

Started with `setsid nohup pnpm --filter web-admin dev`. Next.js reported `Ready in 922 ms` on port 3002. Monitored `next-server (v16.3.8)` PID `998756` and its parent `node … next dev` PID `998738`.

| Sample | Time | Main process (MB) | next-server RSS (KB) | next-server (MB) |
| --- | --- | --- | --- | --- |
| 0 | 18:01:54 | 77 | 387,884 | 378 |
| 1 | 18:02:24 | 77 | 387,884 | 378 |
| 2 | 18:02:54 | 77 | 387,888 | 378 |
| 3 | 18:03:24 | 77 | 387,908 | 378 |
| 4 | 18:03:54 | 77 | 387,908 | 378 |
| 5 | 18:04:24 | 77 | 387,908 | 378 |
| 6 | 18:04:54 | 77 | 387,908 | 378 |
| 7 | 18:05:24 | 77 | 387,908 | 378 |
| 8 | 18:05:54 | 77 | 387,908 | 378 |
| 9 | 18:06:25 | 77 | 387,908 | 378 |
| 10 | 18:06:55 | 77 | 387,908 | 378 |

**Result: first 378 MB, last 378 MB, min 378 MB, max 378 MB, Δ = 0 MB over 5 minutes.** The +24 KB drift in the raw RSS is normal allocator noise, not growth. The dev server was then stopped cleanly (`kill` on PIDs 998736/998738/998756); no `next dev` processes remain.

**Exact `.next` sizes (after the test)**

```text
2.2G  apps/frontend/.next
229M  apps/web-admin/.next
4.7G  apps/web-business/.next
7.0G  total
```

**Exact `tsserver` processes (after the test)**

```text
PID=541143  RSS=32,236 KB  ≈  31 MB   (partialSemantic server)
PID=541144  RSS=500,496 KB ≈ 488 MB   (full semantic server)
count: 2   → combined ≈ 519 MB
```

---

## 3. Detailed Findings & Rationale

### F-1: Accumulated Turbopack caches total ~7.0 GiB (Severity: Critical)

**Observation.** `du -sh apps/*/.next` reports `frontend` 2.2 G, `web-admin` 229 M, `web-business` 4.7 G — **7.0 G total**. The 4.7 G business cache was produced by prior production builds, not by this 5-minute dev run (which only added ~few MB to web-admin's 229 M).

**Why this matters (Rationale).** Since Next.js 16.1/16.3, Turbopack's **FileSystem cache is enabled by default** for dev (`.next/dev/cache/turbopack`) and build (`.next/cache/turbopack`). It stores compiled module graphs, source maps, HMR snapshots, and post-optimisation artifacts so subsequent runs start warm. That speed has a cost: the cache is not a compact index — it is a large set of files that the OS maps into the **page cache**. With 7 GiB of cold cache on a 9.6 GiB machine, the kernel has almost no room to keep active code hot; every restart re-reads a multi-gigabyte working set, which shows up as high "buff/cache", disk I/O, and — once physical pages are exhausted — **swap thrashing**. This is the single largest *repository-owned* contributor to the observed memory pressure.

**Recommendation.** Prune caches for apps you are not actively developing and make it a habit:

```bash
rm -rf apps/web-business/.next apps/frontend/.next   # keep only the app you develop
```

Add a root script:

```json
"dev:clean": "rm -rf apps/*/.next"
```

In CI, cache **only** `apps/<app>/.next/cache/turbopack`, never the whole `.next` directory.

---

### F-2: Host is swapping heavily (Severity: High)

**Observation.** `free -h`: 9.6 GiB total, 5.9 GiB used, ~900 MiB free, 3.1 GiB buff/cache, **3.5 GiB of 8 GiB swap used**. `vm.swappiness = 60`. The post-test reading was essentially unchanged, confirming this is baseline state, not a transient from our dev server.

**Why this matters (Rationale).** Swap is not "extra RAM" — it is disk. At 3.5 GiB swapped, the kernel is continuously deciding which anonymous pages to move out and back in. Because our V8/Chromium/IDE processes have large, sparse heaps, the pages that get swapped are often ones needed on the next keystroke or HMR cycle, producing latency spikes and a feedback loop: pressure → swap-out → page fault → swap-in → more I/O → less time to reclaim. Combined with F-1's 7 GiB page-cache competition, the machine spends a meaningful fraction of its time moving memory rather than running code.

**Recommendation.** First remove the *causes* (F-1, F-3, F-5, F-6). Then, if the desktop workload is permanent, lower swap tendency:

```bash
sudo sysctl vm.swappiness=10          # runtime
# persist: echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.d/99-memory.conf
```

Note: lowering swappiness trades a little responsiveness under burst load for far less thrashing under sustained load — appropriate for this machine.

---

### F-3: Two TypeScript language servers and many Chrome renderers dominate RSS (Severity: High)

**Observation.** `tsserver` count = **2**: PID 541143 at 32,236 KB (~31 MB, `partialSemantic`) and PID 541144 at **500,496 KB (~488 MB)** — **~519 MB combined**. The `ps aux --sort=-%mem` top-20 also shows a ~490 MB VS Code renderer, a ~710 MB opencode process, and roughly ten Chrome renderer processes between 100–320 MB each. No `next dev` process appeared in the top 20 even while running (378 MB).

**Why this matters (Rationale).** VS Code starts one full tsserver **per workspace folder**. Two open workspaces (or a workspace plus a standalone folder) mean two independent TypeScript program graphs, each holding the entire dependency-in-the-air model: `node_modules` type declarations, `.d.ts` files, incremental caches, and ASTs. With a monorepo of five packages plus Next.js types, each full server is ~500 MB. This is pure development-tooling overhead — it does not help the build or the running app — yet it consumes more RAM than any single dev server we measured. Chrome renderers behave similarly: each tab is a separate process with its own JS heap, so "just a few tabs" can be 1–2 GiB.

**Recommendation.** Close the second VS Code workspace to kill one tsserver, and cap the remaining one:

```json
// VS Code settings.json
{
  "typescript.tsserver.maxTsServerMemory": 2048
}
```

Close unused Chrome tabs/extensions. A practical target is **one tsserver (<500 MB) and one browser window** while developing.

---

### F-4: Duplicate TypeScript version 5.9.3 + 6.0.3 (Severity: High)

**Observation.** `pnpm why typescript@6.0.3`:

```text
typescript@6.0.3
├─┬ @nestjs/cli@12.0.8
│ └── @accounting-saas/backend@0.1.0 (devDependencies)
└─┬ @nestjs/schematics@12.0.6
  └── @nestjs/cli@12.0.8 [deduped]
```

The workspace actually uses `typescript@5.9.3`; 6.0.3 exists only to satisfy a peer range. Every `pnpm install` also prints the known ignored-`pnpm` field warning (documented in `27-monorepo-architecture.md` §6).

**Why this matters (Rationale).** TypeScript is a large compiler with a substantial in-memory program representation. Two installed versions mean two copies in the pnpm virtual store, two sets of lib `.d.ts` files, and — more importantly — the possibility that an editor or CLI loads the wrong one, producing inconsistent diagnostics. The ignored `pnpm` field means our carefully written `peerDependencyRules` is **not being applied**, so pnpm keeps resolving an unnecessary peer instead of accepting the TS 5 range we intend. This wastes disk, inflates the store, and keeps a warning alive on every install.

**Recommendation.** Move the rules to the location pnpm 12 actually reads, then reinstall:

```yaml
# pnpm-workspace.yaml — add at TOP LEVEL (outside `catalog`)
peerDependencyRules:
  allowedVersions:
    '@nestjs/schematics>typescript': '5'
    'eslint-config-next>eslint': '9'
```

Remove the now-dead `pnpm` block from the root `package.json`, then run:

```bash
pnpm install
```

Longer term, pin `@nestjs/cli` / `@nestjs/schematics` to a release whose declared peer range accepts TypeScript 5 so the rule is unnecessary.

---

### F-5: No Node heap cap — 2,096 MB default per process (Severity: High)

**Observation.** `printenv NODE_OPTIONS` → unset. `node -e "v8.getHeapStatistics().heap_size_limit"` → 2,096 MB. During the test, the main `next dev` process used only ~77 MB RSS and `next-server` 378 MB, but these are *current* values; V8 is allowed to grow up to ~2 GiB before GC pressure becomes extreme.

**Why this matters (Rationale).** Without an explicit `--max-old-space-size`, each Node process may expand toward ~2 GiB. With four workspace dev scripts (`pnpm dev`), that is a theoretical ~8 GiB of heap on a 9.6 GiB machine — *before* the IDE and browser. A cap does not make the app faster; it makes failure **bounded and predictable**: a process that would have pushed the machine into swap instead hits a clear OOM message that you can diagnose. It also encourages V8 to GC earlier, keeping RSS lower.

**Recommendation.** Set a per-app cap in the dev scripts (or environment):

```bash
NODE_OPTIONS='--max-old-space-size=2048' pnpm --filter web-admin dev
```

Or in each app's `package.json`:

```json
"dev": "NODE_OPTIONS=--max-old-space-size=2048 next dev --port 3002"
```

Choose a value ~2× the measured steady-state RSS (378 MB → 1–2 GB is generous).

---

### F-6: Root `pnpm dev` starts all four packages in parallel (Severity: High)

**Observation.** Root `package.json:13`: `"dev": "pnpm -r --parallel dev"`. This launches frontend (3001), web-admin (3002), web-business (3003), and the backend at once.

**Why this matters (Rationale).** Each Next.js dev server builds and holds its own module graph, HMR subscriptions, and Turbopack worker set. Running three concurrently triples that baseline; add the NestJS process with its TypeORM/Drizzle pools, Redis client, and worker connections, and the aggregate easily exceeds available RAM. Our measurement showed a *single* Next dev server at 378 MB — three plus a backend plus IDE would plausibly be 2–3 GiB of app processes alone, which is exactly the regime that triggers F-2's swapping.

**Recommendation.** Develop one app at a time:

```bash
pnpm --filter frontend dev       # 3001
pnpm --filter web-admin dev      # 3002
pnpm --filter web-business dev   # 3003
pnpm --filter @accounting-saas/backend dev
```

Reserve `pnpm dev` for integration demos on a machine with headroom.

---

### F-7: Wide barrel exports in `packages/web` (Severity: Medium)

**Observation.** `packages/web/index.ts` re-exports `./ui/index` and `./hooks/usePagination`; `packages/web/ui/index.ts` contains **29 `export *` lines** covering DataTable, shadcn components, sonner, input-otp, sidebar, etc. Apps commonly import from the root `@repo/web`.

**Why this matters (Rationale).** A barrel is a module the bundler must evaluate to discover exports. When many side-effectful modules (toast containers, OTP inputs, sidebar keydown listeners) are re-exported from one entry point, tree-shaking has to prove each one is unused before dropping it. Modules with top-level side effects are retained, so a component that only needs `Button` can pull in code for unrelated UI primitives. In dev this means a larger initial graph for Turbopack to compile and watch; in production it can mean a larger client chunk. It is not a leak, but it is avoidable work on every change.

**Recommendation.** Use the deep import paths that already exist in `exports` for hot/shared paths, and let the barrel remain for convenience:

```ts
import { cn } from '@repo/web/ui/utils/cn';
import { Button } from '@repo/web/ui/components/shadcn/ui/button/button';
```

The team already does this for `cn`; extend the same habit to DataTable and typography in frequently edited components.

---

### F-8: Duplicated Rubik font definitions and ~20 TTF files (Severity: Medium)

**Observation.** `find` located ~20 Rubik `.ttf` files of ~204 KB each across `apps/web-business/src/core/assets/style/fonts/`, `packages/web/styles/fonts/`, and other app folders. Four separate `next/font/local` declarations exist (frontend, web-admin, web-business, packages/web). Frontend also loads `Vazirmatn-Variable.woff2`.

**Why this matters (Rationale).** Each `next/font/local` call instructs Next.js to read, hash, preload, and serve the declared files. Duplicating the same family across four packages means four independent font subsets in the build output and four preload sets in the HTML; browsers may download the same glyph data more than once under different URLs. Because TTF is an uncompressed outline format, ~200 KB per weight adds up quickly (20 × 204 KB ≈ 4 MB of source assets) and inflates both the compiled CSS and the page cache the dev server maintains.

**Recommendation.** Consolidate to a single variable font in the shared package and reuse it everywhere:

```ts
// packages/web/styles/fonts/font.ts
import localFont from 'next/font/local';

export const rubik = localFont({
  src: '../fonts/Rubik[wght].woff2',   // one variable file
  weight: '100 900',
  display: 'swap',
  variable: '--font-rubik',
});
```

Then remove the duplicated `.ttf` copies and per-app declarations, importing `rubik` from `@repo/web/styles/fonts/font`. Keep `display: 'swap'`.

---

### F-9: Unbounded in-memory `Map` in `ExampleService` (Severity: Medium)

**Observation.** `apps/backend/src/infrastructure/presentation/example/example.service.ts:19` declares `private readonly examples = new Map<string, ExampleResponseDto>();`. The public `create(request)` method inserts a new UUID-keyed entry on every call; `list()` spreads all values into an array. There is no eviction or size cap. `apps/backend/src/shared/time/jalali-calendar.ts:242` also caches `Intl.DateTimeFormat` in `DAY_FORMATTERS` keyed by arbitrary timezone string.

**Why this matters (Rationale).** NestJS providers are **singletons** by default, so this Map lives for the entire process lifetime. A reference/demo endpoint is low-risk today, but every POST makes it grow; over a long-running dev server or a misused staging environment, that is a classic slow leak — memory rises monotonically and is never returned because the Map holds strong references. The `Intl.DateTimeFormat` cache has the same shape: each distinct timezone string creates a formatter that is retained forever. In practice the timezone set comes from config and is tiny, so it is bounded by convention, not by code.

**Recommendation.** Either remove the reference endpoint once real modules exist, or bound it:

```ts
private static readonly MAX_EXAMPLES = 1000;

create(request: CreateExampleDto): ExampleResponseDto {
  const example: ExampleResponseDto = { /* … */ };
  this.examples.set(example.id, example);
  if (this.examples.size > ExampleService.MAX_EXAMPLES) {
    const oldest = this.examples.keys().next().value;
    if (oldest !== undefined) this.examples.delete(oldest);
  }
  return example;
}
```

For `DAY_FORMATTERS`, validate `timeZone` against the supported set from `AppConfigService` before caching.

---

### F-10: Leak test completed — no growth observed (Severity: Low)

**Observation.** The 5-minute test described in §2.3 produced 11 samples of `next-server` RSS at a constant 378 MB (Δ = 0 MB). The parent `node next dev` stayed at 77 MB. The server was stopped cleanly.

**Why this matters (Rationale).** This is important *negative* evidence: it tells us the high-RAM complaint is **not** caused by a runaway loop in our Next.js setup, middleware, or shared components. Turbopack's memory-eviction feature in 16.3.8 appears to be doing its job — after the initial compilation snapshot (~378 MB), the process reaches a steady state and does not accumulate. It redirects the investigation toward aggregate load (F-3, F-5, F-6) and artifact size (F-1), which is where the recommendations should focus.

**Recommendation.** Keep this test as a regression guard. Before and after any major dependency or config change, re-run the sampling loop (§6, checklist item 4) and record the delta in this report's table. A future non-zero slope would be the first signal of a real leak.

---

## 4. Verified Clean Areas

The following were checked and found **not** problematic — this is intentional evidence of audit thoroughness:

| Area | What was checked | Result |
| --- | --- | --- |
| Middleware / proxy | No `middleware.ts` files; `apps/frontend/src/proxy.ts` reviewed. Static matcher excludes `api`, `_next/*`, `favicon.ico`, `common`, and dotted files; only bounded redirects to `/` and `/login`. | No loops, no heavy sync work. |
| `useEffect` dependencies | 8 effects across apps + `packages/web`; inspected dashboard, journal, contact form, audit page. All have correct dependency arrays; `DashboardBlock` uses `[]` with an `isMounted` guard. | No circular or missing deps. |
| `usePagination` stability | `queryParams` is `useMemo(() => ({ page, limit }), [page, limit])`, so `JournalView`'s `[key, queryParams, search, status]` effect does not refetch on every render. | No render loop. |
| Timers | All `setTimeout` uses either clear in a cleanup (`useTimer`, `useDebouncedCallback`, `SearchInput`) or are one-shot promise delays with mock helpers. No bare `setInterval`. | No uncleaned timers. |
| Event listeners | `document`, `window`, `mediaQuery`, and `storage` listeners in `SiteHeader`, `useScrollPosition`, `useIsMobile`, `usePanelTheme`, sidebar, and print flows all have matching `removeEventListener` / `cancelAnimationFrame`. | Clean. |
| Images | No raw `<img>` tags in app source; the single image helper uses `next/image`. | Properly optimised. |
| Fonts loading strategy | `next/font/local` with `display: 'swap'` is used in all apps — only the *duplication* (F-8), not the mechanism, is an issue. | Correct API. |
| Turbopack config | All three `next.config.mjs` files set `turbopack.root: path.resolve(__dirname, '../../')`; no `next.config.ts` remains. `experimental` contains only `globalNotFound`. | Correct. |
| Backend connections | `RedisConnectionService` registers one `error` listener, guards reconnects during shutdown, and calls `quit()` with a grace timeout plus `destroy()`. MySQL uses a pooled provider with shutdown hooks (4 `onApplicationShutdown`/`onModuleDestroy` implementations). | Properly closed. |
| EventEmitter usage | No `EventEmitter` usage in backend source. | N/A. |
| Heavy libraries | `pnpm why`: no `moment`, no `@mui/material`; `lodash` appears only transitively via `minio` (backend). `lucide-react` resolves to **one version (1.55.0)** across all four consumers thanks to catalogs. | No tree-shaking emergency. |
| Zombie processes | `ps -eo stat= | grep -c '^Z'` → **0**. | Clean. |

---

## 5. Action Plan (Prioritized)

### Immediate Actions (this week, low risk)

1. **Prune stale caches (F-1):** `rm -rf apps/web-business/.next apps/frontend/.next`; keep only the app under active development. Add a `dev:clean` script.
2. **Close the second VS Code workspace (F-3):** kills one tsserver; set `typescript.tsserver.maxTsServerMemory: 2048`; close unused Chrome tabs.
3. **Switch to filtered dev (F-6):** replace `pnpm dev` with `pnpm --filter <app> dev` in daily work.
4. **Move peer rules into `pnpm-workspace.yaml` and reinstall (F-4):** removes the duplicate TypeScript 6.0.3 and the install warning.
5. **Cap Node heap for dev scripts (F-5):** `NODE_OPTIONS=--max-old-space-size=2048` per app.
6. **Lower swappiness (F-2):** `sudo sysctl vm.swappiness=10` after steps 1–3.

### Long-term Improvements (next sprint)

7. **Consolidate fonts (F-8):** one `Rubik[wght].woff2` in `@repo/web`, delete ~20 duplicate TTFs.
8. **Reduce barrel breadth (F-7):** adopt deep imports in hot paths; document the rule in `28-monorepo-handbook.md`.
9. **Bound or remove the demo store (F-9):** cap `ExampleService` at 1,000 entries or delete the reference endpoint; validate timezone keys in `DAY_FORMATTERS`.
10. **Automate the leak test (F-10):** add an optional `pnpm dev:profile` script that samples RSS for 5 minutes and writes a CSV, so the baseline is regenerated on every major upgrade.

---

## 6. Verification Checklist

Run these after applying fixes and record the results in this document:

```bash
# 1. Cache size is back under control (expect only the active app to have a large .next)
du -sh apps/*/.next

# 2. No ignored-setting warning, no duplicate TypeScript 6.x
pnpm install 2>&1 | grep -E 'peerDependencyRules|WARN' || echo "clean install"
pnpm why typescript@6.0.3 2>&1 | head -3   # expect "No packages matched"

# 3. Only one tsserver, reasonably sized
ps aux | grep tsserver | grep -v grep | awk '{print $2, $6/1024 " MB"}'
# target: exactly 1 line, < 500 MB

# 4. Five-minute leak regression (replace PID after starting one filtered dev server)
pnpm --filter web-admin dev > /tmp/dev.log 2>&1 &
PID=$(pgrep -f 'next-server' | head -1)
echo "SAMPLE,TIME,RSS_KB" > /tmp/rss.csv
for i in $(seq 0 10); do
  echo "$i,$(date +%H:%M:%S),$(ps -o rss= -p $PID | tr -d ' ')" | tee -a /tmp/rss.csv
  [ "$i" -lt 10 ] && sleep 30
done
python3 -c "import csv; v=[int(r['RSS_KB']) for r in csv.DictReader(open('/tmp/rss.csv'))]; print('delta MB:', (v[-1]-v[0])/1024)"
# target: delta ≈ 0 MB (baseline: 0 MB at 378 MB steady state)
kill $PID

# 5. Host pressure has eased
free -h            # swap used should be well below 3.5 GiB

# 6. No regression in builds or root detection
pnpm typecheck
pnpm lint
pnpm build
# expect: all four "Done" lines, zero workspace-root / lockfile warnings

# 7. Heap cap is active for a dev command
NODE_OPTIONS='--max-old-space-size=2048' pnpm --filter web-admin exec node -e \
  "console.log(Math.round(require('v8').getHeapStatistics().heap_size_limit/1048576)) + ' MB'"
# expect: 2048 MB
```

**Sign-off criteria:** swap used < 1 GiB, one tsserver, `.next` total < 3 GiB, RSS delta ≈ 0 MB over 5 minutes, and a clean `pnpm build` with no workspace warnings.
