// A tiny in-browser "backend" for the demo: same method names and response shapes as the real API,
// persisted in localStorage so every visitor plays with their own private copy.
import { buildCertificatesDocument } from '../certificates';
import { seedData } from './seed';

const KEY = 'fbi-demo-db-v1';
const METHODS = ['INSTAPAY', 'ETISALAT_CASH', 'CASH'];

const lang = () => localStorage.getItem('lang') || 'ar';
const T = (ar, en) => (lang() === 'ar' ? ar : en);
const uid = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

// Same shape the pages read errors from: err.response.data.message
const fail = (message) => Object.assign(new Error(message), { response: { data: { message } } });

// ---------------------------------------------------------------- storage
let cache = null;

function load() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw);
      return cache;
    }
  } catch {
    /* corrupted or blocked storage: fall through and reseed */
  }
  cache = seedData();
  persist();
  return cache;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    throw fail(T('مساحة التخزين في المتصفح امتلأت (جرّب صورة أصغر)', 'Browser storage is full (try a smaller image)'));
  }
}

export function resetDemoData() {
  cache = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- helpers
const num = (v) => Number(v ?? 0);
const nowIso = () => new Date().toISOString();
const sortBy = (arr, key, dir = 1) => [...arr].sort((a, b) => (a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0));
const sum = (rows, key) => rows.reduce((s, r) => s + r[key], 0);

function paymentStatus(total, paid) {
  if (total <= 0 || paid >= total) return 'PAID';
  if (paid <= 0) return 'UNPAID';
  return 'PARTIAL';
}

function withBalance(db, student) {
  const payments = sortBy(db.payments.filter((p) => p.studentId === student.id), 'paidAt');
  const total = num(student.totalPrice);
  const paid = payments.reduce((s, p) => s + num(p.amount), 0);
  return { ...student, totalPrice: total, payments, paid, remaining: Math.max(total - paid, 0), paymentStatus: paymentStatus(total, paid) };
}

const groupStudents = (db, groupId) => sortBy(db.students.filter((s) => s.groupId === groupId), 'createdAt').map((s) => withBalance(db, s));

function getCourse(db, id) {
  const c = db.courses.find((x) => x.id === id);
  if (!c) throw fail(T('الكورس غير موجود', 'Course not found'));
  return c;
}
function getGroup(db, id) {
  const g = db.groups.find((x) => x.id === id);
  if (!g) throw fail(T('الجروب غير موجود', 'Group not found'));
  return g;
}
function getStudent(db, id) {
  const s = db.students.find((x) => x.id === id);
  if (!s) throw fail(T('الطالب غير موجود', 'Student not found'));
  return s;
}

function assertGroupNameFree(db, courseId, name, exceptId) {
  const wanted = name.trim().toLowerCase();
  const clash = db.groups.some((g) => g.courseId === courseId && g.id !== exceptId && g.name.trim().toLowerCase() === wanted);
  if (clash) throw fail(T('فيه جروب بنفس الاسم في الكورس ده، اختار اسم تاني', 'A group with this name already exists in this course'));
}

const cleanText = (v) => {
  const t = (v ?? '').toString().trim();
  return t || null;
};

function intIn(v, min, max, label) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw fail(T(`${label} لازم يكون بين ${min} و ${max}`, `${label} must be between ${min} and ${max}`));
  return n;
}

async function readImage(file, max) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(fail(T('الصورة غير صالحة', 'Invalid image')));
    };
    img.src = url;
  });
}

