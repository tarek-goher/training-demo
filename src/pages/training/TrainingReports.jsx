import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Printer, FileText } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import Loader from '../../components/Loader';
import { useL, useLogo, inputCls, money, methodLabel, PaymentBadge, GroupStatusBadge, StatCard } from './shared';
import { buildSectionReport, buildFullReport, openPrintable, resolveLogo } from './printReport';
import { formatDate } from '../../utils/format';

function Section({ title, onPrint, children }) {
  const L = useL();
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="font-extrabold text-navy">{title}</h2>
        <button onClick={onPrint} className="flex items-center gap-1.5 text-xs font-semibold text-teal-dark hover:underline">
          <Printer size={14} /> {L('طباعة / PDF', 'Print / PDF')}
        </button>
      </div>
      {children}
    </div>
  );
}

const Box = ({ children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">{children}</div>
);
const Th = ({ children }) => <th className="px-4 py-3 font-semibold text-start whitespace-nowrap">{children}</th>;
const Empty = ({ cols, children }) => (
  <tr><td colSpan={cols} className="px-4 py-6 text-center text-gray-400">{children}</td></tr>
);

export default function TrainingReports() {
  const L = useL();
  const { lang } = useLang();
  const logo = useLogo();
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trainingApi.listCourses().then((res) => setCourses(res.data.data));
    trainingApi.listGroups().then((res) => setGroups(res.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    trainingApi
      .reports({ ...(courseId && { courseId }), ...(groupId && { groupId }) })
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [courseId, groupId]);

  const visibleGroups = courseId ? groups.filter((g) => g.course.id === courseId) : groups;

  const filterLabel = () => {
    const parts = [];
    if (courseId) parts.push(courses.find((c) => c.id === courseId)?.name);
    if (groupId) parts.push(groups.find((g) => g.id === groupId)?.name);
    return parts.length ? parts.join(' · ') : L('كل الكورسات والجروبات', 'All courses and groups');
  };

  const openReport = (html) => {
    if (!openPrintable(html)) toast.error(L('المتصفح منع النافذة، اسمح بالـ popups وجرّب تاني', 'Popup blocked — allow popups and try again'));
  };
  const opts = () => ({ lang, filterLabel: filterLabel(), logoSrc: resolveLogo(logo.src) });
  const printSection = (key) => openReport(buildSectionReport(key, data, opts()));
  const printFull = () => openReport(buildFullReport(data, opts()));

  const exportUnpaid = () => {
    const rows = [
      ['Name', 'Phone', 'Course', 'Group', 'Referred by', 'Total', 'Paid', 'Remaining'],
      ...data.unpaid.map((u) => [u.name, u.phone || '', u.course, u.group, u.marketer || '', u.total, u.paid, u.remaining]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unpaid-students.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const s = data?.summary;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-extrabold text-navy">{L('التقارير', 'Reports')}</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setGroupId(''); }} className={`${inputCls} !w-auto min-w-[200px]`}>
            <option value="">{L('كل الكورسات', 'All courses')}</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={`${inputCls} !w-auto min-w-[160px]`}>
            <option value="">{L('كل الجروبات', 'All groups')}</option>
            {visibleGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button
            onClick={printFull}
            disabled={!data}
            className="btn-gold rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40"
          >
            <FileText size={16} /> {L('تقرير شامل (PDF)', 'Full report (PDF)')}
          </button>
        </div>
      </div>

      {loading || !data ? (
        <Loader />
      ) : (
        <>
          <Section title={L('الملخص العام', 'Overview')} onPrint={() => printSection('summary')}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={L('عدد الطلاب', 'Students')} value={s.students} />
              <StatCard label={L('الإجمالي المطلوب', 'Expected')} value={money(s.expected, lang)} />
              <StatCard label={L('المحصّل', 'Collected')} value={money(s.collected, lang)} tone="green" />
              <StatCard label={L('المتبقي', 'Remaining')} value={money(s.remaining, lang)} tone={s.remaining > 0 ? 'red' : 'navy'} />
            </div>
          </Section>

          <Section title={L('طرق الدفع', 'Payment methods')} onPrint={() => printSection('methods')}>
            <div className="grid sm:grid-cols-3 gap-3">
              {Object.entries(data.byMethod).map(([method, total]) => (
                <StatCard key={method} label={`${L('المحصّل', 'Collected')} — ${methodLabel(method, lang)}`} value={money(total, lang)} />
              ))}
            </div>
          </Section>

          <Section title={L('حسب الكورس', 'By course')} onPrint={() => printSection('byCourse')}>
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('الكورس', 'Course')}</Th><Th>{L('الطلاب', 'Students')}</Th><Th>{L('المطلوب', 'Expected')}</Th><Th>{L('المحصّل', 'Collected')}</Th><Th>{L('المتبقي', 'Remaining')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.byCourse.length === 0 && <Empty cols={5}>{L('لا توجد بيانات', 'No data')}</Empty>}
                  {data.byCourse.map((r) => (
                    <tr key={r.key}>
                      <td className="px-4 py-3 font-bold text-navy">{r.label}</td>
                      <td className="px-4 py-3">{r.students}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(r.expected, lang)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">{money(r.collected, lang)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{money(r.remaining, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>

          <Section title={L('حسب الجروب', 'By group')} onPrint={() => printSection('byGroup')}>
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('الجروب', 'Group')}</Th><Th>{L('الكورس', 'Course')}</Th><Th>{L('الحالة', 'Status')}</Th><Th>{L('الطلاب', 'Students')}</Th><Th>{L('المحصّل', 'Collected')}</Th><Th>{L('المتبقي', 'Remaining')}</Th><Th>{L('نسبة الحضور', 'Attendance')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.groups.length === 0 && <Empty cols={7}>{L('لا توجد بيانات', 'No data')}</Empty>}
                  {data.groups.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-3"><Link to={`/groups/${g.id}`} className="font-bold text-navy hover:text-teal-dark">{g.name}</Link></td>
                      <td className="px-4 py-3 text-gray-600">{g.course}</td>
                      <td className="px-4 py-3"><GroupStatusBadge status={g.status} /></td>
                      <td className="px-4 py-3">{g.students}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">{money(g.collected, lang)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{money(g.remaining, lang)}</td>
                      <td className="px-4 py-3">{g.attendanceRate === null ? '—' : `${g.attendanceRate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>

          <Section title={L('حسب المسوّق', 'By marketer')} onPrint={() => printSection('byMarketer')}>
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('المسوّق', 'Marketer')}</Th><Th>{L('عدد الطلاب', 'Students')}</Th><Th>{L('المطلوب', 'Expected')}</Th><Th>{L('المحصّل', 'Collected')}</Th><Th>{L('المتبقي', 'Remaining')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.byMarketer.length === 0 && <Empty cols={5}>{L('لا توجد بيانات', 'No data')}</Empty>}
                  {data.byMarketer.map((r) => (
                    <tr key={r.key}>
                      <td className="px-4 py-3 font-bold text-navy">{r.label || L('— بدون مسوّق —', '— No marketer —')}</td>
                      <td className="px-4 py-3">{r.students}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(r.expected, lang)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">{money(r.collected, lang)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{money(r.remaining, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>

          <Section title={`${L('طلاب عليهم فلوس', 'Students with a balance')} (${data.unpaid.length})`} onPrint={() => printSection('unpaid')}>
            {data.unpaid.length > 0 && (
              <button onClick={exportUnpaid} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-teal-dark mb-2">
                <Download size={13} /> {L('تصدير Excel (CSV)', 'Export CSV')}
              </button>
            )}
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('الطالب', 'Student')}</Th><Th>{L('التليفون', 'Phone')}</Th><Th>{L('الكورس / الجروب', 'Course / Group')}</Th><Th>{L('المسوّق', 'Marketer')}</Th><Th>{L('الإجمالي', 'Total')}</Th><Th>{L('دفع', 'Paid')}</Th><Th>{L('المتبقي', 'Remaining')}</Th><Th>{L('الحالة', 'Status')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.unpaid.length === 0 && <Empty cols={8}>{L('مفيش حد عليه فلوس 🎉', 'Nobody owes money 🎉')}</Empty>}
                  {data.unpaid.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-bold text-navy whitespace-nowrap">{u.name}</td>
                      <td className="px-4 py-3 text-gray-500" dir="ltr">{u.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600"><Link to={`/groups/${u.groupId}`} className="hover:text-teal-dark">{u.course} / {u.group}</Link></td>
                      <td className="px-4 py-3 text-gray-500">{u.marketer || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(u.total, lang)}</td>
                      <td className="px-4 py-3 text-green-600 whitespace-nowrap">{money(u.paid, lang)}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold whitespace-nowrap">{money(u.remaining, lang)}</td>
                      <td className="px-4 py-3"><PaymentBadge status={u.paymentStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>

          <Section title={`${L('سجل الدفعات', 'Payments ledger')} (${data.payments.length})`} onPrint={() => printSection('payments')}>
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('التاريخ', 'Date')}</Th><Th>{L('الطالب', 'Student')}</Th><Th>{L('الكورس / الجروب', 'Course / Group')}</Th><Th>{L('المسوّق', 'Marketer')}</Th><Th>{L('الطريقة', 'Method')}</Th><Th>{L('المبلغ', 'Amount')}</Th><Th>{L('ملاحظة', 'Note')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.payments.length === 0 && <Empty cols={7}>{L('لا توجد دفعات', 'No payments')}</Empty>}
                  {data.payments.map((p, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(p.date, lang)}</td>
                      <td className="px-4 py-3 font-bold text-navy whitespace-nowrap">{p.student}</td>
                      <td className="px-4 py-3 text-gray-600">{p.course} / {p.group}</td>
                      <td className="px-4 py-3 text-gray-500">{p.marketer || '—'}</td>
                      <td className="px-4 py-3">{methodLabel(p.method, lang)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">{money(p.amount, lang)}</td>
                      <td className="px-4 py-3 text-gray-400">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>

          <Section title={L('الحضور والغياب', 'Attendance')} onPrint={() => printSection('attendance')}>
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('الطالب', 'Student')}</Th><Th>{L('الكورس / الجروب', 'Course / Group')}</Th><Th>{L('أيام الجروب', 'Days')}</Th><Th>{L('حضر', 'Present')}</Th><Th>{L('غاب', 'Absent')}</Th><Th>{L('لم يُسجل', 'Not marked')}</Th><Th>{L('نسبة الحضور', 'Rate')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.attendance.length === 0 && <Empty cols={7}>{L('لا توجد بيانات', 'No data')}</Empty>}
                  {data.attendance.map((a, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-bold text-navy whitespace-nowrap">{a.student}</td>
                      <td className="px-4 py-3 text-gray-600">{a.course} / {a.group}</td>
                      <td className="px-4 py-3">{a.daysCount}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold">{a.present}</td>
                      <td className="px-4 py-3 text-red-600 font-semibold">{a.absent}</td>
                      <td className="px-4 py-3 text-gray-400">{a.notMarked}</td>
                      <td className="px-4 py-3">{a.rate === null ? '—' : `${a.rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>

          <Section title={`${L('الشهادات الصادرة', 'Issued certificates')} (${data.certificates.length})`} onPrint={() => printSection('certificates')}>
            <Box>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><Th>{L('الطالب', 'Student')}</Th><Th>{L('الكورس / الجروب', 'Course / Group')}</Th><Th>{L('رقم الشهادة', 'Certificate No.')}</Th><Th>{L('تاريخ الإصدار', 'Issued on')}</Th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {data.certificates.length === 0 && <Empty cols={4}>{L('لسه مفيش شهادات صدرت', 'No certificates issued yet')}</Empty>}
                  {data.certificates.map((c, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-bold text-navy whitespace-nowrap">{c.student}</td>
                      <td className="px-4 py-3 text-gray-600">{c.course} / {c.group}</td>
                      <td className="px-4 py-3 text-gray-500" dir="ltr">{c.serial}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(c.issuedAt, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Section>
        </>
      )}
    </div>
  );
}
