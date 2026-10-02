import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import { resolveMediaUrl } from '../../api/client';
import Loader from '../../components/Loader';
import { getErrorMessage } from '../../utils/format';
import { useL, inputCls, money, GroupStatusBadge } from './shared';

export default function TrainingCourses() {
  const L = useL();
  const { lang } = useLang();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', price: '', instructorName: '' });
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ name: '', price: '', instructorName: '' });
  const [imageFile, setImageFile] = useState(null); // optional picture for a new course
  const [editImage, setEditImage] = useState({ file: null, remove: false });

  const previewOf = (file) => (file ? URL.createObjectURL(file) : null);

  const load = () =>
    trainingApi
      .listCourses()
      .then((res) => setCourses(res.data.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await trainingApi.createCourse({ name: form.name.trim(), price: Number(form.price), instructorName: form.instructorName.trim() });
      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await trainingApi.uploadCourseImage(res.data.data.id, fd).catch((err) => toast.error(getErrorMessage(err, lang)));
      }
      toast.success(L('تم إضافة الكورس', 'Course added'));
      setForm({ name: '', price: '', instructorName: '' });
      setImageFile(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (id) => {
    try {
      await trainingApi.updateCourse(id, { name: edit.name.trim(), price: Number(edit.price), instructorName: edit.instructorName.trim() });
      if (editImage.file) {
        const fd = new FormData();
        fd.append('image', editImage.file);
        await trainingApi.uploadCourseImage(id, fd);
      } else if (editImage.remove) {
        await trainingApi.deleteCourseImage(id);
      }
      toast.success(L('تم الحفظ', 'Saved'));
      setEditId(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  const remove = async (id) => {
    if (!window.confirm(L('متأكد إنك عايز تمسح الكورس؟', 'Delete this course?'))) return;
    try {
      await trainingApi.deleteCourse(id);
      toast.success(L('تم المسح', 'Deleted'));
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold text-navy mb-1">{L('الكورسات والأسعار', 'Courses & Prices')}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {L(
          'السعر بيتكتب مرة واحدة هنا، وأي طالب يتسجل في جروب تابع للكورس بياخد السعر ده تلقائي.',
          'Set the price once; every student registered in a group of this course gets it automatically.',
        )}
      </p>

      <form
        onSubmit={submit}
        className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6 grid sm:grid-cols-[1.3fr_1fr_150px_auto] gap-3 items-end"
      >
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('اسم الكورس', 'Course name')}</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
            placeholder="Medical Analysis Course"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('اسم الدكتور', 'Instructor')}</label>
          <input
            required
            value={form.instructorName}
            onChange={(e) => setForm((f) => ({ ...f, instructorName: e.target.value }))}
            className={inputCls}
            placeholder={L('د. ...', 'Dr. ...')}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">{L('السعر (ج.م)', 'Price (EGP)')}</label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className={inputCls}
          />
        </div>
        <button disabled={saving} className="btn-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">
          <Plus size={15} /> {L('إضافة', 'Add')}
        </button>

        <div className="sm:col-span-full flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:border-teal hover:text-teal-dark cursor-pointer">
            <ImagePlus size={16} />
            {imageFile ? imageFile.name : L('صورة الكورس (اختياري)', 'Course image (optional)')}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          </label>
          {imageFile && (
            <>
              <img src={previewOf(imageFile)} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
              <button type="button" onClick={() => setImageFile(null)} className="text-xs text-gray-400 hover:text-red-500">{L('إزالة', 'Remove')}</button>
            </>
          )}
        </div>
      </form>

      {loading ? (
        <Loader />
      ) : courses.length === 0 ? (
        <p className="text-center text-gray-400 py-10">{L('لسه مفيش كورسات', 'No courses yet')}</p>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => {
            const open = openId === c.id;
            const editing = editId === c.id;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                  {editing ? (
                    <>
                      <input value={edit.name} onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))} className={`${inputCls} flex-1 min-w-[180px]`} />
                      <input value={edit.instructorName} onChange={(e) => setEdit((x) => ({ ...x, instructorName: e.target.value }))} className={`${inputCls} w-44`} placeholder={L('اسم الدكتور', 'Instructor')} />
                      <input type="number" min="0" value={edit.price} onChange={(e) => setEdit((x) => ({ ...x, price: e.target.value }))} className={`${inputCls} w-36`} />
                      <div className="flex items-center gap-2">
                        {(editImage.file || (c.imageUrl && !editImage.remove)) && (
                          <img src={editImage.file ? previewOf(editImage.file) : resolveMediaUrl(c.imageUrl)} alt="" className="w-11 h-11 rounded-lg object-cover border border-gray-100" />
                        )}
                        <label className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer" title={L('تغيير الصورة', 'Change image')}>
                          <ImagePlus size={16} />
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditImage({ file: e.target.files?.[0] || null, remove: false })} />
                        </label>
                        {c.imageUrl && !editImage.file && !editImage.remove && (
                          <button type="button" onClick={() => setEditImage({ file: null, remove: true })} className="text-xs text-gray-400 hover:text-red-500">{L('إزالة الصورة', 'Remove image')}</button>
                        )}
                      </div>
                      <button onClick={() => saveEdit(c.id)} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Check size={16} /></button>
                      <button onClick={() => setEditId(null)} className="p-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100"><X size={16} /></button>
                    </>
                  ) : (
                    <>
                      {c.imageUrl && <img src={resolveMediaUrl(c.imageUrl)} alt="" className="w-11 h-11 rounded-lg object-cover border border-gray-100" />}
                      <button onClick={() => setOpenId(open ? null : c.id)} className="flex-1 min-w-[200px] text-start flex items-center gap-2">
                        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        <span className="font-bold text-navy">{c.name}</span>
                        {c.instructorName && <span className="text-xs text-teal-dark font-semibold">{c.instructorName}</span>}
                        <span className="text-xs text-gray-400">
                          ({c.groups.length} {L('جروب', 'groups')})
                        </span>
                      </button>
                      <span className="font-extrabold text-teal-dark">{money(c.price, lang)}</span>
                      <button
                        onClick={() => { setEditId(c.id); setEdit({ name: c.name, price: c.price, instructorName: c.instructorName || '' }); setEditImage({ file: null, remove: false }); }}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-navy"
                      >
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(c.id)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>

                {open && (
                  <div className="border-t border-gray-50 px-5 py-3">
                    {c.groups.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">{L('مفيش جروبات لسه على الكورس ده', 'No groups for this course yet')}</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {c.groups.map((g) => (
                          <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-2">
                            <span className="font-semibold text-navy text-sm">{g.name}</span>
                            <span className="flex items-center gap-3">
                              <GroupStatusBadge status={g.status} />
                              <span className="text-sm text-gray-500">
                                {g.studentsCount} {L('طالب', 'students')}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
