'use client';

import type { AccountingRules } from '../../../assets/@types/settings';
import { SettingsToggleRow } from '../../ui/SettingsToggleRow';

type RuleKey = keyof AccountingRules;

const RULE_ROWS: ReadonlyArray<{
  key: RuleKey;
  label: string;
  description: string;
  locked?: boolean;
}> = [
  {
    key: 'autoNumbering',
    label: 'شماره‌گذاری خودکار اسناد',
    description: 'شماره سند به‌ترتیب و بدون تکرار ساخته می‌شود.',
  },
  {
    key: 'balanceControl',
    label: 'کنترل توازن بدهکار و بستانکار',
    description: 'ثبت سند نامتوازن همیشه مسدود است.',
    locked: true,
  },
  {
    key: 'autoInvoiceJournal',
    label: 'ایجاد خودکار سند برای فاکتور',
    description: 'پس از ثبت فاکتور و دریافت/پرداخت.',
  },
  {
    key: 'preventDuplicateTransactions',
    label: 'جلوگیری از تراکنش تکراری',
    description: 'هشدار هنگام ثبت پرداخت مشابه.',
  },
];

export type AccountingRulesSectionProps = {
  value: AccountingRules;
  onChange: (patch: Partial<AccountingRules>) => void;
  disabled: boolean;
};

export function AccountingRulesSection({ value, onChange, disabled }: AccountingRulesSectionProps) {
  return (
    <div>
      {RULE_ROWS.map((row) => (
        <SettingsToggleRow
          key={row.key}
          id={`settings-${row.key}`}
          label={row.label}
          description={row.description}
          checked={value[row.key]}
          onCheckedChange={(checked) => onChange({ [row.key]: checked })}
          disabled={disabled || row.locked === true}
        />
      ))}
    </div>
  );
}
