import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { LessonsDataService } from './lessons-data.service';
import { StudentSessionService } from './student-session.service';
import { GameFxService } from './game-fx.service';
import { ProgressService } from './progress.service';
import { LearningLogService } from './learning-log.service';
import { MistakesTrackerService } from './mistakes-tracker.service';
import { ApiService } from '../../services/api.service';
import {
  TYPO_FIX_DEFAULT_BANK,
  SCENARIO_DEFAULT_BANK,
  EMAIL_CAPSTONE_DEFAULT_BANK,
  PICTURE_WORD_DEFAULT_BANK,
  DIALOGUE_DEFAULT_BANK,
  POS_SORTER_DEFAULT_BANK,
  SYNONYM_WORD_MAP,
  SYNONYM_MATCH_DEFAULT_BANK,
  DRAG_WORD_DEFAULT_BANK,
  CONVERT_SENTENCE_DEFAULT_BANK,
  ENG_TO_THAI_DEFAULT_BANK,
} from '../../shared/game-default-content';

// Full per-game state + logic for all ~20 mini-games (Phase 4 of the
// migration plan), extracted verbatim from student.component.ts:
//  - vocab pool + icon/image maps (Phase 0, ~2331-2437, 5970-5997)
//  - round/bank state for every game (~2281-2325, 2439-2801)
//  - init/setup/check/next/finish methods for every game (~5798-5954,
//    6235-7773) — both the Games tab AND the Lessons roadmap's step overlay
//    (scramble/dialogue/picture-word/fill-blank) call these same methods,
//    so Lessons never needs to reach into the Games component directly.
//
// Cross-references retargeted from the original component during the move:
//  - this.units/.currentUser/.currentUnit -> lessonsData/session services
//  - this.triggerConfetti/triggerGameShake/playSoundEffect/awardGameXp/
//    shuffleArray/normalizeAnswer/iconColorClass/escapeRegExp/
//    normalizeSentence/extractKeywords/speakText -> gameFx service
//  - this.logActivity -> learningLog.log, this.loadProgressHistory ->
//    progress.loadProgressHistory, this.trackWrongItem -> mistakes.trackWrongItem
//  - this.currentStep/this.submitQuizResultToBackend (Lessons-only concepts)
//    replaced by a new `roadmapQuizType` flag: StudentLessonsComponent sets
//    it to 'pre_game'/'post_game' before calling init*Game() from the
//    roadmap, and clears it to null for standalone Games-tab play, so this
//    service never needs to know about Lessons' step enum.
//  - onWordSearchPointerUp lost its @HostListener (services can't have one)
//    — StudentGamesComponent re-declares a thin @HostListener wrapper that
//    calls this method.
//
// Pre-existing staleness bug (not introduced here, not fixed): the original
// called buildGameVocabPool() once, synchronously, in ngOnInit — before the
// async loadLessonsFromDb() resolved, so the pool could be built from stale
// fallback data. StudentShellComponent.ngOnInit still does the same thing.
@Injectable({ providedIn: 'root' })
export class GameEngineService {
  gameVocabPool: { word: string; meaning: string; image?: string; icon: string }[] = [];

  /** Set by StudentLessonsComponent when a roadmap "game-pre"/"game-post"
   *  step launches a game, so finish*Game() knows whether/how to submit a
   *  quiz result. Left null for standalone Games-tab play. */
  roadmapQuizType: 'pre_game' | 'post_game' | null = null;

  /** Teacher-edited content overrides (GET /game-contents, {game_key: items[]}) —
   *  loaded once per session (StudentShellComponent.ngOnInit) via loadCustomGameContent().
   *  Now checked by every one of the ~21 games (2026-08-12):
   *   - typo-fix, scenario, email-capstone, picture-word, sentence-reorder, open-reply,
   *     pos-sorter, synonym-match, convert-sentence, drag-word, eng-to-thai have a
   *     standalone static bank as their only source.
   *   - scramble, dialogue, picture-word, fill-blank ALSO have a per-lesson override
   *     from that lesson's own "Dedicated Game Creator Studio" which takes priority
   *     over this global one when the current lesson has set it (see
   *     initScrambleGame()/initDialogueGame()/initPictureWordGame()/initFillBlankGame()).
   *   - thai-recall, sprint, word-riddle, match-pair, dictation, save-mascot,
   *     word-search fall back to the shared cross-lesson vocabulary pool
   *     (gameVocabPool, built from every lesson's Vocabulary Manager) when left
   *     unset here. */
  customGameContent: { [gameKey: string]: any[] } = {};

  constructor(
    private lessonsData: LessonsDataService,
    private session: StudentSessionService,
    private gameFx: GameFxService,
    private progress: ProgressService,
    private learningLog: LearningLogService,
    private mistakes: MistakesTrackerService,
    private apiService: ApiService,
  ) {}

  // โหลดชุดกลาง (game_contents) ก่อนเหมือนเดิม แล้วถ้านักศึกษามีปีที่รู้จัก (session.
  // activeYearLevel) เอาชุดเฉพาะปีนั้น (game_contents_by_year) มาทับอีกที — เกมไหนยังไม่ได้
  // ตั้งค่าเฉพาะปีนี้ก็ยังใช้ชุดกลางไปก่อน (ไม่มีวันเจอเกมว่างเปล่า) เกมทั้ง ~21 แบบด้านล่างนี้
  // ไม่ต้องรู้เรื่องปีเลย เพราะทุกตัวอ่านจาก customGameContent[key] เหมือนเดิมทุกประการ
  loadCustomGameContent(): void {
    this.apiService.getGameContents().subscribe({
      next: (globalData: any) => {
        const merged = globalData && typeof globalData === 'object' ? { ...globalData } : {};
        const year = this.session.activeYearLevel;
        if (!year) {
          this.customGameContent = merged;
          return;
        }
        this.apiService.getGameContentsForYear(year).subscribe({
          next: (yearData: any) => {
            if (yearData && typeof yearData === 'object') {
              Object.assign(merged, yearData);
            }
            this.customGameContent = merged;
          },
          error: () => {
            this.customGameContent = merged;
          }
        });
      },
      error: () => {
        this.customGameContent = {};
      }
    });
  }

  /** original student.component.ts:5660-5670 ("Games Tab" quick-play shortcut,
   *  called only from the Games tab's own scramble/dialogue buttons). */
  startGameFromTab(type: 'scramble' | 'dialogue'): void {
    const unit = this.lessonsData.units.find((u) => u.id === +this.selectedGameUnitId) || this.lessonsData.units[0];
    this.lessonsData.currentUnit = unit;
    if (type === 'scramble') {
      this.activeGameType = 'scramble';
      this.initScrambleGame();
    } else if (type === 'dialogue') {
      this.activeGameType = 'dialogue';
      this.initDialogueGame();
    }
  }

  /** original student.component.ts:3299-3307 — reads selectedGameUnitId as a
   *  fallback when the Games tab menu checks whether a game is allowed for
   *  the currently-selected unit; Lessons' roadmap always passes unitId
   *  explicitly instead of relying on the fallback. */
  isGameAllowed(gameType: string, unitId?: number): boolean {
    const targetUnitId = unitId !== undefined ? +unitId : +this.selectedGameUnitId;
    const unit = this.lessonsData.units.find((u) => u.id === targetUnitId);
    if (!unit) return true;
    if (unit.allowedGames && Array.isArray(unit.allowedGames)) {
      return unit.allowedGames.includes(gameType);
    }
    return true;
  }

  // ── Interactive Word Scramble Game (Clickable letters concept) ──
  scrambleIndex = 0;
  scrambleCompleted = false;
  scrambleScores: boolean[] = [];
  clickableLetters: { char: string; used: boolean; originalIndex: number }[] = [];
  scrambleUserWordList: { char: string; originalIndex: number }[] = [];
  // สุ่มว่ารอบนี้จะหยิบคำไหนบ้างจาก scrambleWordsActive และเรียงลำดับใหม่ทุกครั้ง
  // เพื่อให้แต่ละคน/แต่ละรอบเล่นได้ไม่เหมือนกัน (ไม่ตายตัวว่าต้องเจอคำที่ 1-2-3-4 เรียงกันเสมอ)
  scrambleRoundIndices: number[] = [];
  // คลังคำที่ใช้เล่นรอบนี้จริง — คำนวณครั้งเดียวใน initScrambleGame() แล้ว
  // setupCurrentScramble()/checkScrambleAnswer() อ่านจากตรงนี้เท่านั้น ไม่แตะ
  // lessonsData.currentUnit.scrambleWords ตรงๆ อีกต่อไป เพราะตอนนี้มีคลังสำรอง
  // ทั่วระบบ (customGameContent['scramble']) ให้ใช้เมื่อหน่วยเรียนไม่ได้กำหนดไว้
  scrambleWordsActive: string[] = [];
  // เมื่อไม่ null แสดงว่ากำลังเล่นเกม (Picture-Word/Fill-blank) จากขั้นตอนบทเรียนของหน่วยนี้อยู่
  // ใช้ตอนบันทึกคะแนนแยกตามหน่วย และอัปเดตเครื่องหมายสำเร็จในแผนที่การเรียน
  roadmapGameUnitId: number | null = null;

  // ── Post-Lesson Game: Unscramble Dialogue State ──
  scrambledDialogueLines: { id: number; text: string; currentOrder: number }[] = [];
  // บทสนทนาที่ใช้เล่นรอบนี้จริง (ต้นฉบับที่ยังไม่สุ่มลำดับ) — ใช้เทียบคำตอบใน
  // checkDialogueOrder() แทนการอ่าน lessonsData.currentUnit.unscrambleDialogue
  // ตรงๆ ด้วยเหตุผลเดียวกับ scrambleWordsActive ด้านบน
  dialogueActive: { id: number; text: string; order: number }[] = [];
  dialogueSuccessMessage = '';
  dialogueFinished = false;

  // ── Game Center State ──
  selectedGameUnitId = 1;
  activeGameType:
    | 'vocabulary'
    | 'scramble'
    | 'dialogue'
    | 'picture-word'
    | 'thai-recall'
    | 'fill-blank'
    | 'sprint'
    | 'typo-fix'
    | 'word-riddle'
    | 'sentence-reorder'
    | 'open-reply'
    | 'scenario'
    | 'email-capstone'
    | 'match-pair'
    | 'dictation'
    | 'pos-sorter'
    | 'synonym-match'
    | 'save-mascot'
    | 'word-search'
    | 'drag-word'
    | 'convert-sentence'
    | 'eng-to-thai'
    | null = null;


  // ── Game: Picture → Type the Word (Rebus Word Combinations) ──
  // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) ให้
  // TeacherGameCoversComponent ใช้พรีฟิลฟอร์ม "จัดการเนื้อหา" ได้ด้วย — ค่าเดิมทุกตัว
  pw_rebusPool = PICTURE_WORD_DEFAULT_BANK;
  pw_pool: { word: string; meaning: string; emoji1?: string; emoji2?: string; clue?: string; unitId?: number; image?: string; icon?: string }[] = [];
  pw_index = 0;
  pw_roundSize = 10;
  pw_input = '';
  pw_wrongAttempts = 0;
  pw_feedback: 'correct' | 'wrong' | '' = '';
  pw_imgError = false;
  pw_score = 0;
  pw_finished = false;

