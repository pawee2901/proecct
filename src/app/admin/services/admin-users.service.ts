import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';
import { AdminMonitorService } from './admin-monitor.service';

export interface AdminUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  approval_status: 'approved' | 'pending' | 'rejected';
  is_approved: boolean;
  created_at?: string;
}

// usersList/pendingTeachersList are read by both AdminOverviewComponent (KPI
// cards + the pendingTeachersCount nav badge in the shell) and
// AdminUsersComponent (the full tables + CRUD actions) — extracted verbatim
// from the old monolithic AdminComponent so both can share it.
// openAddUserModal() also lives here (rather than in AdminUsersComponent)
// because it's a "quick action" fired from *both* the Overview page and the
// Users page, so it needs a home reachable from either.
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  usersList: AdminUser[] = [];
  pendingTeachersList: AdminUser[] = [];
  totalUsers = 0;
  pendingTeachersCount = 0;

  constructor(private apiService: ApiService, private adminMonitor: AdminMonitorService) {}

  loadUsers(): void {
    this.apiService.getAdminUsers().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.usersList = data;
          this.totalUsers = this.usersList.length;
        }
      },
      error: () => {
        // เชื่อม backend ไม่ได้ — ปล่อยว่างไว้ ไม่ใส่รายชื่อผู้ใช้ปลอมแทนของจริง
        this.usersList = [];
        this.totalUsers = 0;
      }
    });
  }

  loadPendingTeachers(): void {
    this.apiService.getPendingTeachers().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.pendingTeachersList = data;
          this.pendingTeachersCount = this.pendingTeachersList.length;
        }
      },
      error: () => {
        this.pendingTeachersList = [];
        this.pendingTeachersCount = 0;
      }
    });
  }

  get approvedTeachers(): AdminUser[] {
    return this.usersList.filter(u => u.role === 'teacher' && u.is_approved);
  }

  // ── Add User Modal (Overview quick action + Users page header button) ──
  openAddUserModal(): void {
    Swal.fire({
      title: 'เพิ่มผู้ใช้ใหม่ / Add New User',
      width: 620,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <style>
          .au-wrap { text-align: left; font-family: 'Inter', 'Mitr', sans-serif; }
          .au-role-toggle { display: flex; background: #f0fdfa; border-radius: 16px; padding: 4px; margin-bottom: 1.15rem; gap: 4px; border: 1px solid #99f6e4; }
          .au-role-btn { flex: 1; border: none; background: transparent; padding: 0.6rem 0.4rem; border-radius: 12px;
            font-size: 0.82rem; font-weight: 700; color: #0d9488; cursor: pointer; transition: all .15s; font-family: inherit; }
          .au-role-btn.active { background: #0d9488; box-shadow: 0 2px 10px rgba(13, 148, 136,0.25); color: #ffffff; }
          .au-row { display: flex; gap: 0.75rem; margin-bottom: 0.9rem; }
          .au-group { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
          .au-label { font-size: 0.76rem; font-weight: 700; color: #334155; }
          .au-input, .au-select {
            width: 100%; box-sizing: border-box; padding: 0.65rem 0.9rem; border-radius: 16px;
            border: 1px solid #e2e8f0; background: #ffffff; font-size: 0.88rem; color: #0f172a;
            outline: none; transition: border-color .15s; font-family: inherit;
          }
          .au-input::placeholder { color: #94a3b8; }
          .au-input:focus, .au-select:focus { border-color: #0d9488; }
          .au-student-fields.hidden { display: none; }
        </style>
        <div class="au-wrap">
          <div class="au-role-toggle">
            <button type="button" class="au-role-btn active" data-role="student">นักศึกษา (Student)</button>
            <button type="button" class="au-role-btn" data-role="teacher">อาจารย์ (Teacher)</button>
            <button type="button" class="au-role-btn" data-role="admin">ผู้ดูแลระบบ (Admin)</button>
          </div>
          <input type="hidden" id="au-role" value="student">

          <div class="au-row">
            <div class="au-group">
              <span class="au-label">ชื่อจริง / First Name</span>
              <input id="au-first-name" class="au-input" type="text" placeholder="กรอกชื่อจริง">
            </div>
            <div class="au-group">
              <span class="au-label">นามสกุล / Last Name</span>
              <input id="au-last-name" class="au-input" type="text" placeholder="กรอกนามสกุล">
            </div>
          </div>

          <div class="au-row">
            <div class="au-group">
              <span class="au-label">ชื่อผู้ใช้ / Username</span>
              <input id="au-username" class="au-input" type="text" placeholder="username สำหรับเข้าสู่ระบบ">
            </div>
            <div class="au-group">
              <span class="au-label">อีเมล / Email</span>
              <input id="au-email" class="au-input" type="email" placeholder="example@school.ac.th">
            </div>
          </div>

          <div id="au-student-fields" class="au-student-fields">
            <div class="au-row">
              <div class="au-group">
                <span class="au-label">รหัสนักศึกษา / Student ID</span>
                <input id="au-student-id" class="au-input" type="text" placeholder="66XXXXXX">
              </div>
              <div class="au-group">
                <span class="au-label">ชั้นปีการศึกษา</span>
                <select id="au-year" class="au-select">
                  <option value="">เลือกชั้นปี</option>
                  <option value="1">ปี 1</option>
                  <option value="2">ปี 2</option>
                  <option value="3">ปี 3</option>
                  <option value="4">ปี 4</option>
                </select>
              </div>
            </div>
          </div>

          <div class="au-row">
            <div class="au-group">
              <span class="au-label">รหัสผ่าน / Password</span>
              <input id="au-password" class="au-input" type="password" placeholder="อย่างน้อย 4 ตัวอักษร">
            </div>
            <div class="au-group">
              <span class="au-label">ยืนยันรหัสผ่าน / Confirm</span>
              <input id="au-confirm-password" class="au-input" type="password" placeholder="กรอกรหัสผ่านอีกครั้ง">
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'เพิ่มผู้ใช้ / Save User',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก / Cancel',
      focusConfirm: false,
      didOpen: () => {
        const roleInput = document.getElementById('au-role') as HTMLInputElement;
        const studentFields = document.getElementById('au-student-fields');
        const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.au-role-btn'));
        buttons.forEach((btn) => {
          btn.addEventListener('click', () => {
            buttons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            const role = btn.getAttribute('data-role') || 'student';
            if (roleInput) roleInput.value = role;
            studentFields?.classList.toggle('hidden', role !== 'student');
          });
        });
      },
      preConfirm: () => {
        const role = (document.getElementById('au-role') as HTMLInputElement)?.value || 'student';
        const firstName = (document.getElementById('au-first-name') as HTMLInputElement)?.value.trim();
        const lastName = (document.getElementById('au-last-name') as HTMLInputElement)?.value.trim();
        const username = (document.getElementById('au-username') as HTMLInputElement)?.value.trim();
        const email = (document.getElementById('au-email') as HTMLInputElement)?.value.trim();
        const password = (document.getElementById('au-password') as HTMLInputElement)?.value;
        const confirmPassword = (document.getElementById('au-confirm-password') as HTMLInputElement)?.value;

        if (!firstName || !lastName || !username || !email || !password) {
          Swal.showValidationMessage('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
          return false;
        }
        if (password !== confirmPassword) {
          Swal.showValidationMessage('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
          return false;
        }

        return {
          username,
          password,
          role: role as 'student' | 'teacher' | 'admin',
          first_name: firstName,
          last_name: lastName,
          email,
          name: `${firstName} ${lastName}`
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newUserPayload = result.value;
        this.apiService.adminCreateUser(newUserPayload).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'เพิ่มผู้ใช้สำเร็จ',
              confirmButtonColor: '#0d9488',
              background: '#ffffff',
              color: '#0f172a',
              timer: 1800
            });
            this.loadUsers();
            this.adminMonitor.addLog('SUCCESS', `Added new user '${newUserPayload.username}' (${newUserPayload.role})`);
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'เพิ่มผู้ใช้ไม่สำเร็จ',
              text: err?.error?.message || 'เชื่อมต่อ backend ไม่ได้ หรือชื่อผู้ใช้/อีเมลนี้มีอยู่แล้ว',
              confirmButtonColor: '#0d9488',
              background: '#ffffff',
              color: '#0f172a'
            });
            this.adminMonitor.addLog('ERROR', `Failed to add user '${newUserPayload.username}'`);
          }
        });
      }
    });
  }
}
