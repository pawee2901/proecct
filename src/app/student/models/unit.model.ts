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
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  practice_count: number;
  total_score: number;
  isCurrentUser?: boolean;
}

export interface LearningLogEntry {
  date: Date | string;
  type: string;
  title: string;
  score?: number;
  xp: number;
  transcript?: { sender: 'user' | 'ai'; text: string }[];
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
}
