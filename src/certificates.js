function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderCertificateHtml({ studentName, courseTitle, serialNumber, issuedAt, instructorName, signatureUrl, brand }) {
  const dateStr = issuedAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const name = escapeHtml(studentName);
  const course = escapeHtml(courseTitle);
  const instructor = instructorName ? escapeHtml(instructorName) : '';
  const signatureBlock = signatureUrl || (brand?.showInstructor && instructor)
    ? `<div class="foot-block">
            ${signatureUrl ? `<img src="${escapeHtml(signatureUrl)}" alt="" class="signature-img" />` : '<div class="signature-img"></div>'}
            <div class="foot-value">${instructor}</div>
            <div class="foot-line">INSTRUCTOR</div>
          </div>`
    : '';

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Certificate — ${name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Poppins:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eef1f5; font-family: 'Poppins', sans-serif; }
  .page { width: 1100px; max-width: 100%; margin: 40px auto; padding: 0 16px; }
  .cert { position: relative; background: #fff; border-radius: 20px; padding: 14px; box-shadow: 0 20px 60px rgba(16, 28, 49, 0.18); }
  .cert-inner {
    position: relative;
    border: 2px solid #f2a900;
    border-radius: 14px;
    padding: 56px 64px;
    background:
      radial-gradient(circle at 0% 0%, rgba(34, 199, 191, 0.10), transparent 42%),
      radial-gradient(circle at 100% 100%, rgba(242, 169, 0, 0.10), transparent 42%);
    overflow: hidden;
  }
  .watermark {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif; font-size: 220px; font-weight: 800; color: #101c31;
    opacity: 0.035; pointer-events: none; user-select: none; white-space: nowrap;
  }
  .corner { position: absolute; width: 44px; height: 44px; border-color: #101c31; }
  .tl { top: 10px; left: 10px; border-top: 3px solid; border-left: 3px solid; border-radius: 12px 0 0 0; }
  .tr { top: 10px; right: 10px; border-top: 3px solid; border-right: 3px solid; border-radius: 0 12px 0 0; }
  .bl { bottom: 10px; left: 10px; border-bottom: 3px solid; border-left: 3px solid; border-radius: 0 0 0 12px; }
  .br { bottom: 10px; right: 10px; border-bottom: 3px solid; border-right: 3px solid; border-radius: 0 0 12px 0; }

  .brand { display: flex; align-items: center; justify-content: center; gap: 12px; position: relative; z-index: 1; }
  .badge { width: 46px; height: 46px; border-radius: 50%; background: #101c31; color: #22c7bf; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; border: 2px solid #22c7bf; }
  .brand-logo { height: 84px; width: 84px; object-fit: contain; }
  .brand-name { font-weight: 800; font-size: 20px; color: #101c31; letter-spacing: 0.3px; }

  .kicker { position: relative; z-index: 1; text-align: center; color: #94a3b8; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; margin-top: 22px; }
  .title { position: relative; z-index: 1; text-align: center; font-family: 'Playfair Display', serif; font-size: 42px; color: #101c31; margin: 8px 0 30px; font-weight: 800; }

  .lede { position: relative; z-index: 1; text-align: center; color: #64748b; font-size: 14px; margin-bottom: 6px; }
  .name-wrap { position: relative; z-index: 1; text-align: center; }
  .name { display: inline-block; font-family: 'Playfair Display', serif; font-size: 38px; color: #16a19a; margin: 4px 0 24px; font-weight: 700; border-bottom: 2px solid #f2a900; padding-bottom: 10px; }

  .desc { position: relative; z-index: 1; text-align: center; color: #475569; font-size: 15px; max-width: 720px; margin: 0 auto 36px; line-height: 1.9; }
  .course { font-weight: 800; color: #101c31; }

  .footer { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; }
  .foot-block { text-align: center; min-width: 170px; }
  .foot-value { font-size: 13px; color: #101c31; font-weight: 700; margin-bottom: 4px; }
  .foot-line { border-top: 1.5px solid #cbd5e1; padding-top: 8px; font-size: 11px; color: #94a3b8; letter-spacing: 0.3px; }
  .signature-img { height: 40px; max-width: 150px; object-fit: contain; margin-bottom: 4px; }
  .seal { width: 78px; height: 78px; border-radius: 50%; background: conic-gradient(#f2a900, #22c7bf, #f2a900); display: flex; align-items: center; justify-content: center; }
  .seal-inner { width: 62px; height: 62px; border-radius: 50%; background: #101c31; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; text-align: center; line-height: 1.3; letter-spacing: 0.5px; }

  @media print {
    @page { size: A4 landscape; margin: 0; }
    body { background: #fff; }
    .page { margin: 0; width: 100%; padding: 24px; }
    .cert { box-shadow: none; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="cert">
      <div class="cert-inner">
        <div class="watermark">${escapeHtml(brand?.watermark || 'NEXA')}</div>
        <div class="corner tl"></div>
        <div class="corner tr"></div>
        <div class="corner bl"></div>
        <div class="corner br"></div>

        <div class="brand">
          ${brand?.logoSrc ? `<img src="${brand.logoSrc}" alt="" class="brand-logo" />` : '<div class="badge">N</div>'}
          <div class="brand-name">${escapeHtml(brand?.name || 'Nexa Academy')}</div>
        </div>

        <p class="kicker">Certificate of Completion</p>
        <h1 class="title">Certificate of Achievement</h1>

        <p class="lede">This certifies that</p>
        <div class="name-wrap"><div class="name">${name}</div></div>

        <p class="desc">
          has successfully completed all requirements of the course <span class="course">${course}</span>
        </p>

        <div class="footer">
          <div class="foot-block">
            <div class="foot-value">${dateStr}</div>
            <div class="foot-line">DATE ISSUED</div>
          </div>
          ${signatureBlock}
          <div class="seal">
            <div class="seal-inner">${brand?.sealText || 'NEXA<br />CERTIFIED'}</div>
          </div>
          <div class="foot-block">
            <div class="foot-value">${serialNumber}</div>
            <div class="foot-line">CERTIFICATE NO.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}



const BRAND = { name: 'Future Biotech Invators', watermark: 'FBI', sealText: 'FBI<br />CERTIFIED' };

// Builds ONE printable document containing a certificate per student (each on its own A4 landscape page).
export function buildCertificatesDocument({ students, courseTitle, instructorName, logoSrc }) {
  const pages = students.map((s) =>
    renderCertificateHtml({
      studentName: s.name,
      courseTitle,
      serialNumber: s.certificateSerial,
      issuedAt: new Date(s.certificateIssuedAt),
      instructorName,
      brand: { ...BRAND, logoSrc, showInstructor: true },
    }),
  );

  const style = pages[0].match(/<style>([\s\S]*?)<\/style>/)[1];
  const bodies = pages.map((p) => p.match(/<body>([\s\S]*)<\/body>/)[1]);

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<title>Certificates — ${escapeHtml(courseTitle)}</title>
<style>${style}
  .page { break-after: page; }
  .page:last-of-type { break-after: auto; }
  .print-hint { position: fixed; top: 0; inset-inline: 0; background: #101c31; color: #fff; text-align: center; padding: 10px; font: 600 14px Poppins, sans-serif; z-index: 10; }
  .print-hint button { margin-inline-start: 12px; background: #22c7bf; color: #101c31; border: 0; border-radius: 8px; padding: 6px 14px; font-weight: 700; cursor: pointer; }
  body { padding-top: 48px; }
  @media print { .print-hint { display: none; } body { padding-top: 0; } }
</style>
</head>
<body>
<div class="print-hint">Print → choose "Save as PDF" · اطبع واختار "Save as PDF" <button onclick="window.print()">Print / Save as PDF</button></div>
${bodies.join('\n')}
</body>
</html>`;
}
