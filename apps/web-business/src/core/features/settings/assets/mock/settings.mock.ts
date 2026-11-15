import type { Settings } from '../@types/settings';

const DEFAULT_SETTINGS: Settings = {
  company: {
    companyName: 'شرکت نمونه',
    nationalId: '۱۴۰۰۱۲۳۴۵۶۷',
    fiscalYearStart: '۱۴۰۵/۰۱/۰۱',
    currency: 'IRR',
  },
  rules: {
    autoNumbering: true,
    balanceControl: true,
    autoInvoiceJournal: true,
    preventDuplicateTransactions: true,
  },
  fiscal: {
    yearTitle: '۱۴۰۵',
    periodName: 'فروردین ۱۴۰۵',
    periodStatus: 'open',
  },
  updatedAt: '2026-11-01T08:30:00.000Z',
};

function cloneSettings(settings: Settings): Settings {
  return {
    company: { ...settings.company },
    rules: { ...settings.rules },
    fiscal: { ...settings.fiscal },
    updatedAt: settings.updatedAt,
  };
}

let settingsStore: Settings = cloneSettings(DEFAULT_SETTINGS);

export function getMockSettings(): Settings {
  return cloneSettings(settingsStore);
}

export function saveMockSettings(next: Settings): Settings {
  settingsStore = {
    ...cloneSettings(next),
    updatedAt: new Date().toISOString(),
  };

  return cloneSettings(settingsStore);
}
