import type { FiscalAuditLog, FiscalPeriod, FiscalYear } from '../@types';

export function createInitialFiscalYears(): FiscalYear[] {
  return [
    {
      id: 'year-1405',
      title: 'سال مالی ۱۴۰۵',
      from: '۱۴۰۵/۰۱/۰۱',
      to: '۱۴۰۵/۱۲/۲۹',
    },
    {
      id: 'year-1404',
      title: 'سال مالی ۱۴۰۴',
      from: '۱۴۰۴/۰۱/۰۱',
      to: '۱۴۰۴/۱۲/۲۹',
    },
  ];
}

export function createInitialFiscalPeriods(): FiscalPeriod[] {
  return [
    {
      id: 'period-1405-01',
      yid: 'year-1405',
      name: 'فروردین ۱۴۰۵',
      from: '۱۴۰۵/۰۱/۰۱',
      to: '۱۴۰۵/۰۱/۳۱',
      status: 'closed',
    },
    {
      id: 'period-1405-02',
      yid: 'year-1405',
      name: 'اردیبهشت ۱۴۰۵',
      from: '۱۴۰۵/۰۲/۰۱',
      to: '۱۴۰۵/۰۲/۳۱',
      status: 'reopened',
    },
    {
      id: 'period-1405-03',
      yid: 'year-1405',
      name: 'خرداد ۱۴۰۵',
      from: '۱۴۰۵/۰۳/۰۱',
      to: '۱۴۰۵/۰۳/۳۱',
      status: 'closed',
    },
    {
      id: 'period-1405-04',
      yid: 'year-1405',
      name: 'تیر ۱۴۰۵',
      from: '۱۴۰۵/۰۴/۰۱',
      to: '۱۴۰۵/۰۴/۳۱',
      status: 'closed',
    },
    {
      id: 'period-1405-05',
      yid: 'year-1405',
      name: 'مرداد ۱۴۰۵',
      from: '۱۴۰۵/۰۵/۰۱',
      to: '۱۴۰۵/۰۵/۳۱',
      status: 'closed',
    },
    {
      id: 'period-1405-06',
      yid: 'year-1405',
      name: 'شهریور ۱۴۰۵',
      from: '۱۴۰۵/۰۶/۰۱',
      to: '۱۴۰۵/۰۶/۳۱',
      status: 'closed',
    },
    {
      id: 'period-1405-07',
      yid: 'year-1405',
      name: 'مهر ۱۴۰۵',
      from: '۱۴۰۵/۰۷/۰۱',
      to: '۱۴۰۵/۰۷/۳۰',
      status: 'review',
    },
    {
      id: 'period-1405-08',
      yid: 'year-1405',
      name: 'آبان ۱۴۰۵',
      from: '۱۴۰۵/۰۸/۰۱',
      to: '۱۴۰۵/۰۸/۳۰',
      status: 'open',
    },
    {
      id: 'period-1405-09',
      yid: 'year-1405',
      name: 'آذر ۱۴۰۵',
      from: '۱۴۰۵/۰۹/۰۱',
      to: '۱۴۰۵/۰۹/۳۰',
      status: 'open',
    },
    {
      id: 'period-1405-10',
      yid: 'year-1405',
      name: 'دی ۱۴۰۵',
      from: '۱۴۰۵/۱۰/۰۱',
      to: '۱۴۰۵/۱۰/۳۰',
      status: 'open',
    },
    {
      id: 'period-1405-11',
      yid: 'year-1405',
      name: 'بهمن ۱۴۰۵',
      from: '۱۴۰۵/۱۱/۰۱',
      to: '۱۴۰۵/۱۱/۳۰',
      status: 'open',
    },
    {
      id: 'period-1405-12',
      yid: 'year-1405',
      name: 'اسفند ۱۴۰۵',
      from: '۱۴۰۵/۱۲/۰۱',
      to: '۱۴۰۵/۱۲/۲۹',
      status: 'open',
    },
  ];
}

export function createInitialAuditLogs(): FiscalAuditLog[] {
  return [
    {
      id: 'log-01',
      action: 'بازگشایی دوره',
      period: 'اردیبهشت ۱۴۰۵',
      reason: 'اصلاح سند هزینه‌ی اجاره که با تاریخ اشتباه ثبت شده بود.',
      who: 'علی رضایی',
      at: '۱۴۰۵/۰۸/۰۵ ۱۱:۲۰',
    },
    {
      id: 'log-02',
      action: 'بستن دوره',
      period: 'شهریور ۱۴۰۵',
      reason: '',
      who: 'علی رضایی',
      at: '۱۴۰۵/۰۷/۰۱ ۰۹:۱۵',
    },
    {
      id: 'log-03',
      action: 'بستن دوره',
      period: 'مرداد ۱۴۰۵',
      reason: '',
      who: 'علی رضایی',
      at: '۱۴۰۵/۰۶/۰۱ ۱۰:۰۰',
    },
  ];
}
