// Printable reports (print dialog -> "Save as PDF"). Pure functions: data in, HTML string out.

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const METHOD = {
  INSTAPAY: ['انستاباي', 'InstaPay'],
  ETISALAT_CASH: ['اتصالات كاش', 'Etisalat Cash'],
  CASH: ['نقدي', 'Cash'],
};
const PAY_STATUS = { PAID: ['خالص', 'Paid'], PARTIAL: ['دفع جزء', 'Partial'], UNPAID: ['لم يدفع', 'Unpaid'] };

function makeFmt(lang) {
  const ar = lang === 'ar';
  const L = (a, e) => (ar ? a : e);
  const n = (v) => Number(v || 0).toLocaleString(ar ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 });
  return {
    ar,
    L,
    n,
    money: (v) => (ar ? `${n(v)} ج.م` : `EGP ${n(v)}`),
    date: (d) =>
      d ? new Date(d).toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
    method: (m) => (METHOD[m] ? METHOD[m][ar ? 0 : 1] : m),
    status: (s) => (PAY_STATUS[s] ? PAY_STATUS[s][ar ? 0 : 1] : s),
    pct: (v) => (v === null || v === undefined ? '—' : `${n(v)}%`),
  };
}

// ----------------------------------------------------------------- building blocks

const section = (title, inner) => `<section><h2>${esc(title)}</h2>${inner}</section>`;

