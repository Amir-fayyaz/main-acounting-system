/* سال و دوره مالی: وضعیت مشترک بین همه صفحات (Year → Period). داده‌ی نمایشی در localStorage ذخیره می‌شود. */
(function () {
  'use strict';
  const KEY = 'minhesab-fiscal-v1';
  const MN = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const QN = ['اول', 'دوم', 'سوم', 'چهارم'];
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = s => String(s).replace(/\d/g, d => FA[d]);
  const toEn = s => String(s).replace(/[۰-۹]/g, d => FA.indexOf(d));
  const p2 = n => String(n).padStart(2, '0');
  const leap = y => [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
  const dim = (y, m) => m <= 6 ? 31 : m <= 11 ? 30 : leap(y) ? 30 : 29;
  const fmt = (y, m, d) => y + '/' + p2(m) + '/' + p2(d);
  const split = s => s.split('/').map(Number);
  const parseD = s => {
    const m = toEn(s).trim().replace(/-/g, '/').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    return mo < 1 || mo > 12 || d < 1 || d > dim(y, mo) ? null : fmt(y, mo, d);
  };
  const nextDay = s => { const [y, m, d] = split(s); return d < dim(y, m) ? fmt(y, m, d + 1) : m < 12 ? fmt(y, m + 1, 1) : fmt(y + 1, 1, 1); };
  const prevDay = s => { const [y, m, d] = split(s); return d > 1 ? fmt(y, m, d - 1) : m > 1 ? fmt(y, m - 1, dim(y, m - 1)) : fmt(y - 1, 12, dim(y - 1, 12)); };
  const yearEnd = from => { const [y, m, d] = split(from); return prevDay(fmt(y + 1, m, Math.min(d, dim(y + 1, m)))); };
  const today = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return fmt(+p.year, +p.month, +p.day);
  };
  const now = () => new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const ST = { open: 'باز', review: 'در بازبینی', closing: 'در حال بستن', closed: 'بسته', reopened: 'بازگشایی‌شده' };
  const postable = s => s === ST.open || s === ST.reopened;

  /* تولید دوره: k='m' ماهانه، k='q' فصلی */
  const generate = (from, to, k) => {
    const out = []; let s = from;
    while (s <= to) {
      const [y, m] = split(s); let em = m + (k === 'q' ? 2 : 0), ey = y;
      while (em > 12) { em -= 12; ey++; }
      let e = fmt(ey, em, dim(ey, em)); if (e > to) e = to;
      out.push({ name: k === 'q' ? `فصل ${QN[out.length] || toFa(out.length + 1)} ${toFa(split(from)[0])}` : `${MN[m - 1]} ${toFa(y)}`, from: s, to: e });
      s = nextDay(e);
    }
    return out;
  };

  /* اعتبارسنجی (پیام فارسی یا رشته‌ی خالی) */
  const checkYear = (title, f, t, years) => {
    const a = parseD(f), b = parseD(t);
    if (!title.trim()) return 'عنوان سال مالی را وارد کنید.';
    if (!a || !b) return 'تاریخ‌ها را شمسی و معتبر وارد کنید (مثال: ۱۴۰۵/۰۱/۰۱).';
    if (b <= a) return 'تاریخ پایان باید بعد از تاریخ شروع باشد.';
    const o = years.find(y => !(b < y.from || a > y.to));
    return o ? `بازه با «${o.title}» هم‌پوشانی دارد.` : '';
  };
  const checkPeriod = (name, f, t, year, periods) => {
    const a = parseD(f), b = parseD(t);
    if (!name.trim()) return 'نام دوره را وارد کنید.';
    if (!a || !b) return 'تاریخ‌ها را شمسی و معتبر وارد کنید (مثال: ۱۴۰۵/۰۸/۰۱).';
    if (b < a) return 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.';
    if (a < year.from || b > year.to) return `بازه دوره باید داخل ${year.title} (${toFa(year.from)} تا ${toFa(year.to)}) باشد.`;
    const o = periods.find(p => !(b < p.from || a > p.to));
    return o ? `بازه با دوره‌ی «${o.name}» هم‌پوشانی دارد.` : '';
  };

  /* داده‌ی اولیه نمایشی بر اساس تاریخ امروز */
  const seed = mode => {
    const t = today(), [y, cm] = split(t), from = fmt(y, 1, 1), to = fmt(y, 12, dim(y, 12));
    if (mode === 'empty') return { years: [], periods: [], log: [] };
    const yr = { id: 'y' + y, title: 'سال مالی ' + toFa(y), from, to };
    const periods = generate(from, to, 'm').map((p, i) => {
      const m = i + 1;
      let status = m < cm - 1 ? ST.closed : m === cm - 1 ? ST.review : ST.open;
      if (m === cm - 3 && m > 0) status = ST.reopened;
      if (mode === 'noopen') status = ST.closed;
      if (mode === 'closednow' && m === cm) status = ST.closed;
      return { id: 'p' + y + '-' + m, yid: yr.id, ...p, status };
    });
    const log = [
      { at: now(), who: 'علی رضایی', action: 'بستن دوره', period: periods[Math.max(cm - 4, 0)].name, reason: '' },
      { at: now(), who: 'علی رضایی', action: 'بازگشایی دوره', period: periods[Math.max(cm - 4, 0)].name, reason: 'اصلاح سند هزینه‌ی اجاره که با تاریخ اشتباه ثبت شده بود.' }
    ].reverse();
    return { years: [yr], periods, log };
  };

  let S;
  const get = () => S || (S = (() => { try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.years) return r; } catch (e) { } return seed('normal'); })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
  const reset = mode => { S = seed(mode); save(); };
  const addLog = (action, period, reason) => { get().log.unshift({ at: now(), who: 'علی رضایی', action, period, reason: reason || '' }); get().log.length = Math.min(get().log.length, 20); };

  const active = () => {
    const s = get(), t = today();
    const period = s.periods.find(p => p.from <= t && t <= p.to) || null;
    const year = period ? s.years.find(y => y.id === period.yid) : s.years.find(y => y.from <= t && t <= y.to) || s.years[s.years.length - 1] || null;
    return { today: t, year, period };
  };
  const banner = () => {
    const s = get(), a = active();
    if (!s.years.length || !s.periods.length) return { kind: 'warn', msg: 'راه‌اندازی مالی کامل نشده است. تا ایجاد سال و دوره‌ی مالی، ثبت سند و فاکتور ممکن نیست.', href: 'fiscal-setup.html', label: 'شروع راه‌اندازی مالی' };
    if (!s.periods.some(p => postable(p.status))) return { kind: 'bad', msg: 'هیچ دوره‌ی بازی وجود ندارد؛ ثبت مستقیم هیچ سندی ممکن نیست. یک دوره را باز یا بازگشایی کنید.', href: 'fiscal-periods.html', label: 'مدیریت دوره‌ها' };
    if (!a.period) return { kind: 'warn', msg: 'تاریخ امروز در هیچ دوره‌ی مالی تعریف‌شده‌ای نیست. برای ثبت امروز، دوره‌ی مربوط را ایجاد کنید.', href: 'fiscal-periods.html', label: 'ایجاد دوره' };
    if (a.period.status === ST.closed) return { kind: 'bad', msg: `دوره‌ی ${a.period.name} بسته است؛ ثبت مستقیم سند در این دوره مجاز نیست.`, href: 'fiscal-periods.html', label: 'مدیریت دوره‌ها' };
    if (!postable(a.period.status)) return { kind: 'warn', msg: `دوره‌ی ${a.period.name} «${a.period.status}» است؛ ثبت سند جدید در آن متوقف است.`, href: 'fiscal-periods.html', label: 'مدیریت دوره‌ها' };
    return null;
  };
  const chip = () => {
    const a = active();
    if (!a.year) return { kind: 'bad', text: 'بدون سال مالی' };
    if (!a.period) return { kind: 'warn', text: a.year.title.replace('مالی ', '') + ' · بدون دوره' };
    const k = postable(a.period.status) ? 'ok' : a.period.status === ST.closed ? 'bad' : 'warn';
    return { kind: k, text: `${a.year.title.replace('مالی ', '')} · ${a.period.name.split(' ')[0]} · ${a.period.status}` };
  };

  window.FISCAL = { ST, MN, get, save, reset, addLog, active, banner, chip, postable, generate, checkYear, checkPeriod, parseD, nextDay, prevDay, yearEnd, today, toFa, split, dim };
})();
