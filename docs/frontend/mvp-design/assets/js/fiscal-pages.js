/* صفحات سال و دوره مالی: راه‌اندازی مالی (SET-001)، سال‌های مالی، دوره‌های مالی (ACC-006) */
(function () {
  'use strict';
  const { $, esc, badge, toast, head, kpi, ico, R, paint } = window.MH;
  const F = window.FISCAL, ST = F.ST, fd = F.toFa;
  const q = new URLSearchParams(location.search);

  /* دیالوگ با دکمه‌ی تأیید که تا معتبر شدن فرم غیرفعال است */
  function modal({ title, body, ok, danger, check, onOk }) {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog"><h3>${title}</h3>${body}<div class="alert bad" data-err hidden style="margin-top:12px"></div><menu><button class="btn" type="button" data-x>انصراف</button><button class="btn primary${danger ? ' danger' : ''}" value="ok" disabled>${ok}</button></menu></form>`;
    document.body.append(d); d.showModal();
    $('[data-x]', d).onclick = () => d.close('x');
    const b = $('[value=ok]', d), err = $('[data-err]', d); let touched = false;
    const run = () => { const m = check(d); b.disabled = !!m; err.hidden = !(touched && m && m !== true); err.textContent = typeof m === 'string' ? m : ''; };
    d.addEventListener('input', () => { touched = true; run(); }); run();
    d.addEventListener('close', () => { if (d.returnValue === 'ok') onOk(d); d.remove(); });
  }
  const val = (d, n) => $(`[name=${n}]`, d).value;
  const field = (n, l, v = '', ph = '') => `<div class="field"><label for="m-${n}">${l}</label><input class="inp" id="m-${n}" name="${n}" value="${esc(v)}" placeholder="${ph}"></div>`;
  const demo = () => `<label class="demo-sel">حالت نمایشی<select class="sel" id="demo" aria-label="حالت نمایشی"><option value="">انتخاب کنید…</option><option value="normal">عادی</option><option value="closednow">دوره‌ی جاری بسته</option><option value="noopen">بدون دوره‌ی باز</option><option value="empty">بدون سال مالی</option></select></label>`;
  const bindDemo = () => { const s = $('#demo'); if (s) s.onchange = e => { if (e.target.value) { F.reset(e.target.value); location.href = location.pathname; } }; };
  const yearStatus = (y, ps) => !ps.length ? 'بدون دوره' : ps.every(p => p.status === ST.closed) ? 'بسته' : y.from <= F.today() && F.today() <= y.to ? 'فعال' : y.from > F.today() ? 'آینده' : 'فعال';
  const yearSel = (S, id) => `<select class="sel" id="ysel" aria-label="سال مالی">${S.years.map(y => `<option value="${y.id}"${y.id === id ? ' selected' : ''}>${y.title}</option>`).join('')}</select>`;
  const empty = (t, p, btns) => `<section class="card empty-card"><div>${ico('calendar')}<h2>${t}</h2><p>${p}</p><div class="page-actions" style="justify-content:center;margin-top:14px">${btns}</div></div></section>`;

  /* ---------- مدیریت سال‌های مالی ---------- */
  R.fyears = c => head(c, demo() + `<button class="btn primary" id="ay">${ico('plus')}سال مالی جدید</button>`) + '<div class="stack" id="fx"></div>';
  R.fyears.after = () => {
    bindDemo();
    const draw = () => {
      const S = F.get();
      $('#fx').innerHTML = !S.years.length ? empty('هنوز سال مالی تعریف نشده', 'برای ثبت سند و فاکتور، اول سال مالی و دوره‌هایش را بسازید.', `<a class="btn primary" href="fiscal-setup.html">شروع راه‌اندازی مالی</a>`) :
        `<div class="tbl-wrap"><table aria-label="سال‌های مالی"><thead><tr><th>عنوان</th><th>از تاریخ</th><th>تا تاریخ</th><th>تعداد دوره‌ها</th><th>دوره‌های باز</th><th>وضعیت</th><th></th></tr></thead><tbody>${S.years.map(y => {
          const ps = S.periods.filter(p => p.yid === y.id);
          return `<tr><td>${y.title}</td><td>${fd(y.from)}</td><td>${fd(y.to)}</td><td>${fd(ps.length)}</td><td>${fd(ps.filter(p => F.postable(p.status)).length)}</td><td>${badge(yearStatus(y, ps))}</td><td class="n"><a class="btn sm" href="fiscal-periods.html?year=${y.id}">دوره‌ها</a></td></tr>`;
        }).join('')}</tbody></table></div>`;
    };
    $('#ay').onclick = () => {
      const S = F.get(), last = S.years.map(y => y.to).sort().pop(), from = last ? F.nextDay(last) : F.today().slice(0, 4) + '/01/01', y0 = F.split(from)[0];
      modal({
        title: 'سال مالی جدید', ok: 'ایجاد سال مالی',
        body: `<div class="form-grid">${field('title', 'عنوان', 'سال مالی ' + fd(y0))}${field('from', 'از تاریخ', fd(from))}${field('to', 'تا تاریخ', fd(F.yearEnd(from)))}</div><label class="switch"><span>ساخت خودکار دوره‌های ماهانه</span><input type="checkbox" name="gen" checked></label>`,
        check: d => F.checkYear(val(d, 'title'), val(d, 'from'), val(d, 'to'), F.get().years),
        onOk: d => {
          const S = F.get(), f = F.parseD(val(d, 'from')), t = F.parseD(val(d, 'to')), y = { id: 'y' + f.replace(/\//g, ''), title: val(d, 'title').trim(), from: f, to: t };
          S.years.push(y); S.years.sort((a, b) => a.from < b.from ? -1 : 1);
          if ($('[name=gen]', d).checked) F.generate(f, t, 'm').forEach((p, i) => S.periods.push({ id: y.id + '-' + i, yid: y.id, ...p, status: ST.open }));
          F.addLog('ایجاد سال مالی', y.title); F.save(); draw(); paint(); toast('سال مالی ایجاد شد');
        }
      });
    };
    draw();
  };

  /* ---------- مدیریت دوره‌های مالی (ACC-006) ---------- */
  R.fperiods = c => head(c, demo() + `<button class="btn primary" id="np">${ico('plus')}ایجاد دوره</button>`) + '<div class="stack" id="fx"></div>';
  R.fperiods.after = () => {
    bindDemo();
    let yid = q.get('year') || (F.active().year || {}).id;
    const cur = () => { const S = F.get(); return S.years.find(y => y.id === yid) || S.years[S.years.length - 1]; };
    const setStatus = (id, s) => { F.get().periods.find(p => p.id === id).status = s; F.save(); draw(); paint(); };
    const acts = p => {
      const b = (a, l, cls = '') => `<button class="btn sm ${cls}" data-a="${a}" data-id="${p.id}">${l}</button>`;
      return p.status === ST.open ? b('review', 'شروع بازبینی') + b('close', 'بستن دوره') :
        p.status === ST.review ? b('back', 'بازگشت به باز') + b('close', 'بستن دوره') :
        p.status === ST.closing ? '<span class="muted">در حال پردازش…</span>' :
        p.status === ST.closed ? b('reopen', 'بازگشایی', 'warnbtn') : b('close', 'بستن دوباره');
    };
    function draw() {
      const S = F.get(), y = cur(), box = $('#fx');
      $('#np').disabled = !y;
      if (!y) { box.innerHTML = empty('هنوز سال مالی تعریف نشده', 'دوره‌ها داخل سال مالی ساخته می‌شوند. اول راه‌اندازی مالی را کامل کنید.', `<a class="btn primary" href="fiscal-setup.html">شروع راه‌اندازی مالی</a>`); return; }
      yid = y.id;
      const ps = S.periods.filter(p => p.yid === y.id).sort((a, b) => a.from < b.from ? -1 : 1);
      const head2 = `<div class="toolbar">${yearSel(S, y.id)}<span class="muted">${fd(y.from)} تا ${fd(y.to)}</span></div>`;
      if (!ps.length) { box.innerHTML = head2 + empty('این سال هنوز دوره ندارد', 'دوره‌ها را دستی بسازید یا یک‌جا ۱۲ دوره‌ی ماهانه تولید کنید.', `<button class="btn primary" id="gen">تولید ۱۲ دوره‌ی ماهانه</button><button class="btn" id="np2">ایجاد دوره</button>`); }
      else {
        const open = ps.filter(p => F.postable(p.status)).length;
        box.innerHTML = head2 + `<div class="grid g3">${kpi('دوره‌های باز', fd(open))}${kpi('دوره‌های بسته', fd(ps.filter(p => p.status === ST.closed).length))}${kpi('کل دوره‌ها', fd(ps.length))}</div>
        <div class="alert">ثبت سند، فاکتور، دریافت و پرداخت فقط در دوره‌های «باز» و «بازگشایی‌شده» انجام می‌شود. در دوره‌ی «در بازبینی» ثبت جدید متوقف است.</div>
        <div class="tbl-wrap"><table aria-label="دوره‌های مالی"><thead><tr><th>دوره</th><th>از تاریخ</th><th>تا تاریخ</th><th>وضعیت</th><th>عملیات</th></tr></thead><tbody>${ps.map(p => `<tr><td>${p.status === ST.closed ? ico('lock') + ' ' : ''}${p.name}</td><td>${fd(p.from)}</td><td>${fd(p.to)}</td><td>${badge(p.status)}</td><td><div class="row-acts">${acts(p)}</div></td></tr>`).join('')}</tbody></table></div>`;
      }
      box.innerHTML += `<section class="card"><div class="card-head"><h2>تاریخچه‌ی قفل و بازگشایی دوره‌ها</h2><small>همه‌ی تغییرها در ممیزی ثبت می‌شود</small></div><ul class="list">${S.log.length ? S.log.slice(0, 8).map(l => `<li><span>${l.action} · ${l.period}${l.reason ? `<small>دلیل: ${esc(l.reason)}</small>` : ''}</span><small>${l.who} · ${l.at}</small></li>`).join('') : '<li><span class="muted">هنوز تغییری ثبت نشده است.</span></li>'}</ul></section>`;
      const ys = $('#ysel'); if (ys) ys.onchange = e => { yid = e.target.value; draw(); };
      const g = $('#gen'); if (g) g.onclick = () => { F.generate(y.from, y.to, 'm').forEach((p, i) => S.periods.push({ id: y.id + '-g' + i, yid: y.id, ...p, status: ST.open })); F.addLog('تولید دوره‌ها', y.title); F.save(); draw(); paint(); toast('دوره‌ها ایجاد شدند'); };
      const n2 = $('#np2'); if (n2) n2.onclick = newPeriod;
    }
    function newPeriod() {
      const S = F.get(), y = cur(); if (!y) return;
      const ps = S.periods.filter(p => p.yid === y.id).sort((a, b) => a.from < b.from ? -1 : 1), from = ps.length ? F.nextDay(ps[ps.length - 1].to) : y.from, g = F.generate(from, y.to, 'm')[0] || { name: '', to: '' };
      modal({
        title: 'ایجاد دوره‌ی مالی در ' + y.title, ok: 'ایجاد دوره',
        body: `<div class="form-grid">${field('name', 'نام دوره', g.name)}${field('from', 'از تاریخ', fd(from))}${field('to', 'تا تاریخ', fd(g.to))}</div><p class="muted" style="margin-top:10px">دوره‌ی جدید با وضعیت «باز» ساخته می‌شود.</p>`,
        check: d => F.checkPeriod(val(d, 'name'), val(d, 'from'), val(d, 'to'), y, F.get().periods.filter(p => p.yid === y.id)),
        onOk: d => { const f = F.parseD(val(d, 'from')); S.periods.push({ id: y.id + '-' + Date.now(), yid: y.id, name: val(d, 'name').trim(), from: f, to: F.parseD(val(d, 'to')), status: ST.open }); F.addLog('ایجاد دوره', val(d, 'name').trim()); F.save(); draw(); paint(); toast('دوره ایجاد شد'); }
      });
    }
    function closeP(p) {
      modal({
        title: `بستن دوره‌ی ${p.name}`, ok: 'بستن دوره', danger: true,
        body: `<p>بازه‌ی ${fd(p.from)} تا ${fd(p.to)}</p><div class="alert" style="margin-block:12px">پس از بستن، <b>ثبت یا ویرایش مستقیم</b> سند، فاکتور، دریافت و پرداخت با تاریخ این دوره مجاز نیست. تغییر فقط با بازگشایی کنترل‌شده ممکن است.</div><label class="switch"><span>متوجه‌ام و بستن دوره را تأیید می‌کنم</span><input type="checkbox" name="ok"></label>`,
        check: d => $('[name=ok]', d).checked ? '' : true,
        onOk: () => { setStatus(p.id, ST.closing); setTimeout(() => { setStatus(p.id, ST.closed); F.addLog('بستن دوره', p.name); F.save(); draw(); toast('دوره‌ی ' + p.name + ' بسته شد'); }, 900); }
      });
    }
    function reopenP(p) {
      modal({
        title: `بازگشایی دوره‌ی ${p.name}`, ok: 'بازگشایی دوره', danger: true,
        body: `<div class="alert bad" style="margin-bottom:12px">${ico('shield')} بازگشایی دوره‌ی بسته عملیاتی حساس است و همراه با دلیل در تاریخچه‌ی ممیزی ثبت می‌شود.</div><p class="muted" style="margin-bottom:12px">این عملیات نیازمند مجوز «بازگشایی دوره مالی» است. دسترسی شما: مدیر مالی ✓</p><div class="field"><label for="m-r">دلیل بازگشایی (الزامی، حداقل ۱۰ حرف)</label><textarea class="inp" id="m-r" name="reason" rows="3" style="height:auto;padding-block:8px" placeholder="مثلاً: اصلاح سند ۱۴۰۵۰۴۲ که با تاریخ اشتباه ثبت شده است"></textarea></div><label class="switch"><span>پیامدهای بازگشایی را می‌دانم و تأیید می‌کنم</span><input type="checkbox" name="ok"></label>`,
        check: d => val(d, 'reason').trim().length < 10 ? 'دلیل بازگشایی را بنویسید (حداقل ۱۰ حرف).' : $('[name=ok]', d).checked ? '' : true,
        onOk: d => { F.addLog('بازگشایی دوره', p.name, val(d, 'reason').trim()); setStatus(p.id, ST.reopened); toast('دوره بازگشایی شد و در ممیزی ثبت گردید'); }
      });
    }
    $('#fx').addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const p = F.get().periods.find(x => x.id === b.dataset.id), a = b.dataset.a;
      if (a === 'close') closeP(p); else if (a === 'reopen') reopenP(p);
      else if (a === 'review') { F.addLog('شروع بازبینی', p.name); setStatus(p.id, ST.review); toast('دوره در حالت بازبینی قرار گرفت'); }
      else if (a === 'back') { F.addLog('بازگشت به باز', p.name); setStatus(p.id, ST.open); }
    });
    $('#np').onclick = newPeriod;
    draw();
  };

  /* ---------- راه‌اندازی مالی (SET-001) ---------- */
  R.fsetup = c => head(c, demo()) + '<div class="stack" id="fx"></div>';
  R.fsetup.after = () => {
    bindDemo();
    const S0 = F.get(), done = S0.years.length && S0.periods.some(p => F.postable(p.status));
    if (done) {
      const a = F.active();
      $('#fx').innerHTML = `<section class="card"><div class="alert ok">راه‌اندازی مالی کامل است و شرکت برای ثبت اطلاعات آماده است.</div><div class="grid g3" style="margin-top:16px">${kpi('سال مالی', a.year ? a.year.title : '—')}${kpi('دوره‌ی جاری', a.period ? a.period.name : '—')}${kpi('وضعیت دوره', a.period ? a.period.status : '—')}</div><div class="page-actions" style="margin-top:16px"><a class="btn primary" href="fiscal-periods.html">مدیریت دوره‌ها</a><a class="btn" href="fiscal-years.html">سال‌های مالی</a><a class="btn" href="dashboard.html">رفتن به داشبورد</a></div><p class="muted" style="margin-top:14px">برای دیدن مراحل راه‌اندازی، از «حالت نمایشی» بالای صفحه گزینه‌ی «بدون سال مالی» را انتخاب کنید.</p></section>`;
      return;
    }
    const t = F.today(), y0 = F.split(t)[0];
    const W = { step: 0, title: 'سال مالی ' + fd(y0), from: y0 + '/01/01', to: y0 + '/12/' + String(F.dim(y0, 12)).padStart(2, '0'), kind: 'm', open: null };
    const STEPS = ['تعریف سال مالی', 'ایجاد دوره‌ها', 'باز کردن دوره‌ها', 'مرور و اتمام'];
    const gen = () => F.generate(F.parseD(W.from), F.parseD(W.to), W.kind);
    const err1 = () => F.checkYear(W.title, W.from, W.to, []);
    const draw = () => {
      const s = W.step; let body = '', ok = true, msg = '';
      if (s === 0) {
        msg = err1(); ok = !msg;
        body = `<p class="muted" style="margin-bottom:14px">شرکت و اطلاعات پایه ثبت شده‌اند. حالا بازه‌ی سال مالی را مشخص کنید.</p><div class="form-grid">${field('title', 'عنوان', W.title)}${field('from', 'از تاریخ', fd(W.from))}${field('to', 'تا تاریخ', fd(W.to))}</div>`;
      } else if (s === 1) {
        const g = gen();
        body = `<div class="field" style="max-width:320px"><label for="kind">تقسیم سال به</label><select class="sel" id="kind"><option value="m"${W.kind === 'm' ? ' selected' : ''}>ماهانه</option><option value="q"${W.kind === 'q' ? ' selected' : ''}>فصلی</option></select></div><p class="muted" style="margin-block:12px">پیشنهاد سیستم: ${fd(g.length)} دوره</p><div class="tbl-wrap"><table aria-label="پیش‌نمایش دوره‌ها"><thead><tr><th>دوره</th><th>از تاریخ</th><th>تا تاریخ</th></tr></thead><tbody>${g.map(p => `<tr><td>${p.name}</td><td>${fd(p.from)}</td><td>${fd(p.to)}</td></tr>`).join('')}</tbody></table></div>`;
      } else if (s === 2) {
        const g = gen(); if (!W.open) W.open = new Set(g.map((p, i) => i).filter(i => g[i].to >= t));
        ok = W.open.size > 0; msg = ok ? '' : 'حداقل یک دوره باید باز بماند.';
        body = `<p class="muted" style="margin-bottom:12px">دوره‌هایی که تیک ندارند به‌صورت «بسته» ساخته می‌شوند. دوره‌ی جاری و بعد از آن به‌طور پیش‌فرض باز است.</p><div class="tbl-wrap"><table aria-label="دوره‌های باز"><tbody>${g.map((p, i) => `<tr><td style="width:44px"><input type="checkbox" data-i="${i}" ${W.open.has(i) ? 'checked' : ''} aria-label="باز بودن ${p.name}" style="accent-color:var(--primary);width:18px;height:18px"></td><td>${p.name}</td><td>${fd(p.from)} تا ${fd(p.to)}</td><td>${badge(W.open.has(i) ? 'باز' : 'بسته')}</td></tr>`).join('')}</tbody></table></div>`;
      } else {
        const g = gen();
        body = `<div class="grid g3">${kpi('سال مالی', W.title)}${kpi('تعداد دوره‌ها', fd(g.length))}${kpi('دوره‌های باز', fd(W.open.size))}</div><div class="alert ok" style="margin-top:14px">با اتمام، سال و دوره‌ها ساخته می‌شوند و ثبت سند در دوره‌های باز ممکن می‌شود.</div>`;
      }
      $('#fx').innerHTML = `<section class="card"><ol class="steps">${STEPS.map((l, i) => `<li class="${i < s ? 'done' : i === s ? 'cur' : ''}"${i === s ? ' aria-current="step"' : ''}><span>${i < s ? '✓' : fd(i + 1)}</span>${l}</li>`).join('')}</ol><div class="step-body">${body}${msg ? `<div class="alert bad" style="margin-top:12px">${msg}</div>` : ''}</div><div class="page-actions" style="margin-top:18px;justify-content:space-between"><button class="btn" id="pv" ${s ? '' : 'disabled'}>قبلی</button><button class="btn primary" id="nx" ${ok ? '' : 'disabled'}>${s === 3 ? 'اتمام و ورود به داشبورد' : 'بعدی'}</button></div></section>`;
      $('#fx').querySelectorAll('input.inp').forEach(i => i.oninput = e => { W[e.target.name] = e.target.name === 'title' ? e.target.value : F.parseD(e.target.value) || e.target.value; W.open = null; const pos = e.target.selectionStart, n = e.target.name; draw(); const el = $('#m-' + n); el.focus(); el.setSelectionRange(pos, pos); });
      const k = $('#kind'); if (k) k.onchange = e => { W.kind = e.target.value; W.open = null; draw(); };
      $('#fx').querySelectorAll('[data-i]').forEach(c => c.onchange = e => { e.target.checked ? W.open.add(+e.target.dataset.i) : W.open.delete(+e.target.dataset.i); draw(); });
      $('#pv').onclick = () => { W.step--; draw(); };
      $('#nx').onclick = () => {
        if (s < 3) { W.step++; draw(); return; }
        const S = F.get(), y = { id: 'y' + W.from.replace(/\//g, ''), title: W.title.trim(), from: W.from, to: W.to };
        S.years = [y]; S.periods = gen().map((p, i) => ({ id: y.id + '-' + i, yid: y.id, ...p, status: W.open.has(i) ? ST.open : ST.closed }));
        F.addLog('راه‌اندازی مالی', y.title); F.save(); toast('راه‌اندازی مالی کامل شد'); setTimeout(() => location.href = 'dashboard.html', 700);
      };
    };
    draw();
  };
})();