  // ── Game: Thai → English Typing Recall (wrong once = wrong for good) ──
  tr_pool: { word: string; meaning: string; image?: string }[] = [];
  tr_index = 0;
  tr_roundSize = 10;
  tr_input = '';
  tr_feedback: 'correct' | 'wrong' | '' = '';
  tr_score = 0;
  tr_finished = false;

  // ── Game: Fill in the Blank (real dialogue lines from all units) ──
  fb_pool: { blanked: string; answer: string; full: string }[] = [];
  fb_index = 0;
  fb_roundSize = 8;
  fb_input = '';
  fb_feedback: 'correct' | 'wrong' | '' = '';
  fb_score = 0;
  fb_finished = false;

  // ── Game: Vocabulary Typing Sprint (timed) ──
  sprint_queue: { word: string; meaning: string }[] = [];
  sprint_index = 0;
  sprint_input = '';
  sprint_timeLeft = 45;
  sprint_timerInterval: any = null;
  sprint_score = 0;
  sprint_combo = 0;
  sprint_bestCombo = 0;
  sprint_lastResult: 'correct' | 'wrong' | '' = '';
  sprint_finished = false;

  // ── Game: Spot & Fix the Typo ──
  // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) — ค่าเดิมทุกตัว
  typoFixBank: { wrong: string; correct: string }[] = TYPO_FIX_DEFAULT_BANK;
  tf_pool: { wrong: string; correct: string }[] = [];
  tf_index = 0;
  tf_roundSize = 8;
  tf_input = '';
  tf_feedback: 'correct' | 'wrong' | '' = '';
  tf_score = 0;
  tf_finished = false;

  // ── Game: Word Riddle (progressive letter reveal) ──
  wr_pool: { word: string; meaning: string }[] = [];
  wr_index = 0;
  wr_roundSize = 8;
  wr_input = '';
  wr_wrongAttempts = 0;
  wr_maxAttempts = 4;
  wr_feedback: 'correct' | 'wrong' | 'revealed' | '' = '';
  wr_score = 0;
  wr_finished = false;

  // ── Game: Scrambled Sentence → Typed Reorder ──
  ss_pool: string[] = [];
  ss_index = 0;
  ss_roundSize = 8;
  ss_wordBank: string[] = [];
  ss_input = '';
  ss_feedback: 'correct' | 'wrong' | '' = '';
  ss_score = 0;
  ss_finished = false;

  // ── Game: Open Dialogue Reply ──
  odr_pool: { context: string; label: string; sampleAnswer: string; keywords: string[] }[] = [];
  odr_index = 0;
  odr_roundSize = 6;
  odr_input = '';
  odr_submitted = false;
  odr_matchedKeywords: string[] = [];
  odr_score = 0;
  odr_finished = false;

  // ── Game: Scenario Sentence Construction ──
  // โจทย์สถานการณ์เป็นคำถามภาษาอังกฤษ (เหมือนสถานการณ์จริงที่ต้องอ่าน/ฟังแล้วตอบเป็นอังกฤษทันที)
  // ส่วน situationTh เป็นแค่คำแปลกำกับเล็กๆ ไว้ช่วยทำความเข้าใจ ไม่ใช่ตัวโจทย์หลัก
  // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) — ค่าเดิมทุกตัว
  scenarioBank: { situationEn: string; situationTh: string; keywords: string[]; sampleAnswer: string }[] = SCENARIO_DEFAULT_BANK;
  scn_pool: { situationEn: string; situationTh: string; keywords: string[]; sampleAnswer: string }[] = [];
  scn_index = 0;
  scn_roundSize = 6;
  scn_input = '';
  scn_submitted = false;
  scn_matchedKeywords: string[] = [];
  scn_score = 0;
  scn_finished = false;

  // ── Game: Email Reply Capstone ──
  // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) — ค่าเดิมทุกตัว
  emailBank: { subject: string; body: string; keywords: string[]; minWords: number; sampleAnswer: string }[] = EMAIL_CAPSTONE_DEFAULT_BANK;
  em_pool: { subject: string; body: string; keywords: string[]; minWords: number; sampleAnswer: string }[] = [];
  em_index = 0;
  em_roundSize = 5;
  em_input = '';
  em_submitted = false;
  em_matchedKeywords: string[] = [];
  em_wordCountOk = false;
  em_score = 0;
  em_finished = false;

  // ── Game 1: Memory Card Match ──
  mm_cards: { id: number; text: string; type: 'en' | 'th'; matchId: string; isFlipped: boolean; isMatched: boolean }[] = [];
  mm_selectedCards: number[] = [];
  mm_score = 0;
  mm_finished = false;
  mm_round = 1;
  mm_maxRounds = 3;

  // ── Game 2: Dictation Master ──
  dc_pool: { word: string; meaning: string }[] = [];
  dc_index = 0;
  dc_input = '';
  dc_score = 0;
  dc_showFeedback = false;
  dc_isCorrect = false;
  dc_finished = false;

  // ── Game 3: POS Sorter ──
  pos_pool: { word: string; pos: string; meaning: string }[] = [];
  pos_index = 0;
  pos_score = 0;
  pos_showFeedback = false;
  pos_selected = '';
  pos_finished = false;

  // ── Game 4: Synonym Matcher ──
  sm_pool: { word: string; synonym: string; options: string[] }[] = [];
  sm_index = 0;
  sm_score = 0;
  sm_selectedOption = '';
  sm_showFeedback = false;
  sm_finished = false;

  // ── Game 5: Save the Mascot ──
  hm_roundWords: { word: string; meaning: string }[] = [];
  hm_wordObj: { word: string; meaning: string } | null = null;
  hm_wordLetters: string[] = [];
  hm_guessedLetters: Set<string> = new Set();
  hm_lives = 5;
  hm_score = 0;
  hm_index = 0;
  hm_finished = false;
  hm_keyboard: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // ── Game 6: Word Search (Drag to Find) ──
  readonly ws_gridSize = 12;
  ws_grid: string[][] = [];
  ws_words: { word: string; meaning: string; found: boolean; colorIndex: number }[] = [];
  ws_selectedCells: { row: number; col: number }[] = [];
  private ws_wordCellMap: { [key: string]: { word: string; colorIndex: number } } = {};
  private ws_isDragging = false;
  private ws_startCell: { row: number; col: number } | null = null;
  ws_score = 0;
  ws_finished = false;
  ws_invalidFlash = false;
  private readonly ws_colorCount = 6;

  // ── Game 7: Drag & Drop Word Builder (เกมลากคำ) ──
  dw_questions: {
    id: number;
    thaiHint: string;
    sentenceTemplate: string;
    slots: { placeholder: string; targetWord: string; currentWord: string | null }[];
    wordBank: string[];
    explanation: string;
  }[] = [];
  dw_index = 0;
  dw_score = 0;
  dw_draggedWord: string | null = null;
  dw_showFeedback = false;
  dw_isCorrect = false;
  dw_finished = false;

  // ── Game 8: Sentence Converter (เกมคอนเวิด - แปลงรูปประโยค) ──
  cs_questions: {
    id: number;
    instruction: string;
    originalSentence: string;
    hint: string;
    correctAnswers: string[];
    explanation: string;
  }[] = [];
  cs_index = 0;
  cs_score = 0;
  cs_input = '';
  cs_showHint = false;
  cs_showFeedback = false;
  cs_isCorrect = false;
  cs_finished = false;

  // ── Game 9: English to Thai Translation (เกมแปลอังกฤษ พิมพ์ไทย) ──
  et_questions: {
    id: number;
    englishSentence: string;
    thaiHint: string;
    primaryThai: string;
    keyKeywords: string[];
    explanation: string;
  }[] = [];
  et_index = 0;
  et_score = 0;
  et_input = '';
  et_showHint = false;
  et_showFeedback = false;
  et_isCorrect = false;
  et_finished = false;

  private readonly vocabIconMap: { [word: string]: string } = {
    welcoming: 'smile',
    icebreaker: 'lightbulb',
    'face-to-face': 'person',
    'course overview': 'compass',
    'receptions duties': 'list',
    receptionist: 'person',
    appointment: 'calendar',
    'service-mind': 'smile',
    expectation: 'compass',
    schedule: 'calendar',
    concise: 'chat',
    etiquette: 'smile',
    transferring: 'link',
    unavailable: 'clock',
    verify: 'check',
    professionalism: 'briefcase',
    multitasking: 'briefcase',
    extension: 'phone',
    reachable: 'phone',
    assist: 'person',
    'visual aids': 'monitor',
    takeaway: 'document',
    outline: 'list',
    transition: 'link',
    'q&a session': 'question',
    hook: 'mic',
    interactive: 'chat',
    articulation: 'mic',
    adaptability: 'puzzle',
    storytelling: 'mic',
    agenda: 'list',
    minutes: 'document',
    stakeholders: 'person',
    brainstorming: 'lightbulb',
    chairperson: 'person',
    'action item': 'list',
    'decision-making': 'chart',
    negotiation: 'check',
    curriculum: 'book',
    'common ground': 'check',
    'break down': 'list',
    'peer feedback': 'chat',
    'sequence words': 'list',
    consensus: 'check',
    excel: 'award',
    straightforward: 'compass',
    comprehension: 'book',
    worksheet: 'document',
    collaboration: 'person',
    enthusiasm: 'smile',
  };

  // Maps each vocabulary word to a free flat-illustration file (unDraw,
  // no attribution required) stored under src/assets/vocab-images/.
  private readonly vocabImageMap: { [word: string]: string } = {
    welcoming: 'welcoming',
    icebreaker: 'icebreaker',
    'face-to-face': 'face-to-face',
    'course overview': 'course-overview',
    'receptions duties': 'receptions-duties',
    receptionist: 'receptionist',
    appointment: 'appointment',
    'service-mind': 'service-mind',
    expectation: 'expectation',
    schedule: 'schedule',
    concise: 'concise',
    etiquette: 'etiquette',
    transferring: 'transferring',
    unavailable: 'unavailable',
    verify: 'verify',
    professionalism: 'professionalism',
    multitasking: 'multitasking',
    extension: 'extension',
    reachable: 'reachable',
    assist: 'assist',
    'visual aids': 'visual-aids',
    takeaway: 'takeaway',
    outline: 'outline',
    transition: 'transition',
    'q&a session': 'qa-session',
    hook: 'hook',
    interactive: 'interactive',
    articulation: 'articulation',
    adaptability: 'adaptability',
    storytelling: 'storytelling',
    agenda: 'agenda',
    minutes: 'minutes',
    stakeholders: 'stakeholders',
    brainstorming: 'brainstorming',
    chairperson: 'chairperson',
    'action item': 'action-item',
    'decision-making': 'decision-making',
    negotiation: 'negotiation',
    curriculum: 'curriculum',
    'common ground': 'common-ground',
    'break down': 'break-down',
    'peer feedback': 'peer-feedback',
    'sequence words': 'sequence-words',
    consensus: 'consensus',
    excel: 'excel',
    straightforward: 'straightforward',
    comprehension: 'comprehension',
    worksheet: 'worksheet',
    collaboration: 'collaboration',
    enthusiasm: 'enthusiasm',
  };

