/* مین‌حساب – demo panel. Pages are declared in PAGES and rendered by type. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const fa = n => (+n).toLocaleString('fa-IR', { maximumFractionDigits: 1 });
  const D = '۰۱۲۳۴۵۶۷۸۹';
  const parse = s => +String(s).replace(/[۰-۹]/g, d => D.indexOf(d)).replace(/[^\d.]/g, '') || 0;
  const short = n => n >= 1e9 ? [fa(n / 1e9), 'میلیارد ریال'] : [fa(n / 1e6), 'میلیون ریال'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const num = (a, b, step = 1) => Math.round((a + rnd() * (b - a)) / step) * step;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const day = n => new Date(Date.now() + n * 864e5).toLocaleDateString('fa-IR');
  const jd = n => { const p = Object.fromEntries(new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(Date.now() + n * 864e5)).map(x => [x.type, x.value])); return p.year + '/' + p.month.padStart(2, '0') + '/' + p.day.padStart(2, '0'); };
  const en = s => String(s).replace(/[۰-۹]/g, d => D.indexOf(d));
  const FT = s => FISCAL.toFa(s);
  const SELLERS = ['نگار فرهادی', 'کامران اکبری', 'مهدی شریفی'], RATE = { 'نگار فرهادی': 2, 'کامران اکبری': 3, 'مهدی شریفی': 2.5 };
  const DESCS = ['فروش عمده با تحویل در انبار مرکزی', 'طبق قرارداد شماره ۱۲', 'مشمول تخفیف مناسبتی', 'تسویه تا پایان ماه', 'خدمات نصب و راه‌اندازی', '', '', 'تحویل در دو مرحله'];
  const ids = n => Array.from({ length: n }, () => num(0, 9)).join('');
  const NAMES = ['شرکت آرمان تجارت', 'فروشگاه نوید', 'بازرگانی پارس', 'احمد کریمی', 'مریم صادقی', 'گروه صنعتی البرز', 'داروخانه مهر', 'رضا حیدری', 'پخش سپهر', 'سارا محمدی', 'تولیدی آریا', 'کامران اکبری'];
  const BRANCHES = ['دفتر مرکزی', 'شعبه ونک', 'شعبه اصفهان', 'شعبه تبریز'];
  const BANKS = ['ملی', 'ملت', 'سامان', 'پاسارگاد', 'صادرات'];
  const ACCOUNTS = ['۱۱۰۱ صندوق', '۱۱۰۲ بانک ملت', '۱۱۰۳ بانک ملی', '۱۲۰۱ حساب‌های دریافتنی', '۱۳۰۱ موجودی کالا', '۲۱۰۱ حساب‌های پرداختنی', '۳۱۰۱ سرمایه', '۴۱۰۱ فروش کالا', '۵۱۰۱ بهای تمام‌شده', '۵۲۰۱ هزینه اجاره', '۵۲۰۲ هزینه حقوق'];
  const TONE = { ok: ['باز', 'فعال', 'تسویه‌شده', 'وصول‌شده', 'موفق', 'پرداخت‌شده', 'تراز'], warn: ['بدون دوره', 'در بازبینی', 'در حال بستن', 'بازگشایی‌شده', 'نزدیک سررسید', 'در انتظار', 'پرداخت جزئی', 'پیش‌نویس', 'واگذارشده'], bad: ['برگشتی', 'ناموفق', 'غیرفعال', 'تسویه‌نشده', 'رد شد', 'سررسیدشده'] };
  const tone = v => Object.keys(TONE).find(k => TONE[k].includes(v)) || '';
  const badge = v => `<span class="badge-s ${tone(v)}">${esc(v)}</span>`;
  const gen = (n, f) => Array.from({ length: n }, (_, i) => f(i));

  /* ---------- navigation (slug, label, icon, badge | children) ---------- */
  const NAV = [
    ['عمومی', [['dashboard', 'داشبورد', 'home'], ['reports', 'گزارش‌ها', 'chart']]],
    ['حسابداری', [[null, 'اسناد حسابداری', 'book', [['journal', 'دفتر روزنامه'], ['new-journal', 'ثبت سند مرکب'], ['trial', 'تراز آزمایشی']]]]],
    ['خزانه', [['accounts', 'بانک و صندوق', 'bank'], ['cheques', 'چک‌ها', 'check', 5], ['pos', 'دستگاه‌های POS', 'card']]],
    ['فروش و خرید', [[null, 'فروش', 'cart', [['invoices', 'فاکتورهای فروش'], ['new-invoice', 'فاکتور جدید']]], ['purchases', 'خرید', 'box'], ['people', 'مشتریان و تأمین‌کنندگان', 'users']]],
    ['سازمان', [['branches', 'شعب', 'building'], ['users', 'کاربران و نقش‌ها', 'shield'], ['audit', 'تاریخچه تغییرات', 'file'], [null, 'سال و دوره‌های مالی', 'calendar', [['fiscal-periods', 'دوره‌های مالی'], ['fiscal-years', 'سال‌های مالی'], ['fiscal-setup', 'راه‌اندازی مالی']]], ['settings', 'تنظیمات', 'gear']]]
  ];
  const ICONS = `<symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15h3"/></symbol><symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></symbol><symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13M9 7h6"/></symbol><symbol id="i-bank" viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/></symbol><symbol id="i-card" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></symbol><symbol id="i-check" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 14h6M7 10h10"/></symbol><symbol id="i-building" viewBox="0 0 24 24"><path d="M5 21V4a1 1 0 011-1h8a1 1 0 011 1v17M15 9h3a1 1 0 011 1v11M3 21h18M9 7h2M9 11h2M9 15h2"/></symbol><symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4"/></symbol><symbol id="i-file" viewBox="0 0 24 24"><path d="M6 3h8l5 5v13H6V3zM14 3v5h5M9 13h6M9 17h6"/></symbol><symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol><symbol id="i-print" viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></symbol><symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></symbol>`;

  /* ---------- layout ---------- */
  const cur = document.body.dataset.page;
  const ico = n => `<svg class="ico"><use href="#i-${n}"/></svg>`;
  const link = (s, l, i, b) => `<li><a class="nav-item${s === cur ? ' active' : ''}" href="${s}.html" title="${l}">${ico(i)}<span class="nav-label">${l}</span>${b ? `<span class="badge">${fa(b)}</span>` : ''}</a></li>`;
  const navItem = ([s, l, i, b]) => {
    if (s) return link(s, l, i, b);
    const open = b.some(c => c[0] === cur);
    return `<li class="has-sub${open ? ' open' : ''}"><button class="nav-item" type="button" aria-expanded="${open}" title="${l}">${ico(i)}<span class="nav-label">${l}</span><svg class="ico chev"><use href="#i-chev"/></svg></button><div class="sub"><ul>${b.map(c => `<li><a href="${c[0]}.html" class="${c[0] === cur ? 'active' : ''}">${c[1]}</a></li>`).join('')}</ul></div></li>`;
  };
  const flat = NAV.flatMap(([, it]) => it.flatMap(x => x[0] ? [[x[0], x[1]]] : x[3]));
  const P = () => PAGES[cur] || {};
  document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${window.ICONS_BASE || ''}${ICONS}</defs></svg>`);
  $('#app').innerHTML = `
  <aside class="sidebar" id="sidebar" aria-label="منوی اصلی">
    <div class="sb-header"><a class="brand" href="dashboard.html"><span class="brand-logo">م</span><span class="brand-text"><b>مین‌حساب</b><small id="brandSub"></small></span></a>
      <button class="icon-btn sb-collapse" id="collapseBtn" aria-label="جمع کردن منو" title="جمع کردن منو">${ico('panel')}</button>
      <button class="icon-btn" id="closeBtn" aria-label="بستن منو" style="display:none"><svg class="ico" style="transform:rotate(180deg)"><use href="#i-chev"/></svg></button></div>
    <nav class="sb-nav">${NAV.map(([g, it]) => `<div class="nav-group"><p class="nav-title">${g}</p><ul>${it.map(navItem).join('')}</ul></div>`).join('')}</nav>
    <div class="sb-footer"><div class="user"><span class="avatar">ع</span><span class="user-info"><b>علی رضایی</b><small>مدیر مالی</small></span><a class="icon-btn" href="auth.html" aria-label="خروج" title="خروج">${ico('out')}</a></div></div>
  </aside><div class="overlay" id="overlay"></div>
  <div class="main"><header class="topbar">
    <button class="icon-btn menu-btn" id="menuBtn" aria-label="باز کردن منو">${ico('menu')}</button>
    <label class="search">${ico('search')}<input id="jump" list="pages" placeholder="رفتن به صفحه… (مثلاً چک‌ها)" aria-label="جستجو"><datalist id="pages">${flat.map(f => `<option value="${f[1]}">`).join('')}</datalist></label>
    <a class="period-chip" id="chip" href="fiscal-periods.html" title="وضعیت سال و دوره‌ی مالی"></a><div class="topbar-actions"><button class="icon-btn theme-btn" id="themeBtn" aria-label="تغییر حالت تاریک و روشن">${ico('sun').replace('ico', 'ico sun')}${ico('moon').replace('ico', 'ico moon')}</button>
    <button class="icon-btn dot" aria-label="اعلان‌ها">${ico('bell')}</button></div></header>
    <main class="content" id="content"></main></div>`;
  $('#jump').addEventListener('change', e => { const f = flat.find(x => x[1] === e.target.value.trim()); if (f) location.href = f[0] + '.html'; });

  /* ---------- helpers ---------- */
  const toast = m => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; t.setAttribute('role', 'status'); document.body.append(t); setTimeout(() => t.remove(), 2400); };
  const head = (c, actions = '') => `<div class="page-head"><div><h1>${c.t}</h1><p>${c.d || ''}</p></div><div class="page-actions">${actions}</div></div>`;
  function dialog(title, fields, ok, onOk, validate) {
    const d = document.createElement('dialog');
    const inp = ([k, l, t]) => Array.isArray(t) ? `<select class="sel" id="f-${k}" name="${k}">${t.map(o => `<option>${o}</option>`).join('')}</select>` :
      t === 'textarea' ? `<textarea class="inp" id="f-${k}" name="${k}" rows="2" style="height:auto;padding-block:8px;width:100%"></textarea>` :
      t === 'date' ? `<input class="inp" id="f-${k}" name="${k}" inputmode="numeric" value="${FT(jd(0))}" placeholder="${FT('1405/07/27')}">` :
      `<input class="inp" id="f-${k}" name="${k}" type="${t || 'text'}">`;
    d.innerHTML = `<form method="dialog"><h3>${title}</h3><div class="form-grid">${fields.map(f => `<div class="field" ${f[2] === 'textarea' ? 'style="grid-column:1/-1"' : ''}><label for="f-${f[0]}">${f[1]}</label>${inp(f)}</div>`).join('')}</div><div class="alert bad" data-err hidden style="margin-top:12px"></div><menu><button class="btn" type="button" data-x>انصراف</button><button class="btn primary" value="ok">${ok}</button></menu></form>`;
    document.body.append(d); d.showModal();
    const get = () => Object.fromEntries(new FormData($('form', d))), okb = $('[value=ok]', d), err = $('[data-err]', d); let touched = false;
    const run = () => { const m = validate ? validate(get()) : ''; okb.disabled = !!m; err.hidden = !(touched && m); err.textContent = m || ''; };
    $('[data-x]', d).onclick = () => d.close('x');
    d.addEventListener('input', () => { touched = true; run(); }); run();
    d.addEventListener('close', () => { if (d.returnValue === 'ok') onOk(get()); d.remove(); });
  }

  /* ---------- mock data ---------- */
  const rows = {
    journal: () => gen(48, i => ({ no: fa(1405000 + 48 - i), date: day(-i), desc: pick(['فروش نقدی', 'پرداخت اجاره', 'دریافت از مشتری', 'خرید کالا', 'پرداخت حقوق', 'انتقال بین حساب‌ها']), amount: num(2e6, 9e8, 1e5), status: pick(['تراز', 'تراز', 'تراز', 'پیش‌نویس']) })),
    trial: () => ACCOUNTS.map((a, i) => { const x = num(1e8, 9e9, 1e6); return { code: a.split(' ')[0], name: a.slice(5), dr: i < 5 || i > 7 ? x : 0, cr: i < 5 || i > 7 ? 0 : x }; }),
    accounts: () => [['صندوق اصلی', 'صندوق'], ['صندوق شعبه ونک', 'صندوق'], ['تنخواه دفتر', 'تنخواه'], ...BANKS.map(b => ['حساب جاری ' + b, 'بانک'])].map(([n, t]) => ({ name: n, type: t, bank: t === 'بانک' ? n.split(' ').pop() : '—', no: t === 'بانک' ? 'IR' + ids(24) : '—', branch: pick(BRANCHES), balance: num(5e6, 4e9, 1e5), status: pick(['فعال', 'فعال', 'فعال', 'غیرفعال']) })),
    cheques: () => gen(34, () => { const reg = jd(-num(1, 45)); let due = jd(num(-20, 60)); if (due < reg) due = reg; const late = due < jd(0); return { no: String(num(100000, 999999)), sayad: ids(16), kind: pick(['دریافتی', 'پرداختی']), who: pick(NAMES), bank: pick(BANKS), amount: num(5e6, 8e8, 1e6), reg, due, status: late ? pick(['وصول‌شده', 'برگشتی', 'سررسیدشده']) : pick(['در انتظار', 'نزدیک سررسید', 'واگذارشده']) }; }),
    pos: () => gen(9, i => ({ title: 'POS ' + pick(BRANCHES), term: ids(8), merch: ids(10), bank: pick(BANKS), fee: fa(pick([0.5, 0.7, 1])) + '٪', acct: 'IR' + ids(6) + '…', status: pick(['فعال', 'فعال', 'غیرفعال']), since: day(-num(30, 600)) })),
    invoices: () => gen(52, i => { const gross = num(3e6, 9e8, 1e5), pct = pick([0, 0, 5, 10, 15]), disc = Math.round(gross * pct / 100 / 1e5) * 1e5, t = gross - disc, s = pick(['تسویه‌شده', 'پرداخت جزئی', 'تسویه‌نشده']), sl = pick(SELLERS), rate = RATE[sl]; return { no: fa(2200 + 52 - i), cust: pick(NAMES), seller: sl, date: day(-i), disc, pct: disc ? pct : 0, dstate: disc ? 'با تخفیف' : 'بدون تخفیف', total: t, paid: s === 'تسویه‌شده' ? t : s === 'پرداخت جزئی' ? Math.round(t * .4 / 1e5) * 1e5 : 0, comm: Math.round(t * rate / 100 / 1e4) * 1e4, rate, desc: pick(DESCS), status: s }; }),
    purchases: () => gen(30, i => { const gross = num(5e6, 7e8, 1e5), pct = pick([0, 0, 3, 5, 8]), disc = Math.round(gross * pct / 100 / 1e5) * 1e5; return { no: fa(800 + 30 - i), sup: pick(NAMES), date: day(-i * 2), disc, pct: disc ? pct : 0, dstate: disc ? 'با تخفیف' : 'بدون تخفیف', total: gross - disc, due: day(num(0, 45)), desc: pick(DESCS.slice(1)), status: pick(['پرداخت‌شده', 'تسویه‌نشده', 'پرداخت جزئی']) }; }),
    people: () => NAMES.map(n => ({ name: n, kind: pick(['مشتری', 'تأمین‌کننده', 'هر دو']), phone: '۰۹۱۲' + fa(ids(7)).replace(/٬/g, ''), recv: num(0, 6e8, 1e6), pay: num(0, 3e8, 1e6), branch: pick(BRANCHES) })),
    branches: () => BRANCHES.map((b, i) => ({ code: fa(101 + i), name: b, mgr: NAMES[3 + i], cash: fa(num(1, 3)), users: fa(num(3, 14)), sales: num(2e9, 2e10, 1e7), status: 'فعال' })),
    users: () => [['علی رضایی', 'مدیر مالی'], ['مریم صادقی', 'حسابدار ارشد'], ['رضا حیدری', 'صندوقدار'], ['سارا محمدی', 'حسابدار'], ['کامران اکبری', 'مدیر شعبه'], ['نگار فرهادی', 'ناظر (فقط مشاهده)']].map(([n, r], i) => ({ name: n, email: 'user' + (i + 1) + '@example.com', role: r, branch: pick(BRANCHES), status: i === 5 ? 'غیرفعال' : 'فعال' })),
    audit: () => gen(40, i => ({ at: day(-(i >> 2)) + ' ' + fa(num(8, 18)) + ':' + fa(num(10, 59)), who: pick(NAMES.slice(3, 9)), action: pick(['user.signed_in', 'invoice.created', 'journal.posted', 'cheque.status_changed', 'role.permission_granted']), target: pick(['فاکتور ' + fa(2200 + i), 'سند ' + fa(1405000 + i), 'چک ' + fa(i + 10), '—']), out: pick(['موفق', 'موفق', 'موفق', 'ناموفق']) }))
  };
  const sum = (a, k) => a.reduce((s, r) => s + r[k], 0);
  const M = (k) => v => fa(v[k]);
  const PAGES = {
    dashboard: { t: 'داشبورد', d: 'خلاصه‌ای از وضعیت مالی امروز', type: 'dashboard' },
    reports: { t: 'گزارش‌ها', d: 'گزارش‌های مالی، خزانه‌داری، فروش و مدیریتی', type: 'reports' },
    journal: { t: 'دفتر روزنامه', d: 'همه اسناد ثبت‌شده به ترتیب تاریخ', type: 'table', add: ['ثبت سند مرکب', 'new-journal.html'], cols: [['no', 'شماره سند'], ['date', 'تاریخ'], ['desc', 'شرح'], ['amount', 'مبلغ (ریال)', 'm'], ['status', 'وضعیت', 's']], filter: 'status', stats: r => [['تعداد اسناد', fa(r.length)], ['جمع مبالغ', fa(sum(r, 'amount')) + ' ریال'], ['پیش‌نویس', fa(r.filter(x => x.status === 'پیش‌نویس').length)]] },
    trial: { t: 'تراز آزمایشی', d: 'کنترل توازن مانده بدهکار و بستانکار', type: 'table', cols: [['code', 'کد'], ['name', 'نام حساب'], ['dr', 'مانده بدهکار', 'm'], ['cr', 'مانده بستانکار', 'm']], total: ['dr', 'cr'], noPage: 1 },
    accounts: { t: 'بانک و صندوق', d: 'حساب‌های بانکی، صندوق‌ها و تنخواه با موجودی', type: 'table', cols: [['name', 'عنوان'], ['type', 'نوع'], ['bank', 'بانک'], ['no', 'شماره شبا'], ['branch', 'شعبه'], ['balance', 'موجودی (ریال)', 'm'], ['status', 'وضعیت', 's']], filter: 'type', stats: r => [['موجودی بانک‌ها', short(sum(r.filter(x => x.type === 'بانک'), 'balance')).join(' ')], ['موجودی صندوق‌ها', short(sum(r.filter(x => x.type !== 'بانک'), 'balance')).join(' ')], ['تعداد حساب‌ها', fa(r.length)]], addLabel: 'حساب جدید', form: [['name', 'عنوان'], ['type', 'نوع', ['بانک', 'صندوق', 'تنخواه']], ['bank', 'نام بانک'], ['no', 'شماره شبا'], ['balance', 'موجودی اولیه (ریال)']] },
    cheques: { t: 'چک‌ها', d: 'چک‌های دریافتی و پرداختی با شماره چک و شناسه صیادی', type: 'table', cols: [['no', 'شماره چک', 'pk'], ['sayad', 'شناسه صیادی', 'p'], ['kind', 'نوع'], ['who', 'طرف حساب'], ['bank', 'بانک'], ['amount', 'مبلغ (ریال)', 'm'], ['reg', 'تاریخ ثبت', 'd'], ['due', 'سررسید', 'd'], ['status', 'وضعیت', 's']], filter: ['status', 'kind'], stats: r => [['چک‌های دریافتی', fa(r.filter(x => x.kind === 'دریافتی').length)], ['چک‌های پرداختی', fa(r.filter(x => x.kind === 'پرداختی').length)], ['سررسیدشده', fa(r.filter(x => x.status === 'سررسیدشده').length)]], addLabel: 'ثبت چک', form: [['no', 'شماره چک'], ['sayad', 'شناسه صیادی (۱۶ رقم)'], ['kind', 'نوع', ['دریافتی', 'پرداختی']], ['who', 'طرف حساب'], ['bank', 'بانک'], ['amount', 'مبلغ (ریال)'], ['reg', 'تاریخ ثبت چک', 'date'], ['due', 'تاریخ سررسید', 'date']],
      validate: (v, data) => {
        const no = en(v.no).trim(), sy = en(v.sayad).trim(), reg = FISCAL.parseD(v.reg), due = FISCAL.parseD(v.due);
        if (!/^\d{4,12}$/.test(no)) return 'شماره چک را وارد کنید (فقط رقم).';
        if (data.some(r => r.no === no && r.bank === v.bank.trim())) return 'چکی با این شماره برای همین بانک قبلاً ثبت شده است.';
        if (!/^\d{16}$/.test(sy)) return 'شناسه صیادی باید ۱۶ رقم باشد.';
        if (data.some(r => r.sayad === sy)) return 'این شناسه صیادی قبلاً ثبت شده است.';
        if (!v.who.trim() || !v.bank.trim()) return 'طرف حساب و بانک را وارد کنید.';
        if (!parse(v.amount)) return 'مبلغ چک را وارد کنید.';
        if (!reg || !due) return 'تاریخ‌ها را شمسی و معتبر وارد کنید (مثال: ' + FT('1405/07/27') + ').';
        if (due < reg) return `تاریخ سررسید (${FT(due)}) قبل از تاریخ ثبت (${FT(reg)}) است؛ ثبت چکِ سررسیدگذشته مجاز نیست. تاریخ ثبت را به قبل از سررسید تغییر دهید.`;
        return '';
      } },
    pos: { t: 'دستگاه‌های POS', d: 'ترمینال‌ها، پذیرنده‌ها و حساب مقصد تسویه', type: 'table', cols: [['title', 'عنوان'], ['term', 'شماره ترمینال'], ['merch', 'شماره پذیرنده'], ['bank', 'بانک'], ['fee', 'کارمزد'], ['acct', 'حساب مقصد'], ['since', 'فعال‌سازی'], ['status', 'وضعیت', 's']], filter: 'status', addLabel: 'دستگاه جدید', form: [['title', 'عنوان دستگاه'], ['term', 'شماره ترمینال'], ['merch', 'شماره پذیرنده'], ['bank', 'بانک'], ['fee', 'کارمزد (٪)']], unique: 'term' },
    invoices: { t: 'فاکتورهای فروش', d: 'فاکتورها، تخفیف، فروشنده و پورسانت، پرداخت‌ها و مانده هر فاکتور', type: 'table', add: ['فاکتور جدید', 'new-invoice.html'], cols: [['no', 'شماره'], ['cust', 'مشتری'], ['seller', 'فروشنده'], ['date', 'تاریخ'], ['disc', 'تخفیف', 'dc'], ['total', 'مبلغ نهایی (ریال)', 'm'], ['paid', 'پرداخت‌شده', 'm'], ['rest', 'مانده', 'm'], ['comm', 'پورسانت (ریال)', 'cm'], ['desc', 'شرح', 't'], ['status', 'وضعیت', 's']], filter: ['status', 'seller', 'dstate'], fl: { dstate: 'تخفیف' },
      stats: r => [['جمع فروش (پس از تخفیف)', short(sum(r, 'total')).join(' ')], ['جمع تخفیف‌ها', short(sum(r, 'disc')).join(' ') + ' · ' + fa(r.filter(x => x.disc).length) + ' فاکتور'], ['مانده مطالبات', short(sum(r, 'total') - sum(r, 'paid')).join(' ')], ['جمع پورسانت فروشندگان', fa(sum(r, 'comm')) + ' ریال']],
      top: r => SELLERS.map(s => { const x = r.filter(y => y.seller === s); return `<div class="card kpi"><span>${s}</span><b style="font-size:16px">${fa(x.length)} فاکتور · ${short(sum(x, 'total')).join(' ')}</b><em>پورسانت: ${fa(sum(x, 'comm'))} ریال (${fa(RATE[s])}٪)</em></div>`; }).join('') },
    purchases: { t: 'فاکتورهای خرید', d: 'خرید از تأمین‌کنندگان، تخفیف و بدهی‌های باز', type: 'table', cols: [['no', 'شماره'], ['sup', 'تأمین‌کننده'], ['date', 'تاریخ'], ['disc', 'تخفیف', 'dc'], ['total', 'مبلغ نهایی (ریال)', 'm'], ['due', 'سررسید پرداخت'], ['desc', 'شرح', 't'], ['status', 'وضعیت', 's']], filter: ['status', 'dstate'], fl: { dstate: 'تخفیف' },
      stats: r => [['جمع خرید (پس از تخفیف)', short(sum(r, 'total')).join(' ')], ['جمع تخفیف‌ها', short(sum(r, 'disc')).join(' ')], ['فاکتورهای دارای تخفیف', fa(r.filter(x => x.disc).length)]], addLabel: 'فاکتور خرید', form: [['sup', 'تأمین‌کننده'], ['total', 'مبلغ ناخالص (ریال)'], ['pct', 'درصد تخفیف'], ['due', 'سررسید پرداخت', 'date'], ['desc', 'شرح', 'textarea']],
      validate: v => !v.sup.trim() ? 'نام تأمین‌کننده را وارد کنید.' : !parse(v.total) ? 'مبلغ فاکتور را وارد کنید.' : parse(v.pct) > 100 ? 'درصد تخفیف باید بین ۰ تا ۱۰۰ باشد.' : '',
      make: v => { const g = parse(v.total), pct = parse(v.pct), disc = Math.round(g * pct / 100); return { no: fa(900 + Math.floor(rnd() * 90)), sup: v.sup.trim(), date: day(0), disc, pct: disc ? pct : 0, dstate: disc ? 'با تخفیف' : 'بدون تخفیف', total: g - disc, due: FT(FISCAL.parseD(v.due) || jd(30)), desc: v.desc.trim(), status: 'تسویه‌نشده' }; } },
    people: { t: 'مشتریان و تأمین‌کنندگان', d: 'مانده حساب هر شخص', type: 'table', cols: [['name', 'نام'], ['kind', 'نوع'], ['phone', 'تلفن'], ['branch', 'شعبه'], ['recv', 'مطالبات', 'm'], ['pay', 'بدهی', 'm']], filter: 'kind', addLabel: 'شخص جدید', form: [['name', 'نام'], ['kind', 'نوع', ['مشتری', 'تأمین‌کننده', 'هر دو']], ['phone', 'تلفن']] },
    branches: { t: 'شعب', d: 'ساختار سازمانی و عملکرد هر شعبه', type: 'table', cols: [['code', 'کد'], ['name', 'نام شعبه'], ['mgr', 'مدیر'], ['cash', 'صندوق‌ها'], ['users', 'کاربران'], ['sales', 'فروش ماه (ریال)', 'm'], ['status', 'وضعیت', 's']], addLabel: 'شعبه جدید', form: [['code', 'کد شعبه'], ['name', 'نام شعبه'], ['mgr', 'مدیر شعبه']] },
    users: { t: 'کاربران و نقش‌ها', d: 'عضویت‌ها و دسترسی‌ها', type: 'table', cols: [['name', 'نام'], ['email', 'ایمیل'], ['role', 'نقش'], ['branch', 'شعبه'], ['status', 'وضعیت', 's']], filter: 'role', addLabel: 'کاربر جدید', form: [['name', 'نام نمایشی'], ['email', 'ایمیل', 'email'], ['role', 'نقش', ['حسابدار', 'صندوقدار', 'مدیر مالی', 'ناظر (فقط مشاهده)']]] },
    audit: { t: 'تاریخچه تغییرات', d: 'ثبت همه عملیات کاربران (غیرقابل ویرایش)', type: 'table', cols: [['at', 'زمان'], ['who', 'کاربر'], ['action', 'عملیات'], ['target', 'مورد'], ['out', 'نتیجه', 's']], filter: 'out' },
    'new-journal': { t: 'ثبت سند مرکب', d: 'سند فقط با تراز بودن بدهکار و بستانکار ثبت می‌شود', type: 'journal' },
    'new-invoice': { t: 'فاکتور فروش جدید', d: 'چند روش پرداخت و پرداخت جزئی پشتیبانی می‌شود', type: 'invoice' },
    settings: { t: 'تنظیمات', d: 'اطلاعات شرکت و قواعد حسابداری', type: 'settings' }
  };

  /* ---------- renderers ---------- */
  const R = {};
  const kpi = (l, v, sub, cls = '', neg) => { const [n, u] = Array.isArray(v) ? v : [v, '']; return `<div class="card kpi ${cls}"><span>${l}</span><b>${n}<i>${u}</i></b>${sub ? `<em class="${neg ? 'neg' : ''}">${sub}</em>` : ''}</div>`; };

  R.dashboard = c => {
    const inv = rows.invoices().slice(0, 6), mon = ['خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان'];
    const inc = [3.1, 3.8, 3.4, 4.6, 5.2, 4.9], exp = [2.4, 2.9, 2.8, 3.3, 3.6, 3.7], mx = 6;
    const bars = mon.map((m, i) => { const x = 40 + i * 92; return `<rect x="${x}" y="${190 - inc[i] / mx * 170}" width="30" height="${inc[i] / mx * 170}" rx="5" fill="var(--c1)"/><rect x="${x + 34}" y="${190 - exp[i] / mx * 170}" width="30" height="${exp[i] / mx * 170}" rx="5" fill="var(--c3)"/><text x="${x + 32}" y="210" text-anchor="middle">${m}</text>`; }).join('');
    const grid = [0, 2, 4, 6].map(v => `<line x1="30" x2="590" y1="${190 - v / mx * 170}" y2="${190 - v / mx * 170}" stroke="var(--border)"/><text x="24" y="${194 - v / mx * 170}" text-anchor="end">${fa(v)}</text>`).join('');
    const pay = [['نقد', 34, 'c1'], ['کارت', 41, 'c2'], ['چک', 18, 'c3'], ['حواله', 7, 'c4']]; let off = 0;
    const ring = pay.map(([, v, k]) => { const s = `<circle r="15.9" cx="18" cy="18" fill="none" stroke="var(--${k})" stroke-width="5" stroke-dasharray="${v - 1} ${101 - v}" stroke-dashoffset="${-off}"/>`; off += v; return s; }).join('');
    const tasks = [['تطبیق مغایرت بانک ملت', 'امروز'], ['تأیید اسناد شعبه ونک', 'فردا'], ['ارسال فاکتورهای معوق', 'پنجشنبه']];
    const chq = rows.cheques().filter(x => x.status === 'نزدیک سررسید' || x.status === 'در انتظار').slice(0, 4);
    return head(c, `<a class="btn" href="new-journal.html">${ico('plus')}سند جدید</a><a class="btn primary" href="new-invoice.html">${ico('plus')}فاکتور جدید</a>`) + `<div class="stack">
    <div class="grid g4">${kpi('موجودی حساب‌های بانکی', short(48.2e9), '۳٫۱٪ بیشتر از ماه قبل')}${kpi('موجودی صندوق‌ها', short(1.34e9), '')}${kpi('دریافت‌های امروز', short(612e6), '۱۸ تراکنش')}${kpi('پرداخت‌های امروز', short(287e6), '۹ تراکنش', '', 1)}</div>
    <div class="grid g4">${kpi('فروش امروز', short(740e6), 'ماه جاری: ۱۸٫۴ میلیارد ریال', 'hl')}${kpi('خرید امروز', short(310e6), 'ماه جاری: ۹٫۷ میلیارد ریال')}${kpi('سود خالص ماه', short(2.9e9), '۱۵٫۸٪ حاشیه سود', 'hl')}${kpi('مطالبات از مشتریان', short(7.6e9), '۱۲ فاکتور سررسیدشده', '', 1)}</div>
    <div class="grid g21"><section class="card"><div class="card-head"><h2>درآمد و هزینه</h2><div class="legend"><span><i style="background:var(--c1)"></i>درآمد</span><span><i style="background:var(--c3)"></i>هزینه</span><small>میلیارد ریال</small></div></div><svg class="chart" viewBox="0 0 600 220" role="img" aria-label="نمودار درآمد و هزینه شش ماه اخیر">${grid}${bars}</svg></section>
    <section class="card"><div class="card-head"><h2>روش‌های پرداخت</h2></div><div class="donut-wrap"><svg class="donut" viewBox="0 0 36 36" role="img" aria-label="سهم روش‌های پرداخت">${ring}</svg><ul class="legend" style="flex-direction:column;gap:8px">${pay.map(([l, v, k]) => `<li><i style="background:var(--${k})"></i>${l} <b>${fa(v)}٪</b></li>`).join('')}</ul></div></section></div>
    <div class="grid g3"><section class="card"><div class="card-head"><h2>آخرین فاکتورها</h2><a class="btn sm" href="invoices.html">همه</a></div><ul class="list">${inv.slice(0, 5).map(r => `<li><span>${r.cust}<small>فاکتور ${r.no}</small></span><span>${fa(r.total / 1e6)} م</span></li>`).join('')}</ul></section>
    <section class="card"><div class="card-head"><h2>چک‌های نزدیک سررسید</h2><a class="btn sm" href="cheques.html">همه</a></div><ul class="list">${chq.map(r => `<li><span>${r.who}<small>${FT(r.due)}</small></span>${badge(r.status)}</li>`).join('')}</ul></section>
    <section class="card"><div class="card-head"><h2>تسک‌های من</h2></div><ul class="list">${tasks.map(([t, d]) => `<li><label style="display:flex;gap:10px;align-items:center"><input type="checkbox" style="accent-color:var(--primary)"> ${t}</label><small>${d}</small></li>`).join('')}</ul></section></div></div>`;
  };

  R.reports = c => {
    const G = { 'گزارشات مالی': ['ترازنامه', 'صورت سود و زیان', 'صورت جریان وجوه نقد', 'تراز آزمایشی', 'دفتر کل', 'دفتر معین', 'گردش حساب', 'گزارش بدهکاران و بستانکاران'], 'خزانه‌داری': ['موجودی بانک‌ها', 'گردش حساب بانکی', 'گزارش سررسید چک‌ها', 'مغایرت بانکی', 'جریان نقدینگی'], 'فروش و خرید': ['فروش روزانه', 'فروش بر اساس مشتری', 'فروش شعب', 'خرید بر اساس تأمین‌کننده', 'فاکتورهای تسویه‌نشده', 'گزارش مالیات'], 'مدیریتی': ['عملکرد شعب', 'عملکرد کاربران', 'سودآوری هر شعبه', 'گزارش بودجه', 'پیش‌بینی جریان نقدینگی'] };
    return head(c) + `<div class="grid g2" style="margin-top:20px">${Object.entries(G).map(([g, it]) => `<section class="card rep-group"><h2>${g}</h2>${it.map(i => `<button data-r="${i}">${i}<span style="color:var(--muted-foreground)">باز کردن</span></button>`).join('')}</section>`).join('')}</div>`;
  };
  R.reports.after = () => document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
    const n = b.dataset.r;
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog"><h3>${n}</h3><div class="form-grid"><div class="field"><label>از تاریخ</label><input class="inp" value="${day(-30)}"></div><div class="field"><label>تا تاریخ</label><input class="inp" value="${day(0)}"></div><div class="field"><label>شعبه</label><select class="sel"><option>همه شعب</option>${BRANCHES.map(x => `<option>${x}</option>`).join('')}</select></div><div class="field"><label>وضعیت</label><select class="sel"><option>همه</option><option>تراز</option><option>پیش‌نویس</option></select></div></div><menu><button class="btn" value="x">بستن</button><button class="btn" value="xl">${ico('down')}Excel</button><button class="btn" value="pdf">${ico('down')}PDF</button><button class="btn primary" value="show">نمایش گزارش</button></menu></form>`;
    document.body.append(d); d.showModal();
    d.onclose = () => { if (d.returnValue !== 'x') toast('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود'); d.remove(); };
  });

  /* Table with URL state: ?page= &limit= &search= &status= (first filter) &f1= &f2= … */
  R.table = c => {
    c.data = c.data || rows[cur]();
    if (cur === 'invoices') c.data.forEach(r => r.rest = r.total - r.paid);
    const Fs = [].concat(c.filter || []), lab = k => (c.fl && c.fl[k]) || c.cols.find(x => x[0] === k)[1];
    const add = c.add ? `<a class="btn primary" href="${c.add[1]}">${ico('plus')}${c.add[0]}</a>` : c.form ? `<button class="btn primary" id="add">${ico('plus')}${c.addLabel}</button>` : '';
    return head(c, `<button class="btn" onclick="print()">${ico('print')}چاپ</button>${add}`) + `<div class="stack">${c.stats ? `<div class="grid g${c.stats(c.data).length}" id="stats"></div>` : ''}${c.top ? `<div><p class="muted" style="margin-bottom:8px">عملکرد فروشندگان (طبق فیلترهای فعلی)</p><div class="grid g3" id="top"></div></div>` : ''}
    <div><div class="toolbar"><label class="search">${ico('search')}<input class="inp" style="width:100%;padding-inline-start:40px" id="q" type="search" placeholder="جستجو در جدول…" aria-label="جستجو"></label>${Fs.map(k => `<select class="sel" data-f="${k}" aria-label="${lab(k)}"><option value="">${lab(k)}: همه</option>${[...new Set(c.data.map(r => r[k]))].map(v => `<option>${v}</option>`).join('')}</select>`).join('')}</div>
    <div class="tbl-wrap"><table aria-label="${c.t}"><thead><tr><th class="n" style="width:56px">ردیف</th>${c.cols.map(([, l, t]) => `<th class="${['m', 'dc', 'cm'].includes(t) ? 'n' : ''}">${l}</th>`).join('')}</tr></thead><tbody id="tb"></tbody>${c.total ? '<tfoot id="tf"></tfoot>' : ''}</table></div><div class="pager" id="pg"></div></div></div>`;
  };
  R.table.after = c => {
    const Fs = [].concat(c.filter || []), q = new URLSearchParams(location.search), key = i => i ? 'f' + i : 'status';
    const st = { s: q.get('search') || '', f: Object.fromEntries(Fs.map((k, i) => [k, q.get(key(i)) || ''])), p: +q.get('page') || 1, l: [10, 20, 50].includes(+q.get('limit')) ? +q.get('limit') : 10 };
    const cell = (r, [k, , t]) => {
      const v = r[k];
      const h = t === 's' ? badge(v) : t === 'm' ? fa(v) : t === 'd' || t === 'p' ? FT(v) : t === 'pk' ? `<b>${FT(v)}</b>` :
        t === 'dc' ? (r.disc ? `${fa(r.disc)} <small class="muted">(${fa(r.pct)}٪)</small>` : '<span class="muted">بدون تخفیف</span>') :
        t === 'cm' ? `${fa(r.comm)} <small class="muted">(${fa(r.rate)}٪)</small>` :
        t === 't' ? `<span class="tdesc" title="${esc(v)}">${v ? esc(v) : '—'}</span>` : esc(v);
      return `<td class="${['m', 'dc', 'cm'].includes(t) ? 'n' : ''}">${h}</td>`;
    };
    const draw = () => {
      const needle = en(st.s);
      let a = c.data.filter(r => Fs.every(k => !st.f[k] || r[k] === st.f[k]) && (!st.s || en(Object.values(r).join(' ')).includes(needle)));
      const pages = Math.max(1, Math.ceil(a.length / st.l)); st.p = Math.min(st.p, pages);
      const from = (st.p - 1) * st.l, view = c.noPage ? a : a.slice(from, from + st.l), off = c.noPage ? 0 : from;
      $('#tb').innerHTML = view.length ? view.map((r, i) => `<tr><td class="n muted">${fa(off + i + 1)}</td>${c.cols.map(x => cell(r, x)).join('')}</tr>`).join('') : `<tr><td colspan="${c.cols.length + 1}" class="empty-row">${st.s ? `نتیجه‌ای برای «${esc(st.s)}» پیدا نشد. عبارت دیگری را جستجو کنید.` : 'موردی با این فیلترها پیدا نشد.'}</td></tr>`;
      if (c.total) { const [x, y] = c.total, sx = sum(a, x), sy = sum(a, y); $('#tf').innerHTML = `<tr><td colspan="3">جمع کل</td><td class="n">${fa(sx)}</td><td class="n">${fa(sy)}</td></tr>`; }
      if (c.stats) $('#stats').innerHTML = c.stats(a).map(([l, v]) => `<div class="card kpi"><span>${l}</span><b style="font-size:18px">${v}</b></div>`).join('');
      if (c.top) $('#top').innerHTML = c.top(a);
      $('#pg').innerHTML = c.noPage ? (c.total ? `<span class="alert ${sum(a, 'dr') === sum(a, 'cr') ? 'ok' : ''}">${sum(a, 'dr') === sum(a, 'cr') ? 'ترازِ بدهکار و بستانکار برقرار است.' : 'مغایرت در تراز: اختلاف ' + fa(Math.abs(sum(a, 'dr') - sum(a, 'cr')))}</span>` : '') : `<span>نمایش ${fa(a.length ? from + 1 : 0)} تا ${fa(Math.min(from + st.l, a.length))} از ${fa(a.length)}</span><div><select class="sel" id="lim" aria-label="تعداد در صفحه">${[10, 20, 50].map(n => `<option value="${n}"${n === st.l ? ' selected' : ''}>${fa(n)} ردیف</option>`).join('')}</select><button class="btn sm" id="pv" ${st.p <= 1 ? 'disabled' : ''}>قبلی</button><span>صفحه ${fa(st.p)} از ${fa(pages)}</span><button class="btn sm" id="nx" ${st.p >= pages ? 'disabled' : ''}>بعدی</button></div>`;
      if (!c.noPage) { $('#pv').onclick = () => { st.p--; sync(); }; $('#nx').onclick = () => { st.p++; sync(); }; $('#lim').onchange = e => { st.l = +e.target.value; st.p = 1; sync(); }; }
    };
    const sync = () => { const u = new URLSearchParams(); if (st.s) u.set('search', st.s); Fs.forEach((k, i) => st.f[k] && u.set(key(i), st.f[k])); if (st.p > 1) u.set('page', st.p); if (st.l !== 10) u.set('limit', st.l); try { history.replaceState(null, '', location.pathname + (u + '' ? '?' + u : '')); } catch (e) { /* file:// */ } draw(); };
    const qi = $('#q'); qi.value = st.s; qi.oninput = e => { st.s = e.target.value.trim(); st.p = 1; sync(); };
    document.querySelectorAll('[data-f]').forEach(s => { s.value = st.f[s.dataset.f]; s.onchange = e => { st.f[s.dataset.f] = e.target.value; st.p = 1; sync(); }; });
    const ad = $('#add'); if (ad) ad.onclick = () => dialog(c.addLabel, c.form, 'ذخیره', v => {
      const n = c.make ? c.make(v) : (() => { const o = {}; c.cols.forEach(([k, , t]) => o[k] = t === 'm' ? parse(v[k]) : t === 's' ? 'فعال' : t === 'd' ? FISCAL.parseD(v[k]) : t === 'p' || t === 'pk' ? en(v[k]).trim() : v[k] || '—'); if (cur === 'cheques') o.status = o.due <= jd(7) ? 'نزدیک سررسید' : 'در انتظار'; return o; })();
      c.data.unshift(n); st.p = 1; sync(); toast('با موفقیت ثبت شد');
    }, v => (c.validate && c.validate(v, c.data)) || (c.unique && c.data.some(r => String(r[c.unique]) === en(v[c.unique]).trim()) ? 'این شماره قبلاً ثبت شده است.' : ''));
    draw();
  };

  const lineTable = (cols, id) => `<div class="tbl-wrap"><table class="lines" aria-label="${id}"><thead><tr>${cols.map(x => `<th>${x}</th>`).join('')}<th></th></tr></thead><tbody id="${id}"></tbody></table></div>`;
  R.journal = c => head(c) + `<div class="stack"><section class="card"><div class="form-grid"><div class="field"><label for="jd">تاریخ سند</label><input class="inp" id="jd" value="${day(0)}"></div><div class="field"><label for="jn">شماره سند</label><input class="inp" id="jn" value="${fa(1405049)}" readonly></div><div class="field" style="grid-column:span 2"><label for="jx">شرح سند</label><input class="inp" id="jx" placeholder="مثلاً: ثبت هزینه اجاره آبان"></div></div></section>
    <section class="card">${lineTable(['حساب', 'بدهکار', 'بستانکار'], 'jl')}<div style="margin-top:12px"><button class="btn sm" id="ja">${ico('plus')}ردیف جدید</button></div></section>
    <section class="card split"><div id="jmsg"></div><div class="totals"><div><span>جمع بدهکار</span><b id="jdr"></b></div><div><span>جمع بستانکار</span><b id="jcr"></b></div><div class="big"><span>اختلاف</span><b id="jdf"></b></div></div></section>
    <div class="page-actions"><button class="btn primary" id="jsave" disabled>ثبت سند</button><button class="btn" id="jdraft">ذخیره پیش‌نویس</button></div></div>`;
  R.journal.after = () => {
    const L = [{ a: 0, d: '', c: '' }, { a: 7, d: '', c: '' }];
    const draw = () => { $('#jl').innerHTML = L.map((r, i) => `<tr><td><select class="sel" data-i="${i}" data-k="a">${ACCOUNTS.map((a, j) => `<option value="${j}"${j === r.a ? ' selected' : ''}>${a}</option>`).join('')}</select></td><td><input class="inp" inputmode="numeric" data-i="${i}" data-k="d" value="${r.d}" aria-label="بدهکار"></td><td><input class="inp" inputmode="numeric" data-i="${i}" data-k="c" value="${r.c}" aria-label="بستانکار"></td><td><button class="icon-btn" data-x="${i}" aria-label="حذف ردیف" ${L.length < 3 ? 'disabled' : ''}>✕</button></td></tr>`).join(''); calc(); };
    const calc = () => { const d = L.reduce((s, r) => s + parse(r.d), 0), k = L.reduce((s, r) => s + parse(r.c), 0), ok = d === k && d > 0 && !!$('#jx').value.trim();
      $('#jdr').textContent = fa(d); $('#jcr').textContent = fa(k); $('#jdf').textContent = fa(Math.abs(d - k)); $('#jsave').disabled = !ok;
      $('#jmsg').innerHTML = d === k && d > 0 ? `<div class="alert ok">سند تراز است.${$('#jx').value.trim() ? '' : ' شرح سند را وارد کنید.'}</div>` : `<div class="alert">${d === 0 ? 'مبلغ بدهکار و بستانکار را وارد کنید.' : 'سند تراز نیست؛ اختلاف را اصلاح کنید.'}</div>`; };
    $('#jl').addEventListener('input', e => { const t = e.target; if (t.dataset.i) { const r = L[t.dataset.i]; r[t.dataset.k] = t.dataset.k === 'a' ? +t.value : t.value; if (t.dataset.k === 'd' && parse(t.value)) r.c = ''; if (t.dataset.k === 'c' && parse(t.value)) r.d = ''; if (t.dataset.k !== 'a') { const o = t.closest('tr').querySelectorAll('input'); o[0].value = r.d; o[1].value = r.c; } calc(); } });
    $('#jl').addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (x) { L.splice(+x.dataset.x, 1); draw(); } });
    $('#ja').onclick = () => { L.push({ a: 0, d: '', c: '' }); draw(); };
    $('#jx').oninput = calc; $('#jsave').onclick = () => toast('سند ثبت شد (نسخه نمایشی)'); $('#jdraft').onclick = () => toast('پیش‌نویس ذخیره شد'); draw();
  };

  R.invoice = c => head(c) + `<div class="stack"><section class="card"><div class="form-grid"><div class="field"><label for="ic">مشتری</label><select class="sel" id="ic">${NAMES.map(n => `<option>${n}</option>`).join('')}</select></div><div class="field"><label for="idt">تاریخ</label><input class="inp" id="idt" value="${day(0)}"></div><div class="field"><label for="ib">شعبه</label><select class="sel" id="ib">${BRANCHES.map(n => `<option>${n}</option>`).join('')}</select></div><div class="field"><label for="isl">فروشنده</label><select class="sel" id="isl">${SELLERS.map(n => `<option>${n}</option>`).join('')}</select></div><div class="field"><label for="ik">نوع</label><select class="sel" id="ik"><option>فاکتور فروش</option><option>پیش‌فاکتور</option></select></div></div><div class="field" style="margin-top:14px"><label for="ids">شرح فاکتور</label><textarea class="inp" id="ids" rows="2" style="height:auto;padding-block:8px;width:100%" placeholder="توضیحات حسابدار درباره‌ی این فاکتور (اختیاری)"></textarea></div></section>
    <section class="card">${lineTable(['کالا / خدمت', 'تعداد', 'قیمت واحد (ریال)', 'جمع (ریال)'], 'il')}<div style="margin-top:12px"><button class="btn sm" id="ia">${ico('plus')}ردیف جدید</button></div></section>
    <div class="grid g2"><section class="card"><div class="card-head"><h2>پرداخت‌ها</h2><button class="btn sm" id="pa">${ico('plus')}روش پرداخت</button></div>${lineTable(['روش', 'مبلغ (ریال)'], 'pl')}</section>
    <section class="card"><div class="totals" style="margin:0"><div><span>جمع ردیف‌ها</span><b id="t1"></b></div><div class="field"><label for="dc">تخفیف (درصد)</label><input class="inp" id="dc" value="۰" inputmode="numeric"></div><div class="field"><label for="tx">مالیات بر ارزش افزوده (درصد)</label><input class="inp" id="tx" value="۱۰" inputmode="numeric"></div><div><span>مالیات</span><b id="t2"></b></div><div class="big"><span>مبلغ نهایی</span><b id="t3"></b></div><div><span>پرداخت‌شده</span><b id="t4"></b></div><div><span>مانده</span><b id="t5"></b></div><div><span>پورسانت فروشنده (<span id="t7r"></span>٪)</span><b id="t7"></b></div><div id="t6"></div></div></section></div>
    <div class="page-actions"><button class="btn primary" id="isave">ثبت فاکتور</button><button class="btn" onclick="print()">${ico('print')}چاپ</button><button class="btn" id="ipdf">${ico('down')}خروجی PDF</button></div></div>`;
  R.invoice.after = () => {
    const L = [{ n: 'خدمات حسابداری', q: '۱', p: '۲۵۰۰۰۰۰۰' }], Y = [{ m: 'نقد', v: '' }], METH = ['نقد', 'کارت', 'چک', 'حواله'];
    const total = () => { const s = L.reduce((a, r) => a + parse(r.q) * parse(r.p), 0), dc = Math.round(s * parse($('#dc').value) / 100), tx = Math.round((s - dc) * parse($('#tx').value) / 100); return { s, tx, t: s - dc + tx, paid: Y.reduce((a, r) => a + parse(r.v), 0) }; };
    const calc = () => { const { s, tx, t, paid } = total(); L.forEach((r, i) => { const e = $(`#lt${i}`); if (e) e.textContent = fa(parse(r.q) * parse(r.p)); });
      $('#t1').textContent = fa(s); $('#t2').textContent = fa(tx); $('#t3').textContent = fa(t); $('#t4').textContent = fa(paid); $('#t5').textContent = fa(Math.max(t - paid, 0)); const rt = RATE[$('#isl').value]; $('#t7r').textContent = fa(rt); $('#t7').textContent = fa(Math.round((t - tx) * rt / 100));
      $('#t6').innerHTML = paid > t ? '<div class="alert">مبلغ پرداخت از مبلغ فاکتور بیشتر است.</div>' : t > 0 ? `<div>${badge(paid === t ? 'تسویه‌شده' : paid ? 'پرداخت جزئی' : 'تسویه‌نشده')}</div>` : ''; $('#isave').disabled = !(t > 0) || paid > t; };
    const draw = () => {
      $('#il').innerHTML = L.map((r, i) => `<tr><td><input class="inp" data-l="${i}" data-k="n" value="${esc(r.n)}" aria-label="کالا"></td><td><input class="inp" data-l="${i}" data-k="q" value="${r.q}" inputmode="numeric" aria-label="تعداد"></td><td><input class="inp" data-l="${i}" data-k="p" value="${r.p}" inputmode="numeric" aria-label="قیمت"></td><td id="lt${i}"></td><td><button class="icon-btn" data-dl="${i}" aria-label="حذف" ${L.length < 2 ? 'disabled' : ''}>✕</button></td></tr>`).join('');
      $('#pl').innerHTML = Y.map((r, i) => `<tr><td><select class="sel" data-y="${i}" data-k="m">${METH.map(m => `<option${m === r.m ? ' selected' : ''}>${m}</option>`).join('')}</select></td><td><input class="inp" data-y="${i}" data-k="v" value="${r.v}" inputmode="numeric" aria-label="مبلغ"></td><td><button class="icon-btn" data-dy="${i}" aria-label="حذف" ${Y.length < 2 ? 'disabled' : ''}>✕</button></td></tr>`).join(''); calc(); };
    document.addEventListener('input', e => { const t = e.target; if (t.dataset.l) L[t.dataset.l][t.dataset.k] = t.value; else if (t.dataset.y) Y[t.dataset.y][t.dataset.k] = t.value; else if (!['dc', 'tx', 'isl'].includes(t.id)) return; calc(); });
    document.addEventListener('click', e => { const a = e.target.closest('[data-dl],[data-dy]'); if (!a) return; (a.dataset.dl ? L : Y).splice(+(a.dataset.dl ?? a.dataset.dy), 1); draw(); });
    $('#ia').onclick = () => { L.push({ n: '', q: '۱', p: '' }); draw(); }; $('#pa').onclick = () => { Y.push({ m: 'کارت', v: '' }); draw(); };
    $('#isave').onclick = () => toast('فاکتور ثبت شد و سند حسابداری ساخته می‌شود (نسخه نمایشی)'); $('#ipdf').onclick = () => toast('خروجی PDF در نسخه نهایی ساخته می‌شود'); draw();
  };

  R.settings = c => {
    const sw = (l, h, on, lock) => `<label class="switch"><span>${l}<small style="display:block;color:var(--muted-foreground)">${h}</small></span><input type="checkbox" ${on ? 'checked' : ''} ${lock ? 'disabled' : ''}></label>`;
    return head(c, '<button class="btn primary" id="ss">ذخیره تغییرات</button>') + `<div class="grid g2" style="margin-top:20px"><section class="card"><div class="card-head"><h2>اطلاعات شرکت</h2></div><div class="form-grid" style="grid-template-columns:1fr 1fr"><div class="field"><label>نام شرکت</label><input class="inp" value="شرکت نمونه"></div><div class="field"><label>شناسه ملی</label><input class="inp" value="۱۴۰۰۱۲۳۴۵۶۷"></div><div class="field"><label>شروع سال مالی</label><input class="inp" readonly value="${FISCAL.get().years[0] ? FISCAL.toFa(FISCAL.get().years[0].from) : 'تعریف نشده'}"></div><div class="field"><label>واحد پول</label><select class="sel"><option>ریال (IRR)</option><option>تومان</option></select></div></div>${(() => { const a = FISCAL.active(), b = FISCAL.banner(); return `<div class="fiscal-sum"><div><small>سال مالی</small><b>${a.year ? a.year.title : 'تعریف نشده'}</b></div><div><small>دوره‌ی جاری</small><b>${a.period ? a.period.name : '—'}</b></div><div><small>وضعیت</small>${a.period ? badge(a.period.status) : badge('بدون دوره')}</div><a class="btn" href="fiscal-periods.html">${ico('calendar')}مدیریت سال و دوره‌های مالی</a></div>${b ? `<div class="alert ${b.kind === 'bad' ? 'bad' : ''}" style="margin-top:10px">${b.msg}</div>` : ''}`; })()}</section>
    <section class="card"><div class="card-head"><h2>قواعد حسابداری</h2></div>${sw('شماره‌گذاری خودکار اسناد', 'شماره سند به‌ترتیب و بدون تکرار ساخته می‌شود', 1)}${sw('کنترل توازن بدهکار و بستانکار', 'ثبت سند نامتوازن همیشه مسدود است', 1, 1)}${sw('ایجاد خودکار سند برای فاکتور', 'پس از ثبت فاکتور و دریافت/پرداخت', 1)}${sw('جلوگیری از تراکنش تکراری', 'هشدار هنگام ثبت پرداخت مشابه', 1)}</section></div>`;
  };
  R.settings.after = () => $('#ss').onclick = () => toast('تغییرات ذخیره شد');

  const paint = () => {
    const a = FISCAL.active(), ch = FISCAL.chip(), b = FISCAL.banner();
    $('#brandSub').textContent = 'شرکت نمونه · ' + (a.year ? a.year.title : 'بدون سال مالی');
    $('#chip').innerHTML = `<span class="pdot ${ch.kind}"></span><span class="pt">${ch.text}</span>`;
    $('#banner').innerHTML = b && cur !== 'fiscal-setup' ? `<div class="banner ${b.kind}" role="alert"><span>${b.msg}</span><a class="btn sm" href="${b.href}">${b.label}</a></div>` : '';
  };
  window.MH = { $, fa, esc, badge, toast, head, kpi, ico, R, PAGES, paint };

  /* ---------- boot ---------- */
  Object.assign(PAGES, {
    'fiscal-periods': { t: 'دوره‌های مالی', d: 'ایجاد، باز و بسته کردن دوره‌ها؛ ثبت فقط در دوره‌ی باز مجاز است', type: 'fperiods' },
    'fiscal-years': { t: 'سال‌های مالی', d: 'سال‌های مالی شرکت و دوره‌های هر سال', type: 'fyears' },
    'fiscal-setup': { t: 'راه‌اندازی مالی', d: 'چهار قدم تا آماده شدن شرکت برای ثبت اطلاعات', type: 'fsetup' }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const c = PAGES[cur]; if (!c) return;
    document.title = c.t + ' | مین‌حساب';
    const r = R[c.type];
    $('#content').innerHTML = '<div id="banner"></div>' + r(c);
    paint();
    if (r.after) r.after(c);
  });
})();
