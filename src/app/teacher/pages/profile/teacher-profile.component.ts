import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { TeacherSessionService } from '../../services/teacher-session.service';
import { ApiService } from '../../../services/api.service';

// New per feedback (Group C #5, teacher item #8): teacher had no way to
// change their own name/password, unlike Student (see StudentProfileComponent's
// email/password editing — name itself isn't editable there either, but name
// + password was specifically requested here). Reuses existing generic
// endpoints rather than adding new ones: PUT /admin/users/<id> (already
// splits first/last name, see db/admin.py:admin_update_user) and the
// role-agnostic POST /api/change-password.
@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-profile.component.html',
  styleUrl: './teacher-profile.component.scss',
})
export class TeacherProfileComponent {
  editFirstName = '';
  editLastName = '';
  savingName = false;

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  changingPassword = false;

  constructor(public session: TeacherSessionService, private apiService: ApiService) {
    this.editFirstName = this.session.currentUser?.firstName || '';
    this.editLastName = this.session.currentUser?.lastName || '';
  }

  saveName(): void {
    const userId = this.session.currentUser?.id;
    const firstName = this.editFirstName.trim();
    const lastName = this.editLastName.trim();
    if (!userId || !firstName) {
      Swal.fire({ icon: 'warning', title: 'กรอกชื่อจริงด้วยค่ะ', confirmButtonColor: '#0f766e' });
      return;
    }
    this.savingName = true;
    this.apiService.adminUpdateUser(userId, { first_name: firstName, last_name: lastName }).subscribe({
      next: () => {
        this.savingName = false;
        if (this.session.currentUser) {
          this.session.currentUser.firstName = firstName;
          this.session.currentUser.lastName = lastName;
          this.session.persistCurrentUser();
        }
        Swal.fire({ icon: 'success', title: 'บันทึกชื่อสำเร็จ', confirmButtonColor: '#0f766e', timer: 1800 });
      },
      error: () => {
        this.savingName = false;
        Swal.fire({ icon: 'error', title: 'บันทึกชื่อไม่สำเร็จ', text: 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0f766e' });
      },
    });
  }

  submitPasswordChange(): void {
    const userId = this.session.currentUser?.id;
    if (!userId) return;

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'กรอกข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกรหัสผ่านให้ครบทุกช่อง', confirmButtonColor: '#0f766e' });
      return;
    }
    if (this.newPassword.length < 4) {
      Swal.fire({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร', confirmButtonColor: '#0f766e' });
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านต้องตรงกัน', confirmButtonColor: '#0f766e' });
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
          Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', confirmButtonColor: '#0f766e', timer: 1800 });
        } else {
          Swal.fire({ icon: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', text: res?.message || 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0f766e' });
        }
      },
      error: (err: any) => {
        this.changingPassword = false;
        Swal.fire({ icon: 'error', title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ', text: err?.error?.message || 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0f766e' });
      },
    });
  }
}