  private resolveVocabIcon(word: string): string {
    return this.vocabIconMap[word.toLowerCase()] || 'compass';
  }

  private resolveVocabImage(word: string): string | undefined {
    const slug = this.vocabImageMap[word.toLowerCase()];
    return slug ? `/assets/vocab-images/${slug}.svg` : undefined;
  }

  buildGameVocabPool(): void {
    const seen = new Set<string>();
    const pool: { word: string; meaning: string; image?: string; icon: string }[] = [];
    this.lessonsData.units.forEach((u) => {
      u.vocabularies.forEach((v) => {
        const key = v.word.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          pool.push({
            word: v.word,
            meaning: v.meaning,
            image: v.image || this.resolveVocabImage(v.word),
            icon: this.resolveVocabIcon(v.word),
          });
        }
      });
    });
    this.gameVocabPool = pool;
  }

  initScrambleGame(): void {
    this.scrambleIndex = 0;
    this.scrambleCompleted = false;
    this.scrambleScores = [];

    // ลำดับความสำคัญของคลังคำ: คำศัพท์เฉพาะหน่วยเรียนนี้ (Game Creator Studio) >
    // เนื้อหาที่แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม)
    const unitWords = this.lessonsData.currentUnit.scrambleWords;
    const customWords = (this.customGameContent['scramble'] || [])
      .map((w: any) => String(w?.word || '').trim())
      .filter((w: string) => w.length > 0);
    this.scrambleWordsActive = unitWords && unitWords.length > 0 ? unitWords : customWords;

    // สุ่มหยิบคำบางส่วน (ไม่ใช่ทั้งหมดเสมอไป) แล้วสุ่มลำดับใหม่ทุกครั้งที่เริ่มเกม
    const totalWords = this.scrambleWordsActive.length;
    const minCount = Math.min(2, totalWords);
    const roundCount =
      totalWords > minCount
        ? minCount + Math.floor(Math.random() * (totalWords - minCount + 1))
        : totalWords;
    this.scrambleRoundIndices = this.gameFx.shuffleArray(
      this.scrambleWordsActive.map((_, i) => i),
    ).slice(0, roundCount);

    this.setupCurrentScramble();
  }

  setupCurrentScramble(): void {
    const original = this.scrambleWordsActive[this.scrambleRoundIndices[this.scrambleIndex]];
    let arr = original.split('');
    let attempts = 0;
    while (attempts < 10) {
      arr.sort(() => Math.random() - 0.5);
      if (arr.join('') !== original) break;
      attempts++;
    }

    // สร้างคีย์แคปปุ่มกด
    this.clickableLetters = arr.map((char, index) => ({
      char: char.toUpperCase(),
      used: false,
      originalIndex: index,
    }));
    this.scrambleUserWordList = [];
  }

  selectLetter(letter: (typeof this.clickableLetters)[0]): void {
    if (letter.used) return;
    letter.used = true;
    this.scrambleUserWordList.push({ char: letter.char, originalIndex: letter.originalIndex });
  }

  deselectLetter(selected: (typeof this.scrambleUserWordList)[0], userWordIdx: number): void {
    this.scrambleUserWordList.splice(userWordIdx, 1);
    const origin = this.clickableLetters.find((l) => l.originalIndex === selected.originalIndex);
    if (origin) {
      origin.used = false;
    }
  }

  clearScrambleWord(): void {
    this.scrambleUserWordList = [];
    this.clickableLetters.forEach((l) => (l.used = false));
  }

  checkScrambleAnswer(): void {
    const original = this.scrambleWordsActive[this.scrambleRoundIndices[this.scrambleIndex]];
    const userWord = this.scrambleUserWordList.map((item) => item.char).join('');

    const isCorrect = userWord.toUpperCase() === original.toUpperCase();
    this.scrambleScores.push(isCorrect);

    if (!isCorrect) {
      this.gameFx.triggerGameShake();
      this.mistakes.trackWrongItem('word', original, original, 'Word Scramble');
    } else {
      this.gameFx.playSoundEffect('success');
    }

    const nextStep = () => {
      if (this.scrambleIndex < this.scrambleRoundIndices.length - 1) {
        this.scrambleIndex++;
        this.setupCurrentScramble();
      } else {
        this.scrambleCompleted = true;
        const score = Math.round(
          (this.scrambleScores.filter((s) => s).length / this.scrambleScores.length) * 100,
        );
        localStorage.setItem(
          `game_scramble_${this.session.currentUser.id}_unit${this.lessonsData.currentUnit.id}`,
          score.toString(),
        );

        this.gameFx.awardGameXp(15, `Word Scramble Game Unit ${this.lessonsData.currentUnit.id}`, score, this.roadmapQuizType || 'post_game');
        this.progress.loadProgressHistory();
      }
    };

    if (!isCorrect) {
      setTimeout(() => nextStep(), 800);
    } else {
      nextStep();
    }
  }

  initDialogueGame(): void {
    this.dialogueSuccessMessage = '';
    this.dialogueFinished = false;
    // ลำดับความสำคัญ: บทสนทนาเฉพาะหน่วยเรียนนี้ (Game Creator Studio) > เนื้อหาที่
    // แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) > ค่าเริ่มต้นในโค้ด
    const unitDialogue = this.lessonsData.currentUnit?.unscrambleDialogue;
    const customDialogue = (this.customGameContent['dialogue'] || [])
      .map((item: any, index: number) => ({ id: index + 1, text: String(item?.text || '').trim(), order: index }))
      .filter((line) => line.text.length > 0);
    const defaultDialogue = DIALOGUE_DEFAULT_BANK.map((d, index) => ({ id: index + 1, text: d.text, order: index }));
    const rawDialogue = unitDialogue && unitDialogue.length > 0
      ? unitDialogue
      : customDialogue.length > 0
        ? customDialogue
        : defaultDialogue;
    this.dialogueActive = rawDialogue;
    this.scrambledDialogueLines = rawDialogue
      .map((line, index) => {
        return { id: line.id, text: line.text, currentOrder: index };
      })
      .sort(() => Math.random() - 0.5);
  }

  moveLine(index: number, direction: 'up' | 'down'): void {
    if (this.dialogueFinished) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.scrambledDialogueLines.length) return;

    const temp = this.scrambledDialogueLines[index];
    this.scrambledDialogueLines[index] = this.scrambledDialogueLines[targetIndex];
    this.scrambledDialogueLines[targetIndex] = temp;
  }

  checkDialogueOrder(): void {
    let allCorrect = true;
    const correctDialogue = this.dialogueActive;
    this.scrambledDialogueLines.forEach((line, idx) => {
      const originalLine = correctDialogue.find((c) => c.text === line.text);
      if (originalLine && originalLine.order !== idx) {
        allCorrect = false;
      }
    });

    if (allCorrect) {
      this.dialogueSuccessMessage = '🎉 ยินดีด้วยค่ะ! คุณเรียงลำดับบทสนทนาได้ถูกต้องสมบูรณ์แล้ว';
      this.dialogueFinished = true;
      this.gameFx.triggerConfetti();
      localStorage.setItem(
        `game_dialogue_${this.session.currentUser.id}_unit${this.lessonsData.currentUnit.id}`,
        '100',
      );
      this.learningLog.log({ type: 'Game', title: `Dialogue Sequencer Game Unit ${this.lessonsData.currentUnit.id}`, score: 100, xp: 0 });
      this.progress.submitQuizResultToBackend(this.roadmapQuizType || 'post_game', 100);
      this.progress.loadProgressHistory();
    } else {
      this.gameFx.triggerGameShake();
      Swal.fire({
        icon: 'error',
        title: 'คำตอบยังไม่ถูกต้อง',
        text: 'ลำดับบทสนทนายังไม่ถูกต้อง ลองทบทวนและเรียงใหม่อีกครั้งนะคะ',
        confirmButtonColor: '#6B21A8'
      });
    }
  }


  initPictureWordGame(unitId?: number): void {
    this.activeGameType = 'picture-word';
    this.roadmapGameUnitId = unitId ?? null;

    // ลำดับความสำคัญของแหล่งโจทย์: เนื้อหาที่อาจารย์ตั้งเฉพาะบทเรียนนี้ (Game Creator
    // Studio) > เนื้อหาที่แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) > bank เริ่มต้นในโค้ด
    const unit = unitId ? this.lessonsData.units.find((u) => u.id === +unitId) : undefined;
    const lessonPictureWords = unit?.pictureWords;

    let candidatePool: typeof this.pw_pool;
    if (lessonPictureWords && lessonPictureWords.length > 0) {
      candidatePool = this.gameFx.shuffleArray(
        lessonPictureWords.map((p) => ({ word: p.word, meaning: p.meaning, clue: p.clue, image: p.image })),
      );
    } else {
      const basePool = this.customGameContent['picture-word']?.length
        ? this.customGameContent['picture-word']
        : this.pw_rebusPool;

      if (unitId) {
        const unitSpecific = basePool.filter((w) => w.unitId === +unitId);
        const remaining = basePool.filter((w) => w.unitId !== +unitId);
        candidatePool = [
          ...this.gameFx.shuffleArray(unitSpecific),
          ...this.gameFx.shuffleArray(remaining),
        ];
      } else {
        candidatePool = this.gameFx.shuffleArray([...basePool]);
      }
    }

    this.pw_pool = candidatePool.slice(0, this.pw_roundSize);
    this.pw_index = 0;
    this.pw_score = 0;
    this.pw_finished = false;
    this.setupPictureWordRound();
  }

  setupPictureWordRound(): void {
    this.pw_input = '';
    this.pw_wrongAttempts = 0;
    this.pw_feedback = '';
    this.pw_imgError = false;
  }

  get pwCurrentWord(): { word: string; meaning: string; emoji1?: string; emoji2?: string; clue?: string; image?: string; icon?: string } | null {
    return this.pw_pool[this.pw_index] || null;
  }

  get pwHintText(): string {
    const word = this.pwCurrentWord;
    if (!word) return '';
    if (this.pw_wrongAttempts >= 2) return `คำใบ้ภาษาไทย: ${word.emoji1} + ${word.emoji2} แปลว่า "${word.meaning}"`;
    if (this.pw_wrongAttempts === 1) return `ขึ้นต้นด้วยตัว "${word.word.charAt(0).toUpperCase()}" (คำนี้มี ${word.word.length} ตัวอักษร)`;
    return '';
  }

  onPwImageError(): void {
    this.pw_imgError = true;
  }

  checkPictureWordAnswer(): void {
    const word = this.pwCurrentWord;
    if (!word || this.pw_feedback === 'correct' || !this.pw_input.trim()) return;

    const isCorrect = this.gameFx.normalizeAnswer(this.pw_input) === this.gameFx.normalizeAnswer(word.word);
    if (isCorrect) {
      this.pw_feedback = 'correct';
      this.pw_score++;
      setTimeout(() => this.nextPictureWordRound(), 700);
    } else {
      this.pw_wrongAttempts++;
      this.pw_feedback = 'wrong';
      this.mistakes.trackWrongItem('word', word.word, word.meaning, 'Picture → Word');
    }
  }

  skipPictureWord(): void {
    this.nextPictureWordRound();
  }

  nextPictureWordRound(): void {
    if (this.pw_index < this.pw_pool.length - 1) {
      this.pw_index++;
      this.setupPictureWordRound();
    } else {
      this.finishPictureWordGame();
    }
  }

  finishPictureWordGame(): void {
    this.pw_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.pw_score / this.pw_pool.length) * 100);
      const key = this.roadmapGameUnitId
        ? `game_pictureword_${this.session.currentUser.id}_unit${this.roadmapGameUnitId}`
        : `game_pictureword_${this.session.currentUser.id}`;
      localStorage.setItem(key, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'Picture → Word Game', Math.round((this.pw_score / this.pw_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Thai → English Typing Recall ──
  initTypingRecallGame(): void {
    this.activeGameType = 'thai-recall';
    const bank = this.customGameContent['thai-recall']?.length ? this.customGameContent['thai-recall'] : this.gameVocabPool;
    this.tr_pool = this.gameFx.shuffleArray(bank).slice(0, this.tr_roundSize);
    this.tr_index = 0;
    this.tr_score = 0;
    this.tr_finished = false;
    this.setupTypingRecallRound();
  }

  setupTypingRecallRound(): void {
    this.tr_input = '';
    this.tr_feedback = '';
  }

  get trCurrentWord(): { word: string; meaning: string; image?: string } | null {
    return this.tr_pool[this.tr_index] || null;
  }

  submitTypingRecallAnswer(): void {
    const word = this.trCurrentWord;
    if (!word || this.tr_feedback !== '' || !this.tr_input.trim()) return;

    const isCorrect = this.gameFx.normalizeAnswer(this.tr_input) === this.gameFx.normalizeAnswer(word.word);
    this.tr_feedback = isCorrect ? 'correct' : 'wrong';
    if (isCorrect) {
      this.tr_score++;
      this.gameFx.playSoundEffect('success');
    } else {
      this.gameFx.triggerGameShake();
      this.mistakes.trackWrongItem('word', word.word, word.meaning, 'Thai → English Typing Recall');
    }
    setTimeout(() => this.nextTypingRecallRound(), 900);
  }

  nextTypingRecallRound(): void {
    if (this.tr_index < this.tr_pool.length - 1) {
      this.tr_index++;
      this.setupTypingRecallRound();
    } else {
      this.finishTypingRecallGame();
    }
  }

  finishTypingRecallGame(): void {
    this.tr_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.tr_score / this.tr_pool.length) * 100);
      localStorage.setItem(`game_typingrecall_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'Thai → English Typing Recall', Math.round((this.tr_score / this.tr_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── More Shared Game Helpers ──

  private buildDialogueSentencePool(unitId?: number): string[] {
    const sentences = new Set<string>();
    const targetUnits = unitId ? this.lessonsData.units.filter((u) => u.id === unitId) : this.lessonsData.units;
    targetUnits.forEach((u) => {
      u.dialogues.forEach((d) => {
        [d.text1, d.text2].forEach((t) => {
          const wordCount = (t.match(/[A-Za-z']+/g) || []).length;
          if (t && wordCount >= 5 && wordCount <= 14) {
            sentences.add(t.trim());
          }
        });
      });
    });
    return Array.from(sentences);
  }

  private buildFillBlankPool(unitId?: number): { blanked: string; answer: string; full: string }[] {
    const pool: { blanked: string; answer: string; full: string }[] = [];
    this.buildDialogueSentencePool(unitId).forEach((sentence) => {
      const words = sentence.match(/[A-Za-z']+/g) || [];
      if (words.length === 0) return;
      const answer = words.reduce((a, b) => (b.length > a.length ? b : a));
      if (answer.length < 4) return;
      const blanked = sentence.replace(new RegExp(`\\b${this.gameFx.escapeRegExp(answer)}\\b`), '_____');
      if (blanked === sentence) return;
      pool.push({ blanked, answer, full: sentence });
    });
    // หน่วยเรียนบางหน่วยอาจมีประโยคที่ตัดคำได้ไม่พอสำหรับเล่นเป็นรอบ ให้ใช้ทุกหน่วยแทนกันเกมว่างเปล่า
    if (unitId && pool.length < 3) {
      return this.buildFillBlankPool();
    }
    return pool;
  }

  // แปลงรายการที่อาจารย์กรอกไว้ในหน้า "ปกเกม" > เนื้อหาเกม ({fullSentence, answer}) ให้เป็น
  // รูปแบบเดียวกับที่ buildFillBlankPool() สร้างเอง ({blanked, answer, full}) — คืน null
  // ถ้าข้อมูลไม่ครบหรือหาคำตอบในประโยคไม่เจอ (เว้นวรรคไม่ได้)
  private buildFillBlankItemFromCustom(item: any): { blanked: string; answer: string; full: string } | null {
    const full = String(item?.fullSentence || '').trim();
    const answer = String(item?.answer || '').trim();
    if (!full || !answer) return null;
    const blanked = full.replace(new RegExp(`\\b${this.gameFx.escapeRegExp(answer)}\\b`, 'i'), '_____');
    if (blanked === full) return null;
    return { blanked, answer, full };
  }

  private buildOpenReplyPool(): {
    context: string;
    label: string;
    sampleAnswer: string;
    keywords: string[];
  }[] {
    const pool: { context: string; label: string; sampleAnswer: string; keywords: string[] }[] =
      [];
    this.lessonsData.units.forEach((u) => {
      u.fullQuiz?.partC?.forEach((item) => {
        item.subQuestions.forEach((sq) => {
          const keywords = this.gameFx.extractKeywords(sq.sampleAnswer, 4);
          if (keywords.length >= 2) {
            pool.push({
              context: item.contextText,
              label: sq.label,
              sampleAnswer: sq.sampleAnswer,
              keywords,
            });
          }
        });
      });
    });
    return pool;
  }

  // ── Game: Fill in the Blank (real dialogue lines) ──
  // unitId ให้ไว้เมื่อเล่นจากขั้นตอนบทเรียน (roadmap) เพื่อจำกัดประโยคเฉพาะหน่วยนั้น
  initFillBlankGame(unitId?: number): void {
    this.activeGameType = 'fill-blank';
    this.roadmapGameUnitId = unitId ?? null;

    // ลำดับความสำคัญ: เนื้อหาที่อาจารย์ตั้งเฉพาะบทเรียนนี้ (Game Creator Studio) >
    // เนื้อหาที่แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) > ประโยคที่ดึงอัตโนมัติจาก
    // บทสนทนาของบทเรียน
    const unit = unitId ? this.lessonsData.units.find((u) => u.id === +unitId) : undefined;
    const lessonFillBlanks = unit?.fillBlankItems;
    const customFillBlanks = (this.customGameContent['fill-blank'] || [])
      .map((item: any) => this.buildFillBlankItemFromCustom(item))
      .filter((item): item is { blanked: string; answer: string; full: string } => !!item);

    const pool = lessonFillBlanks && lessonFillBlanks.length > 0
      ? lessonFillBlanks
      : customFillBlanks.length > 0
        ? customFillBlanks
        : this.buildFillBlankPool(unitId);
    this.fb_pool = this.gameFx.shuffleArray(pool).slice(0, this.fb_roundSize);
    this.fb_index = 0;
    this.fb_score = 0;
    this.fb_finished = false;
    this.setupFillBlankRound();
  }

  setupFillBlankRound(): void {
    this.fb_input = '';
    this.fb_feedback = '';
  }

  get fbCurrentItem(): { blanked: string; answer: string; full: string } | null {
    return this.fb_pool[this.fb_index] || null;
  }

  checkFillBlankAnswer(): void {
    const item = this.fbCurrentItem;
    if (!item || this.fb_feedback !== '' || !this.fb_input.trim()) return;
    const correct = this.gameFx.normalizeAnswer(this.fb_input) === this.gameFx.normalizeAnswer(item.answer);
    this.fb_feedback = correct ? 'correct' : 'wrong';
    if (correct) {
      this.fb_score++;
    } else {
      this.mistakes.trackWrongItem('sentence', item.answer, item.full, 'Fill in the Blank');
    }
    setTimeout(() => this.nextFillBlankRound(), 1000);
  }

  nextFillBlankRound(): void {
    if (this.fb_index < this.fb_pool.length - 1) {
      this.fb_index++;
      this.setupFillBlankRound();
    } else {
      this.finishFillBlankGame();
    }
  }

  finishFillBlankGame(): void {
    this.fb_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.fb_score / this.fb_pool.length) * 100);
      const key = this.roadmapGameUnitId
        ? `game_fillblank_${this.session.currentUser.id}_unit${this.roadmapGameUnitId}`
        : `game_fillblank_${this.session.currentUser.id}`;
      localStorage.setItem(key, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'Fill in the Blank Game', Math.round((this.fb_score / this.fb_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Vocabulary Typing Sprint ──
  initSprintGame(): void {
    this.activeGameType = 'sprint';
    const bank = this.customGameContent['sprint']?.length ? this.customGameContent['sprint'] : this.gameVocabPool;
    this.sprint_queue = this.gameFx.shuffleArray(bank);
    this.sprint_index = 0;
    this.sprint_input = '';
    this.sprint_score = 0;
    this.sprint_combo = 0;
    this.sprint_bestCombo = 0;
    this.sprint_lastResult = '';
    this.sprint_timeLeft = 45;
    this.sprint_finished = false;
    if (this.sprint_timerInterval) clearInterval(this.sprint_timerInterval);
    this.sprint_timerInterval = setInterval(() => {
      this.sprint_timeLeft--;
      if (this.sprint_timeLeft <= 0) {
        this.finishSprintGame();
      }
    }, 1000);
  }

  get sprintCurrentWord(): { word: string; meaning: string } | null {
    if (this.sprint_queue.length === 0) return null;
    return this.sprint_queue[this.sprint_index % this.sprint_queue.length];
  }

  submitSprintAnswer(): void {
    const word = this.sprintCurrentWord;
    if (!word || this.sprint_finished || !this.sprint_input.trim()) return;
    const correct = this.gameFx.normalizeAnswer(this.sprint_input) === this.gameFx.normalizeAnswer(word.word);
    if (correct) {
      this.sprint_score++;
      this.sprint_combo++;
      this.sprint_bestCombo = Math.max(this.sprint_bestCombo, this.sprint_combo);
      this.sprint_lastResult = 'correct';
    } else {
      this.sprint_combo = 0;
      this.sprint_lastResult = 'wrong';
    }
    this.sprint_input = '';
    this.sprint_index++;
  }

  finishSprintGame(): void {
    if (this.sprint_timerInterval) {
      clearInterval(this.sprint_timerInterval);
      this.sprint_timerInterval = null;
    }
    this.sprint_finished = true;
    if (this.session.currentUser) {
      const bestKey = `game_sprint_best_${this.session.currentUser.id}`;
      const prevBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
      if (this.sprint_score > prevBest) {
        localStorage.setItem(bestKey, this.sprint_score.toString());
      }
    }
    this.gameFx.awardGameXp(20, 'Typing Sprint', this.sprint_score, this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  exitSprintGame(): void {
    if (this.sprint_timerInterval) {
      clearInterval(this.sprint_timerInterval);
      this.sprint_timerInterval = null;
    }
    this.activeGameType = null;
  }

  // ── Game: Spot & Fix the Typo ──
  initTypoFixGame(): void {
    this.activeGameType = 'typo-fix';
    const bank = this.customGameContent['typo-fix']?.length ? this.customGameContent['typo-fix'] : this.typoFixBank;
    this.tf_pool = this.gameFx.shuffleArray(bank).slice(0, this.tf_roundSize);
    this.tf_index = 0;
    this.tf_score = 0;
    this.tf_finished = false;
    this.setupTypoFixRound();
  }

  setupTypoFixRound(): void {
    this.tf_input = '';
    this.tf_feedback = '';
  }

  get tfCurrentItem(): { wrong: string; correct: string } | null {
    return this.tf_pool[this.tf_index] || null;
  }

  checkTypoFixAnswer(): void {
    const item = this.tfCurrentItem;
    if (!item || this.tf_feedback !== '' || !this.tf_input.trim()) return;
    const correct = this.gameFx.normalizeSentence(this.tf_input) === this.gameFx.normalizeSentence(item.correct);
    this.tf_feedback = correct ? 'correct' : 'wrong';
    if (correct) {
      this.tf_score++;
    } else {
      this.mistakes.trackWrongItem('sentence', item.wrong, item.correct, 'Spot & Fix the Typo');
    }
    setTimeout(() => this.nextTypoFixRound(), 1400);
  }

  nextTypoFixRound(): void {
    if (this.tf_index < this.tf_pool.length - 1) {
      this.tf_index++;
      this.setupTypoFixRound();
    } else {
      this.finishTypoFixGame();
    }
  }

  finishTypoFixGame(): void {
    this.tf_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.tf_score / this.tf_pool.length) * 100);
      localStorage.setItem(`game_typofix_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(20, 'Spot & Fix the Typo', Math.round((this.tf_score / this.tf_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Word Riddle (progressive letter reveal) ──
  initWordRiddleGame(): void {
    this.activeGameType = 'word-riddle';
    const bank = this.customGameContent['word-riddle']?.length ? this.customGameContent['word-riddle'] : this.gameVocabPool;
    this.wr_pool = this.gameFx.shuffleArray(bank).slice(0, this.wr_roundSize);
    this.wr_index = 0;
    this.wr_score = 0;
    this.wr_finished = false;
    this.setupWordRiddleRound();
  }

  setupWordRiddleRound(): void {
    this.wr_input = '';
    this.wr_wrongAttempts = 0;
    this.wr_feedback = '';
  }

  get wrCurrentWord(): { word: string; meaning: string } | null {
    return this.wr_pool[this.wr_index] || null;
  }

  get wrMaskedWord(): string {
    const word = this.wrCurrentWord;
    if (!word) return '';
    return word.word
      .split('')
      .map((ch, idx) => (ch === ' ' ? ' ' : idx < this.wr_wrongAttempts ? ch : '_'))
      .join(' ');
  }

  checkWordRiddleAnswer(): void {
    const word = this.wrCurrentWord;
    if (!word || this.wr_feedback !== '' || !this.wr_input.trim()) return;
    const correct = this.gameFx.normalizeAnswer(this.wr_input) === this.gameFx.normalizeAnswer(word.word);
    if (correct) {
      this.wr_feedback = 'correct';
      this.wr_score++;
      setTimeout(() => this.nextWordRiddleRound(), 800);
    } else {
      this.wr_wrongAttempts++;
      if (this.wr_wrongAttempts >= this.wr_maxAttempts) {
        this.wr_feedback = 'revealed';
        this.mistakes.trackWrongItem('word', word.word, word.meaning, 'Word Riddle');
        setTimeout(() => this.nextWordRiddleRound(), 1700);
      } else {
        this.wr_feedback = 'wrong';
        setTimeout(() => {
          this.wr_feedback = '';
          this.wr_input = '';
        }, 700);
      }
    }
  }

  nextWordRiddleRound(): void {
    if (this.wr_index < this.wr_pool.length - 1) {
      this.wr_index++;
      this.setupWordRiddleRound();
    } else {
      this.finishWordRiddleGame();
    }
  }

  finishWordRiddleGame(): void {
    this.wr_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.wr_score / this.wr_pool.length) * 100);
      localStorage.setItem(`game_wordriddle_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'Word Riddle', Math.round((this.wr_score / this.wr_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Scrambled Sentence → Typed Reorder ──
  initSentenceReorderGame(): void {
    this.activeGameType = 'sentence-reorder';
    // เนื้อหาที่อาจารย์แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) มาก่อน ไม่งั้นดึงประโยค
    // จากบทสนทนาของบทเรียนเหมือนเดิม
    const customSentences = (this.customGameContent['sentence-reorder'] || [])
      .map((it: any) => String(it.sentence || '').trim())
      .filter((s: string) => s.length > 0);
    const sentencePool = customSentences.length > 0 ? customSentences : this.buildDialogueSentencePool();
    this.ss_pool = this.gameFx.shuffleArray(sentencePool).slice(
      0,
      this.ss_roundSize,
    );
    this.ss_index = 0;
    this.ss_score = 0;
    this.ss_finished = false;
    this.setupSentenceReorderRound();
  }

  setupSentenceReorderRound(): void {
    this.ss_input = '';
    this.ss_feedback = '';
    const sentence = this.ss_pool[this.ss_index] || '';
    this.ss_wordBank = this.gameFx.shuffleArray(sentence.split(/\s+/));
  }

  get ssCurrentSentence(): string {
    return this.ss_pool[this.ss_index] || '';
  }

  checkSentenceReorderAnswer(): void {
    if (this.ss_feedback !== '' || !this.ss_input.trim()) return;
    const target = this.gameFx.normalizeSentence(this.ssCurrentSentence).split(' ');
    const typed = this.gameFx.normalizeSentence(this.ss_input).split(' ');
    const correct = target.length === typed.length && target.every((w, i) => w === typed[i]);
    this.ss_feedback = correct ? 'correct' : 'wrong';
    if (correct) {
      this.ss_score++;
    } else {
      this.mistakes.trackWrongItem('sentence', this.ssCurrentSentence, this.ssCurrentSentence, 'Sentence Reorder');
    }
    setTimeout(() => this.nextSentenceReorderRound(), 1300);
  }

  nextSentenceReorderRound(): void {
    if (this.ss_index < this.ss_pool.length - 1) {
      this.ss_index++;
      this.setupSentenceReorderRound();
    } else {
      this.finishSentenceReorderGame();
    }
  }

  finishSentenceReorderGame(): void {
    this.ss_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.ss_score / this.ss_pool.length) * 100);
      localStorage.setItem(`game_sentencereorder_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(20, 'Sentence Reorder', Math.round((this.ss_score / this.ss_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Open Dialogue Reply ──
  initOpenReplyGame(): void {
    this.activeGameType = 'open-reply';
    const custom = this.customGameContent['open-reply'];
    const pool = custom && custom.length > 0 ? custom : this.buildOpenReplyPool();
    this.odr_pool = this.gameFx.shuffleArray(pool).slice(0, this.odr_roundSize);
    this.odr_index = 0;
    this.odr_score = 0;
    this.odr_finished = false;
    this.setupOpenReplyRound();
  }

  setupOpenReplyRound(): void {
    this.odr_input = '';
    this.odr_submitted = false;
    this.odr_matchedKeywords = [];
  }

  get odrCurrentItem(): {
    context: string;
    label: string;
    sampleAnswer: string;
    keywords: string[];
  } | null {
    return this.odr_pool[this.odr_index] || null;
  }

  submitOpenReplyAnswer(): void {
    const item = this.odrCurrentItem;
    if (!item || this.odr_submitted || !this.odr_input.trim()) return;
    const normalized = this.gameFx.normalizeAnswer(this.odr_input);
    this.odr_matchedKeywords = item.keywords.filter((k) => normalized.includes(k.toLowerCase()));
    this.odr_submitted = true;
    if (this.odr_matchedKeywords.length / item.keywords.length >= 0.5) this.odr_score++;
  }

  nextOpenReplyRound(): void {
    if (this.odr_index < this.odr_pool.length - 1) {
      this.odr_index++;
      this.setupOpenReplyRound();
    } else {
      this.finishOpenReplyGame();
    }
  }

  finishOpenReplyGame(): void {
    this.odr_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.odr_score / this.odr_pool.length) * 100);
      localStorage.setItem(`game_openreply_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(20, 'Open Dialogue Reply', Math.round((this.odr_score / this.odr_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Scenario Sentence Construction ──
  initScenarioGame(): void {
    this.activeGameType = 'scenario';
    const bank = this.customGameContent['scenario']?.length ? this.customGameContent['scenario'] : this.scenarioBank;
    this.scn_pool = this.gameFx.shuffleArray(bank).slice(0, this.scn_roundSize);
    this.scn_index = 0;
    this.scn_score = 0;
    this.scn_finished = false;
    this.setupScenarioRound();
  }

  setupScenarioRound(): void {
    this.scn_input = '';
    this.scn_submitted = false;
    this.scn_matchedKeywords = [];
  }

  get scnCurrentItem(): { situationEn: string; situationTh: string; keywords: string[]; sampleAnswer: string } | null {
    return this.scn_pool[this.scn_index] || null;
  }

  submitScenarioAnswer(): void {
    const item = this.scnCurrentItem;
    if (!item || this.scn_submitted || !this.scn_input.trim()) return;
    const normalized = this.gameFx.normalizeAnswer(this.scn_input);
    this.scn_matchedKeywords = item.keywords.filter((k) => normalized.includes(k.toLowerCase()));
    this.scn_submitted = true;
    if (this.scn_matchedKeywords.length / item.keywords.length >= 0.5) this.scn_score++;
  }

  nextScenarioRound(): void {
    if (this.scn_index < this.scn_pool.length - 1) {
      this.scn_index++;
      this.setupScenarioRound();
    } else {
      this.finishScenarioGame();
    }
  }

  finishScenarioGame(): void {
    this.scn_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.scn_score / this.scn_pool.length) * 100);
      localStorage.setItem(`game_scenario_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(25, 'Scenario Construction', Math.round((this.scn_score / this.scn_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Email Reply Capstone ──
  initEmailCapstoneGame(): void {
    this.activeGameType = 'email-capstone';
    const bank = this.customGameContent['email-capstone']?.length ? this.customGameContent['email-capstone'] : this.emailBank;
    this.em_pool = this.gameFx.shuffleArray(bank).slice(0, this.em_roundSize);
    this.em_index = 0;
    this.em_score = 0;
    this.em_finished = false;
    this.setupEmailCapstoneRound();
  }

  setupEmailCapstoneRound(): void {
    this.em_input = '';
    this.em_submitted = false;
    this.em_matchedKeywords = [];
    this.em_wordCountOk = false;
  }

  get emCurrentItem(): {
    subject: string;
    body: string;
    keywords: string[];
    minWords: number;
    sampleAnswer: string;
  } | null {
    return this.em_pool[this.em_index] || null;
  }

  get emWordCount(): number {
    return (this.em_input.trim().match(/\S+/g) || []).length;
  }

  submitEmailCapstoneAnswer(): void {
    const item = this.emCurrentItem;
    if (!item || this.em_submitted || !this.em_input.trim()) return;
    const normalized = this.gameFx.normalizeAnswer(this.em_input);
    this.em_matchedKeywords = item.keywords.filter((k) => normalized.includes(k.toLowerCase()));
    this.em_wordCountOk = this.emWordCount >= item.minWords;
    this.em_submitted = true;
    const keywordScore = this.em_matchedKeywords.length / item.keywords.length;
    if (keywordScore >= 0.5 && this.em_wordCountOk) this.em_score++;
  }

  nextEmailCapstoneRound(): void {
    if (this.em_index < this.em_pool.length - 1) {
      this.em_index++;
      this.setupEmailCapstoneRound();
    } else {
      this.finishEmailCapstoneGame();
    }
  }

  finishEmailCapstoneGame(): void {
    this.em_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.em_score / this.em_pool.length) * 100);
      localStorage.setItem(`game_emailcapstone_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(30, 'Email Reply Capstone', Math.round((this.em_score / this.em_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Memory Card Match ──
  initMemoryMatchGame(): void {
    this.activeGameType = 'match-pair';
    this.mm_round = 1;
    this.mm_score = 0;
    this.mm_finished = false;
    this.startMemoryMatchRound();
  }

  startMemoryMatchRound(): void {
    this.mm_selectedCards = [];
    const bank = this.customGameContent['match-pair']?.length ? this.customGameContent['match-pair'] : this.gameVocabPool;
    const pool = bank.length > 0 ? bank : this.lessonsData.units[0].vocabularies;
    const shuffledPool = this.gameFx.shuffleArray([...pool]);
    const roundVocab = shuffledPool.slice(0, 4);
    
    const cards: { id: number; text: string; type: 'en' | 'th'; matchId: string; isFlipped: boolean; isMatched: boolean }[] = [];
    let idCounter = 1;
    roundVocab.forEach(v => {
      cards.push({
        id: idCounter++,
        text: v.word,
        type: 'en',
        matchId: v.word,
        isFlipped: false,
        isMatched: false
      });
      cards.push({
        id: idCounter++,
        text: v.meaning,
        type: 'th',
        matchId: v.word,
        isFlipped: false,
        isMatched: false
      });
    });
    
    this.mm_cards = this.gameFx.shuffleArray(cards);
  }

  selectMemoryMatchCard(index: number): void {
    const card = this.mm_cards[index];
    if (this.mm_finished || card.isFlipped || card.isMatched || this.mm_selectedCards.length >= 2) return;
    
    card.isFlipped = true;
    this.mm_selectedCards.push(index);
    
    if (this.mm_selectedCards.length === 2) {
      setTimeout(() => this.checkMemoryMatch(), 1000);
    }
  }

  checkMemoryMatch(): void {
    const [idx1, idx2] = this.mm_selectedCards;
    const card1 = this.mm_cards[idx1];
    const card2 = this.mm_cards[idx2];
    
    if (card1.matchId === card2.matchId && card1.type !== card2.type) {
      card1.isMatched = true;
      card2.isMatched = true;
      this.mm_score++;
      
      const allMatched = this.mm_cards.every(c => c.isMatched);
      if (allMatched) {
        if (this.mm_round < this.mm_maxRounds) {
          this.mm_round++;
          this.startMemoryMatchRound();
        } else {
          this.finishMemoryMatchGame();
        }
      }
    } else {
      card1.isFlipped = false;
      card2.isFlipped = false;
    }
    this.mm_selectedCards = [];
  }

  finishMemoryMatchGame(): void {
    this.mm_finished = true;
    if (this.session.currentUser) {
      localStorage.setItem(`game_memorymatch_${this.session.currentUser.id}`, '100');
    }
    this.gameFx.awardGameXp(15, 'Memory Card Match', 100, this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Dictation Master ──
  initDictationGame(): void {
    this.activeGameType = 'dictation';
    const bank = this.customGameContent['dictation']?.length ? this.customGameContent['dictation'] : this.gameVocabPool;
    const pool = bank.length > 0 ? bank : this.lessonsData.units[0].vocabularies;
    this.dc_pool = this.gameFx.shuffleArray([...pool]).slice(0, 5);
    this.dc_index = 0;
    this.dc_score = 0;
    this.dc_input = '';
    this.dc_showFeedback = false;
    this.dc_isCorrect = false;
    this.dc_finished = false;
    setTimeout(() => this.playDictationWord(), 500);
  }

  playDictationWord(): void {
    const current = this.dc_pool[this.dc_index];
    if (current) {
      this.gameFx.speakText(current.word);
    }
  }

  submitDictationAnswer(): void {
    if (this.dc_finished || this.dc_showFeedback || !this.dc_input.trim()) return;
    const current = this.dc_pool[this.dc_index];
    this.dc_isCorrect = this.gameFx.normalizeAnswer(this.dc_input) === this.gameFx.normalizeAnswer(current.word);
    if (this.dc_isCorrect) {
      this.dc_score++;
    }
    this.dc_showFeedback = true;
  }

  nextDictationRound(): void {
    this.dc_showFeedback = false;
    this.dc_input = '';
    if (this.dc_index < this.dc_pool.length - 1) {
      this.dc_index++;
      setTimeout(() => this.playDictationWord(), 300);
    } else {
      this.finishDictationGame();
    }
  }

  finishDictationGame(): void {
    this.dc_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.dc_score / this.dc_pool.length) * 100);
      localStorage.setItem(`game_dictation_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(20, 'Dictation Master', Math.round((this.dc_score / this.dc_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: POS Sorter ──
  initPosSorterGame(): void {
    this.activeGameType = 'pos-sorter';
    // เนื้อหาที่อาจารย์แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) มาก่อนเสมอ ถ้ามี — ไม่งั้น
    // ค่อย fallback ไปคำศัพท์ของบทเรียน (ซึ่งตอนนี้ pos ถูก map เป็น 'n.' เสมอจาก DB จริง) แล้ว
    // ค่อย fallback อีกชั้นเป็นชุดตัวอย่างในโค้ด
    const customPool = (this.customGameContent['pos-sorter'] || []).filter((it: any) => (it.word || '').trim() && (it.pos || '').trim());
    const unitVocab = this.lessonsData.currentUnit?.vocabularies || [];
    let pool: { word: string; pos?: string; meaning: string }[] = customPool.length > 0
      ? customPool
      : unitVocab.filter(v => v.pos && ['n.', 'v.', 'adj.', 'adv.', 'noun', 'verb', 'adjective', 'adverb'].some(p => v.pos!.toLowerCase().includes(p)));

    if (pool.length < 5) {
      // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) — ค่าเดิมทุกตัว
      // (pos สะกดเต็มแล้วแทน 'n./v./adj./adv.' ย่อ — cleanPos ด้านล่างรองรับทั้งสองแบบอยู่แล้ว)
      pool = POS_SORTER_DEFAULT_BANK;
    }

    this.pos_pool = this.gameFx.shuffleArray([...pool]).slice(0, 5).map(item => {
      let cleanPos = 'noun';
      const posStr = item.pos ? item.pos.toLowerCase() : '';
      if (posStr.includes('v') || posStr.includes('verb')) cleanPos = 'verb';
      else if (posStr.includes('adj') || posStr.includes('adjective')) cleanPos = 'adjective';
      else if (posStr.includes('adv') || posStr.includes('adverb')) cleanPos = 'adverb';
      return {
        word: item.word,
        pos: cleanPos,
        meaning: item.meaning
      };
    });
    
    this.pos_index = 0;
    this.pos_score = 0;
    this.pos_showFeedback = false;
    this.pos_selected = '';
    this.pos_finished = false;
  }

  submitPosAnswer(choice: string): void {
    if (this.pos_finished || this.pos_showFeedback) return;
    this.pos_selected = choice;
    const current = this.pos_pool[this.pos_index];
    if (choice === current.pos) {
      this.pos_score++;
    }
    this.pos_showFeedback = true;
  }

  nextPosRound(): void {
    this.pos_showFeedback = false;
    this.pos_selected = '';
    if (this.pos_index < this.pos_pool.length - 1) {
      this.pos_index++;
    } else {
      this.finishPosSorterGame();
    }
  }

  finishPosSorterGame(): void {
    this.pos_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.pos_score / this.pos_pool.length) * 100);
      localStorage.setItem(`game_possorter_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'POS Sorter', Math.round((this.pos_score / this.pos_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Synonym Matcher ──
  initSynonymMatchGame(): void {
    this.activeGameType = 'synonym-match';

    // เนื้อหาที่อาจารย์แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) มาก่อนเสมอ ถ้ามี — ใช้คู่
    // คำพ้อง/ตัวลวงที่อาจารย์กำหนดตรงๆ แทน synonymBank ที่ตายตัวด้านล่าง (เดิมคำศัพท์ที่
    // อาจารย์เพิ่มเองในบทเรียนจะไม่มีคำพ้องให้เล่นเลยถ้าไม่ตรงกับ synonymBank พอดี)
    const customPool = (this.customGameContent['synonym-match'] || []).filter((it: any) => (it.word || '').trim() && (it.synonym || '').trim());
    if (customPool.length > 0) {
      const chosen = this.gameFx.shuffleArray([...customPool]).slice(0, 5);
      this.sm_pool = chosen.map((item: any) => {
        const distractors: string[] = (Array.isArray(item.distractors) ? item.distractors : []).slice(0, 3);
        const options = this.gameFx.shuffleArray([item.synonym, ...distractors]);
        return { word: item.word, synonym: item.synonym, options };
      });
      this.sm_index = 0;
      this.sm_score = 0;
      this.sm_selectedOption = '';
      this.sm_showFeedback = false;
      this.sm_finished = false;
      return;
    }

    // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) — ค่าเดิมทุกตัว
    const synonymBank = SYNONYM_WORD_MAP;

    const pool = this.gameVocabPool.length > 0 ? this.gameVocabPool : this.lessonsData.units[0].vocabularies;
    let matchingWords = pool.filter(v => synonymBank[v.word.toLowerCase()]);
    
    if (matchingWords.length < 5) {
      // ค่าเริ่มต้นย้ายไป shared/game-default-content.ts (2026-08-12) — ค่าเดิมทุกตัว
      matchingWords = SYNONYM_MATCH_DEFAULT_BANK.map(({ word, meaning }) => ({ word, meaning }));
    }
    
    const chosenWords = this.gameFx.shuffleArray([...matchingWords]).slice(0, 5);
    
    this.sm_pool = chosenWords.map(item => {
      const targetWord = item.word.toLowerCase();
      const synonym = synonymBank[targetWord] || 'cooperate';
      const distractors = Object.values(synonymBank)
        .filter(s => s !== synonym)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      const options = this.gameFx.shuffleArray([synonym, ...distractors]);
      return {
        word: item.word,
        synonym: synonym,
        options: options
      };
    });
    
    this.sm_index = 0;
    this.sm_score = 0;
    this.sm_selectedOption = '';
    this.sm_showFeedback = false;
    this.sm_finished = false;
  }

  submitSynonymAnswer(option: string): void {
    if (this.sm_finished || this.sm_showFeedback) return;
    this.sm_selectedOption = option;
    const current = this.sm_pool[this.sm_index];
    if (option === current.synonym) {
      this.sm_score++;
    }
    this.sm_showFeedback = true;
  }

  nextSynonymRound(): void {
    this.sm_showFeedback = false;
    this.sm_selectedOption = '';
    if (this.sm_index < this.sm_pool.length - 1) {
      this.sm_index++;
    } else {
      this.finishSynonymMatchGame();
    }
  }

  finishSynonymMatchGame(): void {
    this.sm_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.sm_score / this.sm_pool.length) * 100);
      localStorage.setItem(`game_synonymmatch_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'Synonym Matcher', Math.round((this.sm_score / this.sm_pool.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Save the Mascot ──
  initSaveMascotGame(): void {
    this.activeGameType = 'save-mascot';
    const bank = this.customGameContent['save-mascot']?.length ? this.customGameContent['save-mascot'] : this.gameVocabPool;
    const pool = bank.length > 0 ? bank : this.lessonsData.units[0].vocabularies;
    const filterPool = pool.filter(v => !v.word.includes(' ') && !v.word.includes('-'));
    const cleanPool = filterPool.length >= 3 ? filterPool : pool;
    
    this.hm_roundWords = this.gameFx.shuffleArray([...cleanPool]).slice(0, 3);
    this.hm_index = 0;
    this.hm_score = 0;
    this.hm_finished = false;
    this.startMascotRound();
  }

  startMascotRound(): void {
    this.hm_wordObj = this.hm_roundWords[this.hm_index];
    this.hm_lives = 5;
    this.hm_guessedLetters = new Set<string>();
    
    if (this.hm_wordObj) {
      this.hm_wordLetters = this.hm_wordObj.word.toUpperCase().split('');
    }
  }

  guessMascotLetter(letter: string): void {
    if (this.hm_finished || this.hm_lives <= 0 || this.hm_guessedLetters.has(letter) || this.hm_isGuessed) return;
    
    this.hm_guessedLetters.add(letter);
    const isCorrect = this.hm_wordLetters.includes(letter);
    if (!isCorrect) {
      this.hm_lives--;
      if (this.hm_lives <= 0) {
        setTimeout(() => this.nextMascotRound(), 1500);
      }
    } else {
      if (this.hm_isGuessed) {
        this.hm_score++;
        setTimeout(() => this.nextMascotRound(), 1500);
      }
    }
  }

  get hm_isGuessed(): boolean {
    if (!this.hm_wordLetters.length) return false;
    return this.hm_wordLetters.every((char: string) => this.hm_guessedLetters.has(char));
  }

  get hm_displayWord(): string {
    if (!this.hm_wordObj) return '';
    return this.hm_wordLetters
      .map((char: string) => (this.hm_guessedLetters.has(char) ? char : '_'))
      .join(' ');
  }

  nextMascotRound(): void {
    if (this.hm_index < this.hm_roundWords.length - 1) {
      this.hm_index++;
      this.startMascotRound();
    } else {
      this.finishSaveMascotGame();
    }
  }

  finishSaveMascotGame(): void {
    this.hm_finished = true;
    if (this.session.currentUser) {
      const scorePct = Math.round((this.hm_score / this.hm_roundWords.length) * 100);
      localStorage.setItem(`game_savemascot_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(25, 'Save the Mascot', Math.round((this.hm_score / this.hm_roundWords.length) * 100), this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game: Word Search (Drag to Find) ──
  initWordSearchGame(): void {
    this.activeGameType = 'word-search';
    this.startNewWordSearchRound();
  }

  startNewWordSearchRound(): void {
    this.ws_selectedCells = [];
    this.ws_isDragging = false;
    this.ws_startCell = null;
    this.ws_wordCellMap = {};
    this.ws_score = 0;
    this.ws_finished = false;
    this.ws_invalidFlash = false;

    const fallbackWords = [
      { word: 'welcome', meaning: 'ยินดีต้อนรับ' },
      { word: 'schedule', meaning: 'ตารางเวลา' },
      { word: 'teacher', meaning: 'ครู' },
      { word: 'student', meaning: 'นักเรียน' },
      { word: 'lesson', meaning: 'บทเรียน' },
      { word: 'meeting', meaning: 'การประชุม' },
      { word: 'colleague', meaning: 'เพื่อนร่วมงาน' },
      { word: 'feedback', meaning: 'ข้อเสนอแนะ' },
      { word: 'question', meaning: 'คำถาม' },
      { word: 'answer', meaning: 'คำตอบ' },
    ];

    const customBank = this.customGameContent['word-search'];
    const source = customBank?.length ? customBank : (this.gameVocabPool.length > 0 ? this.gameVocabPool : this.lessonsData.units[0]?.vocabularies || []);
    const seen = new Set<string>();
    const candidatePool = source
      .filter((v) => /^[A-Za-z]+$/.test(v.word) && v.word.length >= 3 && v.word.length <= 10)
      .map((v) => ({ word: v.word, meaning: v.meaning }))
      .filter((v) => {
        const key = v.word.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (candidatePool.length < 6) {
      fallbackWords.forEach((fw) => {
        const key = fw.word.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          candidatePool.push(fw);
        }
      });
    }

    const shuffled = this.gameFx.shuffleArray(candidatePool);
    const targetCount = 8;
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: -1 },
    ];
    const grid: string[][] = Array.from({ length: this.ws_gridSize }, () => Array(this.ws_gridSize).fill(''));
    const placed: { word: string; meaning: string; cells: { row: number; col: number }[] }[] = [];

    for (const candidate of shuffled) {
      if (placed.length >= targetCount) break;
      const letters = candidate.word.toUpperCase().split('');
      if (letters.length > this.ws_gridSize) continue;

      let cells: { row: number; col: number }[] | null = null;
      for (let attempt = 0; attempt < 30 && !cells; attempt++) {
        const dir = directions[Math.floor(Math.random() * directions.length)];
        cells = this.ws_tryPlaceWord(grid, letters, dir);
      }
      if (cells) {
        placed.push({ word: candidate.word.toUpperCase(), meaning: candidate.meaning, cells });
      }
    }

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < this.ws_gridSize; r++) {
      for (let c = 0; c < this.ws_gridSize; c++) {
        if (!grid[r][c]) grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }

    this.ws_grid = grid;
    this.ws_words = placed.map((p, idx) => ({
      word: p.word,
      meaning: p.meaning,
      found: false,
      colorIndex: idx % this.ws_colorCount,
    }));
  }

  private ws_randomStart(dir: { dr: number; dc: number }, len: number): { row: number; col: number } | null {
    const size = this.ws_gridSize;
    const rowMin = 0;
    const rowMax = dir.dr === 1 ? size - len : size - 1;
    const colMin = dir.dc === -1 ? len - 1 : 0;
    const colMax = dir.dc === 1 ? size - len : size - 1;
    if (rowMax < rowMin || colMax < colMin) return null;
    const row = rowMin + Math.floor(Math.random() * (rowMax - rowMin + 1));
    const col = colMin + Math.floor(Math.random() * (colMax - colMin + 1));
    return { row, col };
  }

  private ws_tryPlaceWord(
    grid: string[][],
    letters: string[],
    dir: { dr: number; dc: number },
  ): { row: number; col: number }[] | null {
    const start = this.ws_randomStart(dir, letters.length);
    if (!start) return null;

    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < letters.length; i++) {
      const row = start.row + dir.dr * i;
      const col = start.col + dir.dc * i;
      const existing = grid[row][col];
      if (existing && existing !== letters[i]) return null;
      cells.push({ row, col });
    }
    cells.forEach((cell, i) => {
      grid[cell.row][cell.col] = letters[i];
    });
    return cells;
  }

  getWsCellClass(row: number, col: number): string {
    const found = this.ws_wordCellMap[`${row}-${col}`];
    if (found) return `ws-cell ws-found ws-color-${found.colorIndex}`;
    if (this.ws_selectedCells.some((c) => c.row === row && c.col === col)) {
      return this.ws_invalidFlash ? 'ws-cell ws-selected ws-invalid' : 'ws-cell ws-selected';
    }
    return 'ws-cell';
  }

  startWordSelect(row: number, col: number, event: PointerEvent): void {
    if (this.ws_finished) return;
    const target = event.target as Element;
    if (target && target.hasPointerCapture && target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
    this.ws_isDragging = true;
    this.ws_startCell = { row, col };
    this.ws_selectedCells = [{ row, col }];
  }

  continueWordSelect(row: number, col: number): void {
    if (!this.ws_isDragging || !this.ws_startCell) return;
    this.ws_selectedCells = this.ws_computeSelectionLine(this.ws_startCell, { row, col });
  }

  // NOTE: no longer @HostListener here (services can't use it) — StudentGamesComponent
  // adds its own @HostListener('document:pointerup') that calls this method.
  onWordSearchPointerUp(): void {
    if (!this.ws_isDragging) return;
    this.ws_isDragging = false;
    this.ws_startCell = null;

    if (this.ws_selectedCells.length < 2) {
      this.ws_selectedCells = [];
      return;
    }

    const cells = this.ws_selectedCells;
    const letters = cells.map((c) => this.ws_grid[c.row][c.col]).join('');
    const reversed = letters.split('').reverse().join('');
    const match = this.ws_words.find((w) => !w.found && (w.word === letters || w.word === reversed));

    if (match) {
      match.found = true;
      cells.forEach((cell) => {
        this.ws_wordCellMap[`${cell.row}-${cell.col}`] = { word: match.word, colorIndex: match.colorIndex };
      });
      this.ws_score++;
      this.ws_selectedCells = [];
      this.gameFx.playSoundEffect('success');
      if (this.ws_words.every((w) => w.found)) {
        setTimeout(() => this.finishWordSearchGame(), 400);
      }
    } else {
      this.ws_invalidFlash = true;
      this.gameFx.playSoundEffect('error');
      setTimeout(() => {
        this.ws_invalidFlash = false;
        this.ws_selectedCells = [];
      }, 350);
    }
  }

  private ws_computeSelectionLine(
    start: { row: number; col: number },
    end: { row: number; col: number },
  ): { row: number; col: number }[] {
    const dRow = end.row - start.row;
    const dCol = end.col - start.col;
    if (dRow === 0 && dCol === 0) return [start];

    const eightDirs = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: -1 },
      { dr: 0, dc: -1 },
      { dr: -1, dc: -1 },
      { dr: -1, dc: 0 },
      { dr: -1, dc: 1 },
    ];
    const angle = Math.atan2(dRow, dCol);
    const idx = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
    const dir = eightDirs[idx];
    const steps = Math.max(Math.abs(dRow), Math.abs(dCol));

    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const row = start.row + dir.dr * i;
      const col = start.col + dir.dc * i;
      if (row < 0 || row >= this.ws_gridSize || col < 0 || col >= this.ws_gridSize) break;
      cells.push({ row, col });
    }
    return cells;
  }

  finishWordSearchGame(): void {
    this.ws_finished = true;
    const scorePct = this.ws_words.length > 0 ? Math.round((this.ws_score / this.ws_words.length) * 100) : 0;
    if (this.session.currentUser) {
      localStorage.setItem(`game_wordsearch_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(20, 'Word Search Puzzle', scorePct, this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game 7: Drag & Drop Word Builder (เกมลากคำ) ──
  initDragWordGame(): void {
    this.activeGameType = 'drag-word';
    this.dw_index = 0;
    this.dw_score = 0;
    this.dw_finished = false;
    this.dw_showFeedback = false;
    this.dw_draggedWord = null;

    // เนื้อหาที่อาจารย์แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) มาก่อนเสมอ ถ้ามี — sentenceTemplate
    // ที่อาจารย์กรอกใช้ token [slot0]/[slot1]/... เหมือนโค้ดเดิม, slotWords คือคำตอบเรียงตาม
    // ลำดับ token ที่เจอ (คำที่ 1 → token แรกที่เจอ ฯลฯ), wordBank คือตัวเลือกทั้งหมดที่ให้ลาก —
    // ไม่งั้นใช้ DRAG_WORD_DEFAULT_BANK (shared/game-default-content.ts) ผ่าน transform เดียวกัน
    // (มี token [slot0]/[slot1] อยู่ในรูปแบบเดียวกันกับที่อาจารย์กรอกเองอยู่แล้ว)
    const custom = (this.customGameContent['drag-word'] || []).filter(
      (it: any) => (it.sentenceTemplate || '').trim() && Array.isArray(it.slotWords) && it.slotWords.length > 0,
    );
    const dwSource = custom.length > 0 ? custom : DRAG_WORD_DEFAULT_BANK;
    this.dw_questions = dwSource.map((it: any, idx: number) => {
      const template: string = it.sentenceTemplate;
      const tokenCount = (template.match(/\[slot\d+\]/g) || []).length;
      const slotWords: string[] = it.slotWords;
      const slots = Array.from({ length: tokenCount }, (_, i) => ({
        placeholder: `เลือกคำที่ ${i + 1}`,
        targetWord: slotWords[i] || '',
        currentWord: null as string | null,
      }));
      return {
        id: idx + 1,
        thaiHint: it.thaiHint || '',
        sentenceTemplate: template,
        slots,
        wordBank: this.gameFx.shuffleArray(Array.isArray(it.wordBank) ? it.wordBank : []),
        explanation: it.explanation || '',
      };
    });
  }

  onDwDragStart(event: DragEvent, word: string): void {
    this.dw_draggedWord = word;
    event.dataTransfer?.setData('text/plain', word);
  }

  onDwDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDwDrop(event: DragEvent, slotIndex: number): void {
    event.preventDefault();
    const word = event.dataTransfer?.getData('text/plain') || this.dw_draggedWord;
    if (word) {
      this.placeWordInSlot(word, slotIndex);
    }
    this.dw_draggedWord = null;
  }

  placeWordInSlot(word: string, slotIndex: number): void {
    if (this.dw_showFeedback || this.dw_finished) return;
    const currentQ = this.dw_questions[this.dw_index];
    if (!currentQ) return;

    currentQ.slots.forEach(s => {
      if (s.currentWord === word) s.currentWord = null;
    });

    currentQ.slots[slotIndex].currentWord = word;
    this.gameFx.playSoundEffect('click');
  }

  clearDwSlot(slotIndex: number): void {
    if (this.dw_showFeedback || this.dw_finished) return;
    const currentQ = this.dw_questions[this.dw_index];
    if (currentQ && currentQ.slots[slotIndex]) {
      currentQ.slots[slotIndex].currentWord = null;
    }
  }

  quickPlaceWord(word: string): void {
    if (this.dw_showFeedback || this.dw_finished) return;
    const currentQ = this.dw_questions[this.dw_index];
    if (!currentQ) return;

    const existingSlot = currentQ.slots.find(s => s.currentWord === word);
    if (existingSlot) {
      existingSlot.currentWord = null;
      return;
    }

    const emptySlot = currentQ.slots.find(s => !s.currentWord);
    if (emptySlot) {
      emptySlot.currentWord = word;
      this.gameFx.playSoundEffect('click');
    }
  }

  checkDragWordAnswer(): void {
    const currentQ = this.dw_questions[this.dw_index];
    if (!currentQ || this.dw_showFeedback) return;

    const allCorrect = currentQ.slots.every(s => s.currentWord === s.targetWord);
    this.dw_isCorrect = allCorrect;
    this.dw_showFeedback = true;

    if (allCorrect) {
      this.dw_score++;
      this.gameFx.playSoundEffect('success');
    } else {
      this.gameFx.playSoundEffect('error');
    }
  }

  nextDragWordQuestion(): void {
    this.dw_showFeedback = false;
    if (this.dw_index < this.dw_questions.length - 1) {
      this.dw_index++;
    } else {
      this.finishDragWordGame();
    }
  }

  finishDragWordGame(): void {
    this.dw_finished = true;
    const scorePct = Math.round((this.dw_score / this.dw_questions.length) * 100);
    if (this.session.currentUser) {
      localStorage.setItem(`game_dragword_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'เกมลากคำ (Drag & Drop Word Builder)', scorePct, this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game 8: Sentence Converter (เกมคอนเวิด - แปลงรูปประโยค) ──
  initConvertSentenceGame(): void {
    this.activeGameType = 'convert-sentence';
    this.cs_index = 0;
    this.cs_score = 0;
    this.cs_input = '';
    this.cs_showHint = false;
    this.cs_showFeedback = false;
    this.cs_finished = false;

    // เนื้อหาที่อาจารย์แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) มาก่อนเสมอ ถ้ามี — ไม่งั้น
    // ใช้ CONVERT_SENTENCE_DEFAULT_BANK (shared/game-default-content.ts) ผ่าน transform เดียวกัน
    const custom = (this.customGameContent['convert-sentence'] || []).filter((it: any) => (it.originalSentence || '').trim() && Array.isArray(it.correctAnswers) && it.correctAnswers.length > 0);
    const csSource = custom.length > 0 ? custom : CONVERT_SENTENCE_DEFAULT_BANK;
    this.cs_questions = csSource.map((it: any, idx: number) => ({
      id: idx + 1,
      instruction: it.instruction || '',
      originalSentence: it.originalSentence,
      hint: it.hint || '',
      correctAnswers: it.correctAnswers,
      explanation: it.explanation || '',
    }));
  }

  toggleConvertHint(): void {
    this.cs_showHint = !this.cs_showHint;
  }

  checkConvertSentenceAnswer(): void {
    if (this.cs_showFeedback || !this.cs_input.trim()) return;
    const currentQ = this.cs_questions[this.cs_index];
    if (!currentQ) return;

    const normalizedInput = this.cs_input.trim().toLowerCase().replace(/[.,?!]/g, '').replace(/\s+/g, ' ');
    const isMatched = currentQ.correctAnswers.some(ans => {
      const normAns = ans.trim().toLowerCase().replace(/[.,?!]/g, '').replace(/\s+/g, ' ');
      return normAns === normalizedInput;
    });

    this.cs_isCorrect = isMatched;
    this.cs_showFeedback = true;

    if (isMatched) {
      this.cs_score++;
      this.gameFx.playSoundEffect('success');
    } else {
      this.gameFx.playSoundEffect('error');
    }
  }

  nextConvertSentenceQuestion(): void {
    this.cs_showFeedback = false;
    this.cs_showHint = false;
    this.cs_input = '';
    if (this.cs_index < this.cs_questions.length - 1) {
      this.cs_index++;
    } else {
      this.finishConvertSentenceGame();
    }
  }

  finishConvertSentenceGame(): void {
    this.cs_finished = true;
    const scorePct = Math.round((this.cs_score / this.cs_questions.length) * 100);
    if (this.session.currentUser) {
      localStorage.setItem(`game_convertsentence_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'คอนเวิด - แปลงประโยค (Sentence Converter)', scorePct, this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

  // ── Game 9: English to Thai Translation Recall (แปลอังกฤษ พิมพ์ไทย) ──
  initEngToThaiGame(): void {
    this.activeGameType = 'eng-to-thai';
    this.et_index = 0;
    this.et_score = 0;
    this.et_input = '';
    this.et_showHint = false;
    this.et_showFeedback = false;
    this.et_finished = false;

    // เนื้อหาที่อาจารย์แก้ไว้ทั่วระบบ (หน้า "ปกเกม" > เนื้อหาเกม) มาก่อนเสมอ ถ้ามี — ไม่งั้น
    // ใช้ ENG_TO_THAI_DEFAULT_BANK (shared/game-default-content.ts) ผ่าน transform เดียวกัน
    const custom = (this.customGameContent['eng-to-thai'] || []).filter((it: any) => (it.englishSentence || '').trim() && (it.primaryThai || '').trim());
    const etSource = custom.length > 0 ? custom : ENG_TO_THAI_DEFAULT_BANK;
    this.et_questions = etSource.map((it: any, idx: number) => ({
      id: idx + 1,
      englishSentence: it.englishSentence,
      thaiHint: it.thaiHint || '',
      primaryThai: it.primaryThai,
      keyKeywords: Array.isArray(it.keyKeywords) ? it.keyKeywords : [],
      explanation: it.explanation || '',
    }));
    setTimeout(() => this.speakEngToThaiCurrent(), 400);
  }

  speakEngToThaiCurrent(): void {
    const current = this.et_questions[this.et_index];
    if (current) {
      this.gameFx.speakText(current.englishSentence);
    }
  }

  toggleEngToThaiHint(): void {
    this.et_showHint = !this.et_showHint;
  }

  checkEngToThaiAnswer(): void {
    if (this.et_showFeedback || !this.et_input.trim()) return;
    const currentQ = this.et_questions[this.et_index];
    if (!currentQ) return;

    const userInput = this.et_input.trim();
    const matchedCount = currentQ.keyKeywords.filter(kw => userInput.includes(kw)).length;
    const keywordRatio = matchedCount / currentQ.keyKeywords.length;
    const isMatch = keywordRatio >= 0.5 || userInput.includes(currentQ.keyKeywords[0]);

    this.et_isCorrect = isMatch;
    this.et_showFeedback = true;

    if (isMatch) {
      this.et_score++;
      this.gameFx.playSoundEffect('success');
    } else {
      this.gameFx.playSoundEffect('error');
    }
  }

  nextEngToThaiQuestion(): void {
    this.et_showFeedback = false;
    this.et_showHint = false;
    this.et_input = '';
    if (this.et_index < this.et_questions.length - 1) {
      this.et_index++;
      setTimeout(() => this.speakEngToThaiCurrent(), 300);
    } else {
      this.finishEngToThaiGame();
    }
  }

  finishEngToThaiGame(): void {
    this.et_finished = true;
    const scorePct = Math.round((this.et_score / this.et_questions.length) * 100);
    if (this.session.currentUser) {
      localStorage.setItem(`game_engtothai_${this.session.currentUser.id}`, scorePct.toString());
    }
    this.gameFx.awardGameXp(15, 'แปลอังกฤษ พิมพ์ไทย (English to Thai Recall)', scorePct, this.roadmapQuizType || 'post_game');
    this.progress.loadProgressHistory();
  }

}
