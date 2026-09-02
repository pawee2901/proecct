import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

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
  scores: { unit: string; pre: number; post: number; game: number }[];
  /** ค่าเฉลี่ย % ของคะแนนย่อยการฝึกพูดทุกรอบที่ผ่าน evaluate-session จริง (คำนวณจาก
   *  `activity` ใน computeSkillAverages() ด้านล่าง ไม่ใช่ค่าจาก backend ตรงๆ) — เดิมมี
   *  fluency/vocabulary ด้วยแต่ AI ไม่เคยประเมิน 2 อย่างนี้จริงเลยทั้งระบบ (ดูคอมเมนต์ที่
   *  computeSkillAverages()) เลยตัดออก เหลือแค่ 3 มิติที่มีข้อมูลจริงรองรับ */
  skills: { pronunciation: number; speed: number; grammar: number };
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

  // ให้การ์ด "ทักษะการพูด" แยกแยะ "0% เพราะยังไม่เคยฝึกพูดแบบมี AI ประเมินเลย" ออกจาก
  // "0% เพราะข้อมูลพัง" (ปัญหาเดิม) — true ถ้ามีอย่างน้อย 1 รายการใน activity ที่แกะคะแนนย่อยได้
  hasSpeakingEvaluations(st: MockStudent): boolean {
    return st.activity.some((a) => a.pronunciation_score !== null);
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
          this.selectedStudent.skills = this.computeSkillAverages(data);
        }
      },
      error: () => {}
    });
  }

  // "ทักษะการพูด (AI Evaluated Skills)" การ์ด — ค่าเฉลี่ย % ของทุกรอบฝึกพูดจริงที่ผ่าน
  // evaluate-session (ai-speaking/evaluate-session, ดู routes/ai_speaking.py ฝั่ง backend)
  // เดิม hardcode เป็น 0 เสมอสำหรับนักศึกษาจริงทุกคน (ไม่เคยต่อกับข้อมูลจริงเลย) และมี field
  // fluency/vocabulary ที่ AI ไม่เคยประเมินจริงในระบบนี้ (evaluate_speaking_session() ให้แค่
  // pronunciation_score/grammar_score, ai_speaking.py เพิ่ม speed_score จากเวลาตอบ) — ตัดสอง
  // field ปลอมออก คำนวณ 3 มิติที่เหลือจาก a.pronunciation_score/.speed_score/.grammar_score
  // ต่อรายการใน activity แทน (เพิ่งเพิ่มฝั่ง backend ให้ get_teacher_student_activity() แกะออก
  // จาก ai_feedback prefix แล้ว — แถวที่เป็นแบบทดสอบ/เกม/ฝึกพูดโหมดเก่าจะเป็น null ทั้งสามค่า
  // ไม่ถูกนับ)
  private computeSkillAverages(
    activity: MockStudent['activity']
  ): { pronunciation: number; speed: number; grammar: number } {
    const evaluated = activity.filter((a) => a.pronunciation_score !== null);
    if (evaluated.length === 0) {
      return { pronunciation: 0, speed: 0, grammar: 0 };
    }
    const avg = (pick: (a: (typeof evaluated)[number]) => number | null, max: number) =>
      Math.round(
        (evaluated.reduce((sum, a) => sum + (pick(a) ?? 0), 0) / evaluated.length / max) * 100
      );
    return {
      pronunciation: avg((a) => a.pronunciation_score, 30),
      speed: avg((a) => a.speed_score, 20),
      grammar: avg((a) => a.grammar_score, 50),
    };
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
              // รายละเอียดคะแนนต่อบทเรียน/สกิล/ประวัติจะโหลดจริงตอนกด "เปิดดูสถิติ" (ดู selectStudent())
              scores: [],
              // ค่าจริงคำนวณตอนกด "เปิดดูสถิติ" (ดู selectStudent() -> computeSkillAverages())
              skills: { pronunciation: 0, speed: 0, grammar: 0 },
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
            id: 1, name: 'Sarah Johnson', student_code: '651202201', email: 'sarah.j@school.ac.th', average_score: 92, lessons_completed: 5, need_support: false, year_level: 1, classroom_id: null, practicedClassrooms: [],
            practicedYears: [1], averageScoreByYear: { 1: 92, 2: 0 }, lessonsCompletedByYear: { 1: 5, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 80, post: 100, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 75, post: 95, game: 100 },
              { unit: 'Unit 3: Presentation', pre: 80, post: 90, game: 90 },
              { unit: 'Unit 4: Teacher Meeting', pre: 85, post: 95, game: 95 },
              { unit: 'Unit 5: Giving Instruction', pre: 90, post: 100, game: 100 }
            ],
            skills: { pronunciation: 88, speed: 92, grammar: 95 },
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
            id: 2, name: 'สมชาย ดีดี (Somchai DeeDee)', student_code: '651202202', email: 'somchai.d@school.ac.th', average_score: 68, lessons_completed: 2, need_support: true, year_level: 1, classroom_id: null, practicedClassrooms: [],
            practicedYears: [1], averageScoreByYear: { 1: 68, 2: 0 }, lessonsCompletedByYear: { 1: 2, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 50, post: 70, game: 80 },
              { unit: 'Unit 2: Telephoning', pre: 40, post: 65, game: 70 }
            ],
            skills: { pronunciation: 62, speed: 65, grammar: 70 },
            practiceLogs: [
              { timestamp: '01/07/2026 14:15', sentence: 'Hello morning Ms. Parker.', score: 60, attempt: 1, feedback: 'ควรพูดให้เต็มประโยค: "Hello, good morning Ms. Parker."' }
            ],
            activity: []
          },
          {
            id: 3, name: 'ปวีณา แสนสวย (Paweena Sansuay)', student_code: '651202203', email: 'paweena.s@school.ac.th', average_score: 84, lessons_completed: 4, need_support: false, year_level: 1, classroom_id: null, practicedClassrooms: [],
            practicedYears: [1], averageScoreByYear: { 1: 84, 2: 0 }, lessonsCompletedByYear: { 1: 4, 2: 0 },
            scores: [
              { unit: 'Unit 1: Welcoming', pre: 70, post: 85, game: 100 },
              { unit: 'Unit 2: Telephoning', pre: 65, post: 80, game: 90 }
            ],
            skills: { pronunciation: 85, speed: 82, grammar: 80 },
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
