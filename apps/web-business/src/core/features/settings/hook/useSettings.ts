'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  AccountingRules,
  CompanyErrors,
  CompanyInfo,
  Settings,
  SettingsStatus,
  UpdateSettingsInput,
} from '../assets/@types/settings';
import { getSettings, updateSettings } from '../lib/settings.service';
import { hasErrors, validateCompanyInfo } from '../lib/settings.validation';

const SAVE_ERROR_MESSAGE = 'ذخیره تنظیمات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';
const VALIDATION_ERROR_MESSAGE = 'لطفاً خطاهای فرم را برطرف کنید.';
const SAVED_MESSAGE = 'تغییرات ذخیره شد';

const EMPTY_ERRORS: CompanyErrors = {};

export interface UseSettingsResult {
  status: SettingsStatus;
  settings: Settings | null;
  errors: CompanyErrors;
  saving: boolean;
  patchCompany: (patch: Partial<CompanyInfo>) => void;
  patchRules: (patch: Partial<AccountingRules>) => void;
  handleSave: () => Promise<void>;
  retryLoad: () => void;
}

export function useSettings(): UseSettingsResult {
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<CompanyErrors>(EMPTY_ERRORS);
  const [saving, setSaving] = useState(false);
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    let isActive = true;

    getSettings()
      .then((next) => {
        if (!isActive) return;
        setSettings(next);
        setStatus('success');
      })
      .catch(() => {
        if (isActive) setStatus('error');
      });

    return () => {
      isActive = false;
    };
  }, [reloadIndex]);

  const patchCompany = useCallback((patch: Partial<CompanyInfo>) => {
    setSettings((current) =>
      current ? { ...current, company: { ...current.company, ...patch } } : current,
    );

    if (Object.keys(errors).length > 0) {
      setErrors((current) => {
        const next = { ...current };
        for (const key of Object.keys(patch)) {
          delete next[key as keyof CompanyErrors];
        }
        return next;
      });
    }
  }, [errors]);

  const patchRules = useCallback((patch: Partial<AccountingRules>) => {
    setSettings((current) =>
      current ? { ...current, rules: { ...current.rules, ...patch } } : current,
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings || saving) return;

    const nextErrors = validateCompanyInfo(settings.company);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      toast.error(VALIDATION_ERROR_MESSAGE);
      return;
    }

    const input: UpdateSettingsInput = {
      company: settings.company,
      rules: settings.rules,
    };

    setSaving(true);
    try {
      const updated = await updateSettings(input);
      setSettings(updated);
      setErrors(EMPTY_ERRORS);
      toast.success(SAVED_MESSAGE);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : SAVE_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }, [saving, settings]);

  const retryLoad = useCallback(() => {
    setStatus('loading');
    setReloadIndex((current) => current + 1);
  }, []);

  return {
    status,
    settings,
    errors,
    saving,
    patchCompany,
    patchRules,
    handleSave,
    retryLoad,
  };
}
