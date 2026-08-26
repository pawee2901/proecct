import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

// Cross-page state for the Teacher area, extracted from the old monolithic
// TeacherComponent (ngOnInit role guard, activeYearLevel, logout()). Modeled
// on StudentSessionService — see src/app/student/services/student-session.service.ts.
// Everything else that used to live on TeacherComponent (student list, lesson
// list, game covers, edit state, ...) is only ever read by one tab, so it
// stays local to that tab's page component instead of living here.
@Injectable({ providedIn: 'root' })
export class TeacherSessionService {
  currentUser: any = null;
  activeYearLevel: 1 | 2 = 1;

  // ปุ่มสลับปีย้ายไปอยู่ใน shell แล้ว (แสดงแถวเดียวกับแท็บหลัก แทนที่จะแยกแถวซ้ำใน
  // students/lessons page) แต่ทั้งสองหน้ายังต้องรีเซ็ต state ของตัวเอง (editingLesson/
  // selectedStudent) ตอนสลับปี — shell ไม่รู้จัก state พวกนั้น เลยแค่ยิง event นี้ให้แต่ละ
  // หน้าฟังแล้วเคลียร์ state ของตัวเองแทน
  readonly yearChanged$ = new Subject<1 | 2>();

  constructor(private router: Router) {}

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
    return true;
  }

  persistCurrentUser(): void {
    if (this.currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
  }

  switchYearLevel(year: 1 | 2): void {
    this.activeYearLevel = year;
    this.yearChanged$.next(year);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
