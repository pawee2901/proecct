import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { TeacherSessionService } from '../../services/teacher-session.service';
import { escapeHtml } from '../../utils/escape-html';
import { UNIVERSITY_OPTIONS } from '../../../shared/university-options';

interface MockStudent {
  id: number;
  name: string;
  /** ชื่อจริง/นามสกุลแยกกัน (name ด้านบนคือ "first_name last_name" รวมกันไว้แสดงผลเฉยๆ) —
   *  เก็บแยกไว้ให้ openEditStudentModal() prefill ฟอร์มถูกต้อง แทนที่จะต้อง split(' ') เอา
   *  จาก name ซึ่งพังได้กับนามสกุลที่มีช่องว่าง */
  first_name: string;
  last_name: string;
  student_code: string;
  email: string;
  average_score: number;
  lessons_completed: number;
  need_support: boolean;
  year_level?: number;
  /** ห้องเรียนที่นักศึกษาคนนี้สังกัดอยู่จริง (users.classroom_id, ตั้งค่าตอนสมัคร หรือย้าย
   *  ทีหลังผ่าน "ย้ายเข้าห้อง") — null ถ้าสมัครไว้ก่อนมีฟีเจอร์ห้องเรียน (ดู unassignedStudents) */
  classroom_id: number | null;
  /** ห้องเรียนที่นักศึกษาคนนี้ "มีคะแนนจริง" อยู่ (จาก practice_sessions → lessons.classroom_id)
   *  — อาจไม่ตรงกับ classroom_id ด้านบนเลยก็ได้ (เช่น สมัครไว้ก่อนมีฟีเจอร์ห้องเรียน ระบบเลย
   *  backfill classroom_id ไปที่ "ห้องเริ่มต้น" ห้องเดียว ทั้งที่จริงเคยฝึกทั้งปี 1 และปี 2) —
   *  filteredStudents union ค่านี้เข้ากับ classroom_id กันคะแนนจริงหายไปจากทุกห้อง */
  practicedClassrooms: number[];
  /** ปีการศึกษาที่นักศึกษาคนนี้ "มีคะแนนจริง" อยู่ (จาก practice_sessions → lessons.year_level)
   *  — อาจมีมากกว่า 1 ปีถ้าเคยทำทั้งบทปี 1 และปี 2, ใช้จัดกลุ่มเข้าแท็บแทน year_level อย่างเดียว
   *  (ดู backend db/teacher.py: get_teacher_students() สำหรับที่มาของบั๊กที่แก้) */
  practicedYears: number[];
  averageScoreByYear: { [year: number]: number };
  lessonsCompletedByYear: { [year: number]: number };
  /** overall/passed/reasoning มาจาก ai/lesson_grading.py (backend) ที่รวม pre/post/game
   *  เป็นคะแนนเดียว + ผ่านหรือไม่ — อาจเป็น null ได้ถ้า backend เก่ายังไม่มี field นี้ หรือ
   *  AI คำนวณไม่สำเร็จตอนนั้น (ดูคอมเมนต์ compute_lesson_overall_score) */
  scores: { unit: string; pre: number; post: number; game: number; overall?: number | null; passed?: boolean | null; reasoning?: string }[];
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
    /** คะแนนย่อยของรอบฝึกพูดนี้ (แกะจาก ai_feedback ฝั่ง backend, ดู
     *  get_teacher_student_activity() ใน db/teacher.py) — null ทั้งสามถ้าแถวนี้เป็น
     *  แบบทดสอบ/เกม หรือฝึกพูดโหมดที่ไม่เคยผ่าน evaluate-session (ไม่มีคะแนนย่อยให้แกะ) */
    pronunciation_score: number | null;
    speed_score: number | null;
    grammar_score: number | null;
  }[];
}

