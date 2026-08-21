import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { GameQuestionsEditorComponent } from './game-questions-editor.component';
import {
  TYPO_FIX_DEFAULT_BANK,
  SCENARIO_DEFAULT_BANK,
  EMAIL_CAPSTONE_DEFAULT_BANK,
  PICTURE_WORD_DEFAULT_BANK,
  DIALOGUE_DEFAULT_BANK,
  POS_SORTER_DEFAULT_BANK,
  SYNONYM_MATCH_DEFAULT_BANK,
  DRAG_WORD_DEFAULT_BANK,
  CONVERT_SENTENCE_DEFAULT_BANK,
  ENG_TO_THAI_DEFAULT_BANK,
} from '../../../shared/game-default-content';
import { buildDefaultDialogueSentencePool, buildDefaultFillBlankPool } from '../../../shared/lesson-dialogue-defaults';

// เกมทุกตัว (21 เกมเดิม + เกมใหม่ที่ครูสร้างเอง) เป็นแถวจริงในตาราง `games`
// แล้ว (2026-08-12, ดู backend/db/games.py) — การ์ดด้านบนนี้จึงโหลดจาก
// GET /games เสมอ ไม่จำกัดจำนวนเกมอีกต่อไป เกม 21 เกมเดิม (is_builtin=true,
// game_type = คีย์กลไกเกมเดิมเช่น 'scramble') ยังคงเล่น/แก้เนื้อหาด้วย
// GameEngineService + gameContentConfigs ด้านล่างเหมือนเดิมทุกอย่าง —
// เกมใหม่ (game_type='custom-quiz') ใช้ GameQuestionsEditorComponent
// แทน เพราะเป็นเกมถามตอบทั่วไปที่ไม่มีกลไกเฉพาะในโค้ด
export interface Game {
  game_id: number;
  game_type: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  instructions: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_seconds: number | null;
  total_score: number;
  is_builtin: boolean;
  display_order: number;
  question_count: number;
}

interface GameForm {
  title: string;
  description: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_seconds: number | null;
  total_score: number;
  cover_image: string;
}

// "ปกเกม" tab extracted verbatim from the old TeacherComponent
// (teacher.component.ts/.html) — no cross-page state needed.
@Component({
  selector: 'app-teacher-game-covers',
  standalone: true,
  imports: [CommonModule, FormsModule, GameQuestionsEditorComponent],
  templateUrl: './teacher-game-covers.component.html',
  styleUrl: './teacher-game-covers.component.scss',
})
export class TeacherGameCoversComponent implements OnInit {
  // ── Games (Dynamic Game Management) ──
  games: Game[] = [];
  gamesLoading = false;

  readonly difficultyOptions: { value: 'easy' | 'medium' | 'hard'; label: string }[] = [
    { value: 'easy', label: 'ง่าย' },
    { value: 'medium', label: 'ปานกลาง' },
    { value: 'hard', label: 'ยาก' },
  ];

  showGameModal = false;
  gameModalMode: 'create' | 'edit' = 'create';
  editingGameId: number | null = null;
  gameForm: GameForm = this.emptyGameForm();
  savingGame = false;
  uploadingGameCover = false;

  // เกมที่กำลังเปิด "จัดการเนื้อหา" (custom-quiz เท่านั้น — เกม builtin ใช้
  // ส่วน "เนื้อหาเกม" ด้านล่างของหน้านี้แทน)
  managingContentGame: Game | null = null;

