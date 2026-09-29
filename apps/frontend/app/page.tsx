import { fetchBackendReadiness } from '@/lib/api-client';
import { getPublicApiBaseUrl } from '@/lib/env';

/**
 * Application shell with a local infrastructure status panel.
 *
 * The panel is a development aid that proves the frontend can reach the backend
 * through the documented configuration (FND-002). It reads only operational
 * endpoints and contains no business logic or business data; real screens are
 * added under `features/` once their backend use cases exist (TECH-004).
 */
export default async function HomePage() {
  const backend = await fetchBackendReadiness();

  return (
    <main className="app-shell">
      <h1 className="app-shell__title">سامانه حسابداری هوشمند</h1>
      <p className="app-shell__subtitle">نسخه ۱ در حال ساخت است.</p>

      <section className="status-panel">
        <h2 className="status-panel__title">وضعیت زیرساخت محلی</h2>

        <p className="status-panel__line">
          اتصال به Backend:{' '}
          <span className={backend.reachable ? 'status-up' : 'status-down'}>
            {backend.reachable ? 'برقرار است' : 'برقرار نیست'}
          </span>
        </p>

        {backend.reachable ? (
          <ul className="status-panel__checks">
            {backend.report.checks.map((check) => (
              <li key={check.name} className="status-panel__check">
                <span className={check.status === 'up' ? 'status-up' : 'status-down'}>
                  {check.status === 'up' ? 'فعال' : 'قطع'}
                </span>{' '}
                <code>{check.name}</code>
                <span className="status-panel__latency">{check.latencyMs}ms</span>
                {check.reason ? (
                  <span className="status-panel__error">
                    {check.reason === 'timeout' ? 'پاسخ‌گو نیست' : 'در دسترس نیست'}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="status-panel__error">{backend.error}</p>
        )}

        <p className="status-panel__hint">
          آدرس API برای مرورگر: <code>{getPublicApiBaseUrl()}</code>
        </p>
      </section>
    </main>
  );
}
