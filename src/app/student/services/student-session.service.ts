import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

// Extracted from student.component.ts ngOnInit (user/session bootstrap,
// lines ~2940-2959 of the original file) and logout() (~2995).
@Injectable({ providedIn: 'root' })
export class StudentSessionService {
  currentUser: any = null;
  activeYearLevel: 1 | 2 = 1;
  isYearLocked = false;

  /** Emits after switchStudentYearLevel() actually changes the year, so features
   *  that used to be reset inline by the old switchTab()/year-switch logic
   *  (e.g. Practice's practiceUnitId) can react without this service knowing
   *  about them. */
  readonly yearLevelChanged$ = new Subject<1 | 2>();

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
      if (
        this.currentUser.role === 'student_year1' ||
        Number(this.currentUser.year_level) === 1 ||
        Number(this.currentUser.year_of_study) === 1
      ) {
        this.activeYearLevel = 1;
        this.isYearLocked = true;
      } else if (
        this.currentUser.role === 'student_year2' ||
        Number(this.currentUser.year_level) === 2 ||
        Number(this.currentUser.year_of_study) === 2
      ) {
        this.activeYearLevel = 2;
        this.isYearLocked = true;
      } else {
        this.isYearLocked = false;
      }
    }

    return true;
  }

  switchStudentYearLevel(year: 1 | 2): void {
    if (this.isYearLocked) return;
    this.activeYearLevel = year;
    this.yearLevelChanged$.next(year);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
