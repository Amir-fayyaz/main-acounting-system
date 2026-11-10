'use client';

import { AlertCircle, Info } from 'lucide-react';
import type { FormEvent } from 'react';

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui';
import Modal from '@web/ui/components/custom/ui/modal/Modal';

import type {
  Account,
  AccountType,
  CreateAccountRequest,
} from '../../../assets/@types/account.types';
import { useAccountForm } from '../../../hook/useAccountForm';
import { ACCOUNT_TYPE_OPTIONS } from '../../../lib/accounts.config';
import { accountsApi } from '../../../lib/accounts-api';
import { AccountField } from '../../ui/AccountField';
import { AccountNotice } from '../../ui/AccountNotice';

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (account: Account) => void | Promise<void>;
}

const CONTROL_CLASS = 'text-start tabular-nums';

export function AccountFormDialog({ open, onOpenChange, onSaved }: AccountFormDialogProps) {
  const handleValidSubmit = async (payload: CreateAccountRequest): Promise<void> => {
    const created = await accountsApi.create(payload);
    await onSaved(created);
  };

  const { values, errors, formError, isSubmitting, setField, submit } = useAccountForm({
    onValidSubmit: handleValidSubmit,
  });

  const isBank = values.type === 'bank';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isSaved = await submit();
    if (isSaved) onOpenChange(false);
  };

  const titleId = 'create-account-title';
  const typeId = 'create-account-type';
  const bankId = 'create-account-bank';
  const ibanId = 'create-account-iban';
  const balanceId = 'create-account-opening-balance';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="حساب جدید"
      description="حساب بانکی، صندوق یا تنخواه جدید را با موجودی اولیه ثبت کنید."
      hideDefaultFooter
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-label="فرم حساب جدید">
        <AccountNotice icon={<Info className="size-4" />}>
          برای حساب بانکی، نام بانک و شماره شبا الزامی است. موجودی اولیه می‌تواند صفر باشد.
        </AccountNotice>

        {formError ? (
          <AccountNotice tone="danger" icon={<AlertCircle className="size-4" />}>
            {formError}
          </AccountNotice>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <AccountField id={titleId} label="عنوان" error={errors.title}>
            <Input
              id={titleId}
              autoComplete="off"
              value={values.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(event) => {
                setField('title', event.target.value);
              }}
            />
          </AccountField>

          <AccountField id={typeId} label="نوع" error={errors.type}>
            <Select
              value={values.type}
              onValueChange={(value) => {
                setField('type', value as AccountType);
              }}
            >
              <SelectTrigger
                id={typeId}
                className="w-full"
                aria-label="نوع حساب"
                aria-invalid={Boolean(errors.type)}
                aria-describedby={errors.type ? `${typeId}-message` : undefined}
              >
                <SelectValue placeholder="انتخاب نوع" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </AccountField>

          <AccountField
            id={bankId}
            label="نام بانک"
            error={errors.bank}
            hint={isBank ? undefined : 'فقط برای حساب بانکی لازم است.'}
          >
            <Input
              id={bankId}
              autoComplete="off"
              disabled={!isBank}
              value={values.bank}
              aria-invalid={Boolean(errors.bank)}
              onChange={(event) => {
                setField('bank', event.target.value);
              }}
            />
          </AccountField>

          <AccountField
            id={ibanId}
            label="شماره شبا"
            error={errors.iban}
            hint={isBank ? 'با IR شروع می‌شود و ۲۴ رقم دارد.' : 'فقط برای حساب بانکی لازم است.'}
          >
            <Input
              id={ibanId}
              dir="ltr"
              autoComplete="off"
              inputMode="text"
              className={CONTROL_CLASS}
              disabled={!isBank}
              placeholder="IR000000000000000000000000"
              value={values.iban}
              aria-invalid={Boolean(errors.iban)}
              onChange={(event) => {
                setField('iban', event.target.value);
              }}
            />
          </AccountField>

          <AccountField
            id={balanceId}
            label="موجودی اولیه (ریال)"
            error={errors.openingBalance}
            hint="مبلغ را فقط با رقم وارد کنید؛ نمونه: ۱۲۵٬۰۰۰٬۰۰۰. خالی یعنی صفر."
          >
            <Input
              id={balanceId}
              dir="ltr"
              inputMode="decimal"
              autoComplete="off"
              className={CONTROL_CLASS}
              value={values.openingBalance}
              aria-invalid={Boolean(errors.openingBalance)}
              onChange={(event) => {
                setField('openingBalance', event.target.value);
              }}
            />
          </AccountField>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              onOpenChange(false);
            }}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'در حال ذخیره…' : 'ثبت حساب'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
