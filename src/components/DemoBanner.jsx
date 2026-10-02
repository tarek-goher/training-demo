import { FlaskConical, RotateCcw } from 'lucide-react';
import { useL } from '../pages/training/shared';
import { resetDemoData } from '../api/endpoints';

export default function DemoBanner() {
  const L = useL();

  const reset = () => {
    if (!window.confirm(L('إعادة البيانات التجريبية لحالتها الأولى؟ كل تعديلاتك هتتمسح.', 'Restore the original sample data? All your changes will be erased.'))) return;
    resetDemoData();
    window.location.reload();
  };

  return (
    <div className="bg-gold/15 border-b border-gold/40 text-navy text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-2 font-bold">
          <FlaskConical size={15} /> {L('نسخة تجريبية', 'Demo version')}
        </span>
        <span className="text-gray-600 flex-1 min-w-[220px]">
          {L(
            'الأسماء والأسعار بيانات تجريبية. كل اللي بتعمله بيتحفظ في متصفحك إنت بس ومبيتبعتش لأي مكان.',
            'Names and prices are sample data. Everything you do is stored in your own browser only and is never sent anywhere.',
          )}
        </span>
        <button onClick={reset} className="flex items-center gap-1.5 font-semibold text-teal-dark hover:underline">
          <RotateCcw size={13} /> {L('إعادة ضبط البيانات', 'Reset data')}
        </button>
      </div>
    </div>
  );
}
