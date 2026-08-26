import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { TeacherSessionService } from '../../services/teacher-session.service';

interface MockStudent {
  id: number;
  name: string;
  student_code: string;
  email: string;
  average_score: number;
  lessons_completed: number;
  need_support: boolean;
  year_level?: number;
  /** ปีการศึกษาที่นักศึกษาคนนี้ "มีคะแนนจริง" อยู่ (จาก practice_sessions → lessons.year_level)
   *  — อาจมีมากกว่า 1 ปีถ้าเคยทำทั้งบทปี 1 และปี 2, ใช้จัดกลุ่มเข้าแท็บแทน year_level อย่างเดียว
   *  (ดู backend db/teacher.py: get_teacher_students() สำหรับที่มาของบั๊กที่แก้) */
  practicedYears: number[];
  averageScoreByYear: { [year: number]: number };
  lessonsCompletedByYear: { [year: number]: number };
  scores: { unit: string; pre: number; post: number; game: number }[];
  skills: { fluency: number; pronunciation: number; grammar: number; vocabulary: number };
  practiceLogs: { timestamp: string; sentence: string; score: number; attempt: number; feedback: string }[];
  gameLogs?: { unit: string; gameType: string; score: number; details: string; duration: string }[];
  /** ประวัติการทำกิจกรรมรายครั้ง (ทุกแถวจริงใน practice_sessions ไม่ใช่ค่าสรุป) พร้อม
   *  ai_feedback ถ้ามี — โหลดจริงตอนกด "เปิดดูสถิติ" เหมือน scores (ดู selectStudent()) */
  activity: {
    session_id: number;
    lesson_name: string;
    quiz_type: string | null;
    practice_mode: string | null;
    total_score: number;
    ai_feedback: string | null;
    created_at_formatted: string;
  }[];
}

// "รายงานสถิตินักศึกษา" tab extracted verbatim from the old TeacherComponent
// (teacher.component.ts/.html). Reads/writes the shared activeYearLevel via
// TeacherSessionService so it stays in sync with the Lessons page.
@Component({
  selector: 'app-teacher-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-students.component.html',
  styleUrl: './teacher-students.component.scss',
})
export class TeacherStudentsComponent implements OnInit, OnDestroy {
  // Students list
  students: MockStudent[] = [];
  selectedStudent: MockStudent | null = null;
  searchQuery = '';

  private yearChangedSub?: Subscription;

  constructor(public session: TeacherSessionService, private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadStudents();
    // ปุ่มสลับปีย้ายไปอยู่ใน shell แล้ว (ดู TeacherShellComponent) — ฟัง event ตรงนี้แทน
    // เพื่อยังคงเคลียร์ selectedStudent เหมือนเดิมตอนสลับปีระหว่างดูรายละเอียดนักศึกษาอยู่
    this.yearChangedSub = this.session.yearChanged$.subscribe(() => {
      this.selectedStudent = null;
    });
  }

  ngOnDestroy(): void {
    this.yearChangedSub?.unsubscribe();
  }

