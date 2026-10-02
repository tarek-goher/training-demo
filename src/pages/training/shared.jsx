import { useEffect, useState } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import { trainingApi } from '../../api/endpoints';
import { resolveMediaUrl } from '../../api/client';

export const DEFAULT_LOGO = `${import.meta.env.BASE_URL}fbi-logo.png`;
const BRANDING_EVENT = 'training-branding-changed';

export function notifyBrandingChanged() {
  window.dispatchEvent(new Event(BRANDING_EVENT));
}

// The logo shown in the management header: the uploaded one, or the built-in FBI logo
export function useLogo() {
  const [logo, setLogo] = useState({ src: DEFAULT_LOGO, isCustom: false });

  useEffect(() => {
    const load = () =>
      trainingApi
        .getBranding()
        .then((res) => {
          const { logoUrl, isCustom } = res.data.data;
          setLogo({ src: logoUrl ? resolveMediaUrl(logoUrl) : DEFAULT_LOGO, isCustom });
        })
        .catch(() => {});
    load();
    window.addEventListener(BRANDING_EVENT, load);
    return () => window.removeEventListener(BRANDING_EVENT, load);
  }, []);

  return logo;
}

// Bilingual helper: const L = useL(); L('عربي', 'English')
export function useL() {
  const { lang } = useLang();
  return (ar, en) => (lang === 'ar' ? ar : en);
}

export const inputCls =
  'border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-teal bg-white w-full';

export const PAYMENT_METHODS = [
  { value: 'INSTAPAY', ar: 'انستاباي', en: 'InstaPay' },
  { value: 'ETISALAT_CASH', ar: 'اتصالات كاش', en: 'Etisalat Cash' },
  { value: 'CASH', ar: 'نقدي', en: 'Cash' },
];

export function methodLabel(value, lang) {
  const m = PAYMENT_METHODS.find((x) => x.value === value);
  return m ? (lang === 'ar' ? m.ar : m.en) : value;
}

export function money(n, lang = 'ar') {
  const v = Number(n || 0);
  const text = v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 });
  return lang === 'ar' ? `${text} ج.م` : `EGP ${text}`;
}

const STATUS = {
  PAID: { ar: 'خالص', en: 'Paid', cls: 'bg-green-100 text-green-700' },
  PARTIAL: { ar: 'دفع جزء', en: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  UNPAID: { ar: 'لم يدفع', en: 'Unpaid', cls: 'bg-red-100 text-red-700' },
};

export function PaymentBadge({ status }) {
  const L = useL();
  const s = STATUS[status] || STATUS.UNPAID;
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}>{L(s.ar, s.en)}</span>
  );
}

export function GroupStatusBadge({ status }) {
  const L = useL();
  return status === 'ENDED' ? (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
      {L('منتهي', 'Ended')}
    </span>
  ) : (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-teal/10 text-teal-dark">
      {L('شغال', 'Active')}
    </span>
  );
}

export function StatCard({ label, value, tone = 'navy' }) {
  const tones = { navy: 'text-navy', green: 'text-green-600', red: 'text-red-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <p className="text-xs text-gray-400 font-semibold">{label}</p>
      <p className={`text-xl font-extrabold mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  );
}

// Saves a Blob response (ZIP of certificates) as a file download
export function downloadBlob(blob, headers, fallbackName) {
  let filename = fallbackName;
  const cd = headers?.['content-disposition'];
  const match = cd && /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (match) filename = decodeURIComponent(match[1]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Errors on blob requests arrive as a Blob — read the JSON message out of it
export async function blobErrorMessage(err, fallback) {
  try {
    const data = err?.response?.data;
    if (data instanceof Blob) {
      const json = JSON.parse(await data.text());
      return json.message || fallback;
    }
  } catch {
    /* fall through */
  }
  return err?.response?.data?.message || fallback;
}

// Demo: opens the printable certificates page (the user chooses Print -> Save as PDF)
export function openCertificatesWindow(html) {
  // A blob: URL is more reliable than document.write into an about:blank popup
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const w = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  return true;
}