async function defaultLogoDataUrl() {
  const blob = await (await fetch(`${import.meta.env.BASE_URL}fbi-logo.png`)).blob();
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

// Wraps a handler so it always resolves to an axios-like response
const api = (fn) => async (...args) => {
  const data = await fn(...args);
  return { data: { success: true, data }, headers: {} };
};

// ---------------------------------------------------------------- API
export const trainingApi = {
  // ---- courses
  listCourses: api(() => {
    const db = load();
    return sortBy(db.courses, 'createdAt').map((c) => ({
      id: c.id,
      name: c.name,
      price: num(c.price),
      instructorName: c.instructorName,
      imageUrl: c.imageUrl,
      groups: sortBy(db.groups.filter((g) => g.courseId === c.id), 'createdAt').map((g) => ({
        id: g.id,
        name: g.name,
        status: g.status,
        studentsCount: db.students.filter((s) => s.groupId === g.id).length,
      })),
    }));
  }),

  createCourse: api((p) => {
    const db = load();
    const name = (p.name || '').trim();
    if (name.length < 2) throw fail(T('اسم الكورس قصير', 'Course name is too short'));
    if (!(num(p.price) >= 0)) throw fail(T('السعر غير صحيح', 'Invalid price'));
    const course = { id: uid(), name, price: num(p.price), instructorName: cleanText(p.instructorName), imageUrl: null, createdAt: nowIso() };
    db.courses.push(course);
    persist();
    return course;
  }),

  updateCourse: api((id, p) => {
    const db = load();
    const c = getCourse(db, id);
    if (p.name !== undefined) {
      if (p.name.trim().length < 2) throw fail(T('اسم الكورس قصير', 'Course name is too short'));
      c.name = p.name.trim();
    }
    if (p.price !== undefined) c.price = num(p.price); // existing students keep the price they registered with
    if (p.instructorName !== undefined) c.instructorName = cleanText(p.instructorName);
    persist();
    return c;
  }),

  deleteCourse: api((id) => {
    const db = load();
    getCourse(db, id);
    if (db.groups.some((g) => g.courseId === id)) throw fail(T('امسح جروبات الكورس الأول', 'Delete the course groups first'));
    db.courses = db.courses.filter((c) => c.id !== id);
    persist();
    return null;
  }),

  uploadCourseImage: api(async (id, formData) => {
    const file = formData.get('image');
    if (!file) throw fail(T('الصورة مطلوبة', 'Image is required'));
    const imageUrl = await readImage(file, 480);
    const db = load();
    const c = getCourse(db, id);
    c.imageUrl = imageUrl;
    persist();
    return c;
  }),

  deleteCourseImage: api((id) => {
    const db = load();
    getCourse(db, id).imageUrl = null;
    persist();
    return null;
  }),

  // ---- branding
  getBranding: api(() => {
    const logo = load().logo;
    return { logoUrl: logo || null, isCustom: Boolean(logo) };
  }),

  uploadLogo: api(async (formData) => {
    const file = formData.get('logo');
    if (!file) throw fail(T('صورة اللوجو مطلوبة', 'Logo image is required'));
    const logo = await readImage(file, 300);
    const db = load();
    db.logo = logo;
    persist();
    return { logoUrl: logo, isCustom: true };
  }),

  resetLogo: api(() => {
    const db = load();
    db.logo = null;
    persist();
    return { logoUrl: null, isCustom: false };
  }),

  // ---- groups
  listGroups: api((params) => {
    const db = load();
    const rows = db.groups.filter((g) => !params?.courseId || g.courseId === params.courseId);
    return sortBy(rows, 'createdAt', -1).map((g) => {
      const students = groupStudents(db, g.id);
      const course = getCourse(db, g.courseId);
      return {
        id: g.id,
        name: g.name,
        status: g.status,
        startDate: g.startDate,
        weeksCount: g.weeksCount,
        daysPerWeek: g.daysPerWeek,
        daysCount: g.daysCount,
        course: { id: course.id, name: course.name },
        studentsCount: students.length,
        expected: sum(students, 'totalPrice'),
        collected: sum(students, 'paid'),
        remaining: sum(students, 'remaining'),
      };
    });
  }),

  createGroup: api((p) => {
    const db = load();
    const name = (p.name || '').trim();
    if (!name) throw fail(T('اسم الجروب مطلوب', 'Group name is required'));
    getCourse(db, p.courseId);
    assertGroupNameFree(db, p.courseId, name);
    const weeksCount = intIn(p.weeksCount, 1, 52, T('عدد الأسابيع', 'Weeks'));
    const daysPerWeek = intIn(p.daysPerWeek, 1, 7, T('أيام الأسبوع', 'Days per week'));
    const group = {
      id: uid(),
      name,
      courseId: p.courseId,
      startDate: p.startDate ? new Date(p.startDate).toISOString() : null,
      weeksCount,
      daysPerWeek,
      daysCount: weeksCount * daysPerWeek,
      status: 'ACTIVE',
      endedAt: null,
      createdAt: nowIso(),
    };
    db.groups.push(group);
    persist();
    return group;
  }),

  getGroup: api((id) => {
    const db = load();
    const g = getGroup(db, id);
    const course = getCourse(db, g.courseId);
    const students = groupStudents(db, g.id);
    return {
      id: g.id,
      name: g.name,
      status: g.status,
      startDate: g.startDate,
      weeksCount: g.weeksCount,
      daysPerWeek: g.daysPerWeek,
      daysCount: g.daysCount,
      endedAt: g.endedAt,
      course: { id: course.id, name: course.name, price: num(course.price), instructorName: course.instructorName },
      students,
      totals: { expected: sum(students, 'totalPrice'), collected: sum(students, 'paid'), remaining: sum(students, 'remaining') },
    };
  }),

  updateGroup: api((id, p) => {
    const db = load();
    const g = getGroup(db, id);
    if (p.name !== undefined) {
      if (!p.name.trim()) throw fail(T('اسم الجروب مطلوب', 'Group name is required'));
      assertGroupNameFree(db, g.courseId, p.name, g.id);
      g.name = p.name.trim();
    }
    if (p.startDate !== undefined) g.startDate = p.startDate ? new Date(p.startDate).toISOString() : null;
    if (p.weeksCount !== undefined || p.daysPerWeek !== undefined) {
      g.weeksCount = intIn(p.weeksCount ?? g.weeksCount, 1, 52, T('عدد الأسابيع', 'Weeks'));
      g.daysPerWeek = intIn(p.daysPerWeek ?? g.daysPerWeek, 1, 7, T('أيام الأسبوع', 'Days per week'));
      g.daysCount = g.weeksCount * g.daysPerWeek;
      // shrinking the schedule drops marks for days that no longer exist
      const ids = new Set(db.students.filter((s) => s.groupId === g.id).map((s) => s.id));
      db.attendance = db.attendance.filter((a) => !(ids.has(a.studentId) && a.dayNumber > g.daysCount));
    }
    persist();
    return g;
  }),

  deleteGroup: api((id) => {
    const db = load();
    getGroup(db, id);
    const ids = new Set(db.students.filter((s) => s.groupId === id).map((s) => s.id));
    db.students = db.students.filter((s) => s.groupId !== id);
    db.payments = db.payments.filter((p) => !ids.has(p.studentId));
    db.attendance = db.attendance.filter((a) => !ids.has(a.studentId));
    db.groups = db.groups.filter((g) => g.id !== id);
    persist();
    return null;
  }),

  // ---- students & payments
  addStudent: api((groupId, p) => {
    const db = load();
    const g = getGroup(db, groupId);
    const course = getCourse(db, g.courseId);
    const total = num(course.price);
    const name = (p.name || '').trim();
    if (name.length < 2) throw fail(T('اسم الطالب قصير', 'Student name is too short'));
    const paid = num(p.paidAmount);
    if (paid > total) throw fail(T('المبلغ المدفوع أكبر من سعر الكورس', 'Paid amount exceeds the course price'));
    if (paid > 0 && !METHODS.includes(p.method)) throw fail(T('اختار طريقة الدفع', 'Payment method is required'));

    const student = { id: uid(), groupId, name, phone: cleanText(p.phone), marketer: cleanText(p.marketer), totalPrice: total, certificateSerial: null, certificateIssuedAt: null, createdAt: nowIso() };
    db.students.push(student);
    if (paid > 0) db.payments.push({ id: uid(), studentId: student.id, amount: paid, method: p.method, paidAt: nowIso(), note: null });
    persist();
    return withBalance(db, student);
  }),

  updateStudent: api((id, p) => {
    const db = load();
    const s = getStudent(db, id);
    if (p.name !== undefined) {
      if (p.name.trim().length < 2) throw fail(T('اسم الطالب قصير', 'Student name is too short'));
      s.name = p.name.trim();
    }
    if (p.phone !== undefined) s.phone = cleanText(p.phone);
    if (p.marketer !== undefined) s.marketer = cleanText(p.marketer);
    persist();
    return withBalance(db, s);
  }),

  deleteStudent: api((id) => {
    const db = load();
    getStudent(db, id);
    db.students = db.students.filter((s) => s.id !== id);
    db.payments = db.payments.filter((p) => p.studentId !== id);
    db.attendance = db.attendance.filter((a) => a.studentId !== id);
    persist();
    return null;
  }),

  addPayment: api((studentId, p) => {
    const db = load();
    const s = getStudent(db, studentId);
    const amount = num(p.amount);
    if (!(amount > 0)) throw fail(T('المبلغ غير صحيح', 'Invalid amount'));
    if (!METHODS.includes(p.method)) throw fail(T('اختار طريقة الدفع', 'Payment method is required'));
    const { remaining } = withBalance(db, s);
    if (amount > remaining) throw fail(T(`المبلغ أكبر من المتبقي (${remaining})`, `Amount exceeds the remaining balance (${remaining})`));
    db.payments.push({ id: uid(), studentId, amount, method: p.method, paidAt: nowIso(), note: cleanText(p.note) });
    persist();
    return withBalance(db, s);
  }),

  deletePayment: api((id) => {
    const db = load();
    if (!db.payments.some((p) => p.id === id)) throw fail(T('الدفعة غير موجودة', 'Payment not found'));
    db.payments = db.payments.filter((p) => p.id !== id);
    persist();
    return null;
  }),

  // ---- attendance
  getAttendance: api((groupId) => {
    const db = load();
    const g = getGroup(db, groupId);
    const course = getCourse(db, g.courseId);
    return {
      id: g.id,
      name: g.name,
      course: course.name,
      startDate: g.startDate,
      weeksCount: g.weeksCount,
      daysPerWeek: g.daysPerWeek,
      daysCount: g.daysCount,
      students: sortBy(db.students.filter((s) => s.groupId === g.id), 'createdAt').map((s) => ({
        id: s.id,
        name: s.name,
        marks: Object.fromEntries(db.attendance.filter((a) => a.studentId === s.id).map((a) => [a.dayNumber, a.present])),
      })),
    };
  }),

  setAttendance: api((groupId, { studentId, dayNumber, present }) => {
    const db = load();
    const g = getGroup(db, groupId);
    if (dayNumber > g.daysCount) throw fail(T('اليوم خارج أيام الجروب', 'Day is outside the group days'));
    const s = getStudent(db, studentId);
    if (s.groupId !== groupId) throw fail(T('الطالب غير موجود في الجروب', 'Student not found in this group'));
    db.attendance = db.attendance.filter((a) => !(a.studentId === studentId && a.dayNumber === dayNumber));
    if (present !== null) db.attendance.push({ studentId, dayNumber, present });
    persist();
    return null;
  }),

  // ---- certificates: a printable page with one certificate per student (Print -> Save as PDF)
  endGroupAndPrint: api(async (groupId, onlyPaid) => {
    const db = load();
    const g = getGroup(db, groupId);
    const course = getCourse(db, g.courseId);
    const eligible = groupStudents(db, groupId).filter((s) => !onlyPaid || s.paymentStatus === 'PAID');
    if (eligible.length === 0) throw fail(T('مفيش طلاب تتطلعلهم شهادات', 'No students to issue certificates for'));

    for (const s of eligible) {
      const raw = db.students.find((x) => x.id === s.id);
      if (!raw.certificateSerial) {
        raw.certificateSerial = `FBI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
        raw.certificateIssuedAt = nowIso();
      }
    }
    if (g.status !== 'ENDED') {
      g.status = 'ENDED';
      g.endedAt = nowIso();
    }
    persist();

    const logoSrc = db.logo || (await defaultLogoDataUrl());
    const html = buildCertificatesDocument({
      students: eligible.map((s) => db.students.find((x) => x.id === s.id)),
      courseTitle: course.name,
      instructorName: course.instructorName,
      logoSrc,
    });
    return { html };
  }),

  // ---- reports
  reports: api((params) => {
    const db = load();
    const groups = db.groups.filter((g) => (!params?.groupId || g.id === params.groupId) && (!params?.courseId || g.courseId === params.courseId));

    const summary = { students: 0, expected: 0, collected: 0, remaining: 0 };
    const byCourse = new Map();
    const byMarketer = new Map();
    const byMethod = { INSTAPAY: 0, ETISALAT_CASH: 0, CASH: 0 };
    const unpaid = [];
    const groupRows = [];

    const bucket = (map, key, label) => {
      if (!map.has(key)) map.set(key, { key, label, students: 0, expected: 0, collected: 0, remaining: 0 });
      return map.get(key);
    };

    for (const g of groups) {
      const course = getCourse(db, g.courseId);
      const students = groupStudents(db, g.id);
      const expected = sum(students, 'totalPrice');
      const collected = sum(students, 'paid');
      const ids = new Set(students.map((s) => s.id));
      const marks = db.attendance.filter((a) => ids.has(a.studentId));
      const presentCount = marks.filter((m) => m.present).length;

      groupRows.push({
        id: g.id,
        name: g.name,
        course: course.name,
        status: g.status,
        students: students.length,
        expected,
        collected,
        remaining: Math.max(expected - collected, 0),
        attendanceRate: marks.length ? Math.round((presentCount / marks.length) * 100) : null,
      });

      for (const s of students) {
        summary.students += 1;
        summary.expected += s.totalPrice;
        summary.collected += s.paid;
        summary.remaining += s.remaining;

        const marketerName = (s.marketer || '').trim();
        for (const [map, key, label] of [
          [byCourse, course.id, course.name],
          [byMarketer, marketerName.toLowerCase(), marketerName],
        ]) {
          const b = bucket(map, key, label);
          b.students += 1;
          b.expected += s.totalPrice;
          b.collected += s.paid;
          b.remaining += s.remaining;
        }

        s.payments.forEach((p) => {
          byMethod[p.method] += num(p.amount);
        });

        if (s.remaining > 0) {
          unpaid.push({ id: s.id, name: s.name, phone: s.phone, marketer: s.marketer, group: g.name, groupId: g.id, course: course.name, total: s.totalPrice, paid: s.paid, remaining: s.remaining, paymentStatus: s.paymentStatus });
        }
      }
    }

    unpaid.sort((a, b) => b.remaining - a.remaining);
    return {
      summary,
      byCourse: [...byCourse.values()],
      byMarketer: [...byMarketer.values()].sort((a, b) => b.students - a.students),
      byMethod,
      groups: groupRows,
      unpaid,
    };
  }),
};
