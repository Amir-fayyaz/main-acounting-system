'use client';

import { Button, Card, CardContent, H1, P, SectionLayout, Skeleton } from '@repo/web';

import { useSettings } from '../../hook/useSettings';
import { SettingsCard } from '../ui/SettingsCard';
import { AccountingRulesSection } from './sections/AccountingRulesSection';
import { CompanyInfoSection } from './sections/CompanyInfoSection';

const LOAD_ERROR_MESSAGE = 'دریافت تنظیمات با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function SettingsPage() {
  const {
    status,
    settings,
    errors,
    saving,
    patchCompany,
    patchRules,
    handleSave,
    retryLoad,
  } = useSettings();

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
