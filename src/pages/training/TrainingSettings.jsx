import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, RotateCcw } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/format';
import { useL, useLogo, notifyBrandingChanged } from './shared';

export default function TrainingSettings() {
  const L = useL();
  const { lang } = useLang();
  const logo = useLogo();
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      await trainingApi.uploadLogo(fd);
      notifyBrandingChanged();
      toast.success(L('تم تغيير اللوجو', 'Logo updated'));
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(L('الرجوع للوجو الأصلي؟', 'Go back to the original logo?'))) return;
    setBusy(true);
    try {
      await trainingApi.resetLogo();
      notifyBrandingChanged();
      toast.success(L('تم الرجوع للوجو الأصلي', 'Logo reset'));
    } catch (err) {
      toast.error(getErrorMessage(err, lang));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold text-navy mb-1">{L('الإعدادات', 'Settings')}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {L('اللوجو ده بيظهر فوق في صفحات الإدارة وعلى كل الشهادات اللي بتتطبع.', 'This logo appears in the management header and on every printed certificate.')}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <p className="font-bold text-navy mb-4">{L('اللوجو', 'Logo')}</p>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="w-32 h-32 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center p-2">
            <img src={logo.src} alt="logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex flex-col gap-2">
            <label className={`btn-primary rounded-lg px-5 py-2.5 text-sm font-bold flex items-center gap-2 cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={16} /> {L('رفع لوجو جديد', 'Upload new logo')}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPick} />
            </label>
            {logo.isCustom && (
              <button onClick={reset} disabled={busy} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50">
                <RotateCcw size={15} /> {L('الرجوع للوجو الأصلي', 'Reset to original')}
              </button>
            )}
            <p className="text-xs text-gray-400">{L('PNG أو JPG، يفضل خلفية شفافة ومربع الشكل.', 'PNG or JPG; a square image with a transparent background works best.')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
