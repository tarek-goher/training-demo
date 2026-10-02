import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Users } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import Loader from '../../components/Loader';
import { getErrorMessage, formatDate } from '../../utils/format';
import { useL, inputCls, money, GroupStatusBadge } from './shared';

const emptyForm = { name: '', courseId: '', startDate: '', weeksCount: 4, daysPerWeek: 2 };

export default function TrainingGroups() {
  const L = useL();
  const { lang } = useLang();
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filterCourse, setFilterCourse] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGroups = () =>
    trainingApi
      .listGroups(filterCourse ? { courseId: filterCourse } : undefined)
      .then((res) => setGroups(res.data.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    trainingApi.listCourses().then((res) => setCourses(res.data.data));
  }, []);

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCourse]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await trainingApi.createGroup({
        name: form.name.trim(),
        courseId: form.courseId,
        startDate: form.startDate || null,
        weeksCount: Number(form.weeksCount),
        daysPerWeek: Number(form.daysPerWeek),
      });
      toast.success(L('تم إنشاء الجروب', 'Group created'));
      setForm((f) => ({ ...emptyForm, courseId: f.courseId }));
      loadGroups();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy mb-6">{L('الجروبات', 'Groups')}</h1>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
        <p className="font-bold text-navy mb-3">{L('إنشاء جروب جديد', 'Create a new group')}</p>
        {courses.length === 0 ? (
          <p className="text-sm text-amber-600">
            {L('ضيف كورس الأول من صفحة "الكورسات والأسعار".', 'Add a course first from the "Courses & Prices" page.')}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1fr_100px_100px_auto] gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('اسم الجروب', 'Group name')}</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder={L('جروب 1', 'Group 1')} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('الكورس', 'Course')}</label>
              <select required value={form.courseId} onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))} className={inputCls}>
                <option value="">{L('اختار الكورس', 'Select course')}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {money(c.price, lang)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('تاريخ البداية', 'Start date')}</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('عدد الأسابيع', 'Weeks')}</label>
              <input required type="number" min="1" max="52" value={form.weeksCount} onChange={(e) => setForm((f) => ({ ...f, weeksCount: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('أيام/أسبوع', 'Days/week')}</label>
              <input required type="number" min="1" max="7" value={form.daysPerWeek} onChange={(e) => setForm((f) => ({ ...f, daysPerWeek: e.target.value }))} className={inputCls} />
            </div>
            <button disabled={saving} className="btn-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
              <Plus size={15} /> {L('إنشاء', 'Create')}
            </button>
          </div>
        )}
        {courses.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            {L('إجمالي أيام الجروب:', 'Total sessions:')} <b className="text-navy">{(Number(form.weeksCount) || 0) * (Number(form.daysPerWeek) || 0)}</b>
          </p>
        )}
      </form>

      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="text-sm text-gray-400">{groups.length} {L('جروب', 'groups')}</p>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={`${inputCls} !w-auto min-w-[220px]`}>
          <option value="">{L('كل الكورسات', 'All courses')}</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : groups.length === 0 ? (
        <p className="text-center text-gray-400 py-10">{L('مفيش جروبات', 'No groups')}</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {[L('الجروب', 'Group'), L('الكورس', 'Course'), L('البداية', 'Start'), L('الجدول', 'Schedule'), L('الطلاب', 'Students'), L('المحصّل', 'Collected'), L('المتبقي', 'Remaining'), L('الحالة', 'Status')].map((h, i) => (
                  <th key={i} className="px-4 py-3 font-semibold text-start whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/groups/${g.id}`} className="font-bold text-navy hover:text-teal-dark">{g.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{g.course.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{g.startDate ? formatDate(g.startDate, lang) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{g.weeksCount} {L('أسابيع', 'wk')} × {g.daysPerWeek} ({g.daysCount})</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-gray-600"><Users size={14} /> {g.studentsCount}</span>
                  </td>
                  <td className="px-4 py-3 text-green-600 font-semibold whitespace-nowrap">{money(g.collected, lang)}</td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap ${g.remaining > 0 ? 'text-red-600' : 'text-gray-400'}`}>{money(g.remaining, lang)}</td>
                  <td className="px-4 py-3"><GroupStatusBadge status={g.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