// "รายงานสถิตินักศึกษา" tab extracted verbatim from the old TeacherComponent
// (teacher.component.ts/.html). Reads/writes the shared activeYearLevel via
// TeacherSessionService so it stays in sync with the Lessons page.
type ActivityCategory = 'speech-to-speech' | 'text-to-text' | 'speech-to-text' | 'text-to-speech' | 'test' | 'game';

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

  // เดิมคอลัมน์ "ประวัติการทำ" โชว์ activity ทุกแถวรวมกันเป็นลิสต์ยาวเดียว ไม่แยกหมวดหมู่เลย
  // ทั้งที่ข้อมูลเดียวกันนี้ (practice_sessions ผ่าน get_teacher_student_activity()) ก็ครบ
  // ทั้ง 6 โหมดอยู่แล้ว เหมือนที่หน้าโปรไฟล์ของนักศึกษาเองแยกเป็นการ์ดหมวดหมู่ให้เลือกดู — เพิ่ม
  // การแยกหมวดหมู่แบบเดียวกันฝั่งอาจารย์ด้วย (คลิกเข้าไปดูทีละหมวด แทนลิสต์ยาวปนกันหมด)
  selectedActivityCategory: ActivityCategory | null = null;
  readonly activityCategories: { id: ActivityCategory; icon: string; label: string }[] = [
    { id: 'speech-to-speech', icon: '📞', label: 'Speech-to-Speech' },
    { id: 'text-to-text', icon: '💬', label: 'Text-to-Text' },
    { id: 'speech-to-text', icon: '🎤', label: 'Speech-to-Text' },
    { id: 'text-to-speech', icon: '🔊', label: 'Text-to-Speech' },
    { id: 'test', icon: '📋', label: 'Pre/Post-Test' },
    { id: 'game', icon: '🎮', label: 'เกมฝึกทักษะ' },
  ];

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
    const cat = this.activityCategories.find((c) => c.id === (a.practice_mode || '').replace(/_/g, '-'));
    return cat ? `ฝึกพูด (${cat.label})` : 'ฝึกพูด (' + (a.practice_mode || 'text_to_text') + ')';
  }

  // จัดกลุ่ม activity รายแถวเข้า 1 ใน 6 หมวดเดียวกับที่หน้าโปรไฟล์ของนักศึกษาเองใช้ (ดู
  // getFilteredProfileLogs() ใน student-profile.component.ts) — quiz_type ก่อน (test/game)
  // แล้วค่อย practice_mode (DB เก็บเป็น underscore เช่น speech_to_speech ต้องแปลงเป็น
  // hyphen ให้ตรงกับ id ใน activityCategories)
  activityCategoryOf(a: { quiz_type: string | null; practice_mode: string | null }): ActivityCategory {
    if (a.quiz_type?.includes('test')) return 'test';
    if (a.quiz_type?.includes('game')) return 'game';
    const mode = (a.practice_mode || 'text_to_text').replace(/_/g, '-');
    return (this.activityCategories.some((c) => c.id === mode) ? mode : 'text-to-text') as ActivityCategory;
  }

  activityCountForCategory(category: ActivityCategory): number {
    if (!this.selectedStudent) return 0;
    return this.selectedStudent.activity.filter((a) => this.activityCategoryOf(a) === category).length;
  }

  filteredActivity(category: ActivityCategory): MockStudent['activity'] {
    if (!this.selectedStudent) return [];
    return this.selectedStudent.activity.filter((a) => this.activityCategoryOf(a) === category);
  }

  activityCategoryLabel(category: ActivityCategory): string {
    return this.activityCategories.find((c) => c.id === category)?.label || category;
  }

  openActivityCategory(category: ActivityCategory): void {
    this.selectedActivityCategory = category;
  }

  backToActivityCategories(): void {
    this.selectedActivityCategory = null;
  }

  // เปิดดูสถิติรายบุคคล — โหลดคะแนนต่อบทเรียนจริงจาก backend
  selectStudent(st: MockStudent): void {
    this.selectedStudent = st;
    this.selectedActivityCategory = null;
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

            // ห้องเรียนที่มีคะแนนจริง (จาก practice_sessions → lessons.classroom_id) — ดู
            // คอมเมนต์ practicedClassrooms ใน MockStudent ด้านบน
            const practicedClassrooms: number[] = String(st.practiced_classrooms || '')
              .split(',')
              .map((c: string) => Number(c))
              .filter((c: number) => Number.isFinite(c) && c > 0);

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
              first_name: st.first_name || '',
              last_name: st.last_name || '',
              student_code: codeVal,
              email: emailVal,
              average_score: avg,
              lessons_completed: lessonsCompleted,
              need_support: needSupport,
              year_level: Number(st.year_of_study || st.year_level) || 1,
              classroom_id: st.classroom_id != null ? Number(st.classroom_id) : null,
              practicedClassrooms,
              practicedYears,
              averageScoreByYear,
              lessonsCompletedByYear,
              // รายละเอียดคะแนนต่อบทเรียน/ประวัติจะโหลดจริงตอนกด "เปิดดูสถิติ" (ดู selectStudent())
              scores: [],
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
            id: 1, name: 'Sarah Johnson', first_name: 'Sarah', last_name: 'Johnson', student_code: '651202201', email: 'sarah.j@school.ac.th', average_score: 92, lessons_completed: 5, need_support: false, year_level: 1, classroom_id: null, practicedClassrooms: [],
            practicedYears: [1], averageScoreByYear: { 1: 92, 2: 0 }, lessonsCompletedByYear: { 1: 5, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 80, post: 100, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 75, post: 95, game: 100 },
              { unit: 'Unit 3: Presentation', pre: 80, post: 90, game: 90 },
              { unit: 'Unit 4: Teacher Meeting', pre: 85, post: 95, game: 95 },
              { unit: 'Unit 5: Giving Instruction', pre: 90, post: 100, game: 100 }
            ],
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
            id: 2, name: 'สมชาย ดีดี (Somchai DeeDee)', first_name: 'สมชาย', last_name: 'ดีดี', student_code: '651202202', email: 'somchai.d@school.ac.th', average_score: 68, lessons_completed: 2, need_support: true, year_level: 1, classroom_id: null, practicedClassrooms: [],
            practicedYears: [1], averageScoreByYear: { 1: 68, 2: 0 }, lessonsCompletedByYear: { 1: 2, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 50, post: 70, game: 80 },
              { unit: 'Unit 2: Telephoning', pre: 40, post: 65, game: 70 }
            ],
            practiceLogs: [
              { timestamp: '01/07/2026 14:15', sentence: 'Hello morning Ms. Parker.', score: 60, attempt: 1, feedback: 'ควรพูดให้เต็มประโยค: "Hello, good morning Ms. Parker."' }
            ],
            activity: []
          },
          {
            id: 3, name: 'ปวีณา แสนสวย (Paweena Sansuay)', first_name: 'ปวีณา', last_name: 'แสนสวย', student_code: '651202203', email: 'paweena.s@school.ac.th', average_score: 84, lessons_completed: 4, need_support: false, year_level: 1, classroom_id: null, practicedClassrooms: [],
            practicedYears: [1], averageScoreByYear: { 1: 84, 2: 0 }, lessonsCompletedByYear: { 1: 4, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 70, post: 85, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 65, post: 80, game: 90 }
            ],
            practiceLogs: [
              { timestamp: '01/07/2026 11:20', sentence: 'Good morning, Ms. Parker speaking.', score: 88, attempt: 1, feedback: 'น้ำเสียงเป็นธรรมชาติ ชัดถ้อยชัดคำดีมาก' }
            ],
            activity: []
          },

        ];
      }
    });
  }

  // Filter Helper — กรองด้วยห้องเรียนที่สังกัดจริง (classroom_id) "หรือ" ห้องที่มีคะแนนจริงอยู่
  // (practicedClassrooms) เพราะ classroom_id เดียวไม่พอ: นักศึกษาที่สมัครไว้ก่อนมีฟีเจอร์
  // ห้องเรียนถูก backfill ไปที่ "ห้องเริ่มต้น" ห้องเดียว ทั้งที่อาจมีคะแนนจริงอยู่หลายห้อง/ปี
  // (เช่น เคยฝึกทั้งบทปี 1 และปี 2) — union ทั้งสองค่ากันคะแนนจริงหายไปจากห้องที่ควรเห็น
  // (สืบทอดเจตนาเดียวกับ practicedYears ของระบบเดิม แค่ย้ายมาเป็นระดับห้องแทนระดับปี)
  get filteredStudents(): MockStudent[] {
    const activeId = this.session.activeClassroomId;
    const list = this.students.filter(
      (st) => st.classroom_id === activeId || st.practicedClassrooms.includes(activeId!)
    );
    if (!this.searchQuery.trim()) return list;
    const query = this.searchQuery.toLowerCase();
    return list.filter(
      st => st.name.toLowerCase().includes(query) || st.student_code.includes(query)
    );
  }

  // นักศึกษาที่ยังไม่มีห้องเรียน (สมัครไว้ก่อนมีฟีเจอร์นี้) — ไม่โผล่ในแท็บไหนเลยจนกว่าอาจารย์
  // จะกด "ย้ายเข้าห้อง" ให้ กันไม่ให้คนกลุ่มนี้หายไปเงียบๆ
  get unassignedStudents(): MockStudent[] {
    return this.students.filter((st) => st.classroom_id === null);
  }

  assignClassroom(student: MockStudent, classroomId: number): void {
    if (!classroomId) return;
    this.apiService.assignStudentClassroom(student.id, classroomId).subscribe({
      next: () => {
        student.classroom_id = classroomId;
        Swal.fire({
          icon: 'success',
          title: 'ย้ายห้องเรียนสำเร็จ',
          confirmButtonColor: '#0f766e',
          timer: 1500,
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'ย้ายห้องเรียนไม่สำเร็จ',
          confirmButtonColor: '#0f766e',
        });
      },
    });
  }

  // ── เพิ่มนักศึกษาใหม่ (อาจารย์เพิ่มเองได้แล้ว ไม่ต้องรอนักศึกษาสมัครเองหรือให้แอดมินทำ) ──
  // ฟิลด์/ลำดับเลียนแบบหน้าสมัครสมาชิกของนักศึกษาเองทุกอย่าง (login-register.component.html)
  // ตามที่ขอ — เพิ่ม มหาวิทยาลัย/คณะ/สาขา ที่เดิมฟอร์มนี้ไม่มี. ปีการศึกษา (year_of_study) ไม่มี
  // ช่องแยกให้เลือกเหมือนฟอร์มสมัคร เพราะห้องเรียนหนึ่งผูกกับปีเดียวเสมออยู่แล้ว
  // (session.classrooms แต่ละแถวมี year_level ติดมาด้วย) เลือกห้องแล้วปีจะตามมาเองตอน
  // preConfirm ไม่ต้องให้เลือกซ้ำสองที่
  openAddStudentModal(): void {
    const classroomOptions = this.session.classrooms
      .map((c) => `<option value="${c.classroom_id}" ${c.classroom_id === this.session.activeClassroomId ? 'selected' : ''}>ปี ${c.year_level} · ${escapeHtml(c.name)}</option>`)
      .join('');
    const universityOptions = UNIVERSITY_OPTIONS
      .map((u) => `<option value="${escapeHtml(u)}"></option>`)
      .join('');

    Swal.fire({
      title: 'เพิ่มนักศึกษาใหม่ / Add New Student',
      width: 640,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <style>
          .as-wrap { text-align: left; font-family: 'Inter', 'Mitr', sans-serif; }
          .as-row { display: flex; gap: 0.75rem; margin-bottom: 0.9rem; }
          .as-group { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
          .as-label { font-size: 0.76rem; font-weight: 700; color: #334155; }
          .as-input, .as-select {
            width: 100%; box-sizing: border-box; padding: 0.65rem 0.9rem; border-radius: 16px;
            border: 1px solid #e2e8f0; background: #ffffff; font-size: 0.88rem; color: #0f172a;
            outline: none; transition: border-color .15s; font-family: inherit;
          }
          .as-input::placeholder { color: #94a3b8; }
          .as-input:focus, .as-select:focus { border-color: #0d9488; }
        </style>
        <div class="as-wrap">
          <div class="as-row">
            <div class="as-group">
              <span class="as-label">ชื่อจริง / First Name</span>
              <input id="as-first-name" class="as-input" type="text" placeholder="กรอกชื่อจริง">
            </div>
            <div class="as-group">
              <span class="as-label">นามสกุล / Last Name</span>
              <input id="as-last-name" class="as-input" type="text" placeholder="กรอกนามสกุล">
            </div>
          </div>
          <div class="as-row">
            <div class="as-group">
              <span class="as-label">ชื่อผู้ใช้ / Username</span>
              <input id="as-username" class="as-input" type="text" placeholder="username สำหรับเข้าสู่ระบบ">
            </div>
            <div class="as-group">
              <span class="as-label">รหัสนักศึกษา / Student ID</span>
              <input id="as-student-id" class="as-input" type="text" placeholder="66XXXXXX">
            </div>
          </div>
          <div class="as-row">
            <div class="as-group">
              <span class="as-label">มหาวิทยาลัย / University</span>
              <input id="as-university" class="as-input" type="text" list="as-university-options" placeholder="พิมพ์เพื่อค้นหามหาวิทยาลัย" autocomplete="off">
              <datalist id="as-university-options">${universityOptions}</datalist>
            </div>
            <div class="as-group">
              <span class="as-label">อีเมล / Email</span>
              <input id="as-email" class="as-input" type="email" placeholder="example@school.ac.th">
            </div>
          </div>
          <div class="as-row">
            <div class="as-group">
              <span class="as-label">คณะ / Faculty</span>
              <input id="as-faculty" class="as-input" type="text" placeholder="ชื่อคณะ">
            </div>
            <div class="as-group">
              <span class="as-label">สาขา / Dept.</span>
              <input id="as-department" class="as-input" type="text" placeholder="ชื่อสาขา">
            </div>
            <div class="as-group">
              <span class="as-label">ห้องเรียน / Classroom</span>
              <select id="as-classroom" class="as-select">
                <option value="">ไม่ระบุห้องเรียน</option>
                ${classroomOptions}
              </select>
            </div>
          </div>
          <div class="as-row">
            <div class="as-group">
              <span class="as-label">รหัสผ่าน / Password</span>
              <input id="as-password" class="as-input" type="password" placeholder="อย่างน้อย 4 ตัวอักษร">
            </div>
            <div class="as-group">
              <span class="as-label">ยืนยันรหัสผ่าน / Confirm</span>
              <input id="as-confirm-password" class="as-input" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง">
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'เพิ่มนักศึกษา / Save Student',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก / Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const firstName = (document.getElementById('as-first-name') as HTMLInputElement)?.value.trim();
        const lastName = (document.getElementById('as-last-name') as HTMLInputElement)?.value.trim();
        const username = (document.getElementById('as-username') as HTMLInputElement)?.value.trim();
        const studentId = (document.getElementById('as-student-id') as HTMLInputElement)?.value.trim();
        const university = (document.getElementById('as-university') as HTMLInputElement)?.value.trim();
        const email = (document.getElementById('as-email') as HTMLInputElement)?.value.trim();
        const faculty = (document.getElementById('as-faculty') as HTMLInputElement)?.value.trim();
        const department = (document.getElementById('as-department') as HTMLInputElement)?.value.trim();
        const classroomIdRaw = (document.getElementById('as-classroom') as HTMLSelectElement)?.value;
        const password = (document.getElementById('as-password') as HTMLInputElement)?.value;
        const confirmPassword = (document.getElementById('as-confirm-password') as HTMLInputElement)?.value;

        if (!firstName || !lastName || !username || !email || !password) {
          Swal.showValidationMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
          return false;
        }
        if (password !== confirmPassword) {
          Swal.showValidationMessage('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
          return false;
        }

        const classroomId = classroomIdRaw ? Number(classroomIdRaw) : null;
        const yearLevel = classroomId
          ? this.session.classrooms.find((c) => c.classroom_id === classroomId)?.year_level || null
          : null;

        return {
          username,
          password,
          first_name: firstName,
          last_name: lastName,
          email,
          name: `${firstName} ${lastName}`,
          student_code: studentId || null,
          university_name: university || null,
          faculty_name: faculty || null,
          department_name: department || null,
          classroom_id: classroomId,
          year_of_study: yearLevel,
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.apiService.createTeacherStudent(result.value).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'เพิ่มนักศึกษาสำเร็จ', confirmButtonColor: '#0d9488', timer: 1800 });
            this.loadStudents();
          },
          error: (err: any) => {
            Swal.fire({
              icon: 'error',
              title: 'เพิ่มนักศึกษาไม่สำเร็จ',
              text: err?.error?.message || 'ชื่อผู้ใช้/รหัสนักศึกษา/อีเมลนี้อาจมีอยู่แล้ว',
              confirmButtonColor: '#0d9488',
            });
          },
        });
      }
    });
  }

  // ── แก้ไขข้อมูลนักศึกษา (กันเคสนักศึกษากรอกชื่อ/รหัสนักศึกษาผิดตอนสมัคร) ──
  // เพิ่มห้องเรียน/ชั้นปีให้แก้ได้ด้วย — เลือกห้องแล้ว year_of_study จะคำนวณจาก year_level
  // ของห้องนั้นให้เอง (เหมือน openAddStudentModal()) กันไม่ให้ห้องกับปีในโปรไฟล์ไม่ตรงกัน
  openEditStudentModal(student: MockStudent): void {
    const classroomOptions = this.session.classrooms
      .map((c) => `<option value="${c.classroom_id}" ${c.classroom_id === student.classroom_id ? 'selected' : ''}>ปี ${c.year_level} · ${escapeHtml(c.name)}</option>`)
      .join('');

    Swal.fire({
      title: 'แก้ไขข้อมูลนักศึกษา / Edit Student',
      width: 560,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <style>
          .es-wrap { text-align: left; font-family: 'Inter', 'Mitr', sans-serif; }
          .es-row { display: flex; gap: 0.75rem; margin-bottom: 0.9rem; }
          .es-group { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
          .es-label { font-size: 0.76rem; font-weight: 700; color: #334155; }
          .es-input, .es-select {
            width: 100%; box-sizing: border-box; padding: 0.65rem 0.9rem; border-radius: 16px;
            border: 1px solid #e2e8f0; background: #ffffff; font-size: 0.88rem; color: #0f172a;
            outline: none; transition: border-color .15s; font-family: inherit;
          }
          .es-input:focus, .es-select:focus { border-color: #0d9488; }
        </style>
        <div class="es-wrap">
          <div class="es-row">
            <div class="es-group">
              <span class="es-label">ชื่อจริง / First Name</span>
              <input id="es-first-name" class="es-input" type="text" value="${escapeHtml(student.first_name)}">
            </div>
            <div class="es-group">
              <span class="es-label">นามสกุล / Last Name</span>
              <input id="es-last-name" class="es-input" type="text" value="${escapeHtml(student.last_name)}">
            </div>
          </div>
          <div class="es-row">
            <div class="es-group">
              <span class="es-label">รหัสนักศึกษา / Student ID</span>
              <input id="es-student-id" class="es-input" type="text" value="${escapeHtml(student.student_code)}">
            </div>
            <div class="es-group">
              <span class="es-label">อีเมล / Email</span>
              <input id="es-email" class="es-input" type="email" value="${escapeHtml(student.email)}">
            </div>
          </div>
          <div class="es-row">
            <div class="es-group">
              <span class="es-label">ห้องเรียน / Classroom (ชั้นปีจะเปลี่ยนตามห้องที่เลือก)</span>
              <select id="es-classroom" class="es-select">
                <option value="">ไม่ระบุห้องเรียน</option>
                ${classroomOptions}
              </select>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'บันทึก / Save',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก / Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const firstName = (document.getElementById('es-first-name') as HTMLInputElement)?.value.trim();
        const lastName = (document.getElementById('es-last-name') as HTMLInputElement)?.value.trim();
        const studentId = (document.getElementById('es-student-id') as HTMLInputElement)?.value.trim();
        const email = (document.getElementById('es-email') as HTMLInputElement)?.value.trim();
        const classroomIdRaw = (document.getElementById('es-classroom') as HTMLSelectElement)?.value;

        if (!firstName || !lastName) {
          Swal.showValidationMessage('กรุณากรอกชื่อจริงและนามสกุล');
          return false;
        }

        const classroomId = classroomIdRaw ? Number(classroomIdRaw) : null;
        const yearLevel = classroomId
          ? this.session.classrooms.find((c) => c.classroom_id === classroomId)?.year_level || null
          : null;

        return {
          first_name: firstName,
          last_name: lastName,
          student_code: studentId,
          email,
          classroom_id: classroomId,
          year_of_study: yearLevel,
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const updates = result.value;
        this.apiService.updateTeacherStudent(student.id, updates).subscribe({
          next: () => {
            student.first_name = updates.first_name;
            student.last_name = updates.last_name;
            student.name = `${updates.first_name} ${updates.last_name}`.trim();
            student.student_code = updates.student_code;
            student.email = updates.email;
            student.classroom_id = updates.classroom_id;
            student.year_level = updates.year_of_study || student.year_level;
            Swal.fire({ icon: 'success', title: 'บันทึกข้อมูลสำเร็จ', confirmButtonColor: '#0d9488', timer: 1500 });
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'บันทึกข้อมูลไม่สำเร็จ',
              text: 'รหัสนักศึกษานี้อาจถูกใช้โดยคนอื่นอยู่แล้ว',
              confirmButtonColor: '#0d9488',
            });
          },
        });
      }
    });
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
