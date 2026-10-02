// Sample data the demo starts with. Names, prices and doctors are made up for demonstration only.
const uid = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const DAY = 24 * 60 * 60 * 1000;

export function seedData() {
  const base = Date.now() - 60 * DAY;
  let tick = 0;
  const stamp = () => new Date(base + ++tick * 60 * 1000).toISOString(); // strictly increasing => stable ordering
  const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

  const db = { version: 1, logo: null, courses: [], groups: [], students: [], payments: [], attendance: [] };

  const course = (name, price, instructorName) => {
    const c = { id: uid(), name, price, instructorName, imageUrl: null, createdAt: stamp() };
    db.courses.push(c);
    return c;
  };

  const medical = course('Medical Analysis Course', 2500, 'د. أحمد حسن');
  const multiDrug = course('Multi Drug Course', 2000, 'د. منى السيد');
  const intensive = course('Intensive Medical Analysis Course', 3500, 'د. أحمد حسن');
  const introBio = course('Introduction to Bioinformatics Course [online/offline]', 1800, 'د. خالد إبراهيم');
  course('Drug Design & Molecular Docking [online/offline]', 3000, 'د. منى السيد');
  course('Professional Bioinformatics [online/offline]', 4000, 'د. خالد إبراهيم');

  const group = (c, name, weeksCount, daysPerWeek, startDaysAgo, status = 'ACTIVE') => {
    const g = {
      id: uid(), name, courseId: c.id, startDate: daysAgo(startDaysAgo), weeksCount, daysPerWeek,
      daysCount: weeksCount * daysPerWeek, status, endedAt: status === 'ENDED' ? daysAgo(2) : null, createdAt: stamp(),
    };
    db.groups.push(g);
    return g;
  };

  // student(group, name, phone, marketer, [[amount, method], ...])
  const student = (g, c, name, phone, marketer, pays) => {
    const s = { id: uid(), groupId: g.id, name, phone, marketer, totalPrice: c.price, certificateSerial: null, certificateIssuedAt: null, createdAt: stamp() };
    db.students.push(s);
    pays.forEach(([amount, method], i) =>
      db.payments.push({ id: uid(), studentId: s.id, amount, method, paidAt: daysAgo(20 - i * 5), note: i === 0 && pays.length > 1 ? 'حجز' : null }),
    );
    return s;
  };

  // --- GB-1: Bioinformatics, in progress (4 weeks x 2 days), mixed payments
  const gb1 = group(introBio, 'GB-1', 4, 2, 21);
  const gb1Students = [
    student(gb1, introBio, 'أحمد محمود', '01001234567', 'مها', [[1800, 'INSTAPAY']]),
    student(gb1, introBio, 'سارة علي', '01112345678', 'مها', [[900, 'CASH'], [900, 'CASH']]),
    student(gb1, introBio, 'محمد إبراهيم', '01223456789', 'أحمد سمير', [[900, 'ETISALAT_CASH']]),
    student(gb1, introBio, 'منة الله حسن', '01554321098', 'نادر', [[1800, 'CASH']]),
    student(gb1, introBio, 'يوسف خالد', '01009876543', 'أحمد سمير', []),
    student(gb1, introBio, 'ياسمين طارق', '01145678901', 'نادر', [[600, 'INSTAPAY']]),
  ];
  gb1Students.forEach((s, i) => {
    for (let day = 1; day <= 5; day += 1) {
      if (i === 4 && day > 3) continue; // a student who stopped showing up
      db.attendance.push({ studentId: s.id, dayNumber: day, present: (i + day) % 7 !== 0 });
    }
  });

  // --- MA-1: Medical Analysis, just started (2 weeks x 3 days)
  const ma1 = group(medical, 'MA-1', 2, 3, 5);
  const ma1Students = [
    student(ma1, medical, 'عمر عادل', '01022223333', 'مها', [[1250, 'INSTAPAY']]),
    student(ma1, medical, 'هبة مصطفى', '01133334444', 'نادر', [[2500, 'CASH']]),
    student(ma1, medical, 'كريم وليد', '01244445555', 'أحمد سمير', [[1000, 'ETISALAT_CASH']]),
  ];
  ma1Students.forEach((s, i) => {
    for (let day = 1; day <= 2; day += 1) db.attendance.push({ studentId: s.id, dayNumber: day, present: !(i === 2 && day === 2) });
  });

  // --- MD-1: Multi Drug, finished and fully paid => try "print certificates"
  const md1 = group(multiDrug, 'MD-1', 1, 5, 14, 'ENDED');
  const md1Students = [
    student(md1, multiDrug, 'نور الدين سامي', '01066667777', 'نادر', [[2000, 'INSTAPAY']]),
    student(md1, multiDrug, 'ريم أشرف', '01177778888', 'مها', [[1000, 'CASH'], [1000, 'ETISALAT_CASH']]),
  ];
  md1Students.forEach((s) => {
    for (let day = 1; day <= 5; day += 1) db.attendance.push({ studentId: s.id, dayNumber: day, present: true });
  });

  // keep the intensive course empty on purpose: a blank course to try "add group" on
  void intensive;

  return db;
}
