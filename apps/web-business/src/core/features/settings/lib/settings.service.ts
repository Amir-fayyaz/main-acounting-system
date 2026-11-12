import type { Settings, UpdateSettingsInput } from '../assets/@types/settings';
import { getMockSettings, saveMockSettings } from '../assets/mock/settings.mock';
import { hasErrors, validateCompanyInfo } from './settings.validation';

export async function getSettings(): Promise<Settings> {
  return getMockSettings();
}

export async function updateSettings(input: UpdateSettingsInput = {}): Promise<Settings> {
  const current = getMockSettings();

  const next: Settings = {
    company: { ...current.company, ...input.company },
    rules: { ...current.rules, ...input.rules },
    fiscal: { ...current.fiscal },
    updatedAt: current.updatedAt,
  };

  const errors = validateCompanyInfo(next.company);
  if (hasErrors(errors)) {
    throw new Error(Object.values(errors).find(Boolean));
  }

  return saveMockSettings(next);
}