  // ── Game Content — editable question/item bank, form-based (one labeled
  // row per field, add/remove items — friendlier than raw JSON for a
  // non-technical teacher). GameEngineService reads these via GET
  // /game-contents and prefers them over its hardcoded bank when set for
  // that game_key. Covers all 21 games (2026-08-12): typo-fix, scenario,
  // email-capstone, picture-word, sentence-reorder, open-reply, pos-sorter,
  // synonym-match, convert-sentence, drag-word, eng-to-thai have a
  // standalone static bank as their only source; scramble, dialogue,
  // picture-word and fill-blank ALSO have a per-lesson override from that
  // lesson's own "Dedicated Game Creator Studio" which takes priority over
  // this global one (see GameEngineService.initScrambleGame()/
  // initDialogueGame()/initPictureWordGame()/initFillBlankGame()); and
  // thai-recall, sprint, word-riddle, match-pair, dictation, save-mascot,
  // word-search fall back to the shared cross-lesson vocabulary pool
  // (built from every lesson's Vocabulary Manager) when left unset here.
  readonly gameContentConfigs: {
    key: string;
    label: string;
    fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'tags' | 'lines' | 'image' }[];
    newItem: () => any;
  }[] = [
    {
      key: 'typo-fix',
      label: 'จับผิดประโยค (Spot & Fix the Typo)',
      fields: [
        { key: 'wrong', label: 'ประโยคที่ผิด', type: 'text' },
        { key: 'correct', label: 'ประโยคที่ถูก (คำตอบ)', type: 'text' },
      ],
      newItem: () => ({ wrong: '', correct: '' }),
    },
    {
      key: 'scenario',
      label: 'รับมือสถานการณ์จริง (Scenario Construction)',
      fields: [
        { key: 'situationEn', label: 'สถานการณ์ (ภาษาอังกฤษ)', type: 'textarea' },
        { key: 'situationTh', label: 'คำแปลไทยกำกับ', type: 'textarea' },
        { key: 'keywords', label: 'คำสำคัญที่ต้องมีในคำตอบ (คั่นด้วย ,)', type: 'tags' },
        { key: 'sampleAnswer', label: 'คำตอบตัวอย่าง', type: 'textarea' },
      ],
      newItem: () => ({ situationEn: '', situationTh: '', keywords: '', sampleAnswer: '' }),
    },
    {
      key: 'email-capstone',
      label: 'ตอบอีเมลลูกค้า (Email Reply Capstone)',
      fields: [
        { key: 'subject', label: 'หัวข้ออีเมล', type: 'text' },
        { key: 'body', label: 'เนื้อหาอีเมลที่ได้รับ', type: 'textarea' },
        { key: 'keywords', label: 'คำสำคัญที่ต้องมีในคำตอบ (คั่นด้วย ,)', type: 'tags' },
        { key: 'minWords', label: 'จำนวนคำขั้นต่ำของคำตอบ', type: 'number' },
        { key: 'sampleAnswer', label: 'คำตอบตัวอย่าง', type: 'textarea' },
      ],
      newItem: () => ({ subject: '', body: '', keywords: '', minWords: 10, sampleAnswer: '' }),
    },
    {
      key: 'picture-word',
      label: 'ดูภาพ พิมพ์คำศัพท์ (Picture to Word)',
      fields: [
        { key: 'image', label: 'รูปภาพ', type: 'image' },
        { key: 'word', label: 'คำตอบ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย/คำใบ้ (ภาษาไทย)', type: 'text' },
        { key: 'clue', label: 'คำใบ้เพิ่มเติม (ถ้ามี)', type: 'text' },
      ],
      newItem: () => ({ image: '', word: '', meaning: '', clue: '' }),
    },
    {
      key: 'sentence-reorder',
      label: 'เรียงประโยค พิมพ์ใหม่ (Sentence Reorder)',
      fields: [
        { key: 'sentence', label: 'ประโยคภาษาอังกฤษเต็ม (ให้นักเรียนสลับคำใหม่)', type: 'text' },
      ],
      newItem: () => ({ sentence: '' }),
    },
    {
      key: 'open-reply',
      label: 'ตอบบทสนทนาเอง (Open Dialogue Reply)',
      fields: [
        { key: 'context', label: 'สถานการณ์/บทพูดที่ให้ตอบ', type: 'textarea' },
        { key: 'label', label: 'หัวข้อสั้นๆ กำกับข้อ', type: 'text' },
        { key: 'keywords', label: 'คำสำคัญที่ต้องมีในคำตอบ (คั่นด้วย ,)', type: 'tags' },
        { key: 'sampleAnswer', label: 'คำตอบตัวอย่าง', type: 'textarea' },
      ],
      newItem: () => ({ context: '', label: '', keywords: '', sampleAnswer: '' }),
    },
    {
      key: 'pos-sorter',
      label: 'แยกแยะประเภทคำ (POS Sorter)',
      fields: [
        { key: 'word', label: 'คำศัพท์ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'pos', label: 'ชนิดของคำ (noun / verb / adjective / adverb)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', pos: '', meaning: '' }),
    },
    {
      key: 'synonym-match',
      label: 'คำพ้องความหมาย (Synonym Matcher)',
      fields: [
        { key: 'word', label: 'คำศัพท์ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'synonym', label: 'คำพ้องความหมาย (คำตอบที่ถูก)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
        { key: 'distractors', label: 'ตัวเลือกลวง 3 คำ (คั่นด้วย ,)', type: 'tags' },
      ],
      newItem: () => ({ word: '', synonym: '', meaning: '', distractors: '' }),
    },
    {
      key: 'convert-sentence',
      label: 'คอนเวิด แปลงรูปประโยค (Sentence Converter)',
      fields: [
        { key: 'instruction', label: 'โจทย์ (เช่น "แปลงเป็น Past Simple Tense")', type: 'text' },
        { key: 'originalSentence', label: 'ประโยคตั้งต้น', type: 'textarea' },
        { key: 'hint', label: 'คำใบ้', type: 'text' },
        { key: 'correctAnswers', label: 'คำตอบที่ยอมรับได้ (1 บรรทัด = 1 คำตอบ)', type: 'lines' },
        { key: 'explanation', label: 'คำอธิบายเฉลย', type: 'text' },
      ],
      newItem: () => ({ instruction: '', originalSentence: '', hint: '', correctAnswers: '', explanation: '' }),
    },
    {
      key: 'drag-word',
      label: 'เกมลากคำ (Drag & Drop Word Builder)',
      fields: [
        { key: 'thaiHint', label: 'คำใบ้ภาษาไทย', type: 'text' },
        { key: 'sentenceTemplate', label: 'ประโยคแม่แบบ (ใส่ [slot0], [slot1] แทนช่องว่างที่ต้องลากคำ)', type: 'text' },
        { key: 'slotWords', label: 'คำตอบที่ถูกของแต่ละช่อง เรียงตามลำดับ [slot0], [slot1]... (คั่นด้วย ,)', type: 'tags' },
        { key: 'wordBank', label: 'คำทั้งหมดที่ให้เลือกลาก รวมตัวลวง (คั่นด้วย ,)', type: 'tags' },
        { key: 'explanation', label: 'คำอธิบายเฉลย', type: 'text' },
      ],
      newItem: () => ({ thaiHint: '', sentenceTemplate: '', slotWords: '', wordBank: '', explanation: '' }),
    },
    {
      key: 'eng-to-thai',
      label: 'แปลอังกฤษ พิมพ์ไทย (English to Thai Recall)',
      fields: [
        { key: 'englishSentence', label: 'ประโยคภาษาอังกฤษ', type: 'textarea' },
        { key: 'thaiHint', label: 'คำใบ้ภาษาไทย', type: 'text' },
        { key: 'primaryThai', label: 'คำแปลไทยหลัก (คำตอบตัวอย่าง)', type: 'textarea' },
        { key: 'keyKeywords', label: 'คำสำคัญที่ต้องมีในคำแปล (คั่นด้วย ,)', type: 'tags' },
        { key: 'explanation', label: 'คำอธิบายเฉลย', type: 'text' },
      ],
      newItem: () => ({ englishSentence: '', thaiHint: '', primaryThai: '', keyKeywords: '', explanation: '' }),
    },
    {
      key: 'scramble',
      label: 'สลับตัวอักษร (Word Scramble)',
      fields: [
        { key: 'word', label: 'คำศัพท์ที่จะให้สลับตัวอักษร (ภาษาอังกฤษ)', type: 'text' },
      ],
      newItem: () => ({ word: '' }),
    },
    {
      key: 'dialogue',
      label: 'เรียงบทสนทนา (Dialogue Sequencer)',
      fields: [
        { key: 'text', label: 'บทพูด (เรียงตามลำดับที่ถูกต้องจากบนลงล่าง)', type: 'text' },
      ],
      newItem: () => ({ text: '' }),
    },
    {
      key: 'fill-blank',
      label: 'เติมคำในประโยค (Fill in the Blank)',
      fields: [
        { key: 'fullSentence', label: 'ประโยคเต็มภาษาอังกฤษ', type: 'text' },
        { key: 'answer', label: 'คำที่จะถูกเว้นเป็นช่องว่าง (คำตอบ)', type: 'text' },
      ],
      newItem: () => ({ fullSentence: '', answer: '' }),
    },
    {
      key: 'thai-recall',
      label: 'แปลไทย พิมพ์อังกฤษ (Thai to English Recall)',
      fields: [
        { key: 'word', label: 'คำตอบ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย/คำใบ้ (ภาษาไทย)', type: 'text' },
        { key: 'image', label: 'รูปภาพ (ถ้ามี)', type: 'image' },
      ],
      newItem: () => ({ word: '', meaning: '', image: '' }),
    },
    {
      key: 'sprint',
      label: 'จับเวลาพิมพ์คำศัพท์ (Typing Sprint)',
      fields: [
        { key: 'word', label: 'คำศัพท์ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', meaning: '' }),
    },
    {
      key: 'word-riddle',
      label: 'ทายคำศัพท์ (Word Riddle)',
      fields: [
        { key: 'word', label: 'คำตอบ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', meaning: '' }),
    },
    {
      key: 'match-pair',
      label: 'จับคู่การ์ดความจำ (Memory Match)',
      fields: [
        { key: 'word', label: 'คำศัพท์ (ภาษาอังกฤษ)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', meaning: '' }),
    },
    {
      key: 'dictation',
      label: 'สะกดตามคำบอก (Dictation Master)',
      fields: [
        { key: 'word', label: 'คำศัพท์ที่จะอ่านออกเสียง (ภาษาอังกฤษ)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', meaning: '' }),
    },
    {
      key: 'save-mascot',
      label: 'ช่วยชีวิตนกฮูกมาสคอต (Save the Mascot)',
      fields: [
        { key: 'word', label: 'คำศัพท์ (ภาษาอังกฤษ ไม่มีเว้นวรรค)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', meaning: '' }),
    },
    {
      key: 'word-search',
      label: 'ค้นหาคำศัพท์ (Word Search Puzzle)',
      fields: [
        { key: 'word', label: 'คำศัพท์ (ภาษาอังกฤษ ตัวอักษรล้วน 3-10 ตัว)', type: 'text' },
        { key: 'meaning', label: 'ความหมาย (ภาษาไทย)', type: 'text' },
      ],
      newItem: () => ({ word: '', meaning: '' }),
    },
  ];
  // items ที่แก้อยู่ต่อเกม — keywords เก็บเป็น string คั่นด้วย , ระหว่างแก้ไข (แปลง
  // เป็น string[] ตอนบันทึกเท่านั้น) ให้พิมพ์ในช่องเดียวได้ง่ายกว่าเก็บเป็น array ตรงๆ
  gameContentItems: { [gameKey: string]: any[] } = {};
  gameContentSavedFlag: { [gameKey: string]: boolean } = {};
  gameContentSaving: { [gameKey: string]: boolean } = {};

  // เกมที่กำลังเปิด "จัดการเนื้อหา" (builtin เท่านั้น — เกม custom-quiz ใช้
  // managingContentGame + GameQuestionsEditorComponent แทน) สลับไปแสดงเป็นอีกหน้า
  // ในพาเนลเดียวกัน (แทนที่รายการเกม) โฟกัสเกมเดียว แทนที่การ scroll ไปหาในลิสต์ยาวด้านล่างแบบเดิม
  managingBuiltinGame: Game | null = null;

  // เกม builtin ที่ "มี" ค่าเริ่มต้นจริงในโค้ด (bank ตายตัว) ให้พรีฟิลฟอร์มทันที
  // แทนแถวว่างเปล่า — ย้ายมาจาก GameEngineService (shared/game-default-content.ts)
  // ค่าเดียวกับที่นักศึกษาเล่นจริงเป๊ะๆ ตอนยังไม่มีใครแก้ไว้ใน DB
  private readonly builtinDefaults: { [gameKey: string]: any[] } = {
    'typo-fix': TYPO_FIX_DEFAULT_BANK,
    'scenario': SCENARIO_DEFAULT_BANK,
    'email-capstone': EMAIL_CAPSTONE_DEFAULT_BANK,
    'picture-word': PICTURE_WORD_DEFAULT_BANK,
    'dialogue': DIALOGUE_DEFAULT_BANK,
    'pos-sorter': POS_SORTER_DEFAULT_BANK,
    'synonym-match': SYNONYM_MATCH_DEFAULT_BANK,
    'drag-word': DRAG_WORD_DEFAULT_BANK,
    'convert-sentence': CONVERT_SENTENCE_DEFAULT_BANK,
    'eng-to-thai': ENG_TO_THAI_DEFAULT_BANK,
    // ค่าเริ่มต้นจริงของ 2 เกมนี้คำนวณจากบทสนทนาของ 5 หน่วยเรียนปีที่ 1 ผ่านฟังก์ชัน
    // เดียวกันเป๊ะๆ กับที่ GameEngineService ใช้เล่นจริง (ดู shared/lesson-dialogue-defaults.ts)
    // — แปลงรูปร่างให้ตรงกับ field ของ gameContentConfigs แต่ละเกม
    'fill-blank': buildDefaultFillBlankPool().map((item) => ({ fullSentence: item.full, answer: item.answer })),
    'sentence-reorder': buildDefaultDialogueSentencePool().map((sentence) => ({ sentence })),
  };

  // เกมที่ไม่มี bank ตายตัว — ค่าเริ่มต้นจริงคือ "คลังคำศัพท์รวมทุกบทเรียน" (สด, เปลี่ยน
  // ตามที่อาจารย์เพิ่ม/แก้คำศัพท์ในหน้าจัดการบทเรียน) ดึงมาแสดง/แก้ที่นี่ได้เหมือนกัน
  // แต่ไม่ใช่ literal ในโค้ดแบบ builtinDefaults ด้านบน — 'scramble' รวมอยู่ในกลุ่มนี้ด้วย
  // เพราะตรวจโค้ดแล้วพบว่า initScrambleGame() ก็ derive คำจากคำศัพท์ของบทเรียนเป็นค่า
  // เริ่มต้นเหมือนกันทุกประการเมื่อไม่มีคำที่อาจารย์กำหนดเองต่อหน่วยเรียน (ดู
  // lessons-data.service.ts บรรทัด scrambleWords = customScrambleWords.length > 0
  // ? customScrambleWords : finalVocabs.map(v => v.word))
  private readonly vocabPoolGameKeys = ['scramble', 'thai-recall', 'sprint', 'word-riddle', 'match-pair', 'dictation', 'save-mascot', 'word-search'];
  private vocabPool: { word: string; meaning: string }[] = [];

  isVocabPoolGame(key: string): boolean {
    return this.vocabPoolGameKeys.includes(key);
  }

  // เกมที่เนื้อหาเริ่มต้นดึงจาก fullQuiz.partC ของแต่ละบทเรียน ซึ่งตรวจโค้ดแล้วพบว่าเป็น
  // ข้อมูลที่ฝังตายตัวอยู่ใน lessons-data.service.ts เท่านั้น (ไม่มีตาราง DB รองรับเลย
  // ไม่มีหน้าไหนในระบบให้อาจารย์แก้ไขได้จริงในตอนนี้ ต่างจากคำศัพท์/บทสนทนาที่ดึงมา
  // พรีฟิลด้านบนได้แล้ว) จึงยังไม่มี "ค่าเดียว" ที่ดึงมาพรีฟิลตรงนี้ได้อย่างถูกต้อง —
  // ยังแก้ไขได้ปกติ (บันทึกแล้วจะ override ของสดทันที) แค่เริ่มจากแถวว่างเหมือนเดิม
  // จนกว่าจะแยกงานทำให้ fullQuiz ย้ายเข้า DB เหมือนคำศัพท์ (เป็นงานแยกที่ใหญ่กว่าหน้า Game Covers)
  readonly dynamicOnlyGameKeys = ['open-reply'];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadGames();
    this.loadVocabPoolThenContents();
  }

  // โหลดคลังคำศัพท์รวมทุกบทเรียนก่อน (เดียวกับ GameEngineService.buildGameVocabPool())
  // แล้วค่อยโหลด/พรีฟิลเนื้อหาเกม กันปัญหา race condition ที่ resolveDefaultItems()
  // อาจถูกเรียกใช้ก่อนคลังคำศัพท์พร้อม
  private loadVocabPoolThenContents(): void {
    this.apiService.getLessons().subscribe({
      next: (lessons: any[]) => {
        this.vocabPool = this.buildVocabPool(lessons);
        this.loadGameContents();
      },
      error: () => {
        this.vocabPool = [];
        this.loadGameContents();
      }
    });
  }

  private buildVocabPool(lessons: any[]): { word: string; meaning: string }[] {
    const seen = new Set<string>();
    const pool: { word: string; meaning: string }[] = [];
    (Array.isArray(lessons) ? lessons : []).forEach((lesson: any) => {
      (lesson?.vocabularies || []).forEach((v: any) => {
        const word = String(v?.word || '').trim();
        if (!word) return;
        const key = word.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        pool.push({ word, meaning: v?.meaning || '' });
      });
    });
    return pool;
  }

  // ค่าเริ่มต้นจริงของเกมหนึ่ง (ก่อนแปลงเป็น editable ผ่าน itemToEditable) — ให้ครูเห็น/แก้
  // เนื้อหาที่กำลังใช้เล่นจริงอยู่ แทนที่จะเจอแถวว่างเปล่าเสมอเมื่อยังไม่มีใครบันทึกไว้ใน DB
  private resolveDefaultItems(cfg: { key: string; newItem: () => any }): any[] {
    const bank = this.builtinDefaults[cfg.key];
    if (bank && bank.length > 0) return bank;
    if (this.vocabPoolGameKeys.includes(cfg.key) && this.vocabPool.length > 0) {
      return this.vocabPool.map((v) => ({ ...cfg.newItem(), ...v }));
    }
    return [cfg.newItem()];
  }

  private emptyGameForm(): GameForm {
    return {
      title: '',
      description: '',
      instructions: '',
      difficulty: 'medium',
      time_limit_seconds: null,
      total_score: 100,
      cover_image: '',
    };
  }

  // ── Games (Dynamic Game Management) ──
  loadGames(): void {
    this.gamesLoading = true;
    this.apiService.getGames().subscribe({
      next: (data: any) => {
        this.games = Array.isArray(data) ? data : [];
        this.gamesLoading = false;
      },
      error: () => {
        this.games = [];
        this.gamesLoading = false;
      }
    });
  }

  openCreateGameModal(): void {
    this.gameModalMode = 'create';
    this.editingGameId = null;
    this.gameForm = this.emptyGameForm();
    this.showGameModal = true;
  }

  openEditGameModal(game: Game): void {
    this.gameModalMode = 'edit';
    this.editingGameId = game.game_id;
    this.gameForm = {
      title: game.title || '',
      description: game.description || '',
      instructions: game.instructions || '',
      difficulty: game.difficulty || 'medium',
      time_limit_seconds: game.time_limit_seconds,
      total_score: game.total_score ?? 100,
      cover_image: game.cover_image || '',
    };
    this.showGameModal = true;
  }

  closeGameModal(): void {
    this.showGameModal = false;
  }

  // ปกเกมใส่หรือไม่ใส่ก็ได้ — ปุ่มนี้แค่ล้างค่าในฟอร์ม ยังไม่ยิงลบไฟล์ที่อัปโหลดไว้จนกว่า
  // จะกด "บันทึก" (saveGameModal ส่ง cover_image ว่างไปแทนค่าเดิม)
  removeGameFormCover(): void {
    this.gameForm.cover_image = '';
  }

  onGameFormCoverUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'ชนิดไฟล์ไม่ถูกต้อง', text: 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้นค่ะ', confirmButtonColor: '#0f766e' });
      return;
    }
    this.uploadingGameCover = true;
    this.apiService.uploadFile(file).subscribe({
      next: (res: any) => {
        this.uploadingGameCover = false;
        if (res && res.url) {
          this.gameForm.cover_image = res.url;
        }
      },
      error: () => {
        this.uploadingGameCover = false;
        Swal.fire({ icon: 'error', title: 'อัปโหลดล้มเหลว', text: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', confirmButtonColor: '#0f766e' });
      }
    });
  }

  saveGameModal(): void {
    if (!this.gameForm.title || !this.gameForm.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกชื่อเกม', confirmButtonColor: '#0f766e' });
      return;
    }

    this.savingGame = true;
    const payload = { ...this.gameForm };

    const done = (game: Game) => {
      this.savingGame = false;
      this.showGameModal = false;
      if (this.gameModalMode === 'create') {
        this.games = [...this.games, game];
      } else {
        this.games = this.games.map((g) => (g.game_id === game.game_id ? game : g));
      }
      Swal.fire({ icon: 'success', title: this.gameModalMode === 'create' ? 'สร้างเกมสำเร็จ' : 'บันทึกการแก้ไขสำเร็จ', confirmButtonColor: '#0f766e', timer: 1500 });
    };
    const fail = () => {
      this.savingGame = false;
      Swal.fire({ icon: 'error', title: 'บันทึกล้มเหลว', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลเกม', confirmButtonColor: '#0f766e' });
    };

    if (this.gameModalMode === 'create') {
      this.apiService.createGame(payload).subscribe({ next: done, error: fail });
    } else if (this.editingGameId != null) {
      this.apiService.updateGame(this.editingGameId, payload).subscribe({ next: done, error: fail });
    }
  }

  confirmDeleteGame(game: Game): void {
    Swal.fire({
      icon: 'warning',
      title: 'ลบเกมนี้หรือไม่?',
      text: `ต้องการลบเกม "${game.title}" ใช่หรือไม่ คำถามและคำตอบทั้งหมดของเกมนี้จะถูกลบไปด้วย และไม่กระทบเกมอื่น`,
      showCancelButton: true,
      confirmButtonText: 'ลบเกม',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.apiService.deleteGame(game.game_id).subscribe({
        next: () => {
          this.games = this.games.filter((g) => g.game_id !== game.game_id);
          if (this.managingContentGame?.game_id === game.game_id) {
            this.managingContentGame = null;
          }
          Swal.fire({ icon: 'success', title: 'ลบเกมเรียบร้อยแล้ว', confirmButtonColor: '#0f766e', timer: 1500 });
        },
        error: () => {
          Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: 'เกิดข้อผิดพลาดในการลบเกม', confirmButtonColor: '#0f766e' });
        }
      });
    });
  }

  openContentManager(game: Game): void {
    if (game.game_type === 'custom-quiz') {
      this.managingContentGame = game;
      return;
    }
    // เกม builtin ทั้ง 21 เกมมีฟอร์มใน gameContentConfigs ครบทุกตัวอยู่แล้ว
    this.managingBuiltinGame = game;
  }

  closeContentManager(): void {
    this.managingContentGame = null;
  }

  closeBuiltinContentManager(): void {
    this.managingBuiltinGame = null;
  }

  get managingBuiltinConfig() {
    if (!this.managingBuiltinGame) return null;
    return this.gameContentConfigs.find((c) => c.key === this.managingBuiltinGame!.game_type) || null;
  }

  onQuestionCountChanged(gameId: number, count: number): void {
    this.games = this.games.map((g) => (g.game_id === gameId ? { ...g, question_count: count } : g));
  }

  // ── Game Content (เกม builtin ที่มีฟอร์มแก้ทีละ field) ──
  loadGameContents(): void {
    this.apiService.getGameContents().subscribe({
      next: (data: any) => {
        const saved = data && typeof data === 'object' ? data : {};
        this.gameContentItems = {};
        this.gameContentSavedFlag = {};
        this.gameContentConfigs.forEach((cfg) => {
          const savedItems = saved[cfg.key];
          this.gameContentSavedFlag[cfg.key] = Array.isArray(savedItems) && savedItems.length > 0;
          this.gameContentItems[cfg.key] = Array.isArray(savedItems) && savedItems.length > 0
            ? savedItems.map((item: any) => this.itemToEditable(cfg, item))
            : this.resolveDefaultItems(cfg).map((item: any) => this.itemToEditable(cfg, item));
        });
      },
      error: () => {
        this.gameContentItems = {};
        this.gameContentConfigs.forEach((cfg) => {
          this.gameContentItems[cfg.key] = this.resolveDefaultItems(cfg).map((item: any) => this.itemToEditable(cfg, item));
        });
      }
    });
  }

  // keywords: string[] (จาก DB) -> string คั่นด้วย , (ให้แก้ในช่องเดียวง่ายๆ)
  // correctAnswers ฯลฯ (type 'lines'): string[] (จาก DB) -> string คั่นด้วยขึ้นบรรทัดใหม่
  // (แยกจาก 'tags' เพราะค่าที่เก็บอาจมี comma อยู่ในตัวเอง เช่นประโยคเต็ม)
  private itemToEditable(cfg: { fields: { key: string; type: string }[] }, item: any): any {
    const editable = { ...item };
    cfg.fields.forEach((f) => {
      if (f.type === 'tags' && Array.isArray(editable[f.key])) {
        editable[f.key] = editable[f.key].join(', ');
      } else if (f.type === 'lines' && Array.isArray(editable[f.key])) {
        editable[f.key] = editable[f.key].join('\n');
      }
    });
    return editable;
  }

  // string คั่นด้วย , -> string[] (ก่อนส่งขึ้น backend)
  // string คั่นด้วยขึ้นบรรทัดใหม่ (type 'lines') -> string[]
  private itemToPayload(cfg: { fields: { key: string; type: string }[] }, item: any): any {
    const payload = { ...item };
    cfg.fields.forEach((f) => {
      if (f.type === 'tags') {
        payload[f.key] = String(payload[f.key] || '')
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (f.type === 'lines') {
        payload[f.key] = String(payload[f.key] || '')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (f.type === 'number') {
        payload[f.key] = Number(payload[f.key]) || 0;
      }
    });
    return payload;
  }

  addGameContentItem(gameKey: string): void {
    const cfg = this.gameContentConfigs.find((c) => c.key === gameKey);
    if (!cfg) return;
    this.gameContentItems[gameKey] = [...(this.gameContentItems[gameKey] || []), cfg.newItem()];
  }

  removeGameContentItem(gameKey: string, i: number): void {
    this.gameContentItems[gameKey]?.splice(i, 1);
  }

  onGameContentImageUpload(gameKey: string, i: number, fieldKey: string, event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'ชนิดไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้นค่ะ',
        confirmButtonColor: '#0f766e'
      });
      return;
    }

    this.apiService.uploadFile(file).subscribe({
      next: (res: any) => {
        if (res && res.url && this.gameContentItems[gameKey]?.[i]) {
          this.gameContentItems[gameKey][i][fieldKey] = res.url;
        }
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'อัปโหลดล้มเหลว',
          text: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }

  saveGameContentItems(gameKey: string): void {
    const cfg = this.gameContentConfigs.find((c) => c.key === gameKey);
    const items = this.gameContentItems[gameKey];
    if (!cfg || !items || items.length === 0) return;

    const payload = items
      .map((item) => this.itemToPayload(cfg, item))
      .filter((item) => Object.values(item).some((v) => (Array.isArray(v) ? v.length > 0 : String(v || '').trim())));

    if (payload.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'ยังไม่มีข้อมูล',
        text: 'กรุณากรอกเนื้อหาอย่างน้อย 1 รายการก่อนบันทึกค่ะ',
        confirmButtonColor: '#0f766e'
      });
      return;
    }

    this.gameContentSaving[gameKey] = true;
    this.apiService.saveGameContent(gameKey, payload).subscribe({
      next: () => {
        this.gameContentSaving[gameKey] = false;
        this.gameContentSavedFlag[gameKey] = true;
        Swal.fire({
          icon: 'success',
          title: 'บันทึกเนื้อหาเกมสำเร็จ',
          confirmButtonColor: '#0f766e',
          timer: 1500
        });
      },
      error: () => {
        this.gameContentSaving[gameKey] = false;
        Swal.fire({
          icon: 'error',
          title: 'บันทึกล้มเหลว',
          text: 'เกิดข้อผิดพลาดในการบันทึกเนื้อหาเกม',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }
}
