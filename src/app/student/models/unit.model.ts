// Shared data shapes for the Student area, extracted from the original
// student.component.ts monolith so services and every routed feature
// component can depend on the same types without importing the component.

export interface FullQuizPartCSubQ {
  label: string;
  sampleAnswer: string;
}

export interface FullQuizPartCQuestion {
  contextText: string;
  subQuestions: FullQuizPartCSubQ[];
}

export interface FullQuiz {
  partA: { question: string; options: string[]; answer: number }[];
  partB: {
    expressions: string[];
    replies: { key: string; text: string }[];
    answers: string[];
  };
  partCOrder?: {
    instruction: string;
    items: { text: string; correctPosition: number }[];
  };
  partC: FullQuizPartCQuestion[];
}

export interface LessonSection {
  icon: string;
  title: string;
  subtitle?: string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'pink';
  items: { label?: string; text: string; sub?: string }[];
}

export interface Unit {
  id: number;
  number: string;
  title: string;
  description: string;
  lessons: string[];
  vocabularies: {
    word: string;
    reading?: string;
    pos?: string;
    meaning: string;
    example?: string;
    image?: string;
  }[];
  dialogues: { role1: string; text1: string; role2: string; text2: string }[];
  cultureTips?: string[];
  lessonSections?: LessonSection[];
  preQuiz: { question: string; options: string[]; answer: number }[];
  postQuiz: { question: string; options: string[]; answer: number }[];
  scrambleWords: string[];
  scrambleHints: string[];
  unscrambleDialogue?: { id: number; text: string; order: number }[];
  /** Per-lesson custom content for Picture→Word / Fill in the Blank, set by
   *  the teacher's "Dedicated Game Creator Studio" (custom_games lesson
   *  content) — when present, GameEngineService prefers these over the
   *  global vocab-derived/hardcoded pools for this specific lesson. */
  pictureWords?: { word: string; meaning: string; clue?: string; image?: string }[];
  fillBlankItems?: { blanked: string; answer: string; full: string }[];
  fullQuiz?: FullQuiz;
  allowedGames?: string[];
  speakingQuestions?: string[];
  classHours?: string;
  weekRange?: string;
  topics?: string[];
  keywords?: string[];
  objectives?: string[];
  assessments?: string[];
  slidePath?: string;
  coverImage?: string;
}

export interface LearningLogEntry {
  date: Date | string;
  type: string;
  title: string;
  score?: number;
  xp: number;
  /** Which of the 4 Practice modes produced this entry, so each mode's own
   *  "ประวัติ (ชื่อโหมด)" button can filter to just its own log instead of
   *  mixing in the other 3 modes (or Lessons/Games/Review entries, which
   *  leave this undefined and so never show in any per-mode history). */
  practiceMode?: 'speech-to-speech' | 'text-to-text' | 'speech-to-text' | 'text-to-speech';
  transcript?: { sender: 'user' | 'ai'; text: string; grammarSuggestion?: string | null }[];
  // สรุปผลแบบเดียวกับ modal "ผลสรุปการฝึกพูด" (chatSummaryReport ใน
  // student-practice.component.ts — เดิม AI สร้างสรุปนี้ให้ทุกครั้งที่จบแชท/ฝึกพูด แต่
  // logChatSession()/evaluateCurrentSession() ทิ้งไปไม่เคยบันทึกลงประวัติเลย มีแต่
  // transcript เปล่าๆ) ตอนนี้ทุกกิจกรรมที่มีคะแนนแยกองค์ประกอบใช้ shape เดียวกันนี้ ให้
  // หน้าโปรไฟล์ ▸ ประวัติแสดงผลด้วยดีไซน์เดียวกับตอนฝึกจบสดๆ ไม่ต้องมีกล่อง "คำแนะนำ" คนละ
  // แบบต่อกิจกรรม
  report?: {
    overall: string;
    scoreItems?: { icon: string; label: string; value: number; max: number }[];
    total?: { value: number; max: number };
    corrections: { original: string; suggestion?: string; issue: string }[];
    tips: string[];
  };
  // ผลแยกทีละคำของแบบฝึกหัด dictation (โชว์ใน "ประวัติ" แบบ collapsible เหมือน transcript
  // แต่เป็นรายการคำแทนบทสนทนา เพราะกิจกรรมนี้ไม่มี AI ตอบโต้จริง)
  wordResults?: { text: string; userAnswer: string; score: number }[];
}

export interface FrequentlyWrongItem {
  id: string;
  type: 'word' | 'sentence' | 'grammar';
  original: string;
  correct: string;
  clue?: string;
  wrongCount: number;
}

export interface ProgressReportEntry {
  unitId: number;
  number: string;
  title: string;
  preScore: number | null;
  postScore: number | null;
  gameScramble: number | null;
  gameDialogue: number | null;
  /** Combined pre/post/game score + pass-fail for this lesson, computed by
   *  the backend (ai/lesson_grading.py) from the teacher's configured
   *  pass_threshold/game_weight/test_weight — see ProgressService.
   *  Undefined until synced from GET /student/lesson-scores/<id>. */
  overallScore?: number | null;
  passed?: boolean | null;
  reasoning?: string;
}
