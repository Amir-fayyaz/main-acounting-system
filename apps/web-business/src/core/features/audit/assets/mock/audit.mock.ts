import type { AuditEvent, AuditOutcome } from '../@types/audit';

const NAMES = ['احمد کریمی', 'مریم صادقی', 'رضا حیدری', 'سارا محمدی', 'کامران اکبری', 'نگار فرهادی'];

const ACTIONS = [
  'user.signed_in',
  'invoice.created',
  'journal.posted',
  'cheque.status_changed',
  'role.permission_granted',
];

const TARGETS = (i: number) => [
  `فاکتور ${ (2200 + i).toLocaleString('fa-IR') }`,
  `سند ${(1405000 + i).toLocaleString('fa-IR')}`,
  `چک ${(i + 10).toLocaleString('fa-IR')}`,
  '—',
];

const OUTCOMES: AuditOutcome[] = ['موفق', 'موفق', 'موفق', 'ناموفق'];

function fa(n: number): string {
  return n.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function num(min: number, max: number, seed: number): number {
  const r = (seed * 9301 + 49297) % 233280;
  const t = r / 233280;
  return Math.round(min + t * (max - min));
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('fa-IR');
}

function createSeedEvents(): AuditEvent[] {
  const count = 40;
  const result: AuditEvent[] = [];
  for (let i = 0; i < count; i++) {
    result.push({
      id: `audit-${String(i + 1).padStart(4, '0')}`,
      at: `${day(-(i >> 2))} ${fa(num(8, 18, i * 3))}:${fa(num(10, 59, i * 7)).toString().padStart(2, '0')}`,
      who: pick(NAMES, i * 5),
      action: pick(ACTIONS, i * 11),
      target: pick(TARGETS(i), i * 13),
      out: pick(OUTCOMES, i * 17),
    });
  }
  return result;
}

const auditStore: AuditEvent[] = createSeedEvents();

export function getMockAuditEvents(): AuditEvent[] {
  return auditStore.map((e) => ({ ...e }));
}
