export function formatPrice(price, currency = 'USD') {
  const n = Number(price || 0);
  if (n === 0) return null; // caller should show "Free"
  const symbol = currency === 'USD' ? '$' : currency === 'EGP' ? 'E£' : currency;
  return `${symbol}${n.toFixed(2)}`;
}

export function formatDuration(minutes) {
  const m = Number(minutes || 0);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}m`;
  return `${h}h ${mm}m`;
}

export function formatSeconds(seconds) {
  const s = Number(seconds || 0);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

export function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getErrorMessage(error, lang = 'en') {
  const resData = error?.response?.data;
  if (!resData) return lang === 'ar' ? 'حدث خطأ ما' : 'Something went wrong';
  return resData.message || (lang === 'ar' ? 'حدث خطأ ما' : 'Something went wrong');
}
