import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface LoginForm {
  username: string;
  password: string;
}

interface RegisterForm {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  studentId: string;
  faculty: string;
  department: string;
  yearOfStudy: string;
  classroomId: string;
  role: 'student' | 'teacher' | 'admin';
}

interface SpawnChar {
  id: number;
  type: 'duck' | 'star' | 'heart' | 'cat' | 'book' | 'pencil';
  x: number;
  delay: number;
}

@Component({
  selector: 'app-login-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-register.component.html',
  styleUrl: './login-register.component.css',
})
export class LoginRegisterComponent implements OnInit {
  activeTab: 'login' | 'register' | 'forgot' = 'login';
  errorMessage = '';
  successMessage = '';
  loading = false;

  forgotData = {
    firstName: '',
    email: '',
    newPassword: '',
    confirmNewPassword: ''
  };
  resetUserId: number | null = null;
  resetUsername: string = '';
  isResetVerified = false;


  // Celebration characters
  spawnedChars: SpawnChar[] = [];
  private charSeed = 0;


  loginData: LoginForm = {
    username: '',
    password: '',
  };

  registerData: RegisterForm = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    faculty: '',
    department: '',
    yearOfStudy: '',
    classroomId: '',
    role: 'student',
  };

  // ชั้นปีที่อาจารย์เพิ่ม/ลบเองได้ (ดู TeacherSessionService) — แทนที่ตัวเลือก "ปี 1-4" ตายตัว
  // เดิม ห้องเรียนกรองตามปีที่เลือกไว้ (cascading select) โหลดใหม่ทุกครั้งที่เปลี่ยนปี
  yearLevels: { year_level: number; label: string }[] = [];
  classroomsForYear: { classroom_id: number; name: string }[] = [];

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit(): void {
    localStorage.removeItem('currentUser');
    this.apiService.getYearLevels().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) this.yearLevels = data;
      },
      error: () => {},
    });
  }

  onRegisterYearChange(): void {
    this.registerData.classroomId = '';
    this.classroomsForYear = [];
    const year = Number(this.registerData.yearOfStudy);
    if (!year) return;
    this.apiService.getClassrooms(year).subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) this.classroomsForYear = data;
      },
      error: () => {},
    });
  }

  switchTab(tab: 'login' | 'register' | 'forgot'): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    this.successMessage = '';
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
  }

  private redirectByRole(role: string): void {
    const routes: Record<string, string> = {
      student: '/student',
      teacher: '/teacher',
      admin: '/admin',
    };
    this.router.navigate([routes[role] ?? '/']);
  }

  private playQuack(): void {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.13);
      gain.gain.setValueAtTime(0.28, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  }

  triggerQuack(): void {
    this.playQuack();
    setTimeout(() => this.playQuack(), 290);
    setTimeout(() => this.playQuack(), 580);
  }

  spawnCharacters(mode: 'login' | 'register'): void {
    const loginTypes: SpawnChar['type'][] = ['duck', 'star', 'heart', 'duck', 'star'];
    const regTypes: SpawnChar['type'][] = ['cat', 'star', 'book', 'heart', 'pencil'];
    const types = mode === 'login' ? loginTypes : regTypes;

    // Spread evenly across horizontal space
    const positions = [12, 28, 44, 60, 76];

    this.spawnedChars = types.map((type, i) => ({
      id: ++this.charSeed,
      type,
      x: positions[i] + (Math.random() * 6 - 3),
      delay: i * 0.12,
    }));

    setTimeout(() => {
      this.spawnedChars = [];
    }, 2400);
  }

  login(): void {
    this.triggerQuack();
    this.spawnCharacters('login');

    const { username, password } = this.loginData;
    if (!username || !password) {
      this.showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.login({ username, password }).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response && response.user) {
          const user = response.user;
          const yearOfStudy = user.year_of_study || user.year_level || (user.username?.includes('2') || user.role === 'student_year2' ? 2 : 1);
          const sessionUser = {
            id: user.user_id || user.id,
            username: user.username,
            role: user.role,
            year_level: Number(yearOfStudy),
            year_of_study: Number(yearOfStudy),
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            email: user.email,
            // เดิม login_user() (backend) ไม่ได้ SELECT คอลัมน์พวกนี้เลย และตรงนี้ก็ไม่เคย
            // ส่งต่อมาด้วย ทำให้หน้าโปรไฟล์แสดงคณะ/ภาควิชา/ชั้นปี/รหัสนักศึกษาไม่ได้เลย —
            // แก้ backend ให้ SELECT มาแล้ว แค่ map เพิ่มตรงนี้ให้ตรงกับที่หน้าโปรไฟล์ใช้จริง
            // (yearOfStudy เป็น camelCase คู่กับ year_of_study/year_level ด้านบนที่เป็น
            // snake_case สำหรับ logic ล็อกชั้นปีอื่นๆ — คนละ key กัน เก็บไว้ทั้งคู่)
            studentId: user.student_code || '',
            faculty: user.faculty_name || '',
            department: user.department_name || '',
            yearOfStudy: Number(yearOfStudy),
            avatarUrl: user.avatar_url || '',
            // ห้องเรียน (classrooms.classroom_id) ที่นักศึกษาสังกัดอยู่จริง — ใช้กรอง
            // รายการบทเรียนให้เห็นเฉพาะห้องตัวเอง (ดู LessonsDataService.loadLessonsFromDb())
            // null ถ้าสมัครไว้ก่อนมีฟีเจอร์ห้องเรียน หรือสมัครโดยไม่ได้เลือกห้อง
            classroomId: user.classroom_id != null ? Number(user.classroom_id) : null,
          };
          localStorage.setItem('currentUser', JSON.stringify(sessionUser));
          this.showSuccess(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ ${user.first_name || user.username}`);
          setTimeout(() => this.redirectByRole(user.role), 1000);
        } else {
          this.showError('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง');
        }
      },
      error: (err: any) => {
        this.loading = false;
        // Support offline testing login for students
        const lowerUser = username.toLowerCase();
        if (lowerUser.includes('student') || lowerUser === 'std1' || lowerUser === 'std2' || lowerUser === 'sarah' || lowerUser === 'paweena') {
          const demoYear = lowerUser.includes('2') ? 2 : 1;
          const demoUser = {
            id: 1,
            username: username,
            role: `student_year${demoYear}`,
            year_level: demoYear,
            year_of_study: demoYear,
            firstName: `ปวีณา (ปี ${demoYear})`,
            lastName: 'แสนสวย',
            email: 'student1@school.ac.th'
          };
          localStorage.setItem('currentUser', JSON.stringify(demoUser));
          this.showSuccess(`เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับ นักศึกษา ชั้นปีที่ ${demoYear}`);
          setTimeout(() => this.router.navigate(['/student']), 800);
          return;
        }

        const msg =
          err.error?.message ||
          'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีอาจารย์ยังไม่ได้รับการอนุมัติ';
        this.showError(msg);
      },
    });
  }

  register(): void {
    this.triggerQuack();
    this.spawnCharacters('register');

    const d = this.registerData;
    const required = [d.firstName, d.lastName, d.username, d.email, d.password, d.confirmPassword];
    if (required.some((v) => !v.trim())) {
      this.showError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }
    if (d.password !== d.confirmPassword) {
      this.showError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (d.password.length < 4) {
      this.showError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      username: d.username,
      password: d.password,
      role: d.role,
      first_name: d.firstName,
      last_name: d.lastName,
      email: d.email,
      student_code: d.role === 'student' && d.studentId?.trim() ? d.studentId.trim() : null,
      year_of_study: d.role === 'student' && d.yearOfStudy ? d.yearOfStudy : null,
      classroom_id: d.role === 'student' && d.classroomId ? d.classroomId : null,
      faculty_name: d.faculty,
      department_name: d.department,
      university_name: 'มหาวิทยาลัยราชภัฏ',
    };

    this.apiService.register(payload).subscribe({
      next: () => {
        this.loading = false;
        if (payload.role === 'teacher') {
          this.showSuccess('สมัครสมาชิกอาจารย์สำเร็จ! กรุณารอผู้ดูแลระบบอนุมัติ');
        } else {
          this.showSuccess('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        }
        setTimeout(() => this.switchTab('login'), 2000);
      },
      error: (err: any) => {
        this.loading = false;
        const msg =
          err.error?.message || 'การสมัครสมาชิกผิดพลาด ชื่อผู้ใช้หรืออีเมลอาจมีในระบบแล้ว';
        this.showError(msg);
      },
    });
  }

  forgotPassword(): void {
    this.activeTab = 'forgot';
    this.errorMessage = '';
    this.successMessage = '';
    this.isResetVerified = false;
    this.resetUserId = null;
    this.resetUsername = '';
    this.forgotData = {
      firstName: '',
      email: '',
      newPassword: '',
      confirmNewPassword: ''
    };
  }

  checkResetIdentity(): void {
    this.triggerQuack();
    const { firstName, email } = this.forgotData;
    if (!firstName || !email) {
      this.showError('กรุณากรอกชื่อจริงและอีเมลให้ครบถ้วน');
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.resetPasswordCheck(firstName, email).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.ok) {
          this.resetUserId = res.user_id;
          this.resetUsername = res.username;
          this.isResetVerified = true;
          this.showSuccess(`ยืนยันตัวตนสำเร็จ! ชื่อบัญชีของคุณคือ: ${res.username} กรุณาตั้งรหัสผ่านใหม่ด้านล่าง`);
        } else {
          this.showError(res.message || 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ');
        }
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err.error?.message || 'ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ หรือเกิดข้อผิดพลาดในการตรวจสอบ';
        this.showError(msg);
      }
    });
  }

  submitNewPassword(): void {
    this.triggerQuack();
    const { newPassword, confirmNewPassword } = this.forgotData;
    if (!this.resetUserId) {
      this.showError('การยืนยันตัวตนไม่ถูกต้อง กรุณาทำรายการใหม่');
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      this.showError('กรุณากรอกรหัสผ่านใหม่และยืนยันให้ครบถ้วน');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      this.showError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (newPassword.length < 4) {
      this.showError('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.resetPasswordUpdate(this.resetUserId, newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.showSuccess('เปลี่ยนรหัสผ่านใหม่สำเร็จแล้ว! กำลังนำคุณกลับไปหน้าล็อกอิน...');
        setTimeout(() => {
          this.switchTab('login');
        }, 2000);
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err.error?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
        this.showError(msg);
      }
    });
  }
}
