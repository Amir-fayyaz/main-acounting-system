'use client';

import { useEffect, useState } from 'react';

import { Button, Card, CardContent, H1, P, SectionLayout, Skeleton } from '@repo/web';
import { toast } from 'sonner';

import type {
  AccountingRules,
  CompanyErrors,
  CompanyInfo,
  Settings,
  SettingsStatus,
  UpdateSettingsInput,
} from '../../assets/@types/settings';
import { getSettings, updateSettings } from '../../lib/settings.service';
import { hasErrors, validateCompanyInfo } from '../../lib/settings.validation';
import { SettingsCard } from '../ui/SettingsCard';
import { AccountingRulesSection } from './sections/AccountingRulesSection';
import { CompanyInfoSection } from './sections/CompanyInfoSection';

const LOAD_ERROR_MESSAGE = 'دریافت تنظیمات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';
const SAVE_ERROR_MESSAGE = 'ذخیره تنظیمات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';
const VALIDATION_ERROR_MESSAGE = 'لطفاً خطاهای فرم را برطرف کنید.';
const SAVED_MESSAGE = 'تغییرات ذخیره شد';

const EMPTY_ERRORS: CompanyErrors = {};

export function SettingsPage() {
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

  function patchCompany(patch: Partial<CompanyInfo>) {
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
  }

  function patchRules(patch: Partial<AccountingRules>) {
    setSettings((current) =>
      current ? { ...current, rules: { ...current.rules, ...patch } } : current,
    );
  }

  async function handleSave() {
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
  }

  function retryLoad() {
    setStatus('loading');
    setReloadIndex((current) => current + 1);
  }

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">تنظیمات</H1>
          <P className="text-sm text-muted-foreground">اطلاعات شرکت و قواعد حسابداری</P>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={saving || status !== 'success'}
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </Button>
      </div>

      {status === 'loading' ? (
        <div
          className="grid gap-4 lg:grid-cols-2"
          role="status"
          aria-label="در حال بارگذاری تنظیمات"
        >
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {status === 'error' ? (
        <Card className="gap-4">
          <CardContent className="grid gap-3 py-4">
            <P className="text-sm text-destructive" role="alert">
              {LOAD_ERROR_MESSAGE}
            </P>
            <div>
              <Button type="button" size="sm" onClick={retryLoad}>
                تلاش دوباره
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {status === 'success' && settings ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsCard title="اطلاعات شرکت">
            <CompanyInfoSection
              value={settings.company}
              fiscal={settings.fiscal}
              errors={errors}
              onChange={patchCompany}
              disabled={saving}
            />
          </SettingsCard>

          <SettingsCard title="قواعد حسابداری">
            <AccountingRulesSection
              value={settings.rules}
              onChange={patchRules}
              disabled={saving}
            />
          </SettingsCard>
        </div>
      ) : null}
    </SectionLayout>
  );
}
