import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { TeacherSessionService } from '../../services/teacher-session.service';

// "จัดการบทเรียนและข้อสอบ" tab extracted verbatim from the old TeacherComponent
// (teacher.component.ts/.html). Reads/writes the shared activeYearLevel via
// TeacherSessionService so it stays in sync with the Students page.
@Component({
  selector: 'app-teacher-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-lessons.component.html',
  styleUrl: './teacher-lessons.component.scss',
})
export class TeacherLessonsComponent implements OnInit, OnDestroy {
  // Lessons list
  lessonsList: any[] = [];
  editingLesson: any = null;
  isCreatingNew = false;

  // เกณฑ์คะแนน/คำสั่งให้ AI ต่อบทเรียน (ai_grading_instruction ฯลฯ) — โหลด/บันทึกแยก
  // จาก saveLesson() หลัก เพราะผูกกับ lesson_id จริงใน DB เท่านั้น (บทเรียนที่ยังไม่ได้
  // บันทึกครั้งแรกจะยังไม่มีให้ตั้งค่า)
  aiSettings: {
    pass_threshold: number | null;
    game_weight: number | null;
    test_weight: number | null;
    ai_grading_instruction: string | null;
  } = { pass_threshold: null, game_weight: null, test_weight: null, ai_grading_instruction: null };
  aiSettingsSaving = false;

  // คำสั่งให้ AI แยกตามชั้นปี (ปี 1/ปี 2) — ต่างจาก aiSettings ด้านบนตรงไม่ผูกกับบทเรียน
  // เดียว ระบบดึงจาก year_of_study ของนักศึกษาที่ล็อกอินอยู่เอง จึงมีผลกับหน้าฝึกพูดอิสระ
  // ของนักศึกษาโดยตรง (ai/core.py:get_year_grading_instruction) โหลดครั้งเดียวตอนเข้าหน้า
  // แล้วแสดง/บันทึกตามแท็บปีที่กำลังเลือกอยู่ (session.activeYearLevel) เหมือนกับที่ใช้
  // กรองรายการบทเรียนอยู่แล้ว
  yearAiInstructions: { [yearLevel: number]: string } = {};
  yearAiInstructionsSaving: { [yearLevel: number]: boolean } = {};

  // เนื้อหา prompt เดิมของระบบ (scope "system_speaking" ที่แอดมินตั้งค่าไว้) — แสดงเป็น
  // ข้อมูลอ้างอิงอ่านอย่างเดียวเหนือกล่องข้อความด้านบน เพื่อให้อาจารย์เห็นว่า AI มีกฎ/บุคลิก
  // พื้นฐานอะไรอยู่แล้วก่อนเขียนคำสั่งเพิ่มเติมเฉพาะชั้นปี (กันเขียนซ้ำ/ขัดกับของเดิม)
  systemSpeakingPromptDefault = '';
  showSystemPromptReference = false;

  constructor(public session: TeacherSessionService, private apiService: ApiService) {}

  private yearChangedSub?: Subscription;

  ngOnInit(): void {
    this.loadLessons();
    this.loadYearAiInstructions();
    this.loadSystemSpeakingPromptDefault();
    // ปุ่มสลับปีย้ายไปอยู่ใน shell แล้ว (ดู TeacherShellComponent) — ฟัง event ตรงนี้แทน
    // เพื่อยังคงเคลียร์ editingLesson เหมือนเดิมตอนสลับปีระหว่างแก้บทเรียนอยู่
    this.yearChangedSub = this.session.yearChanged$.subscribe(() => {
      this.editingLesson = null;
    });
  }

  ngOnDestroy(): void {
    this.yearChangedSub?.unsubscribe();
  }

