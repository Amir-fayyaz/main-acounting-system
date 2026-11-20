import { describe, expect, it } from 'vitest';

import {
  activityStatusLabel,
  auditResultLabel,
  chequeStatusLabel,
  journalStatusLabel,
  paymentStatusLabel,
  personKindLabel,
  recordStatusLabel,
} from '../utils/status-label';

describe('status labels', () => {
  it('maps record statuses to Persian labels', () => {
    expect(recordStatusLabel('active')).toBe('فعال');
    expect(recordStatusLabel('inactive')).toBe('غیرفعال');
  });

  it('maps payment statuses to Persian labels', () => {
    expect(paymentStatusLabel('settled')).toBe('تسویه‌شده');
    expect(paymentStatusLabel('partially-settled')).toBe('تسویه جزئی');
    expect(paymentStatusLabel('unsettled')).toBe('تسویه‌نشده');
  });

  it('maps cheque statuses to Persian labels', () => {
    expect(chequeStatusLabel('pending')).toBe('در انتظار');
    expect(chequeStatusLabel('collected')).toBe('وصول‌شده');
    expect(chequeStatusLabel('near-due')).toBe('نزدیک سررسید');
    expect(chequeStatusLabel('returned')).toBe('برگشتی');
    expect(chequeStatusLabel('overdue')).toBe('معوق');
    expect(chequeStatusLabel('endorsed')).toBe('ظهرنویسی‌شده');
  });

  it('maps journal statuses to Persian labels', () => {
    expect(journalStatusLabel('balanced')).toBe('تراز');
    expect(journalStatusLabel('draft')).toBe('پیش‌نویس');
  });

  it('maps audit results to Persian labels', () => {
    expect(auditResultLabel('success')).toBe('موفق');
    expect(auditResultLabel('failure')).toBe('ناموفق');
  });

  it('maps dashboard activity statuses to the dashboard labels', () => {
    expect(activityStatusLabel('success')).toBe('موفق');
    expect(activityStatusLabel('pending')).toBe('در انتظار');
    expect(activityStatusLabel('warning')).toBe('نیازمند بررسی');
  });

  it('maps person kinds to Persian labels', () => {
    expect(personKindLabel('customer')).toBe('مشتری');
    expect(personKindLabel('supplier')).toBe('تأمین‌کننده');
    expect(personKindLabel('both')).toBe('مشتری و تأمین‌کننده');
  });

  it('matches statuses case-insensitively', () => {
    expect(recordStatusLabel('INACTIVE')).toBe('غیرفعال');
    expect(recordStatusLabel('Active')).toBe('فعال');
  });

  it('returns unknown statuses unchanged instead of crashing', () => {
    expect(recordStatusLabel('custom-status')).toBe('custom-status');
    expect(chequeStatusLabel('mystery')).toBe('mystery');
    expect(activityStatusLabel('')).toBe('');
  });
});
