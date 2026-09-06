import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

import { StudentSessionService } from '../../services/student-session.service';
import { ProgressService } from '../../services/progress.service';
import { LearningLogService } from '../../services/learning-log.service';
import { PracticeSessionService } from '../../services/practice-session.service';
import { GameFxService } from '../../services/game-fx.service';
import { ApiService } from '../../../services/api.service';

// Phase 2 of the migration plan. Extracted from student.component.ts
// (profileSubView/selectedHistoryCategory/expandedProfileLogIndex ~423-425,
// openProfileHistoryCategory/getFilteredProfileLogs ~8711-8733) and
// student.component.html (@if (activeTab === 'profile') block, ~4138-4467).
//
// loadLeaderboard/loadMockLeaderboard/leaderboardList were NOT migrated —
// confirmed dead (mutated but never rendered anywhere in the original
// template, same category as the AI Buddy widget/More sheet dropped in
// Phase 0). Flagged for the final review rather than silently resurrected.
@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.scss',
})
export class StudentProfileComponent {
  // 'main' = the 4-button hub menu (ข้อมูลโปรไฟล์/ประวัติการทำแบบฝึกหัด/ผลการเรียน
  // ความก้าวหน้า/ทบทวนคำที่เคยผิด — เดิมทุกอันจากเมนู dropdown ของ shell พาเข้ามาที่
  // หน้านี้เหมือนกันหมดแบบไม่แยก sub-view เลย ทำให้เจอทุกอย่างปนกันในหน้าเดียว ยาวจนงง)
  profileSubView: 'main' | 'info' | 'progress' | 'history-categories' | 'category-detail' = 'main';
  selectedHistoryCategory = 'speech-to-speech';
  expandedProfileLogIndex: number | null = null;

  // ── Pre/Post-Test history (หมวด 'test') ──
  // ต่างจาก 4 หมวดฝึกพูดด้านบนซึ่งอ่านจาก learningLog.learningLogs (localStorage
  // ต่อเครื่อง จำกัด 50 รายการ, ผสมข้อมูล DB เข้ามาเฉพาะ Speaking) — Pre/Post-Test
  // ดึงจาก practice_sessions ตรงๆ ทุกครั้งที่เปิดหมวดนี้ (เหมือนที่หน้าอาจารย์ใช้ดูของ
  // นักศึกษา ผ่าน endpoint เดียวกันเป๊ะ แค่ส่ง user_id ของตัวเอง) เพราะเป็นแหล่งข้อมูล
  // จริงที่ครบและซิงก์ข้ามอุปกรณ์ได้ ไม่หายไปตามจำนวนรายการ localStorage ที่ล้นออก
  testHistory: any[] = [];
  loadingTestHistory = false;

  // ── ข้อมูลโปรไฟล์เต็ม (Profile ▸ ข้อมูลโปรไฟล์) ──
  // แยกจาก session.currentUser (snapshot ตอนล็อกอิน อาจเก่า/ไม่ครบ) โหลดสดจาก
  // /student/profile/<id> ทุกครั้งที่เข้า sub-view นี้ ใช้ field ดิบจาก DB ตรงๆ
  // (snake_case: faculty_name/department_name/year_of_study/student_code/avatar_url)
  profileDetail: any = null;
  loadingProfileDetail = false;

  editEmail = '';
  savingEmail = false;
  uploadingAvatar = false;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = false;

  constructor(
    public session: StudentSessionService,
    public progress: ProgressService,
    public learningLog: LearningLogService,
    private practiceSession: PracticeSessionService,
    public gameFx: GameFxService,
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    // shell's dropdown/mobile-sheet ส่ง ?view=info|progress|history มาตอน routerLink
    // เพื่อพาเข้า sub-view ที่ถูกต้องตรงๆ แทนที่จะโผล่ที่เมนูหลักแล้วต้องกดอีกที — subscribe
    // แทน snapshot ตัวเดียว เพราะ Angular router reuse component instance เดิมถ้ายืนอยู่
    // หน้า /student/profile อยู่แล้วแล้วกด dropdown ซ้ำ (query param เปลี่ยนแต่ path เดิม
    // จะไม่ re-create component ใหม่ ไม่งั้น snapshot ตัวเดียวจะไม่เห็นค่าล่าสุด)
    this.route.queryParamMap.subscribe((params) => {
      const view = params.get('view');
      if (view === 'info') this.enterInfo();
      else if (view === 'progress') this.profileSubView = 'progress';
      else if (view === 'history') this.profileSubView = 'history-categories';
    });
  }

  goToSection(view: 'info' | 'progress' | 'history-categories'): void {
    if (view === 'info') this.enterInfo();
    else this.profileSubView = view;
    this.gameFx.playSoundEffect('click');
  }

