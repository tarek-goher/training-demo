import { useEffect, useState, Fragment } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, ArrowLeft, Plus, Trash2, Pencil, Wallet, ChevronDown, ChevronUp, Award, X, Loader2 } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import Loader from '../../components/Loader';
import { getErrorMessage, formatDate } from '../../utils/format';
import {
  useL, inputCls, money, methodLabel, PAYMENT_METHODS, PaymentBadge, GroupStatusBadge, StatCard,
  blobErrorMessage, openCertificatesWindow,
} from './shared';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-navy">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-navy"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const emptyStudent = { name: '', phone: '', marketer: '', paidAmount: '', method: 'CASH' };

export default function TrainingGroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const L = useL();
  const { lang } = useLang();
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyStudent);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [pay, setPay] = useState({ amount: '', method: 'CASH', note: '' });
  const [editFor, setEditFor] = useState(null);
  const [edit, setEdit] = useState({ name: '', phone: '', marketer: '' });
  const [endOpen, setEndOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [sched, setSched] = useState({ weeksCount: 1, daysPerWeek: 1 });
  const [printing, setPrinting] = useState(false);

  const load = () =>
    trainingApi
      .getGroup(id)
      .then((res) => setGroup(res.data.data))
      .catch(() => navigate('/groups'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <Loader />;
  if (!group) return null;

  const price = group.course.price;
  const unpaidCount = group.students.filter((s) => s.paymentStatus !== 'PAID').length;

  const addStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const paid = Number(form.paidAmount || 0);
      await trainingApi.addStudent(id, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        marketer: form.marketer.trim() || null,
        ...(paid > 0 ? { paidAmount: paid, method: form.method } : {}),
      });
      toast.success(L('تم إضافة الطالب', 'Student added'));
      setForm((f) => ({ ...emptyStudent, method: f.method }));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    try {
      await trainingApi.addPayment(payFor.id, {
        amount: Number(pay.amount),
        method: pay.method,
        note: pay.note.trim() || null,
      });
      toast.success(L('تم تسجيل الدفعة', 'Payment recorded'));
      setPayFor(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    try {
      await trainingApi.updateStudent(editFor.id, {
        name: edit.name.trim(),
        phone: edit.phone.trim() || null,
        marketer: edit.marketer.trim() || null,
      });
      toast.success(L('تم الحفظ', 'Saved'));
      setEditFor(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const removeStudent = async (s) => {
    if (!window.confirm(L(`مسح الطالب ${s.name} وكل دفعاته؟`, `Delete ${s.name} and all their payments?`))) return;
    try {
      await trainingApi.deleteStudent(s.id);
      toast.success(L('تم المسح', 'Deleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const removePayment = async (paymentId) => {
    if (!window.confirm(L('مسح الدفعة دي؟', 'Delete this payment?'))) return;
    try {
      await trainingApi.deletePayment(paymentId);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    try {
      await trainingApi.updateGroup(id, { weeksCount: Number(sched.weeksCount), daysPerWeek: Number(sched.daysPerWeek) });
      toast.success(L('تم الحفظ', 'Saved'));
      setSchedOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const removeGroup = async () => {
    if (!window.confirm(L('مسح الجروب بكل طلابه ودفعاته؟ مينفعش الرجوع.', 'Delete the group with all its students and payments? This cannot be undone.'))) return;
    try {
      await trainingApi.deleteGroup(id);
      toast.success(L('تم المسح', 'Deleted'));
      navigate('/groups');
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const printCertificates = async (onlyPaid) => {
    setPrinting(true);
    try {
      const res = await trainingApi.endGroupAndPrint(id, onlyPaid);
      const opened = openCertificatesWindow(res.data.data.html);
      if (opened) toast.success(L('اتفتحت صفحة الشهادات: اختار طباعة ← حفظ كـ PDF', 'Certificates opened: choose Print → Save as PDF'));
      else toast.error(L('المتصفح منع النافذة، اسمح بالـ popups وجرّب تاني', 'Popup blocked — allow popups and try again'));
      setEndOpen(false);
      load();
    } catch (err) {
      toast.error(await blobErrorMessage(err, getErrorMessage(err, lang)));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div>
      <Link to="/groups" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-navy mb-3">
        <BackIcon size={15} /> {L('كل الجروبات', 'All groups')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-navy">{group.name}</h1>
            <GroupStatusBadge status={group.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {group.course.name}{group.course.instructorName && ` · ${group.course.instructorName}`} · {money(price, lang)} · {group.weeksCount} {L('أسابيع', 'weeks')} × {group.daysPerWeek} {L('أيام', 'days')}
            {group.startDate && ` · ${formatDate(group.startDate, lang)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEndOpen(true)}
            disabled={group.students.length === 0}
            className="btn-gold rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 disabled:opacity-40"
          >
            <Award size={16} />
            {group.status === 'ENDED' ? L('إعادة طباعة الشهادات', 'Reprint certificates') : L('إنهاء الجروب وطباعة الشهادات', 'End group & print certificates')}
          </button>
          <button
            onClick={() => { setSched({ weeksCount: group.weeksCount, daysPerWeek: group.daysPerWeek }); setSchedOpen(true); }}
            className="p-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-navy"
            title={L('تعديل الأسابيع والأيام', 'Edit weeks & days')}
          >
            <Pencil size={16} />
          </button>
          <button onClick={removeGroup} className="p-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label={L('عدد الطلاب', 'Students')} value={group.students.length} />
        <StatCard label={L('الإجمالي المطلوب', 'Expected')} value={money(group.totals.expected, lang)} />
        <StatCard label={L('المحصّل', 'Collected')} value={money(group.totals.collected, lang)} tone="green" />
        <StatCard label={L('المتبقي', 'Remaining')} value={money(group.totals.remaining, lang)} tone={group.totals.remaining > 0 ? 'red' : 'navy'} />
      </div>

      <form onSubmit={addStudent} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
        <p className="font-bold text-navy mb-3">
          {L('إضافة طالب', 'Add student')}
          <span className="text-xs font-normal text-gray-400 ms-2">{L(`السعر المطلوب ${money(price, lang)}`, `Total due ${money(price, lang)}`)}</span>
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('اسم الطالب', 'Student name')}</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('رقم التليفون', 'Phone')}</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('اللي جابه (تسويق)', 'Referred by')}</label>
            <input value={form.marketer} onChange={(e) => setForm((f) => ({ ...f, marketer: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('دفع كام', 'Paid now')}</label>
            <input type="number" min="0" max={price} step="0.01" value={form.paidAmount} onChange={(e) => setForm((f) => ({ ...f, paidAmount: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('طريقة الدفع', 'Method')}</label>
            <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} className={inputCls}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{L(m.ar, m.en)}</option>)}
            </select>
          </div>
          <button disabled={saving} className="btn-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
            <Plus size={15} /> {L('إضافة', 'Add')}
          </button>
        </div>
      </form>

      {group.students.length === 0 ? (
        <p className="text-center text-gray-400 py-10">{L('لسه مفيش طلاب في الجروب', 'No students in this group yet')}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['#', L('الطالب', 'Student'), L('التليفون', 'Phone'), L('المسوّق', 'Referred by'), L('الإجمالي', 'Total'), L('دفع', 'Paid'), L('المتبقي', 'Remaining'), L('الحالة', 'Status'), ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 font-semibold text-start whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {group.students.map((s, i) => {
                const open = expanded === s.id;
                return (
                  <Fragment key={s.id}>
                    <tr className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-navy whitespace-nowrap">{s.name}</td>
                      <td className="px-4 py-3 text-gray-500" dir="ltr">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{s.marketer || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{money(s.totalPrice, lang)}</td>
                      <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">{money(s.paid, lang)}</td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${s.remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{money(s.remaining, lang)}</td>
                      <td className="px-4 py-3"><PaymentBadge status={s.paymentStatus} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {s.remaining > 0 && (
                            <button
                              onClick={() => { setPayFor(s); setPay({ amount: s.remaining, method: 'CASH', note: '' }); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal/10 text-teal-dark text-xs font-bold hover:bg-teal/20 whitespace-nowrap"
                            >
                              <Wallet size={13} /> {L('دفعة', 'Payment')}
                            </button>
                          )}
                          <button onClick={() => setExpanded(open ? null : s.id)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-50" title={L('سجل الدفعات', 'Payment history')}>
                            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                          <button onClick={() => { setEditFor(s); setEdit({ name: s.name, phone: s.phone || '', marketer: s.marketer || '' }); }} className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-navy">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => removeStudent(s)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="bg-gray-50/70">
                        <td colSpan={9} className="px-6 py-3">
                          {s.payments.length === 0 ? (
                            <p className="text-sm text-gray-400">{L('مفيش دفعات', 'No payments yet')}</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {s.payments.map((p) => (
                                <li key={p.id} className="flex items-center gap-4 text-sm">
                                  <span className="font-bold text-green-600 w-28">{money(p.amount, lang)}</span>
                                  <span className="text-gray-600 w-28">{methodLabel(p.method, lang)}</span>
                                  <span className="text-gray-400 w-32">{formatDate(p.paidAt, lang)}</span>
                                  <span className="text-gray-400 flex-1">{p.note}</span>
                                  <button onClick={() => removePayment(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {payFor && (
        <Modal title={`${L('تسجيل دفعة', 'Record payment')} — ${payFor.name}`} onClose={() => setPayFor(null)}>
          <p className="text-sm text-gray-500 mb-4">
            {L('المتبقي على الطالب:', 'Remaining:')} <b className="text-red-600">{money(payFor.remaining, lang)}</b>
          </p>
          <form onSubmit={submitPayment} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('المبلغ', 'Amount')}</label>
              <input required autoFocus type="number" min="1" max={payFor.remaining} step="0.01" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('طريقة الدفع', 'Method')}</label>
              <select value={pay.method} onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))} className={inputCls}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{L(m.ar, m.en)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('ملاحظة (اختياري)', 'Note (optional)')}</label>
              <input value={pay.note} onChange={(e) => setPay((p) => ({ ...p, note: e.target.value }))} className={inputCls} />
            </div>
            <button className="btn-primary rounded-lg py-2.5 text-sm font-bold w-full">{L('تسجيل', 'Record')}</button>
          </form>
        </Modal>
      )}

      {editFor && (
        <Modal title={L('تعديل بيانات الطالب', 'Edit student')} onClose={() => setEditFor(null)}>
          <form onSubmit={submitEdit} className="space-y-3">
            <input required value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} className={inputCls} placeholder={L('الاسم', 'Name')} />
            <input value={edit.phone} onChange={(e) => setEdit((x) => ({ ...x, phone: e.target.value }))} className={inputCls} placeholder={L('التليفون', 'Phone')} dir="ltr" />
            <input value={edit.marketer} onChange={(e) => setEdit((x) => ({ ...x, marketer: e.target.value }))} className={inputCls} placeholder={L('اللي جابه', 'Referred by')} />
            <button className="btn-primary rounded-lg py-2.5 text-sm font-bold w-full">{L('حفظ', 'Save')}</button>
          </form>
        </Modal>
      )}

      {schedOpen && (
        <Modal title={L('تعديل جدول الجروب', 'Edit group schedule')} onClose={() => setSchedOpen(false)}>
          <form onSubmit={submitSchedule} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('عدد الأسابيع', 'Weeks')}</label>
                <input required type="number" min="1" max="52" value={sched.weeksCount} onChange={(e) => setSched((x) => ({ ...x, weeksCount: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('أيام/أسبوع', 'Days/week')}</label>
                <input required type="number" min="1" max="7" value={sched.daysPerWeek} onChange={(e) => setSched((x) => ({ ...x, daysPerWeek: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <p className="text-xs text-amber-600">{L('لو قللت الأيام، علامات الحضور للأيام المحذوفة هتتمسح.', 'If you reduce the days, attendance marks for removed days are deleted.')}</p>
            <button className="btn-primary rounded-lg py-2.5 text-sm font-bold w-full">{L('حفظ', 'Save')}</button>
          </form>
        </Modal>
      )}

      {endOpen && (
        <Modal title={L('طباعة الشهادات', 'Print certificates')} onClose={() => !printing && setEndOpen(false)}>
          <p className="text-sm text-gray-600 mb-1">
            {L(
              `هتتطلع شهادة PDF لكل طالب في الجروب (${group.students.length} طالب) في صفحة واحدة تقدر تطبعها أو تحفظها PDF، والجروب هيتعلّم "منتهي".`,
              `A PDF certificate is generated for every student (${group.students.length}) on one page you can print or save as PDF, and the group is marked as ended.`,
            )}
          </p>
          {unpaidCount > 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 my-3">
              {L(`${unpaidCount} طالب لسه عليهم فلوس.`, `${unpaidCount} student(s) still owe money.`)}
            </p>
          )}
          {printing ? (
            <div className="flex items-center justify-center gap-2 py-6 text-teal-dark font-semibold text-sm">
              <Loader2 size={18} className="animate-spin" /> {L('بيتم تجهيز الشهادات... ممكن ياخد شوية', 'Generating certificates… this may take a moment')}
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={() => printCertificates(false)} className="btn-gold rounded-lg py-2.5 text-sm">
                {L('كل الطلاب', 'All students')} ({group.students.length})
              </button>
              {unpaidCount > 0 && (
                <button onClick={() => printCertificates(true)} className="border border-gray-200 rounded-lg py-2.5 text-sm font-semibold text-navy hover:bg-gray-50">
                  {L('الطلاب اللي خالصين بس', 'Fully paid students only')} ({group.students.length - unpaidCount})
                </button>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
