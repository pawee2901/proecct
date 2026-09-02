import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { ApiService } from '../../services/api.service';

export interface TeacherYearLevel {
  year_level: number;
  label: string;
  display_order: number;
}

export interface TeacherClassroom {
  classroom_id: number;
  year_level: number;
  name: string;
  display_order: number;
}

// Cross-page state for the Teacher area, extracted from the old monolithic
// TeacherComponent (ngOnInit role guard, activeYearLevel, logout()). Modeled
// on StudentSessionService — see src/app/student/services/student-session.service.ts.
// Everything else that used to live on TeacherComponent (student list, lesson
// list, game covers, edit state, ...) is only ever read by one tab, so it
// stays local to that tab's page component instead of living here.
//
// activeYearLevel/activeClassroomId เดิมเป็นปุ่มสลับตายตัว "ปี 1 / ปี 2" (2 ค่าคงที่) —
// ตอนนี้อาจารย์เพิ่ม/ลบชั้นปีและห้องเรียนได้เองจริง (ดู backend/db/classrooms.py) จึงย้ายมา
// เป็น state ที่โหลดจาก backend แทน ห้องเรียนที่กำลังเลือกอยู่ (activeClassroomId) คือหน่วย
// ที่ Lessons/Students page ใช้กรองข้อมูลจริงๆ ส่วน activeYearLevel เหลือไว้เป็น getter
// คำนวณจากห้องที่เลือก (classroom ผูกกับปีเดียวเสมอ) เพื่อให้โค้ดเดิมที่อ่าน activeYearLevel
// อยู่แล้ว (เช่น "Prompt AI ประจำชั้นปี" ใน teacher-lessons) ทำงานต่อได้โดยไม่ต้องแก้
@Injectable({ providedIn: 'root' })
export class TeacherSessionService {
  currentUser: any = null;

  yearLevels: TeacherYearLevel[] = [];
  classrooms: TeacherClassroom[] = [];
  activeClassroomId: number | null = null;

  // ปุ่มสลับปี/ห้องย้ายไปอยู่ใน shell แล้ว (แสดงในแถบด้านข้าง แทนที่จะแยกแถวซ้ำใน
  // students/lessons page) แต่ทั้งสองหน้ายังต้องรีเซ็ต state ของตัวเอง (editingLesson/
  // selectedStudent) ตอนสลับห้อง — shell ไม่รู้จัก state พวกนั้น เลยแค่ยิง event นี้ให้แต่ละ
  // หน้าฟังแล้วเคลียร์ state ของตัวเองแทน (เดิมยิงเป็นเลขปี ตอนนี้ยิงเป็น classroom_id)
  readonly yearChanged$ = new Subject<number | null>();

  constructor(private router: Router, private apiService: ApiService) {}

  /** ปีของห้องเรียนที่กำลังเลือกอยู่ — คำนวณจาก activeClassroomId เสมอ (ห้องหนึ่งผูกกับปี
   *  เดียวตายตัว) คืน null ถ้ายังไม่มีห้องให้เลือกเลย (เช่นฐานข้อมูลว่างเปล่าจริงๆ) */
  get activeYearLevel(): number | null {
    const classroom = this.classrooms.find((c) => c.classroom_id === this.activeClassroomId);
    return classroom ? classroom.year_level : null;
  }

  /** Reads currentUser from localStorage and enforces the 'teacher' role.
   *  Returns false (and redirects away) if there is no session or the role
   *  doesn't match, same as the old ngOnInit guard. */
  loadSession(): boolean {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
      this.router.navigate(['/login']);
      return false;
    }
    this.currentUser = JSON.parse(userJson);
    if (this.currentUser.role !== 'teacher') {
      this.router.navigate([`/${this.currentUser.role}`]);
      return false;
    }
    this.loadClassroomData();
    return true;
  }

  persistCurrentUser(): void {
    if (this.currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
  }

  /** โหลดรายชื่อชั้นปี + ห้องเรียนทั้งหมด แล้วเลือกห้องแรกให้อัตโนมัติถ้ายังไม่เคยเลือกไว้
   *  (หรือห้องที่เคยเลือกไว้ถูกลบไปแล้ว) เรียกตอน bootstrap และหลังเพิ่ม/ลบชั้นปี/ห้องเรียน
   *  ทุกครั้ง เพื่อให้แถบด้านข้างกับ Lessons/Students page เห็นรายการล่าสุดตรงกันเสมอ */
  loadClassroomData(): void {
    this.apiService.getYearLevels().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) this.yearLevels = data;
      },
      error: () => {},
    });
    this.apiService.getClassrooms().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.classrooms = data;
          const stillExists = this.classrooms.some((c) => c.classroom_id === this.activeClassroomId);
          if (!stillExists) {
            this.activeClassroomId = this.classrooms.length > 0 ? this.classrooms[0].classroom_id : null;
            this.yearChanged$.next(this.activeClassroomId);
          }
        }
      },
      error: () => {},
    });
  }

  switchClassroom(classroomId: number): void {
    if (classroomId === this.activeClassroomId) return;
    this.activeClassroomId = classroomId;
    this.yearChanged$.next(classroomId);
  }

  addYearLevel(label: string, onDone?: () => void): void {
    this.apiService.addYearLevel(label).subscribe({
      next: () => {
        this.loadClassroomData();
        onDone?.();
      },
      error: () => onDone?.(),
    });
  }

  deleteYearLevel(yearLevel: number, onDone?: () => void): void {
    this.apiService.deleteYearLevel(yearLevel).subscribe({
      next: () => {
        this.loadClassroomData();
        onDone?.();
      },
      error: () => onDone?.(),
    });
  }

  addClassroom(yearLevel: number, name: string, onDone?: () => void): void {
    this.apiService.addClassroom(yearLevel, name).subscribe({
      next: () => {
        this.loadClassroomData();
        onDone?.();
      },
      error: () => onDone?.(),
    });
  }

  renameClassroom(classroomId: number, name: string, onDone?: () => void): void {
    this.apiService.renameClassroom(classroomId, name).subscribe({
      next: () => {
        this.loadClassroomData();
        onDone?.();
      },
      error: () => onDone?.(),
    });
  }

  deleteClassroom(classroomId: number, onDone?: () => void): void {
    this.apiService.deleteClassroom(classroomId).subscribe({
      next: () => {
        this.loadClassroomData();
        onDone?.();
      },
      error: () => onDone?.(),
    });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