  // แปล quiz_type/practice_mode ดิบจาก DB เป็นป้ายภาษาไทยให้อ่านง่ายในประวัติการทำ
  activityTypeLabel(a: { quiz_type: string | null; practice_mode: string | null }): string {
    const labels: { [key: string]: string } = {
      pre_test: 'ทำแบบทดสอบก่อนเรียน',
      post_test: 'ทำแบบทดสอบหลังเรียน',
      pre_game: 'เล่นเกมก่อนเรียน',
      post_game: 'เล่นเกมหลังเรียน',
    };
    if (a.quiz_type && labels[a.quiz_type]) return labels[a.quiz_type];
    return 'ฝึกพูด (' + (a.practice_mode || 'text_to_text') + ')';
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
    this.apiService.getTeacherStudentActivity(st.id).subscribe({
      next: (data: any) => {
        if (Array.isArray(data) && this.selectedStudent === st) {
          this.selectedStudent.activity = data;
        }
      },
      error: () => {}
    });
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

            // ปีที่มีคะแนนจริง (จาก practice_sessions → lessons.year_level ฝั่ง backend)
            // เช่น "1,2" ถ้าเคยทำทั้งบทปี 1 และปี 2 — คนละเรื่องกับ year_level/year_of_study
            // ซึ่งเป็นแค่โปรไฟล์ที่อาจไม่เคยถูกตั้งค่า (NULL) ก็ได้
            const practicedYears: number[] = String(st.practiced_years || '')
              .split(',')
              .map((y: string) => Number(y))
              .filter((y: number) => y === 1 || y === 2);

            const averageScoreByYear: { [year: number]: number } = {
              1: Number(st.average_score_y1) || 0,
              2: Number(st.average_score_y2) || 0,
            };
            const lessonsCompletedByYear: { [year: number]: number } = {
              1: Number(st.lessons_completed_y1) || 0,
              2: Number(st.lessons_completed_y2) || 0,
            };

            return {
              id: st.user_id || st.id || idx + 1,
              name: nameVal,
              student_code: codeVal,
              email: emailVal,
              average_score: avg,
              lessons_completed: lessonsCompleted,
              need_support: needSupport,
              year_level: Number(st.year_of_study || st.year_level) || 1,
              practicedYears,
              averageScoreByYear,
              lessonsCompletedByYear,
              // รายละเอียดคะแนนต่อบทเรียน/สกิล/ประวัติจะโหลดจริงตอนกด "เปิดดูสถิติ" (ดู selectStudent())
              scores: [],
              skills: { fluency: 0, pronunciation: 0, grammar: 0, vocabulary: 0 },
              practiceLogs: [],
              gameLogs: [],
              activity: []
            };
          });
          // studentCount/classAverage/completedRate are getters derived from
          // filteredStudents (see below) — no assignment needed here, and
          // that keeps them reacting to the active year tab automatically.
        }
      },
      error: () => {
        // Fallback mock data หากยังไม่ได้เชื่อมต่อฐานข้อมูล
        this.students = [
          // ── ชั้นปีที่ 1 (Year 1 Students) ──
          {
            id: 1, name: 'Sarah Johnson', student_code: '651202201', email: 'sarah.j@school.ac.th', average_score: 92, lessons_completed: 5, need_support: false, year_level: 1,
            practicedYears: [1], averageScoreByYear: { 1: 92, 2: 0 }, lessonsCompletedByYear: { 1: 5, 2: 0 },
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
            ],
            activity: []
          },
          {
            id: 2, name: 'สมชาย ดีดี (Somchai DeeDee)', student_code: '651202202', email: 'somchai.d@school.ac.th', average_score: 68, lessons_completed: 2, need_support: true, year_level: 1,
            practicedYears: [1], averageScoreByYear: { 1: 68, 2: 0 }, lessonsCompletedByYear: { 1: 2, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 50, post: 70, game: 80 },
              { unit: 'Unit 2: Telephoning', pre: 40, post: 65, game: 70 }
            ],
            skills: { fluency: 65, pronunciation: 62, grammar: 70, vocabulary: 60 },
            practiceLogs: [
              { timestamp: '01/07/2026 14:15', sentence: 'Hello morning Ms. Parker.', score: 60, attempt: 1, feedback: 'ควรพูดให้เต็มประโยค: "Hello, good morning Ms. Parker."' }
            ],
            activity: []
          },
          {
            id: 3, name: 'ปวีณา แสนสวย (Paweena Sansuay)', student_code: '651202203', email: 'paweena.s@school.ac.th', average_score: 84, lessons_completed: 4, need_support: false, year_level: 1,
            practicedYears: [1], averageScoreByYear: { 1: 84, 2: 0 }, lessonsCompletedByYear: { 1: 4, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 70, post: 85, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 65, post: 80, game: 90 }
            ],
            skills: { fluency: 82, pronunciation: 85, grammar: 80, vocabulary: 88 },
            practiceLogs: [
              { timestamp: '01/07/2026 11:20', sentence: 'Good morning, Ms. Parker speaking.', score: 88, attempt: 1, feedback: 'น้ำเสียงเป็นธรรมชาติ ชัดถ้อยชัดคำดีมาก' }
            ],
            activity: []
          },

        ];
      }
    });
  }

  // Filter Helper — จัดกลุ่มนักศึกษาเข้าแท็บปีตาม "ปีที่มีคะแนนจริง" (practicedYears) ก่อน
  // เสมอ ไม่ใช่แค่โปรไฟล์ year_level/year_of_study เฉยๆ เพราะ field นั้นอาจเป็น NULL หรือไม่
  // ตรงกับบทที่นักศึกษาทำจริง ทำให้คะแนนที่บันทึกลง DB แล้วดูเหมือน "ไม่ส่งถึงอาจารย์" (เห็นแค่
  // ในแท็บผิดปี) — นักศึกษาที่ยังไม่เคยทำอะไรเลย (practicedYears ว่าง) จะ fallback ไปโชว์ตาม
  // year_level/year_of_study เพื่อให้อาจารย์ยังเห็นรายชื่อครบตั้งแต่แรก
  //
  // แก้บั๊ก (พบจริงจาก DB — มีนักศึกษา year_of_study 3 และ 4 อยู่จริง): ระบบมีแค่ 2 แท็บ (ปี 1/ปี 2)
  // ค่า fallback เดิม `(st.year_level || 1) === year` ไม่เคยตรงกับปี 1 หรือ 2 เลยถ้า year_level
  // เป็น 3/4/ค่าอื่น ทำให้นักศึกษากลุ่มนี้หายไปจากทั้งสองแท็บเลยถ้ายังไม่เคยฝึกอะไร (ไม่ใช่แค่
  // "จำนวนนักศึกษาไม่ตรง" แต่หายจริง) — clamp ให้เหลือแค่ 1 หรือ 2 เสมอ (ค่าอื่นทั้งหมด fallback
  // ไปปี 1) เพื่อให้ทุกคนโผล่อย่างน้อย 1 แท็บแน่นอน
  private normalizeYear(rawYear: number | undefined): 1 | 2 {
    return rawYear === 2 ? 2 : 1;
  }

  get filteredStudents(): MockStudent[] {
    const year = this.session.activeYearLevel;
    const yearList = this.students
      .filter(st => (st.practicedYears.length > 0 ? st.practicedYears.includes(year) : this.normalizeYear(st.year_level) === year))
      .map(st => {
        const hasYearData = st.practicedYears.includes(year);
        const average_score = hasYearData ? (st.averageScoreByYear[year] || 0) : st.average_score;
        const lessons_completed = hasYearData ? (st.lessonsCompletedByYear[year] || 0) : st.lessons_completed;
        return { ...st, average_score, lessons_completed, need_support: lessons_completed > 0 && average_score < 75 };
      });
    if (!this.searchQuery.trim()) return yearList;
    const query = this.searchQuery.toLowerCase();
    return yearList.filter(
      st => st.name.toLowerCase().includes(query) || st.student_code.includes(query)
    );
  }

  // สถิติ 3 ใบบนสุด — คำนวณจาก filteredStudents (แท็บที่กำลังดูอยู่) เสมอ แทนที่จะเป็นค่ารวม
  // ทั้งหมดคงที่แบบเดิม (studentCount/classAverage เดิมคำนวณครั้งเดียวตอนโหลดจากทั้ง 15 คนไม่
  // สนใจแท็บที่เลือก, ส่วน completedRate เป็นเลข mock คงที่ = 75 มาตลอด ไม่เคยคำนวณจากข้อมูลจริงเลย)
  get studentCount(): number {
    return this.filteredStudents.length;
  }

  get classAverage(): number {
    const list = this.filteredStudents;
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, st) => acc + st.average_score, 0);
    return Math.round(sum / list.length);
  }

  // "อัตราความสำเร็จ (การส่งงานและฝึกพูด)" — สัดส่วนนักศึกษาในแท็บนี้ที่มีบทเรียนสำเร็จอย่างน้อย
  // 1 บท (เคยส่งงาน/ฝึกพูดจริง) ไม่ใช่แค่ค่าคงที่
  get completedRate(): number {
    const list = this.filteredStudents;
    if (list.length === 0) return 0;
    const engaged = list.filter(st => st.lessons_completed > 0).length;
    return Math.round((engaged / list.length) * 100);
  }
}
