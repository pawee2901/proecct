import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

// Cross-page state for the Admin area: just the current user + role guard +
// logout, extracted from the old monolithic AdminComponent. Modeled on
// TeacherSessionService / StudentSessionService.
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  currentUser: any = null;

  constructor(private router: Router) {}

  /** Reads currentUser from localStorage and enforces the 'admin' role.
   *  Returns false (and redirects away) if there is no session or the role
   *  doesn't match, same as the old ngOnInit guard. */
  loadSession(): boolean {
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) {
      this.router.navigate(['/login']);
      return false;
    }
    this.currentUser = JSON.parse(userJson);
    if (this.currentUser.role !== 'admin') {
      this.router.navigate([`/${this.currentUser.role}`]);
      return false;
    }
    return true;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
