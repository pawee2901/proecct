import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import Swal from 'sweetalert2';

import { TeacherSessionService, TeacherClassroom } from '../services/teacher-session.service';

// Persistent chrome (top nav + side nav) extracted from the old monolithic
// TeacherComponent (teacher.component.html original lines 1-84, minus the
// per-tab content) — mirrors StudentShellComponent's role in the Student area.
// Each tab button now navigates via routerLink instead of switchSubTab().
//
// The academic-year toggle (บทเรียน & นักศึกษา ชั้นปีที่ 1/2) used to be a hardcoded
// 2-button row shared with the 3 main tabs. It's now a full "ชั้นปี & ห้องเรียน" picker
// (dynamic list from TeacherSessionService, teacher can add/delete both) that only
// applies to those two pages (Game Covers has no classroom concept), so it's shown
// conditionally based on the current route rather than always — same as before.
@Component({
  selector: 'app-teacher-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './teacher-shell.component.html',
  styleUrl: './teacher-shell.component.scss',
})
export class TeacherShellComponent implements OnInit, OnDestroy {
  showClassroomPicker = false;
  // Mobile-only: whether the classroom/year picker panel is expanded. Ignored on
  // desktop, where the sidebar section is always visible regardless.
  mobilePickerOpen = false;
  showProfileDropdown = false;

  // ชั้นปีที่กางรายการห้องเรียนอยู่ในแถบด้านข้าง — ค่าเริ่มต้นกางเฉพาะปีของห้องที่เลือกอยู่
  // (ตั้งครั้งแรกตอน classrooms โหลดเสร็จ ดู ngOnInit ด้านล่าง) ผู้ใช้กด toggleYearExpanded()
  // เพิ่มเติมเองได้อิสระหลังจากนั้น
  expandedYears = new Set<number>();

  // ── ฟอร์มเพิ่มชั้นปี/ห้องเรียนใหม่แบบ inline (เปิด/ปิดในแถบด้านข้างเอง ไม่ใช้ modal) ──
  addingYearLevel = false;
  newYearLabel = '';
  addingClassroomForYear: number | null = null;
  newClassroomName = '';
  renamingClassroomId: number | null = null;
  renameClassroomNameValue = '';

  private navSub?: Subscription;
  private hasAutoExpanded = false;

  constructor(public session: TeacherSessionService, private router: Router) {}

  ngOnInit(): void {
    this.session.loadSession();
    this.updatePickerVisibility(this.router.url);
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updatePickerVisibility(e.urlAfterRedirects));
    // ห้องเรียน/ชั้นปีโหลดแบบ async (loadClassroomData() ใน session) — คอย auto-expand
    // ปีของห้องที่ถูกเลือกอยู่ครั้งแรกที่ข้อมูลมาถึง แทนที่จะกางทุกปีตั้งแต่แรกซึ่งรกเกินไป
    this.session.yearChanged$.subscribe(() => this.autoExpandActiveYear());
    this.autoExpandActiveYear();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private autoExpandActiveYear(): void {
    if (this.session.activeYearLevel != null) {
      this.expandedYears.add(this.session.activeYearLevel);
      this.hasAutoExpanded = true;
    } else if (!this.hasAutoExpanded && this.session.yearLevels.length > 0) {
      // ยังไม่มีห้องให้เลือกเลย — กางปีแรกไว้ก่อนเผื่ออาจารย์จะเพิ่มห้องแรกทันที
      this.expandedYears.add(this.session.yearLevels[0].year_level);
    }
  }

  private updatePickerVisibility(url: string): void {
    this.showClassroomPicker = url.includes('/students') || url.includes('/lessons');
  }

  classroomsForYear(yearLevel: number): TeacherClassroom[] {
    return this.session.classrooms.filter((c) => c.year_level === yearLevel);
  }

  activeClassroomName(): string {
    return this.session.classrooms.find((c) => c.classroom_id === this.session.activeClassroomId)?.name || '';
  }

  toggleYearExpanded(yearLevel: number): void {
    if (this.expandedYears.has(yearLevel)) {
      this.expandedYears.delete(yearLevel);
    } else {
      this.expandedYears.add(yearLevel);
    }
  }

  selectClassroom(classroomId: number): void {
    this.session.switchClassroom(classroomId);
    this.mobilePickerOpen = false;
  }

  // ── เพิ่ม/ลบชั้นปี ──
  startAddYearLevel(): void {
    this.addingYearLevel = true;
    this.newYearLabel = '';
  }

  cancelAddYearLevel(): void {
    this.addingYearLevel = false;
    this.newYearLabel = '';
  }

  confirmAddYearLevel(): void {
    const label = this.newYearLabel.trim();
    if (!label) return;
    this.session.addYearLevel(label, () => {
      this.addingYearLevel = false;
      this.newYearLabel = '';
    });
  }

  deleteYearLevel(yearLevel: number, label: string): void {
    Swal.fire({
      title: `ลบ "${label}" ?`,
      text: 'ห้องเรียนทั้งหมดในชั้นปีนี้จะถูกลบไปด้วย (บทเรียน/นักศึกษาที่เคยอยู่ในห้องเหล่านั้นจะไม่ถูกลบ แค่ไม่มีห้องสังกัดแล้ว)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BE185D',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'ลบ / Delete',
      cancelButtonText: 'ยกเลิก / Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.session.deleteYearLevel(yearLevel);
      }
    });
  }

  // ── เพิ่ม/ลบห้องเรียน ──
  startAddClassroom(yearLevel: number): void {
    this.addingClassroomForYear = yearLevel;
    this.newClassroomName = '';
    this.expandedYears.add(yearLevel);
  }

  cancelAddClassroom(): void {
    this.addingClassroomForYear = null;
    this.newClassroomName = '';
  }

  confirmAddClassroom(): void {
    const name = this.newClassroomName.trim();
    if (!name || this.addingClassroomForYear == null) return;
    this.session.addClassroom(this.addingClassroomForYear, name, () => {
      this.addingClassroomForYear = null;
      this.newClassroomName = '';
    });
  }

  startRenameClassroom(classroom: TeacherClassroom): void {
    this.renamingClassroomId = classroom.classroom_id;
    this.renameClassroomNameValue = classroom.name;
  }

  cancelRenameClassroom(): void {
    this.renamingClassroomId = null;
    this.renameClassroomNameValue = '';
  }

  confirmRenameClassroom(): void {
    const name = this.renameClassroomNameValue.trim();
    if (!name || this.renamingClassroomId == null) return;
    this.session.renameClassroom(this.renamingClassroomId, name, () => {
      this.renamingClassroomId = null;
      this.renameClassroomNameValue = '';
    });
  }

  deleteClassroom(classroom: TeacherClassroom): void {
    Swal.fire({
      title: `ลบห้อง "${classroom.name}" ?`,
      text: 'บทเรียน/นักศึกษาที่เคยอยู่ในห้องนี้จะไม่ถูกลบ แค่ไม่มีห้องสังกัดแล้ว',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#BE185D',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'ลบ / Delete',
      cancelButtonText: 'ยกเลิก / Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        this.session.deleteClassroom(classroom.classroom_id);
      }
    });
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  onWrapperClick(): void {
    this.showProfileDropdown = false;
  }

  logout(): void {
    this.session.logout();
  }
}
