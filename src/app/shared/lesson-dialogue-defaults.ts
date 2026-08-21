// shared/lesson-dialogue-defaults.ts — บทสนทนาเริ่มต้นของ 5 หน่วยเรียนปีที่ 1
// (Unit id 1-5) ที่ใช้เป็นค่าเริ่มต้นเมื่อหน่วยเรียนนั้นไม่ได้กำหนดบทสนทนา/ประโยคของ
// ตัวเองไว้เอง — ย้ายมาจาก LessonsDataService.getYearFallbackUnits(1) ("lite" seed
// ตรง `dialogues:` ของแต่ละ unit — คนละชุดกับ fullQuiz/unscrambleDialogue ที่ดึงจาก
// richYear1Seed แยกต่างหาก) ซึ่งฝังเป็นโค้ดตรงๆ มาตั้งแต่แรก ไม่เคยผูกกับตาราง DB ไหน
// เลย แม้แต่บทเรียนที่โหลดจริงจาก DB (id ตรงกับ 1-5) ก็ยังใช้ `dialogues` จากตรงนี้อยู่ดี
// (ดู loadLessonsFromDb() บรรทัด "dialogues: fallbackUnit?.dialogues || [...]") ย้ายมา
// ไว้ที่เดียวให้ทั้ง LessonsDataService (ฝั่งนักศึกษา, เล่นจริง) และ
// TeacherGameCoversComponent (ฟอร์ม "จัดการเนื้อหา" ของเกม เติมคำในประโยค/เรียง
// ประโยค พิมพ์ใหม่) ใช้ร่วมกัน — ค่าเดิมทุกตัว ไม่กระทบพฤติกรรมเดิม
//
// หมายเหตุ: ปีที่ 2 (Unit id 6-10) ยังไม่ได้ย้ายมาไว้ตรงนี้ (มีแค่ 1 บทสนทนาสั้นๆ ต่อ
// หน่วยอยู่แล้วในโค้ดเดิมเหมือนกัน) — เกม "ตอบบทสนทนาเอง (Open Dialogue Reply)" ยังใช้
// fullQuiz.partC เป็นแหล่งข้อมูลแยกต่างหาก ยังไม่ได้ย้ายมาไว้ตรงนี้เช่นกัน

export interface LessonDialogueLine {
  role1: string;
  text1: string;
  role2: string;
  text2: string;
}

export const LESSON_1_DIALOGUES: LessonDialogueLine[] = [
  { role1: 'Teacher', text1: 'Good morning, class! Welcome to our English course.', role2: 'Student', text2: 'Good morning, teacher! Excited to learn.' },
];

export const LESSON_2_DIALOGUES: LessonDialogueLine[] = [
  { role1: 'Receptionist', text1: 'Good morning, Ms. Parker speaking. How can I help you?', role2: 'Caller', text2: 'Hello, I would like to speak to Mr. Davis.' },
];

export const LESSON_3_DIALOGUES: LessonDialogueLine[] = [
  { role1: 'Presenter', text1: 'Today I will present our research findings.', role2: 'Audience', text2: 'Thank you. That was a great presentation.' },
];

export const LESSON_4_DIALOGUES: LessonDialogueLine[] = [
  { role1: 'Student', text1: 'Excuse me, Ms. Parker, do you have a moment to discuss my paper?', role2: 'Teacher', text2: 'Sure, please come in and take a seat.' },
];

export const LESSON_5_DIALOGUES: LessonDialogueLine[] = [
  { role1: 'Teacher', text1: 'First, read the instructions on page 5.', role2: 'Student', text2: 'Got it, thank you!' },
];

export const ALL_LESSON_DIALOGUES: LessonDialogueLine[] = [
  ...LESSON_1_DIALOGUES,
  ...LESSON_2_DIALOGUES,
  ...LESSON_3_DIALOGUES,
  ...LESSON_4_DIALOGUES,
  ...LESSON_5_DIALOGUES,
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// เหมือน GameEngineService.buildDialogueSentencePool() เป๊ะๆ — กรองประโยค 5-14 คำ
// (ตัวอักษรอังกฤษล้วน) แล้วตัดซ้ำ ใช้เป็นค่าเริ่มต้นของเกม "เรียงประโยค พิมพ์ใหม่"
export function buildDefaultDialogueSentencePool(): string[] {
  const sentences = new Set<string>();
  ALL_LESSON_DIALOGUES.forEach((d) => {
    [d.text1, d.text2].forEach((t) => {
      const wordCount = (t.match(/[A-Za-z']+/g) || []).length;
      if (t && wordCount >= 5 && wordCount <= 14) sentences.add(t.trim());
    });
  });
  return Array.from(sentences);
}

// เหมือน GameEngineService.buildFillBlankPool() เป๊ะๆ — เว้นคำที่ยาวที่สุดในประโยคเป็น
// ช่องว่าง ใช้เป็นค่าเริ่มต้นของเกม "เติมคำในประโยค"
export function buildDefaultFillBlankPool(): { blanked: string; answer: string; full: string }[] {
  const pool: { blanked: string; answer: string; full: string }[] = [];
  buildDefaultDialogueSentencePool().forEach((sentence) => {
    const words = sentence.match(/[A-Za-z']+/g) || [];
    if (words.length === 0) return;
    const answer = words.reduce((a, b) => (b.length > a.length ? b : a));
    if (answer.length < 4) return;
    const blanked = sentence.replace(new RegExp(`\\b${escapeRegExp(answer)}\\b`), '_____');
    if (blanked === sentence) return;
    pool.push({ blanked, answer, full: sentence });
  });
  return pool;
}
