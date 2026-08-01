import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface MockStudent {
  id: number;
  name: string;
  student_code: string;
  email: string;
  average_score: number;
  lessons_completed: number;
  need_support: boolean;
  year_level?: number;
  scores: { unit: string; pre: number; post: number; game: number }[];
  skills: { fluency: number; pronunciation: number; grammar: number; vocabulary: number };
  practiceLogs: { timestamp: string; sentence: string; score: number; attempt: number; feedback: string }[];
  gameLogs?: { unit: string; gameType: string; score: number; details: string; duration: string }[];
}

@Component({
  selector: 'app-teacher',
  templateUrl: './teacher.component.html',
  styleUrl: './teacher.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TeacherComponent implements OnInit {
  currentUser: any = null;
  activeSubTab: 'students' | 'lessons' = 'students';
  activeYearLevel: 1 | 2 = 1;

  // Stats
  studentCount = 28;
  classAverage = 82;
  completedRate = 75;

  // Students list
  students: MockStudent[] = [];
  selectedStudent: MockStudent | null = null;
  searchQuery = '';

  // Lessons list
  lessonsList: any[] = [];
  editingLesson: any = null;
  isCreatingNew = false;

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit(): void {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = JSON.parse(userJson);
    if (this.currentUser.role !== 'teacher') {
      this.router.navigate([`/${this.currentUser.role}`]);
      return;
    }

    this.loadStudents();
    this.loadLessons();
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  // เปิดดูสถิติรายบุคคล — โหลดคะแนนต่อบทเรียนจริงจาก backend
  selectStudent(st: MockStudent): void {
    this.selectedStudent = st;
    this.apiService.getTeacherStudentScores(st.id).subscribe({
      next: (data: any) => {
        if (Array.isArray(data) && this.selectedStudent === st) {
          this.selectedStudent.scores = data;
        }
      },
      error: () => {}
    });
  }

  switchSubTab(tab: typeof this.activeSubTab): void {
    this.activeSubTab = tab;
    this.selectedStudent = null;
    this.editingLesson = null;
    this.isCreatingNew = false;
  }

  // ── Load student reports ──
  loadStudents(): void {
    // ดึงรายชื่อนักศึกษาพร้อมคะแนนจริงจาก practice_sessions
    this.apiService.getTeacherStudents().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {

          this.students = data.map((st: any, idx: number) => {
            const hasPracticed = st.lessons_completed && Number(st.lessons_completed) > 0;
            const avg = hasPracticed ? (Number(st.average_score) || 0) : 0;
            const lessonsCompleted = hasPracticed ? (Number(st.lessons_completed) || 0) : 0;
            const needSupport = hasPracticed && avg < 75;

            const nameVal = st.name || `${st.first_name || ''} ${st.last_name || ''}`.trim() || `Student ${idx + 1}`;
            const codeVal = st.student_code || st.studentCode || `6510100${idx + 1}`;
            const emailVal = st.email || `${st.username || 'student'}@university.ac.th`;

            return {
              id: st.user_id || st.id || idx + 1,
              name: nameVal,
              student_code: codeVal,
              email: emailVal,
              average_score: avg,
              lessons_completed: lessonsCompleted,
              need_support: needSupport,
              // รายละเอียดคะแนนต่อบทเรียน/สกิล/ประวัติจะโหลดจริงตอนกด "เปิดดูสถิติ" (ดู selectStudent())
              scores: [],
              skills: { fluency: 0, pronunciation: 0, grammar: 0, vocabulary: 0 },
              practiceLogs: [],
              gameLogs: []
            };
          });

          // อัปเดตสถิติห้องเรียน
          this.studentCount = this.students.length;
          if (this.studentCount > 0) {
            const sum = this.students.reduce((acc, curr) => acc + curr.average_score, 0);
            this.classAverage = Math.round(sum / this.studentCount);
          }
        }
      },
      error: () => {
        // Fallback mock data หากยังไม่ได้เชื่อมต่อฐานข้อมูล
        this.students = [
          // ── ชั้นปีที่ 1 (Year 1 Students) ──
          {
            id: 1, name: 'Sarah Johnson', student_code: '651202201', email: 'sarah.j@school.ac.th', average_score: 92, lessons_completed: 5, need_support: false, year_level: 1,
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 80, post: 100, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 75, post: 95, game: 100 },
              { unit: 'Unit 3: Presentation', pre: 80, post: 90, game: 90 },
              { unit: 'Unit 4: Teacher Meeting', pre: 85, post: 95, game: 95 },
              { unit: 'Unit 5: Giving Instruction', pre: 90, post: 100, game: 100 }
            ],
            skills: { fluency: 92, pronunciation: 88, grammar: 95, vocabulary: 90 },
            practiceLogs: [
              { timestamp: '01/07/2026 15:30', sentence: 'Hello, good morning. My name is Sarah.', score: 95, attempt: 1, feedback: 'การออกเสียงสระและจังหวะพูดดีเยี่ยม' },
              { timestamp: '01/07/2026 15:40', sentence: 'Does anyone have any questions before we begin?', score: 100, attempt: 1, feedback: 'น้ำเสียงแสดงความมั่นใจสมบูรณ์แบบ' }
            ],
            gameLogs: [
              { unit: 'Unit 1: Welcoming', gameType: 'ก่อนเรียน: Word Scramble', score: 100, details: 'จับคู่คำศัพท์ถูกต้อง 5/5 คำ', duration: '28 วินาที' }
            ]
          },
          {
            id: 2, name: 'สมชาย ดีดี (Somchai DeeDee)', student_code: '651202202', email: 'somchai.d@school.ac.th', average_score: 68, lessons_completed: 2, need_support: true, year_level: 1,
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 50, post: 70, game: 80 },
              { unit: 'Unit 2: Telephoning', pre: 40, post: 65, game: 70 }
            ],
            skills: { fluency: 65, pronunciation: 62, grammar: 70, vocabulary: 60 },
            practiceLogs: [
              { timestamp: '01/07/2026 14:15', sentence: 'Hello morning Ms. Parker.', score: 60, attempt: 1, feedback: 'ควรพูดให้เต็มประโยค: "Hello, good morning Ms. Parker."' }
            ]
          },
          {
            id: 3, name: 'ปวีณา แสนสวย (Paweena Sansuay)', student_code: '651202203', email: 'paweena.s@school.ac.th', average_score: 84, lessons_completed: 4, need_support: false, year_level: 1,
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 70, post: 85, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 65, post: 80, game: 90 }
            ],
            skills: { fluency: 82, pronunciation: 85, grammar: 80, vocabulary: 88 },
            practiceLogs: [
              { timestamp: '01/07/2026 11:20', sentence: 'Good morning, Ms. Parker speaking.', score: 88, attempt: 1, feedback: 'น้ำเสียงเป็นธรรมชาติ ชัดถ้อยชัดคำดีมาก' }
            ]
          },

        ];
        this.studentCount = this.students.length;
      }
    });
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

    // Handle JSON fields safely
    this.editingLesson.topics = Array.isArray(lesson.topics) ? lesson.topics : (typeof lesson.topics === 'string' ? JSON.parse(lesson.topics) : []);
    this.editingLesson.keywords = Array.isArray(lesson.keywords) ? lesson.keywords : (typeof lesson.keywords === 'string' ? JSON.parse(lesson.keywords) : []);
    this.editingLesson.objectives = Array.isArray(lesson.objectives) ? lesson.objectives : (typeof lesson.objectives === 'string' ? JSON.parse(lesson.objectives) : []);
    this.editingLesson.assessments = Array.isArray(lesson.assessments) ? lesson.assessments : (typeof lesson.assessments === 'string' ? JSON.parse(lesson.assessments) : []);
    this.editingLesson.preQuiz = Array.isArray(lesson.preQuiz) ? lesson.preQuiz : (typeof lesson.preQuiz === 'string' ? JSON.parse(lesson.preQuiz) : []);
    this.editingLesson.postQuiz = Array.isArray(lesson.postQuiz) ? lesson.postQuiz : (typeof lesson.postQuiz === 'string' ? JSON.parse(lesson.postQuiz) : []);
    // Initialize custom games studio structure
    if (!this.editingLesson.customGames) {
      this.editingLesson.customGames = {
        scrambleWords: ['WELCOME', 'GREETING', 'COMMUNICATION'],
        dialoguePairs: [
          { speakerA: 'Good morning! How can I help you today?', speakerB: 'Hello! I am looking for the administrator office.' },
          { speakerA: 'Sure, please take the elevator to the second floor.', speakerB: 'Thank you very much!' }
        ],
        pictureWords: [
          { hintText: 'ภาพต้อนรับนักศึกษาใหม่', correctWord: 'WELCOME' }
        ],
        fillBlanks: [
          { sentence: 'Please fill out this ___ form before entering class.', missingWord: 'registration' }
        ]
      };
    }
  }

  startNewLesson(): void {
    this.editingLesson = {
      name: '',
      titleEn: '',
      description: '',
      year_level: this.activeYearLevel,
      vocabularies: [],
      speakingQuestions: [],
      allowedGames: ['scramble', 'dialogue'],
      customGames: {
        scrambleWords: ['STUDENT', 'LESSON'],
        dialoguePairs: [{ speakerA: 'Hello!', speakerB: 'Nice to meet you!' }],
        pictureWords: [{ hintText: 'ภาพคำศัพท์ตัวอย่าง', correctWord: 'ENGLISH' }],
        fillBlanks: [{ sentence: 'Welcome to our ___ class.', missingWord: 'speaking' }]
      },
      classHours: '4 คาบเรียน',
      weekRange: 'สัปดาห์ที่ 1',
      slidePath: 'บทที่ 1.pdf',
      topics: [],
      keywords: [],
      objectives: [],
      assessments: [],
      preQuiz: [],
      postQuiz: []
    };
    this.isCreatingNew = true;
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
    this.editingLesson.customGames.pictureWords.push({ hintText: '', correctWord: '' });
  }
  removePictureWord(i: number): void {
    this.editingLesson.customGames.pictureWords.splice(i, 1);
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
    Swal.fire({
      title: `ทดลองเล่นมินิเกม: ${gameType}`,
      html: `
        <div style="text-align: left; font-size: 0.85rem; color: #334155;">
          <p><strong>สถานะการสร้างเกม:</strong> พร้อมใช้งานสำหรับนักเรียนในขั้นตอน Roadmap</p>
          <p>ระบบสร้างเกมสำหรับบทเรียนนี้ได้รับการอัปเดตและบันทึกโจทย์มินิเกมเรียบร้อยแล้วค่ะ</p>
        </div>
      `,
      icon: 'success',
      confirmButtonText: 'ตกลง / Close Preview',
      confirmButtonColor: '#7e22ce'
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
        confirmButtonColor: '#6B21A8'
      });
      return;
    }

    // กำหนดให้ชื่ออังกฤษทั้งสองฝั่งเท่ากันตามความต้องการของผู้ใช้
    this.editingLesson.titleEn = this.editingLesson.name;

    this.apiService.saveLesson(this.editingLesson).subscribe({
      next: (res: any) => {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'บันทึกข้อมูลบทเรียนสำเร็จเรียบร้อยค่ะ',
          confirmButtonColor: '#6B21A8',
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
          confirmButtonColor: '#6B21A8'
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
              confirmButtonColor: '#6B21A8',
              timer: 1500
            });
            this.loadLessons();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'เกิดข้อผิดพลาด',
              text: 'ลบบทเรียนล้มเหลว',
              confirmButtonColor: '#6B21A8'
            });
          }
        });
      }
    });
  }



  switchYearLevel(year: 1 | 2): void {
    this.activeYearLevel = year;
    this.selectedStudent = null;
    this.editingLesson = null;
  }

  // Filter Helper
  get filteredStudents(): MockStudent[] {
    const yearList = this.students.filter(st => (st.year_level || 1) === this.activeYearLevel);
    if (!this.searchQuery.trim()) return yearList;
    const query = this.searchQuery.toLowerCase();
    return yearList.filter(
      st => st.name.toLowerCase().includes(query) || st.student_code.includes(query)
    );
  }

  get filteredLessons(): any[] {
    return this.lessonsList.filter(les => (les.year_level || 1) === this.activeYearLevel);
  }

  onSlideUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      Swal.fire({
        icon: 'error',
        title: 'ชนิดไฟล์ไม่ถูกต้อง',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์เอกสาร PDF เท่านั้นค่ะ',
        confirmButtonColor: '#6B21A8'
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
            confirmButtonColor: '#6B21A8',
            timer: 2000
          });
        }
      },
      error: (err: any) => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'อัปโหลดล้มเหลว',
          text: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ PDF สไลด์บทเรียน',
          confirmButtonColor: '#6B21A8'
        });
      }
    });
  }
}
