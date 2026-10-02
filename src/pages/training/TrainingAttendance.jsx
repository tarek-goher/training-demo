import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, X as XIcon, Minus } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import Loader from '../../components/Loader';
import { getErrorMessage } from '../../utils/format';
import { useL, inputCls } from './shared';

// none -> present -> absent -> none
const nextMark = (cur) => (cur === undefined ? true : cur === true ? false : null);

export default function TrainingAttendance() {
  const L = useL();
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const groupId = params.get('group') || '';

  const [groups, setGroups] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trainingApi.listGroups().then((res) => setGroups(res.data.data));
  }, []);

  useEffect(() => {
    if (!groupId) {
      setData(null);
      return;
    }
    setLoading(true);
    trainingApi
      .getAttendance(groupId)
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err, lang)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const setLocalMark = (studentId, day, value) =>
    setData((d) => ({
      ...d,
      students: d.students.map((s) => {
        if (s.id !== studentId) return s;
        const marks = { ...s.marks };
        if (value === null) delete marks[day];
        else marks[day] = value;
        return { ...s, marks };
      }),
    }));

  const save = async (student, day, value) => {
    const previous = student.marks[day];
    setLocalMark(student.id, day, value); // optimistic
    try {
      await trainingApi.setAttendance(groupId, { studentId: student.id, dayNumber: day, present: value });
    } catch (err) {
      setLocalMark(student.id, day, previous === undefined ? null : previous);
      toast.error(getErrorMessage(err, lang));
    }
  };

  const weeks = data ? Array.from({ length: data.weeksCount }, (_, w) => w) : [];
  const daysOfWeek = data ? Array.from({ length: data.daysPerWeek }, (_, d) => d) : [];
  const dayNo = (w, d) => w * data.daysPerWeek + d + 1;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy mb-1">{L('الحضور والغياب', 'Attendance')}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {L('اختار الجروب، وبعدين دوس على خانة الطالب: مرة = حاضر، مرتين = غايب، تلات مرات = مسح.', 'Pick a group, then click a student cell: once = present, twice = absent, three times = clear.')}
      </p>

      <select value={groupId} onChange={(e) => setParams(e.target.value ? { group: e.target.value } : {})} className={`${inputCls} !w-auto min-w-[280px] mb-6`}>
        <option value="">{L('اختار الجروب', 'Select group')}</option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>{g.name} — {g.course.name}</option>
        ))}
      </select>

      {loading && <Loader />}

      {data && !loading && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-sm text-gray-500">
            <span><b className="text-navy">{data.name}</b> · {data.course}</span>
            <span className="bg-white border border-gray-100 rounded-full px-3 py-1 text-xs font-semibold">
              {data.weeksCount} {L('أسابيع', 'weeks')} × {data.daysPerWeek} {L('أيام', 'days')} = {data.daysCount}
            </span>
            <span className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> {L('حاضر', 'Present')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> {L('غايب', 'Absent')}</span>
            </span>
          </div>

          {data.students.length === 0 ? (
            <p className="text-center text-gray-400 py-10">{L('مفيش طلاب في الجروب ده', 'No students in this group')}</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-navy text-white">
                    <th rowSpan={2} className="px-4 py-3 font-semibold text-start sticky start-0 bg-navy z-10 min-w-[160px]">{L('الطالب', 'Student')}</th>
                    {weeks.map((w) => (
                      <th key={w} colSpan={data.daysPerWeek} className="px-2 py-2 font-bold text-center border-s border-white/20">
                        {L('الأسبوع', 'Week')} {w + 1}
                      </th>
                    ))}
                    <th rowSpan={2} className="px-4 py-3 font-semibold text-center border-s border-white/20 whitespace-nowrap">{L('الحضور', 'Present')}</th>
                  </tr>
                  <tr className="bg-gray-50 text-gray-500 text-xs">
                    {weeks.map((w) =>
                      daysOfWeek.map((d) => (
                        <th key={`${w}-${d}`} className={`px-1 py-2 font-semibold text-center min-w-[58px] ${d === 0 ? 'border-s border-gray-200' : ''}`}>
                          {L('يوم', 'Day')} {d + 1}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.students.map((s) => {
                    const present = Object.values(s.marks).filter((m) => m === true).length;
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 font-bold text-navy whitespace-nowrap sticky start-0 bg-white z-10">{s.name}</td>
                        {weeks.map((w) =>
                          daysOfWeek.map((d) => {
                            const n = dayNo(w, d);
                            const m = s.marks[n];
                            return (
                              <td key={n} className={`px-1 py-2 text-center ${d === 0 ? 'border-s border-gray-100' : ''}`}>
                                <button
                                  onClick={() => save(s, n, nextMark(m))}
                                  className={`w-10 h-9 rounded-lg inline-flex items-center justify-center transition-colors ${
                                    m === true ? 'bg-green-100 text-green-600' : m === false ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                                  }`}
                                  title={m === true ? L('حاضر', 'Present') : m === false ? L('غايب', 'Absent') : L('لم يُسجل', 'Not marked')}
                                >
                                  {m === true ? <Check size={17} /> : m === false ? <XIcon size={17} /> : <Minus size={14} />}
                                </button>
                              </td>
                            );
                          }),
                        )}
                        <td className="px-4 py-2 text-center font-bold text-navy whitespace-nowrap border-s border-gray-100">{present} / {data.daysCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