function table(heads, rows, { foot, empty } = {}) {
  if (rows.length === 0) return `<p class="empty">${esc(empty || '—')}</p>`;
  const head = `<tr>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
  const footer = foot ? `<tfoot><tr>${foot.map((c) => `<td>${c}</td>`).join('')}</tr></tfoot>` : '';
  return `<table><thead>${head}</thead><tbody>${body}</tbody>${footer}</table>`;
}

const cards = (items) =>
  `<div class="cards">${items
    .map(([label, value, tone]) => `<div class="card"><div class="k">${esc(label)}</div><div class="v ${tone || ''}">${esc(value)}</div></div>`)
    .join('')}</div>`;

const strong = (v) => `<b>${esc(v)}</b>`;
const green = (v) => `<span class="green">${esc(v)}</span>`;
const red = (v) => `<span class="red">${esc(v)}</span>`;
const badge = (status, label) => `<span class="badge ${status}">${esc(label)}</span>`;

// ----------------------------------------------------------------- report sections

export function buildSections(data, lang) {
  const f = makeFmt(lang);
  const { L } = f;
  const s = data.summary;
  const none = L('لا توجد بيانات', 'No data');

  return {
    summary: () =>
      section(
        L('الملخص العام', 'Overview'),
        cards([
          [L('عدد الطلاب', 'Students'), f.n(s.students)],
          [L('الإجمالي المطلوب', 'Expected'), f.money(s.expected)],
          [L('المحصّل', 'Collected'), f.money(s.collected), 'green'],
          [L('المتبقي', 'Remaining'), f.money(s.remaining), s.remaining > 0 ? 'red' : ''],
        ]),
      ),

    methods: () =>
      section(
        L('طرق الدفع', 'Payment methods'),
        table(
          [L('الطريقة', 'Method'), L('المحصّل', 'Collected')],
          Object.entries(data.byMethod).map(([m, total]) => [strong(f.method(m)), green(f.money(total))]),
          { foot: [strong(L('الإجمالي', 'Total')), strong(f.money(Object.values(data.byMethod).reduce((a, b) => a + b, 0)))] },
        ),
      ),

    byCourse: () =>
      section(
        L('حسب الكورس', 'By course'),
        table(
          [L('الكورس', 'Course'), L('الطلاب', 'Students'), L('المطلوب', 'Expected'), L('المحصّل', 'Collected'), L('المتبقي', 'Remaining')],
          data.byCourse.map((r) => [strong(r.label), f.n(r.students), f.money(r.expected), green(f.money(r.collected)), red(f.money(r.remaining))]),
          { empty: none },
        ),
      ),

    byGroup: () =>
      section(
        L('حسب الجروب', 'By group'),
        table(
          [L('الجروب', 'Group'), L('الكورس', 'Course'), L('الحالة', 'Status'), L('الطلاب', 'Students'), L('المحصّل', 'Collected'), L('المتبقي', 'Remaining'), L('نسبة الحضور', 'Attendance')],
          data.groups.map((g) => [
            strong(g.name),
            esc(g.course),
            g.status === 'ENDED' ? L('منتهي', 'Ended') : L('شغال', 'Active'),
            f.n(g.students),
            green(f.money(g.collected)),
            red(f.money(g.remaining)),
            f.pct(g.attendanceRate),
          ]),
          { empty: none },
        ),
      ),

    byMarketer: () =>
      section(
        L('حسب المسوّق', 'By marketer'),
        table(
          [L('المسوّق', 'Marketer'), L('عدد الطلاب', 'Students'), L('المطلوب', 'Expected'), L('المحصّل', 'Collected'), L('المتبقي', 'Remaining')],
          data.byMarketer.map((r) => [strong(r.label || L('— بدون مسوّق —', '— No marketer —')), f.n(r.students), f.money(r.expected), green(f.money(r.collected)), red(f.money(r.remaining))]),
          { empty: none },
        ),
      ),

    unpaid: () =>
      section(
        `${L('طلاب عليهم فلوس', 'Students with a balance')} (${data.unpaid.length})`,
        table(
          [L('الطالب', 'Student'), L('التليفون', 'Phone'), L('الكورس / الجروب', 'Course / Group'), L('المسوّق', 'Marketer'), L('الإجمالي', 'Total'), L('دفع', 'Paid'), L('المتبقي', 'Remaining'), L('الحالة', 'Status')],
          data.unpaid.map((u) => [
            strong(u.name),
            `<span dir="ltr">${esc(u.phone || '—')}</span>`,
            `${esc(u.course)} / ${esc(u.group)}`,
            esc(u.marketer || '—'),
            f.money(u.total),
            green(f.money(u.paid)),
            red(f.money(u.remaining)),
            badge(u.paymentStatus, f.status(u.paymentStatus)),
          ]),
          { empty: L('مفيش حد عليه فلوس', 'Nobody owes money'), foot: data.unpaid.length ? [strong(L('الإجمالي', 'Total')), '', '', '', '', '', strong(f.money(data.unpaid.reduce((a, u) => a + u.remaining, 0))), ''] : null },
        ),
      ),

    payments: () =>
      section(
        `${L('سجل الدفعات', 'Payments ledger')} (${data.payments.length})`,
        table(
          [L('التاريخ', 'Date'), L('الطالب', 'Student'), L('الكورس / الجروب', 'Course / Group'), L('المسوّق', 'Marketer'), L('الطريقة', 'Method'), L('المبلغ', 'Amount'), L('ملاحظة', 'Note')],
          data.payments.map((p) => [f.date(p.date), strong(p.student), `${esc(p.course)} / ${esc(p.group)}`, esc(p.marketer || '—'), f.method(p.method), green(f.money(p.amount)), esc(p.note || '')]),
          { empty: none, foot: data.payments.length ? ['', '', '', '', strong(L('الإجمالي', 'Total')), strong(f.money(data.payments.reduce((a, p) => a + p.amount, 0))), ''] : null },
        ),
      ),

    attendance: () =>
      section(
        L('الحضور والغياب', 'Attendance'),
        table(
          [L('الطالب', 'Student'), L('الكورس / الجروب', 'Course / Group'), L('أيام الجروب', 'Days'), L('حضر', 'Present'), L('غاب', 'Absent'), L('لم يُسجل', 'Not marked'), L('نسبة الحضور', 'Rate')],
          data.attendance.map((a) => [strong(a.student), `${esc(a.course)} / ${esc(a.group)}`, f.n(a.daysCount), green(f.n(a.present)), red(f.n(a.absent)), f.n(a.notMarked), f.pct(a.rate)]),
          { empty: none },
        ),
      ),

    certificates: () =>
      section(
        `${L('الشهادات الصادرة', 'Issued certificates')} (${data.certificates.length})`,
        table(
          [L('الطالب', 'Student'), L('الكورس / الجروب', 'Course / Group'), L('رقم الشهادة', 'Certificate No.'), L('تاريخ الإصدار', 'Issued on')],
          data.certificates.map((c) => [strong(c.student), `${esc(c.course)} / ${esc(c.group)}`, `<span dir="ltr">${esc(c.serial)}</span>`, f.date(c.issuedAt)]),
          { empty: L('لسه مفيش شهادات صدرت', 'No certificates issued yet') },
        ),
      ),
  };
}

// Sections that exist as individual reports (key -> Arabic/English title)
export const REPORT_SECTIONS = [
  ['summary', 'الملخص العام', 'Overview'],
  ['methods', 'طرق الدفع', 'Payment methods'],
  ['byCourse', 'حسب الكورس', 'By course'],
  ['byGroup', 'حسب الجروب', 'By group'],
  ['byMarketer', 'حسب المسوّق', 'By marketer'],
  ['unpaid', 'طلاب عليهم فلوس', 'Students with a balance'],
  ['payments', 'سجل الدفعات', 'Payments ledger'],
  ['attendance', 'الحضور والغياب', 'Attendance'],
  ['certificates', 'الشهادات الصادرة', 'Issued certificates'],
];

export function buildSectionReport(key, data, { lang, filterLabel, logoSrc }) {
  const sections = buildSections(data, lang);
  const meta = REPORT_SECTIONS.find((r) => r[0] === key);
  const title = lang === 'ar' ? meta[1] : meta[2];
  return page({ title, subtitle: filterLabel, lang, logoSrc, body: sections[key]() });
}

export function buildFullReport(data, { lang, filterLabel, logoSrc }) {
  const sections = buildSections(data, lang);
  const title = lang === 'ar' ? 'التقرير الشامل' : 'Comprehensive report';
  return page({ title, subtitle: filterLabel, lang, logoSrc, body: REPORT_SECTIONS.map(([key]) => sections[key]()).join('\n') });
}

// ----------------------------------------------------------------- single group report

export function buildGroupReport(group, attendance, { lang, logoSrc }) {
  const f = makeFmt(lang);
  const { L } = f;
  const students = group.students;
  const schedule = `${group.weeksCount} ${L('أسابيع', 'weeks')} × ${group.daysPerWeek} ${L('أيام', 'days')}`;

  const infoParts = [
    group.course.name,
    group.course.instructorName,
    schedule,
    group.startDate ? f.date(group.startDate) : null,
    group.status === 'ENDED' ? L('منتهي', 'Ended') : L('شغال', 'Active'),
  ].filter(Boolean);
  // <bdi> keeps mixed Arabic/English fragments from reordering each other
  const info = `<p class="meta">${infoParts.map((p) => `<bdi>${esc(p)}</bdi>`).join(' · ')}</p>`;

  const summary = section(
    L('الملخص', 'Summary'),
    cards([
      [L('عدد الطلاب', 'Students'), f.n(students.length)],
      [L('الإجمالي المطلوب', 'Expected'), f.money(group.totals.expected)],
      [L('المحصّل', 'Collected'), f.money(group.totals.collected), 'green'],
      [L('المتبقي', 'Remaining'), f.money(group.totals.remaining), group.totals.remaining > 0 ? 'red' : ''],
    ]),
  );

  const studentsTable = section(
    L('الطلاب والدفع', 'Students & payments'),
    table(
      ['#', L('الطالب', 'Student'), L('التليفون', 'Phone'), L('المسوّق', 'Marketer'), L('الإجمالي', 'Total'), L('دفع', 'Paid'), L('المتبقي', 'Remaining'), L('الحالة', 'Status')],
      students.map((s, i) => [
        f.n(i + 1),
        strong(s.name),
        `<span dir="ltr">${esc(s.phone || '—')}</span>`,
        esc(s.marketer || '—'),
        f.money(s.totalPrice),
        green(f.money(s.paid)),
        red(f.money(s.remaining)),
        badge(s.paymentStatus, f.status(s.paymentStatus)),
      ]),
      { empty: L('لا يوجد طلاب', 'No students'), foot: students.length ? ['', strong(L('الإجمالي', 'Total')), '', '', strong(f.money(group.totals.expected)), strong(f.money(group.totals.collected)), strong(f.money(group.totals.remaining)), ''] : null },
    ),
  );

  const paymentRows = students.flatMap((s) => s.payments.map((p) => [f.date(p.paidAt), strong(s.name), f.method(p.method), green(f.money(p.amount)), esc(p.note || '')]));
  const paymentsTable = section(L('سجل الدفعات', 'Payments'), table([L('التاريخ', 'Date'), L('الطالب', 'Student'), L('الطريقة', 'Method'), L('المبلغ', 'Amount'), L('ملاحظة', 'Note')], paymentRows, { empty: L('لا توجد دفعات', 'No payments') }));

  // attendance grid: weeks as column groups, days underneath
  const weeks = Array.from({ length: attendance.weeksCount }, (_, w) => w);
  const days = Array.from({ length: attendance.daysPerWeek }, (_, d) => d);
  const mark = (m) => (m === true ? '<span class="green">✓</span>' : m === false ? '<span class="red">✗</span>' : '<span class="dim">–</span>');
  let grid = `<p class="empty">${L('لا يوجد طلاب', 'No students')}</p>`;
  if (attendance.students.length) {
    const head1 = `<tr><th rowspan="2">${L('الطالب', 'Student')}</th>${weeks.map((w) => `<th colspan="${attendance.daysPerWeek}" class="wk">${L('الأسبوع', 'Week')} ${f.n(w + 1)}</th>`).join('')}<th rowspan="2">${L('الحضور', 'Present')}</th></tr>`;
    const head2 = `<tr>${weeks.map(() => days.map((d) => `<th class="day">${L('يوم', 'Day')} ${f.n(d + 1)}</th>`).join('')).join('')}</tr>`;
    const body = attendance.students
      .map((s) => {
        const present = Object.values(s.marks).filter((m) => m === true).length;
        const cells = weeks.map((w) => days.map((d) => `<td class="c">${mark(s.marks[w * attendance.daysPerWeek + d + 1])}</td>`).join('')).join('');
        return `<tr><td>${strong(s.name)}</td>${cells}<td class="c">${strong(`${f.n(present)} / ${f.n(attendance.daysCount)}`)}</td></tr>`;
      })
      .join('');
    grid = `<table class="grid"><thead>${head1}${head2}</thead><tbody>${body}</tbody></table>`;
  }
  const attendanceSection = section(L('الحضور والغياب', 'Attendance'), grid);

  return page({ title: group.name, subtitle: null, meta: info, lang, logoSrc, body: [summary, studentsTable, paymentsTable, attendanceSection].join('\n') });
}

// ----------------------------------------------------------------- document shell

function page({ title, subtitle, meta, lang, logoSrc, body }) {
  const ar = lang === 'ar';
  const stamp = new Date().toLocaleString(ar ? 'ar-EG' : 'en-GB');
  return `<!doctype html>
<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Poppins:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; padding: 56px 28px 28px; font-family: ${ar ? "'Tajawal'" : "'Poppins'"}, 'Segoe UI', Tahoma, sans-serif; color: #101c31; font-size: 12px; background: #fff; }
  .bar { position: fixed; top: 0; inset-inline: 0; background: #101c31; color: #fff; padding: 9px 20px; display: flex; align-items: center; gap: 14px; font-size: 13px; z-index: 10; }
  .bar button { background: #22c7bf; color: #101c31; border: 0; border-radius: 8px; padding: 6px 16px; font-weight: 700; cursor: pointer; font-family: inherit; }
  header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #f2a900; padding-bottom: 12px; margin-bottom: 8px; }
  header img { width: 56px; height: 56px; object-fit: contain; }
  header .org { font-weight: 800; font-size: 13px; color: #16a19a; }
  header h1 { margin: 2px 0 0; font-size: 22px; font-weight: 800; }
  header .sub { color: #64748b; font-size: 12px; margin-top: 2px; }
  header .stamp { margin-inline-start: auto; color: #94a3b8; font-size: 11px; text-align: end; }
  .meta { color: #475569; margin: 6px 0 4px; font-size: 12.5px; }
  section { margin-top: 18px; break-inside: auto; }
  h2 { font-size: 14px; font-weight: 800; margin: 0 0 8px; padding-inline-start: 8px; border-inline-start: 4px solid #22c7bf; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { background: #101c31; color: #fff; font-weight: 700; padding: 7px 8px; text-align: start; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e9f0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tfoot td { font-weight: 700; background: #eef2f7; border-top: 2px solid #101c31; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
  .card .k { color: #94a3b8; font-size: 10.5px; font-weight: 600; }
  .card .v { font-size: 16px; font-weight: 800; margin-top: 3px; }
  .green { color: #15803d; } .red { color: #dc2626; } .dim { color: #cbd5e1; }
  .v.green { color: #15803d; } .v.red { color: #dc2626; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 10.5px; font-weight: 700; }
  .badge.PAID { background: #dcfce7; color: #15803d; } .badge.PARTIAL { background: #fef3c7; color: #b45309; } .badge.UNPAID { background: #fee2e2; color: #b91c1c; }
  .empty { color: #94a3b8; padding: 10px 0; }
  table.grid th.wk { text-align: center; border-inline-start: 1px solid #334155; }
  table.grid th.day { background: #1f3352; text-align: center; font-weight: 500; font-size: 10.5px; }
  table.grid td.c { text-align: center; font-weight: 700; }
  @page { size: A4 landscape; margin: 10mm; }
  @media print { .bar { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="bar"><span>${ar ? 'اختار "حفظ كـ PDF" من نافذة الطباعة' : 'Choose "Save as PDF" in the print dialog'}</span><button onclick="window.print()">${ar ? 'طباعة / حفظ PDF' : 'Print / Save as PDF'}</button></div>
<header>
  ${logoSrc ? `<img src="${esc(logoSrc)}" alt="" />` : ''}
  <div>
    <div class="org">Future Biotech Invators</div>
    <h1>${esc(title)}</h1>
    ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
  </div>
  <div class="stamp">${ar ? 'تاريخ التقرير' : 'Generated'}<br />${esc(stamp)}</div>
</header>
${meta || ''}
${body}
<script>window.addEventListener('load', function () { var go = function () { setTimeout(function () { window.print(); }, 400); }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go(); });</script>
</body>
</html>`;
}

// ----------------------------------------------------------------- opening

function absoluteUrl(src) {
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

export function resolveLogo(src) {
  return src ? absoluteUrl(src) : '';
}

// A blob: URL is more reliable than document.write into an about:blank popup
export function openPrintable(html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const w = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  return true;
}