  private enterInfo(): void {
    this.profileSubView = 'info';
    this.loadProfileDetail();
  }

  loadProfileDetail(): void {
    const userId = this.session.currentUser?.id;
    if (!userId) return;
    this.loadingProfileDetail = true;
    this.apiService.getStudentProfile(userId).subscribe({
      next: (data: any) => {
        this.loadingProfileDetail = false;
        this.profileDetail = data;
        this.editEmail = data?.email || '';
      },
      error: () => {
        this.loadingProfileDetail = false;
        // ยังพอมี session.currentUser (snapshot ตอนล็อกอิน) ให้ใช้ต่อได้ ถึง fetch สดไม่ได้
        this.profileDetail = this.profileDetail || {
          username: this.session.currentUser?.username,
          first_name: this.session.currentUser?.firstName,
          last_name: this.session.currentUser?.lastName,
          email: this.session.currentUser?.email,
          student_code: this.session.currentUser?.studentId,
          faculty_name: this.session.currentUser?.faculty,
          department_name: this.session.currentUser?.department,
          year_of_study: this.session.currentUser?.yearOfStudy,
          avatar_url: this.session.currentUser?.avatarUrl,
        };
        this.editEmail = this.profileDetail?.email || '';
      },
    });
  }

  saveEmail(): void {
    const userId = this.session.currentUser?.id;
    const email = (this.editEmail || '').trim();
    if (!userId || !email) return;
    this.savingEmail = true;
    this.apiService.updateStudentProfile(userId, { email }).subscribe({
      next: () => {
        this.savingEmail = false;
        if (this.profileDetail) this.profileDetail.email = email;
        if (this.session.currentUser) {
          this.session.currentUser.email = email;
          this.session.persistCurrentUser();
        }
        this.gameFx.playSoundEffect('success');
        Swal.fire({ icon: 'success', title: 'บันทึกอีเมลสำเร็จ', confirmButtonColor: '#6B21A8', timer: 1800 });
      },
      error: () => {
        this.savingEmail = false;
        Swal.fire({ icon: 'error', title: 'บันทึกอีเมลไม่สำเร็จ', text: 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#6B21A8' });
      },
    });
  }

  onAvatarUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Swal.fire({ icon: 'error', title: 'ชนิดไฟล์ไม่ถูกต้อง', text: 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพเท่านั้น', confirmButtonColor: '#6B21A8' });
      return;
    }
    const userId = this.session.currentUser?.id;
    if (!userId) return;

    this.uploadingAvatar = true;
    this.apiService.uploadFile(file).subscribe({
      next: (res: any) => {
        const url = res?.url;
        if (!url) {
          this.uploadingAvatar = false;
          return;
        }
        this.apiService.updateStudentProfile(userId, { avatar_url: url }).subscribe({
          next: () => {
            this.uploadingAvatar = false;
            if (this.profileDetail) this.profileDetail.avatar_url = url;
            if (this.session.currentUser) {
              this.session.currentUser.avatarUrl = url;
              this.session.persistCurrentUser();
            }
            this.gameFx.playSoundEffect('success');
          },
          error: () => {
            this.uploadingAvatar = false;
            Swal.fire({ icon: 'error', title: 'บันทึกรูปโปรไฟล์ไม่สำเร็จ', confirmButtonColor: '#6B21A8' });
          },
        });
      },
      error: () => {
        this.uploadingAvatar = false;
        Swal.fire({ icon: 'error', title: 'อัปโหลดรูปภาพล้มเหลว', confirmButtonColor: '#6B21A8' });
      },
    });
  }

  submitPasswordChange(): void {
    const userId = this.session.currentUser?.id;
    if (!userId) return;

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'กรอกข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกรหัสผ่านให้ครบทุกช่อง', confirmButtonColor: '#6B21A8' });
      return;
    }
    if (this.newPassword.length < 4) {
      Swal.fire({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร', confirmButtonColor: '#6B21A8' });
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านต้องตรงกัน', confirmButtonColor: '#6B21A8' });
      return;
    }

    this.changingPassword = true;
    this.apiService.changePassword(userId, this.currentPassword, this.newPassword).subscribe({
      next: (res: any) => {
        this.changingPassword = false;
        if (res?.ok) {
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.gameFx.playSoundEffect('success');
          Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', confirmButtonColor: '#6B21A8', timer: 1800 });
        } else {
          Swal.fire({ icon: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', text: res?.message || 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#6B21A8' });
        }
      },
      error: (err: any) => {
        this.changingPassword = false;
        Swal.fire({ icon: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', text: err?.error?.message || 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#6B21A8' });
      },
    });
  }

  backToMain(): void {
    this.profileSubView = 'main';
  }

  goToReview(): void {
    this.gameFx.playSoundEffect('click');
    this.router.navigate(['../review'], { relativeTo: this.route });
  }

  getInitial(): string {
    return (this.session.currentUser?.firstName || 'U')[0].toUpperCase();
  }

  logout(): void {
    this.session.logout();
  }

  openProfileHistoryCategory(category: string): void {
    this.selectedHistoryCategory = category;
    this.profileSubView = 'category-detail';
    this.expandedProfileLogIndex = null;
    this.gameFx.playSoundEffect('click');
    if (category === 'test') this.loadTestHistoryFromDb();
  }

  // แปลง "DD/MM/YYYY HH:mm" ที่ backend คืนมา (DATE_FORMAT ฝั่ง MySQL) เป็น Date จริง —
  // new Date("06/08/2026 22:57") เดา format ผิดเป็น MM/DD/YYYY ของ browser locale ได้
  // เลยต้อง parse เองแยกส่วนวัน/เดือน/ปีให้ชัดเจน
  private parseThaiFormattedDate(formatted: string): Date {
    const [datePart, timePart] = (formatted || '').split(' ');
    const [day, month, year] = (datePart || '').split('/').map(Number);
    const [hour, minute] = (timePart || '0:0').split(':').map(Number);
    return new Date(year || 0, (month || 1) - 1, day || 1, hour || 0, minute || 0);
  }

  loadTestHistoryFromDb(): void {
    const userId = this.session.currentUser?.id;
    if (!userId) return;
    this.loadingTestHistory = true;
    this.apiService.getTeacherStudentActivity(userId).subscribe({
      next: (rows: any[]) => {
        this.testHistory = (Array.isArray(rows) ? rows : [])
          .filter((r) => r.quiz_type === 'pre_test' || r.quiz_type === 'post_test')
          .map((r) => ({
            date: this.parseThaiFormattedDate(r.created_at_formatted),
            type: r.quiz_type === 'pre_test' ? 'Pre-Test' : 'Post-Test',
            title: `${r.quiz_type === 'pre_test' ? 'Pre-Test (ก่อนเรียน)' : 'Post-Test (หลังเรียน)'} — ${r.lesson_name}`,
            score: r.total_score,
            xp: 25,
            // ข้อสอบทั้งชุดที่ตอบจริง (null ถ้าเป็น quiz เก่าที่ทำก่อนมีฟีเจอร์นี้ -- ดู
            // QuizAnswerDetail ใน unit.model.ts, เดียวกับที่ submitQuiz()/submitFullQuiz()
            // ใน student-lessons.component.ts ส่งขึ้น backend)
            quizDetail: r.quiz_answers || undefined,
          }))
          .sort((a, b) => b.date.getTime() - a.date.getTime());
        this.loadingTestHistory = false;
      },
      error: (err) => {
        console.warn('Could not load test history from database:', err);
        this.loadingTestHistory = false;
      },
    });
  }

  getFilteredProfileLogs(category: string): any[] {
    // Pre/Post-Test: แหล่งข้อมูลจริงจาก DB (โหลดตอนกดเข้าหมวดนี้ ดู
    // openProfileHistoryCategory/loadTestHistoryFromDb) ไม่ใช่ learningLogs
    if (category === 'test') return this.testHistory;

    if (!this.learningLog.learningLogs) return [];
    // 'game' ยังคงกรองจาก log.type -- Lessons/Games ไม่เคยติด practiceMode
    // (เป็น concept เฉพาะแท็บ Practice) ส่วน 4 โหมดสนทนากรองจาก practiceMode ตรงๆ
    // ที่ Practice เขียนกำกับไว้ทุกรายการที่ log แทนการเทียบ type-string หลวมๆ แบบเดิม
    // ซึ่งเคยเหมารวม Speech-to-Speech/Text-to-Speech/Speech-to-Text เป็น "practice"
    // ก้อนเดียว (type: 'Speaking' เหมือนกันหมด) และทำให้หมวด "speaking" เดิมไม่แมตช์
    // อะไรเลย (เช็ค log.type หา "speech-to-text" ทั้งที่คำนี้อยู่ใน log.title เท่านั้น)
    if (category === 'game') {
      return this.learningLog.learningLogs.filter((log) => (log.type || '').toLowerCase().includes('game'));
    }
    return this.learningLog.learningLogs.filter((log) => log.practiceMode === category);
  }

  stripMarkdown(text: string): string {
    return this.gameFx.stripMarkdown(text);
  }

  /** Original loadPastChatSession(log) reached directly into Practice's
   *  properties (student.component.ts:8641-8671). Now: hand the log to the
   *  mailbox service and navigate — StudentPracticeComponent (Phase 6)
   *  replays the session in its own ngOnInit. */
  loadPastChatSession(log: any): void {
    this.practiceSession.requestResume(log);
    this.router.navigate(['../practice'], { relativeTo: this.route });
  }
}
