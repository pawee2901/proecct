import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

// Extracted from student.component.ts ngOnInit (user/session bootstrap,
// lines ~2940-2959 of the original file) and logout() (~2995).
@Injectable({ providedIn: 'root' })
export class StudentSessionService {
  currentUser: any = null;
  /** เดิม type แคบแค่ 1|2 (โค้ด loadSession() ด้านล่างก็เช็คแค่ 2 ค่านี้ hardcode) —
   *  นักศึกษาปี 3/4 จริงที่มีอยู่ในระบบเลยถูกจัดเป็น "ปี 1" ผิดๆ เสมอมาตลอด (บั๊กเดิม
   *  ตั้งแต่ก่อนมีฟีเจอร์ห้องเรียน — ดู backend/CLAUDE.md บั๊ก #2) ตอนนี้ต้องรู้จักปีจริง
   *  ให้ถูกต้องเพราะ GameEngineService ใช้ค่านี้เลือกคลังคำศัพท์เกมเฉพาะชั้นปี */
  activeYearLevel: number = 1;
  isYearLocked = false;
  /** ห้องเรียน (classrooms.classroom_id) ที่นักศึกษาคนนี้สังกัดอยู่จริง — ตั้งค่าตอนสมัคร
   *  (ดู TeacherSessionService/registration ฝั่งอาจารย์) LessonsDataService ใช้ค่านี้กรอง
   *  รายการบทเรียนให้เห็นเฉพาะห้องตัวเอง แทนที่จะเห็นทุกห้องในปีเดียวกันเหมือนเดิม — null
   *  ถ้าสมัครไว้ก่อนมีฟีเจอร์นี้ หรือสมัครโดยไม่ได้เลือกห้อง (fallback กลับไปกรองด้วยปีแทน) */
  classroomId: number | null = null;

  /** Emits after switchStudentYearLevel() actually changes the year, so features
   *  that used to be reset inline by the old switchTab()/year-switch logic
   *  (e.g. Practice's practiceUnitId) can react without this service knowing
   *  about them. */
  readonly yearLevelChanged$ = new Subject<number>();

  constructor(private router: Router) {}

  /** Reads currentUser from localStorage and applies role-based year-level locking.
   *  Returns false (and redirects to /login) if no session is present. */
  loadSession(): boolean {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
      this.router.navigate(['/login']);
      return false;
    }
    this.currentUser = JSON.parse(userJson);
    // Backend returns user_id; frontend uses .id everywhere — normalise here
    if (this.currentUser && this.currentUser.user_id && !this.currentUser.id) {
      this.currentUser.id = this.currentUser.user_id;
    }

    if (this.currentUser) {
      // ปุ่ม/บัญชีทดสอบแบบ offline (login-register.component.ts error handler)
      // ยังใช้ role string 'student_year1'/'student_year2' ตรงๆ — เช็คก่อนเป็นพิเศษ
      if (this.currentUser.role === 'student_year1') {
        this.activeYearLevel = 1;
        this.isYearLocked = true;
      } else if (this.currentUser.role === 'student_year2') {
        this.activeYearLevel = 2;
        this.isYearLocked = true;
      } else {
        // บัญชีจริง — รู้จักทุกปี ไม่ใช่แค่ 1/2 เหมือนเดิม (year_level มาก่อนถ้ามี ไม่งั้น
        // fallback ไป year_of_study เหมือนพฤติกรรมเดิม)
        const rawYear = Number(this.currentUser.year_level ?? this.currentUser.year_of_study);
        if (Number.isFinite(rawYear) && rawYear > 0) {
          this.activeYearLevel = rawYear;
          this.isYearLocked = true;
        } else {
          this.isYearLocked = false;
        }
      }
      this.classroomId = this.currentUser.classroomId != null ? Number(this.currentUser.classroomId) : null;
    }

    return true;
  }

  switchStudentYearLevel(year: number): void {
    if (this.isYearLocked) return;
    this.activeYearLevel = year;
    this.yearLevelChanged$.next(year);
  }

  /** เขียน currentUser (หลังแก้ไขบางฟิลด์ เช่น email/avatarUrl จากหน้า Profile ▸
   *  ข้อมูลโปรไฟล์) กลับลง localStorage ให้ค่าที่แก้ไว้อยู่รอดข้าม reload โดยไม่ต้อง
   *  ล็อกอินใหม่ — mutate currentUser object ตรงๆ อย่างเดียวไม่พอเพราะ loadSession()
   *  อ่านจาก localStorage ทุกครั้งที่ bootstrap ใหม่ */
  persistCurrentUser(): void {
    if (this.currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
