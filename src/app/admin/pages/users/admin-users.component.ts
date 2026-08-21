import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { AdminUsersService, AdminUser } from '../../services/admin-users.service';
import { AdminMonitorService } from '../../services/admin-monitor.service';
import { escapeHtml } from '../../utils/escape-html';

// "จัดการผู้ใช้งาน (Users)" tab extracted verbatim from the old
// AdminComponent. usersList/pendingTeachersList live in AdminUsersService
// (shared with the Overview page); openAddUserModal() also lives there for
// the same reason. Everything else here (search/filter, approve/reject,
// edit/reset/role-change/delete, teacher directory) is only ever used from
// this page, so it stays local.
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  userSearchQuery = '';
  userRoleFilter = 'all';
  userStatusFilter = 'all';

  constructor(
    public adminUsers: AdminUsersService,
    private adminMonitor: AdminMonitorService,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    // Data is already loaded once by AdminShellComponent; re-fetch here too
    // so this page shows fresh data if the admin navigates straight back to
    // it after mutating something elsewhere.
    this.adminUsers.loadUsers();
    this.adminUsers.loadPendingTeachers();
  }

  openAddUserModal(): void {
    this.adminUsers.openAddUserModal();
  }

  get filteredUsers(): AdminUser[] {
    return this.adminUsers.usersList.filter(user => {
      const matchQuery = !this.userSearchQuery ||
        user.username.toLowerCase().includes(this.userSearchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(this.userSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(this.userSearchQuery.toLowerCase());

      const matchRole = this.userRoleFilter === 'all' || user.role === this.userRoleFilter;
      const matchStatus = this.userStatusFilter === 'all' ||
        (this.userStatusFilter === 'active' && user.is_approved) ||
        (this.userStatusFilter === 'pending' && !user.is_approved);

      return matchQuery && matchRole && matchStatus;
    });
  }

  openTeacherDirectoryModal(): void {
    const teachers = this.adminUsers.approvedTeachers;
    let rowsHtml = '';
    if (teachers.length === 0) {
      rowsHtml = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#94a3b8;">ไม่พบรายชื่ออาจารย์ที่ได้รับการอนุมัติในระบบ</td></tr>';
    } else {
      rowsHtml = teachers.map(t => `
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:0.75rem 1rem; font-weight:700; color:#0f172a;">${escapeHtml(t.name)}</td>
          <td style="padding:0.75rem 1rem; color:#64748b;">${escapeHtml(t.username)}</td>
          <td style="padding:0.75rem 1rem; color:#64748b;">${escapeHtml(t.email)}</td>
          <td style="padding:0.75rem 1rem; text-align:center;">
            <span style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-size:0.72rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:9999px;">อนุมัติแล้ว</span>
          </td>
        </tr>
      `).join('');
    }

    Swal.fire({
      title: 'รายชื่ออาจารย์ทั้งหมดในระบบ / Teacher Directory',
      width: 680,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <div style="text-align:left; font-family:'Inter', 'Mitr', sans-serif;">
          <p style="font-size:0.85rem; color:#64748b; margin-bottom:1rem;">รายชื่ออาจารย์ที่ผ่านการอนุมัติและมีสิทธิ์สร้างบทเรียนภาษาอังกฤษในระบบ (จำนวน ${teachers.length} ท่าน)</p>
          <div style="max-height:300px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:14px;">
            <table style="width:100%; border-collapse:collapse; font-size:0.84rem;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0; color:#475569; font-weight:700;">
                  <th style="padding:0.75rem 1rem; text-align:left;">ชื่อจริง-นามสกุล</th>
                  <th style="padding:0.75rem 1rem; text-align:left;">Username</th>
                  <th style="padding:0.75rem 1rem; text-align:left;">อีเมล</th>
                  <th style="padding:0.75rem 1rem; text-align:center;">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `,
      confirmButtonText: 'ปิด / Close',
      confirmButtonColor: '#0d9488'
    });
    this.adminMonitor.addLog('INFO', 'Viewed teacher directory modal');
  }

  // ── Approve & Reject Teacher ──
  approveTeacher(userId: number): void {
    this.apiService.approveTeacher(userId).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'อนุมัติสำเร็จ',
          text: 'อนุมัติการใช้งานอาจารย์ในระบบเสร็จเรียบร้อยค่ะ',
          confirmButtonColor: '#0d9488',
          background: '#ffffff',
          color: '#0f172a',
          timer: 2000
        });
        this.adminUsers.loadUsers();
        this.adminUsers.loadPendingTeachers();
        this.adminMonitor.addLog('SUCCESS', `Approved teacher ID #${userId}`);
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'อนุมัติไม่สำเร็จ',
          text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonColor: '#0d9488',
          background: '#ffffff',
          color: '#0f172a'
        });
        this.adminMonitor.addLog('ERROR', `Failed to approve teacher ID #${userId}`);
      }
    });
  }

  rejectTeacher(userId: number): void {
    Swal.fire({
      title: 'ปฏิเสธการอนุมัติ?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธการอนุมัติอาจารย์คนนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ปฏิเสธสิทธิ์ / Reject',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.rejectTeacher(userId).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'ดำเนินการเสร็จสิ้น',
              text: 'ปฏิเสธการอนุมัติสิทธิ์เรียบร้อย',
              confirmButtonColor: '#0d9488',
              background: '#ffffff',
              color: '#0f172a',
              timer: 1500
            });
            this.adminUsers.loadUsers();
            this.adminUsers.loadPendingTeachers();
            this.adminMonitor.addLog('WARNING', `Rejected teacher application ID #${userId}`);
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'ปฏิเสธไม่สำเร็จ',
              text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง',
              confirmButtonColor: '#0d9488',
              background: '#ffffff',
              color: '#0f172a'
            });
            this.adminMonitor.addLog('ERROR', `Failed to reject teacher application ID #${userId}`);
          }
        });
      }
    });
  }

  // ── Edit User Modal ──
  openEditUserModal(user: AdminUser): void {
    Swal.fire({
      title: 'แก้ไขข้อมูลผู้ใช้ / Edit User',
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <div style="display:flex; flex-direction:column; gap:0.8rem; text-align:left;">
          <label style="font-size:0.8rem; font-weight:700; color:#334155;">ชื่อ-นามสกุล</label>
          <input id="swal-edit-name" class="swal2-input" placeholder="ชื่อ-นามสกุล" value="${escapeHtml(user.name)}" style="margin:0; width:100%; background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; border-radius:16px;">
          <label style="font-size:0.8rem; font-weight:700; color:#334155; margin-top:0.4rem;">อีเมล</label>
          <input id="swal-edit-email" type="email" class="swal2-input" placeholder="อีเมล" value="${escapeHtml(user.email)}" style="margin:0; width:100%; background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; border-radius:16px;">
        </div>
      `,
      confirmButtonText: 'บันทึก / Save',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก / Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('swal-edit-name') as HTMLInputElement)?.value.trim();
        const email = (document.getElementById('swal-edit-email') as HTMLInputElement)?.value.trim();
        if (!name || !email) {
          Swal.showValidationMessage('กรุณากรอกชื่อและอีเมลให้ครบถ้วน');
          return false;
        }
        return { name, email };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.apiService.adminUpdateUser(user.id, result.value).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminUsers.loadUsers();
            this.adminMonitor.addLog('INFO', `Updated user ID #${user.id} details`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
            this.adminMonitor.addLog('ERROR', `Failed to update user ID #${user.id}`);
          }
        });
      }
    });
  }

  // ── Reset User Password Modal ──
  openResetPasswordModal(user: AdminUser): void {
    Swal.fire({
      title: 'ตั้งรหัสผ่านใหม่ / Reset Password',
      text: `ตั้งรหัสผ่านใหม่สำหรับผู้ใช้ "${user.name}" (${user.username})`,
      input: 'password',
      inputPlaceholder: 'กรอกรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)',
      showCancelButton: true,
      confirmButtonText: 'เปลี่ยนรหัสผ่าน / Reset',
      confirmButtonColor: '#0d9488',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a',
      preConfirm: (password) => {
        if (!password || password.length < 4) {
          Swal.showValidationMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
          return false;
        }
        return password;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.apiService.adminResetUserPassword(user.id, result.value).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminMonitor.addLog('INFO', `Reset password for user '${user.username}'`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
            this.adminMonitor.addLog('ERROR', `Failed to reset password for user '${user.username}'`);
          }
        });
      }
    });
  }

  // ── Change User Role ──
  changeUserRole(user: AdminUser, newRole: string): void {
    if (!newRole || newRole === user.role) return;
    const typedRole = newRole as 'student' | 'teacher' | 'admin';
    Swal.fire({
      title: 'เปลี่ยนสิทธิ์ผู้ใช้?',
      text: `ต้องการเปลี่ยนสิทธิ์ของ "${user.name}" จาก ${user.role.toUpperCase()} เป็น ${typedRole.toUpperCase()} หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยัน / Confirm',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.adminUpdateUserRole(user.id, typedRole).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'เปลี่ยนสิทธิ์สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            user.role = typedRole;
            this.adminMonitor.addLog('INFO', `Role changed for '${user.username}' -> ${typedRole.toUpperCase()}`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'เปลี่ยนสิทธิ์ไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
            this.adminMonitor.addLog('ERROR', `Failed to change role for '${user.username}'`);
          }
        });
      } else {
        this.adminUsers.loadUsers();
      }
    });
  }

  // ── Delete User ──
  deleteUser(user: AdminUser): void {
    Swal.fire({
      title: 'ลบบัญชีผู้ใช้?',
      text: `คุณต้องการลบบัญชีของ "${user.name}" (${user.username}) ออกจากระบบใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ลบบัญชี / Delete',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.adminDeleteUser(user.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'ลบผู้ใช้สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminUsers.usersList = this.adminUsers.usersList.filter(u => u.id !== user.id);
            this.adminUsers.totalUsers = this.adminUsers.usersList.length;
            this.adminMonitor.addLog('WARNING', `Deleted user account '${user.username}' (ID #${user.id})`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'ลบผู้ใช้ไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
            this.adminMonitor.addLog('ERROR', `Failed to delete user account '${user.username}'`);
          }
        });
      }
    });
  }
}