  // ── Load lesson list ──
  loadLessons(): void {
    this.apiService.getLessons().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.lessonsList = data;
        }
      },
      error: () => {
        this.lessonsList = [
          // ── หลักสูตรปี 1 (Year 1 Curriculum) ──
          { id: 1, year_level: 1, name: 'Welcoming Students', titleEn: 'Unit 1: Welcoming Students', description: 'กล่าวทักทายนักศึกษา แนะนำตนเอง และเรียนรู้วัฒนธรรมการสื่อสาร' },
          { id: 2, year_level: 1, name: 'Telephoning & Office Calls', titleEn: 'Unit 2: Telephoning & Office Calls', description: 'รับสายโทรศัพท์ โอนสาย และการบันทึกข้อความในองค์กร' },
          { id: 3, year_level: 1, name: 'Giving Academic Presentation', titleEn: 'Unit 3: Giving Academic Presentation', description: 'การนำเสนอเชิงวิชาการ การใช้สไลด์ และการตอบคำถามอาจารย์' },
          { id: 4, year_level: 1, name: 'Teacher & Student Consultations', titleEn: 'Unit 4: Teacher & Student Consultations', description: 'การขอคำปรึกษาอาจารย์และการสนทนาโต้ตอบในชั้นเรียน' },
          { id: 5, year_level: 1, name: 'Giving Instructions & Directions', titleEn: 'Unit 5: Giving Instructions & Directions', description: 'การอธิบายขั้นตอนการทำงาน การบอกทิศทาง และข้อปฏิบัติ' },

          { id: 6, year_level: 1, name: 'Job Interview & Career Profile', titleEn: 'Unit 6: Job Interview & Career Profile', description: 'การสัมภาษณ์งานภาษาอังกฤษมืออาชีพ การนำเสนอพอร์ตโฟลิโอ และเรซูเม่' }
        ];
      }
    });
  }

  // ── Edit/Delete/Save Lessons ──
  editLesson(lesson: any): void {
    this.editingLesson = { ...lesson };
    this.isCreatingNew = false;
    this.loadLessonAiSettings(lesson.id);

    // Parse allowed games from contents if present
    if (lesson.contents && Array.isArray(lesson.contents)) {
      const gameItem = lesson.contents.find((c: any) => c.content_type === 'allowed_games');
      if (gameItem && gameItem.content_body) {
        this.editingLesson.allowedGames = gameItem.content_body.split(',');
      } else {
        this.editingLesson.allowedGames = ['scramble', 'dialogue'];
      }
    } else {
      this.editingLesson.allowedGames = ['scramble', 'dialogue'];
    }

    // Load vocabularies and speaking sentences
    if (!this.editingLesson.vocabularies) {
      this.editingLesson.vocabularies = [];
    }

    // Parse speakingQuestions if it is a string
    if (typeof this.editingLesson.speakingQuestions === 'string') {
      try {
        this.editingLesson.speakingQuestions = JSON.parse(this.editingLesson.speakingQuestions);
      } catch {
        this.editingLesson.speakingQuestions = [];
      }
    }
    if (!this.editingLesson.speakingQuestions) {
      this.editingLesson.speakingQuestions = [];
    }

    // Initialize syllabus details
    this.editingLesson.classHours = lesson.classHours || '';
    this.editingLesson.weekRange = lesson.weekRange || '';
    this.editingLesson.slidePath = lesson.slidePath || '';
    this.editingLesson.cover_image = lesson.coverImage || lesson.cover_image || '';

    // Handle JSON fields safely
    this.editingLesson.topics = Array.isArray(lesson.topics) ? lesson.topics : (typeof lesson.topics === 'string' ? JSON.parse(lesson.topics) : []);
    this.editingLesson.keywords = Array.isArray(lesson.keywords) ? lesson.keywords : (typeof lesson.keywords === 'string' ? JSON.parse(lesson.keywords) : []);
    this.editingLesson.objectives = Array.isArray(lesson.objectives) ? lesson.objectives : (typeof lesson.objectives === 'string' ? JSON.parse(lesson.objectives) : []);
    this.editingLesson.assessments = Array.isArray(lesson.assessments) ? lesson.assessments : (typeof lesson.assessments === 'string' ? JSON.parse(lesson.assessments) : []);
    this.editingLesson.preQuiz = Array.isArray(lesson.preQuiz) ? lesson.preQuiz : (typeof lesson.preQuiz === 'string' ? JSON.parse(lesson.preQuiz) : []);
    this.editingLesson.postQuiz = Array.isArray(lesson.postQuiz) ? lesson.postQuiz : (typeof lesson.postQuiz === 'string' ? JSON.parse(lesson.postQuiz) : []);
    // Custom Game Creator Studio content — actually load whatever was saved
    // for THIS lesson (lesson_contents row, title='custom_games') instead of
    // always resetting to the same hardcoded placeholder example on every
    // open. Previously this field was never sent anywhere real (saveLesson()
    // included it in the payload, but the backend silently ignored it and
    // previewCustomGame() was a fake modal) — now it round-trips for real.
    const customGamesItem = Array.isArray(lesson.contents)
      ? lesson.contents.find((c: any) => c.content_type === 'custom_games')
      : null;
    if (customGamesItem && customGamesItem.content_body) {
      try {
        this.editingLesson.customGames = JSON.parse(customGamesItem.content_body);
      } catch {
        this.editingLesson.customGames = null;
      }
    } else {
      this.editingLesson.customGames = null;
    }
    if (!this.editingLesson.customGames) {
      // บทเรียนนี้ยังไม่เคยตั้งค่าเนื้อหาเกมของตัวเองเลย — เริ่มจากค่าว่าง (ไม่ใช่ตัวอย่างหลอก)
      this.editingLesson.customGames = { scrambleWords: [], dialoguePairs: [], pictureWords: [], fillBlanks: [] };
    }
  }

  startNewLesson(): void {
    this.editingLesson = {
      name: '',
      titleEn: '',
      description: '',
      year_level: this.session.activeYearLevel,
      vocabularies: [],
      speakingQuestions: [],
      allowedGames: ['scramble', 'dialogue'],
      customGames: {
        scrambleWords: ['STUDENT', 'LESSON'],
        dialoguePairs: [{ speakerA: 'Hello!', speakerB: 'Nice to meet you!' }],
        pictureWords: [{ hintText: 'ภาพคำศัพท์ตัวอย่าง', correctWord: 'ENGLISH', image: '' }],
        fillBlanks: [{ sentence: 'Welcome to our ___ class.', missingWord: 'speaking' }]
      },
      classHours: '4 คาบเรียน',
      weekRange: 'สัปดาห์ที่ 1',
      slidePath: 'บทที่ 1.pdf',
      cover_image: '',
      topics: [],
      keywords: [],
      objectives: [],
      assessments: [],
      preQuiz: [],
      postQuiz: []
    };
    this.isCreatingNew = true;
    // บทเรียนใหม่ยังไม่มี lesson_id จริง — ต้องบันทึกบทเรียนก่อน แล้วค่อยกลับมาตั้งเกณฑ์ AI ทีหลัง
    this.aiSettings = { pass_threshold: null, game_weight: null, test_weight: null, ai_grading_instruction: null };
  }

  loadLessonAiSettings(lessonId: number): void {
    if (!lessonId) return;
    this.apiService.getLessonAiSettings(lessonId).subscribe({
      next: (data: any) => {
        this.aiSettings = {
          pass_threshold: data?.pass_threshold ?? null,
          game_weight: data?.game_weight ?? null,
          test_weight: data?.test_weight ?? null,
          ai_grading_instruction: data?.ai_grading_instruction ?? null,
        };
      },
      error: () => {
        this.aiSettings = { pass_threshold: null, game_weight: null, test_weight: null, ai_grading_instruction: null };
      }
    });
  }

  saveAiSettings(): void {
    if (!this.editingLesson?.id) return;
    this.aiSettingsSaving = true;
    this.apiService.saveLessonAiSettings(this.editingLesson.id, this.aiSettings).subscribe({
      next: () => {
        this.aiSettingsSaving = false;
        Swal.fire({
          icon: 'success',
          title: 'บันทึกเกณฑ์ AI สำเร็จ',
          text: 'AI จะใช้เกณฑ์นี้ตรวจ/ให้คะแนนนักเรียนในบทเรียนนี้ตั้งแต่ตอนนี้เป็นต้นไป',
          confirmButtonColor: '#0f766e',
          timer: 2000
        });
      },
      error: () => {
        this.aiSettingsSaving = false;
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'บันทึกเกณฑ์ AI ไม่สำเร็จ',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }

  // โหลด prompt เดิมของระบบ (ที่แอดมินตั้งค่าไว้ใน Admin ▸ APIs) มาโชว์อ้างอิงเฉยๆ — endpoint
  // นี้เดิมทำไว้ให้แอดมินเรียก แต่ backend นี้ไม่มี auth คุ้มกันเลยทั้งระบบอยู่แล้ว จึงเรียกจาก
  // หน้าอาจารย์ตรงๆ ได้เลยโดยไม่ต้องเพิ่ม endpoint ใหม่
  loadSystemSpeakingPromptDefault(): void {
    this.apiService.getAdminAiPrompts().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          const row = data.find((p: any) => p.scope_key === 'system_speaking');
          this.systemSpeakingPromptDefault = row?.prompt_text || '';
        }
      },
      error: () => {}
    });
  }

  // ── Prompt AI ประจำชั้นปี ──
  loadYearAiInstructions(): void {
    this.apiService.getYearAiInstructions().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          data.forEach((row: any) => {
            this.yearAiInstructions[row.year_level] = row.ai_instruction || '';
          });
        }
      },
      error: () => {}
    });
  }

  saveYearAiInstruction(): void {
    const year = this.session.activeYearLevel;
    const text = (this.yearAiInstructions[year] || '').trim();
    this.yearAiInstructionsSaving[year] = true;
    this.apiService.saveYearAiInstruction(year, text).subscribe({
      next: () => {
        this.yearAiInstructionsSaving[year] = false;
        Swal.fire({
          icon: 'success',
          title: 'บันทึก Prompt ประจำชั้นปีสำเร็จ',
          text: `AI จะใช้คำสั่งนี้เพิ่มเติมกับนักศึกษาชั้นปี ${year} ทุกคนตอนฝึกพูดอิสระ ตั้งแต่ตอนนี้เป็นต้นไป`,
          confirmButtonColor: '#0f766e',
          timer: 2200
        });
      },
      error: () => {
        this.yearAiInstructionsSaving[year] = false;
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'บันทึก Prompt ประจำชั้นปีไม่สำเร็จ',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }

  // Syllabus Array Helper Methods
  addTopic(): void {
    if (!this.editingLesson.topics) this.editingLesson.topics = [];
    this.editingLesson.topics.push('');
  }
  removeTopic(idx: number): void {
    this.editingLesson.topics.splice(idx, 1);
  }

  addKeyword(): void {
    if (!this.editingLesson.keywords) this.editingLesson.keywords = [];
    this.editingLesson.keywords.push('');
  }
  removeKeyword(idx: number): void {
    this.editingLesson.keywords.splice(idx, 1);
  }

  addObjective(): void {
    if (!this.editingLesson.objectives) this.editingLesson.objectives = [];
    this.editingLesson.objectives.push('');
  }
  removeObjective(idx: number): void {
    this.editingLesson.objectives.splice(idx, 1);
  }

  addAssessment(): void {
    if (!this.editingLesson.assessments) this.editingLesson.assessments = [];
    this.editingLesson.assessments.push('');
  }
  removeAssessment(idx: number): void {
    this.editingLesson.assessments.splice(idx, 1);
  }

  // ── Custom Game Studio Builder Helper Methods ──
  addScrambleWord(): void {
    if (!this.editingLesson.customGames) {
      this.editingLesson.customGames = { scrambleWords: [], dialoguePairs: [], pictureWords: [], fillBlanks: [] };
    }
    if (!this.editingLesson.customGames.scrambleWords) this.editingLesson.customGames.scrambleWords = [];
    this.editingLesson.customGames.scrambleWords.push('');
  }
  removeScrambleWord(i: number): void {
    this.editingLesson.customGames.scrambleWords.splice(i, 1);
  }

  addDialoguePair(): void {
    if (!this.editingLesson.customGames) {
      this.editingLesson.customGames = { scrambleWords: [], dialoguePairs: [], pictureWords: [], fillBlanks: [] };
    }
    if (!this.editingLesson.customGames.dialoguePairs) this.editingLesson.customGames.dialoguePairs = [];
    this.editingLesson.customGames.dialoguePairs.push({ speakerA: '', speakerB: '' });
  }
  removeDialoguePair(i: number): void {
    this.editingLesson.customGames.dialoguePairs.splice(i, 1);
  }

  addPictureWord(): void {
    if (!this.editingLesson.customGames) {
      this.editingLesson.customGames = { scrambleWords: [], dialoguePairs: [], pictureWords: [], fillBlanks: [] };
    }
    if (!this.editingLesson.customGames.pictureWords) this.editingLesson.customGames.pictureWords = [];
    this.editingLesson.customGames.pictureWords.push({ hintText: '', correctWord: '', image: '' });
  }
  removePictureWord(i: number): void {
    this.editingLesson.customGames.pictureWords.splice(i, 1);
  }

  onPictureWordImageUpload(i: number, event: any): void {
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
        if (res && res.url) {
          this.editingLesson.customGames.pictureWords[i].image = res.url;
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

  addFillBlank(): void {
    if (!this.editingLesson.customGames) {
      this.editingLesson.customGames = { scrambleWords: [], dialoguePairs: [], pictureWords: [], fillBlanks: [] };
    }
    if (!this.editingLesson.customGames.fillBlanks) this.editingLesson.customGames.fillBlanks = [];
    this.editingLesson.customGames.fillBlanks.push({ sentence: '', missingWord: '' });
  }
  removeFillBlank(i: number): void {
    this.editingLesson.customGames.fillBlanks.splice(i, 1);
  }

  previewCustomGame(gameType: string): void {
    // หมายเหตุ: โจทย์ที่กรอกไว้ด้านบนยังเป็นแค่ค่าในฟอร์ม (draft) — ต้องกด "บันทึกการ
    // เปลี่ยนแปลง / Save" ที่หัวข้อด้านบนก่อน โจทย์ชุดนี้ถึงจะมีผลกับนักเรียนจริง
    // (เดิม modal นี้อ้างว่า "บันทึกโจทย์เรียบร้อยแล้ว" ทั้งที่ยังไม่เคยส่งไปที่ไหนเลย)
    Swal.fire({
      title: `โจทย์มินิเกม: ${gameType}`,
      html: `
        <div style="text-align: left; font-size: 0.85rem; color: #334155;">
          <p>โจทย์ที่กรอกไว้ด้านบนเป็นค่าฉบับร่างในหน้านี้เท่านั้น</p>
          <p><strong>กด "บันทึกการเปลี่ยนแปลง / Save" ที่หัวข้อด้านบนก่อน</strong> เกมชุดนี้จึงจะมีผลกับนักเรียนจริงในขั้นตอน Roadmap ของบทเรียนนี้ค่ะ</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'เข้าใจแล้ว / Got it',
      confirmButtonColor: '#0d9488'
    });
  }

  // Exam (Pre-Test / Post-Test) Helper Methods
  private getQuizArray(field: 'preQuiz' | 'postQuiz'): { question: string; options: string[]; answer: number }[] {
    if (!this.editingLesson[field]) this.editingLesson[field] = [];
    return this.editingLesson[field];
  }
  addQuizQuestion(field: 'preQuiz' | 'postQuiz'): void {
    this.getQuizArray(field).push({ question: '', options: ['', ''], answer: 0 });
  }
  removeQuizQuestion(field: 'preQuiz' | 'postQuiz', idx: number): void {
    this.getQuizArray(field).splice(idx, 1);
  }
  addQuizOption(field: 'preQuiz' | 'postQuiz', qIdx: number): void {
    this.getQuizArray(field)[qIdx].options.push('');
  }
  removeQuizOption(field: 'preQuiz' | 'postQuiz', qIdx: number, optIdx: number): void {
    const q = this.getQuizArray(field)[qIdx];
    q.options.splice(optIdx, 1);
    if (q.answer >= q.options.length) q.answer = 0;
  }
  setQuizAnswer(field: 'preQuiz' | 'postQuiz', qIdx: number, optIdx: number): void {
    this.getQuizArray(field)[qIdx].answer = optIdx;
  }

  getPreGame(): string {
    if (!this.editingLesson || !this.editingLesson.allowedGames || this.editingLesson.allowedGames.length === 0) {
      return 'none';
    }
    return this.editingLesson.allowedGames[0] || 'none';
  }

  setPreGame(game: string): void {
    if (!this.editingLesson) return;
    if (!this.editingLesson.allowedGames) {
      this.editingLesson.allowedGames = [];
    }
    if (this.editingLesson.allowedGames.length === 0) {
      this.editingLesson.allowedGames = [game, 'none'];
    } else {
      this.editingLesson.allowedGames[0] = game;
    }
  }

  getPostGame(): string {
    if (!this.editingLesson || !this.editingLesson.allowedGames || this.editingLesson.allowedGames.length < 2) {
      return 'none';
    }
    return this.editingLesson.allowedGames[1] || 'none';
  }

  setPostGame(game: string): void {
    if (!this.editingLesson) return;
    if (!this.editingLesson.allowedGames) {
      this.editingLesson.allowedGames = ['none', game];
    } else {
      while (this.editingLesson.allowedGames.length < 2) {
        this.editingLesson.allowedGames.push('none');
      }
      this.editingLesson.allowedGames[1] = game;
    }
  }

  saveLesson(): void {
    if (!this.editingLesson.name) {
      Swal.fire({
        icon: 'warning',
        title: 'กรอกข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกชื่อบทเรียนภาษาอังกฤษให้ครบถ้วน',
        confirmButtonColor: '#0f766e'
      });
      return;
    }

    // กำหนดให้ชื่ออังกฤษทั้งสองฝั่งเท่ากันตามความต้องการของผู้ใช้
    this.editingLesson.titleEn = this.editingLesson.name;

    this.apiService.saveLesson(this.editingLesson).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'บันทึกข้อมูลบทเรียนสำเร็จเรียบร้อยค่ะ',
          confirmButtonColor: '#0f766e',
          timer: 2000
        });
        this.editingLesson = null;
        this.isCreatingNew = false;
        this.loadLessons();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'เกิดข้อผิดพลาดในการบันทึกบทเรียน',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }

  deleteLesson(id: number): void {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'ต้องการลบบทเรียนนี้ออกจากระบบหรือไม่? การกระทำนี้ไม่สามารถเรียกคืนได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BE185D',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'ลบ / Delete',
      cancelButtonText: 'ยกเลิก / Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deleteLesson(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'ลบสำเร็จ',
              text: 'ลบบทเรียนสำเร็จเรียบร้อยแล้วค่ะ',
              confirmButtonColor: '#0f766e',
              timer: 1500
            });
            this.loadLessons();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ลบบทเรียนล้มเหลว',
              confirmButtonColor: '#0f766e'
            });
          }
        });
      }
    });
  }

  // Filter Helper
  get filteredLessons(): any[] {
    return this.lessonsList.filter(les => (les.year_level || 1) === this.session.activeYearLevel);
  }

  onSlideUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      Swal.fire({
        icon: 'error',
        title: 'ชนิดไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์เอกสาร PDF เท่านั้นค่ะ',
        confirmButtonColor: '#0f766e'
      });
      return;
    }

    Swal.fire({
      title: 'กำลังอัปโหลด...',
      text: 'ระบบกำลังนำส่งไฟล์ PDF สไลด์ไปยังเซิร์ฟเวอร์',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.apiService.uploadSlidePdf(file).subscribe({
      next: (res: any) => {
        Swal.close();
        if (res && res.url) {
          this.editingLesson.slidePath = res.url;
          Swal.fire({
            icon: 'success',
            title: 'อัปโหลดสไลด์สำเร็จ',
            text: `บันทึกไฟล์สไลด์บทเรียนเรียบร้อยแล้วค่ะ`,
            confirmButtonColor: '#0f766e',
            timer: 2000
          });
        }
      },
      error: () => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'อัปโหลดล้มเหลว',
          text: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ PDF สไลด์บทเรียน',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }

  // รูปปกบทเรียนใส่หรือไม่ใส่ก็ได้ — ปุ่มนี้แค่ล้างค่าในฟอร์ม ยังไม่ยิงลบไฟล์ที่อัปโหลด
  // ไว้จนกว่าจะกด "บันทึกบทเรียน" (saveLesson ส่ง cover_image ว่างไปแทนค่าเดิม)
  removeCoverImage(): void {
    this.editingLesson.cover_image = '';
  }

  onCoverImageUpload(event: any): void {
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

    Swal.fire({
      title: 'กำลังอัปโหลด...',
      text: 'ระบบกำลังนำส่งรูปปกบทเรียนไปยังเซิร์ฟเวอร์',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.apiService.uploadFile(file).subscribe({
      next: (res: any) => {
        Swal.close();
        if (res && res.url) {
          this.editingLesson.cover_image = res.url;
          Swal.fire({
            icon: 'success',
            title: 'อัปโหลดรูปปกสำเร็จ',
            text: 'บันทึกรูปปกบทเรียนเรียบร้อยแล้วค่ะ',
            confirmButtonColor: '#0f766e',
            timer: 2000
          });
        }
      },
      error: () => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'อัปโหลดล้มเหลว',
          text: 'เกิดข้อผิดพลาดในการอัปโหลดรูปปกบทเรียน',
          confirmButtonColor: '#0f766e'
        });
      }
    });
  }
}
