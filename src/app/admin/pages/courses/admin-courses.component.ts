import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { AdminMonitorService } from '../../services/admin-monitor.service';
import { escapeHtml } from '../../utils/escape-html';

export interface SystemCourse {
  id: number;
  title: string;
  year_level: number;
  total_students: number;
  materials_count: number;
  created_at: string;
}

// "คอร์ส & บทเรียน (Courses)" tab extracted verbatim from the old
// AdminComponent. coursesList isn't read anywhere else (Overview has no
// course stats), so it stays entirely local to this page.
@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-courses.component.html',
  styleUrl: './admin-courses.component.scss',
})
export class AdminCoursesComponent implements OnInit {
  // ก่อนโหลดจริงจาก backend — ว่างไว้ก่อน ไม่ใส่ข้อมูลตัวอย่างหลอกๆ (loadCourses()
  // เรียกทันทีใน ngOnInit ระหว่างนี้ table จะว่างสั้นๆ)
  coursesList: SystemCourse[] = [];
  courseSearchQuery = '';

  constructor(private apiService: ApiService, private adminMonitor: AdminMonitorService) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  // /admin/courses คืนบทเรียนจริงพร้อม total_students/materials_count ที่คำนวณจริงจาก
  // practice_sessions/lesson_contents (ดู db/admin.py:get_admin_courses()) — ไม่มี
  // teacher_name เพราะ schema จริงไม่มีความสัมพันธ์ lesson↔teacher เก็บไว้เลย
  loadCourses(): void {
    this.apiService.getAdminCourses().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.coursesList = data.map((c: any) => ({
            id: c.id,
            title: c.name || c.title || 'English Course',
            year_level: c.year_level || 1,
            total_students: c.total_students ?? 0,
            materials_count: c.materials_count ?? 0,
            created_at: c.created_at || c.date || ''
          }));
        }
      },
      error: () => {}
    });
  }

  get filteredCourses(): SystemCourse[] {
    return this.coursesList.filter(course => {
      return !this.courseSearchQuery ||
        course.title.toLowerCase().includes(this.courseSearchQuery.toLowerCase());
    });
  }

  // ── Course Admin Actions ──
  openCourseDetailsModal(course: SystemCourse): void {
    const yearLabel = `ปี ${course.year_level}`;
    const createdAt = course.created_at || 'ไม่ระบุ';
    const totalStudents = course.total_students ?? 0;
    const materialsCount = course.materials_count ?? 0;
    const courseTitle = course.title || 'คอร์สเรียนภาษาอังกฤษ';

    Swal.fire({
      title: 'รายละเอียดคอร์สเรียน / Course Details',
      width: 620,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <div style="text-align:left; font-family:'Inter', 'Mitr', sans-serif;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid #e2e8f0;">
            <span style="background:#f0fdfa; color:#0d9488; border:1px solid #99f6e4; font-size:0.75rem; font-weight:700; padding:0.25rem 0.75rem; border-radius:9999px;">${escapeHtml(yearLabel)}</span>
            <span style="font-size:0.78rem; color:#94a3b8;">สร้างเมื่อ: ${escapeHtml(createdAt)}</span>
          </div>

          <h3 style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-bottom:0.4rem;">${escapeHtml(courseTitle)}</h3>
          <p style="font-size:0.88rem; color:#475569; margin-bottom:1.1rem;">จำนวนนักศึกษาและสื่อการสอนนับจากข้อมูลจริงในระบบ</p>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:0.85rem; border-radius:14px; text-align:center;">
              <span style="font-size:1.4rem; font-weight:800; color:#0d9488; display:block;">${totalStudents}</span>
              <span style="font-size:0.75rem; color:#64748b;">นักศึกษาลงทะเบียนเรียน</span>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:0.85rem; border-radius:14px; text-align:center;">
              <span style="font-size:1.4rem; font-weight:800; color:#0d9488; display:block;">${materialsCount}</span>
              <span style="font-size:0.75rem; color:#64748b;">สื่อการสอน & แบบฝึกหัด</span>
            </div>
          </div>

        </div>
      `,
      confirmButtonText: 'ปิด / Close',
      confirmButtonColor: '#0d9488'
    });
    this.adminMonitor.addLog('INFO', `Inspected details for course '${courseTitle}'`);
  }

  deleteCourse(course: SystemCourse): void {
    Swal.fire({
      title: 'ลบคอร์สเรียน?',
      text: `คุณต้องการลบคอร์ส "${course.title}" ออกจากระบบหรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ลบคอร์ส / Delete',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deleteAdminCourse(course.id).subscribe({
          next: () => {
            this.coursesList = this.coursesList.filter(c => c.id !== course.id);
            Swal.fire({ icon: 'success', title: 'ลบคอร์สเรียนสำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminMonitor.addLog('WARNING', `Deleted course '${course.title}' (ID #${course.id})`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'ลบคอร์สเรียนไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
          }
        });
      }
    });
  }
}
