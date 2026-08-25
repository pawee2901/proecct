import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { TeacherSessionService } from '../services/teacher-session.service';

// Persistent chrome (top nav + tab bar) extracted from the old monolithic
// TeacherComponent (teacher.component.html original lines 1-84, minus the
// per-tab content) — mirrors StudentShellComponent's role in the Student area.
// Each tab button now navigates via routerLink instead of switchSubTab().
//
// The academic-year toggle (บทเรียน & นักศึกษา ชั้นปีที่ 1/2) used to be
// duplicated as its own full-width row inside both TeacherLessonsComponent's
// and TeacherStudentsComponent's own templates, stacked below this bar —
// requested to sit on the same row as the 3 main tabs instead. It only
// applies to those two pages (Game Covers has no year concept), so it's
// shown here conditionally based on the current route rather than always.
@Component({
  selector: 'app-teacher-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './teacher-shell.component.html',
  styleUrl: './teacher-shell.component.scss',
})
export class TeacherShellComponent implements OnInit, OnDestroy {
  showYearToggle = false;
  // Mobile-only: whether the collapsible tab list is expanded. Ignored on
  // desktop, where the tab row is always shown regardless (see scss).
  navExpanded = false;
  private navSub?: Subscription;

  constructor(public session: TeacherSessionService, private router: Router) {}

  ngOnInit(): void {
    this.session.loadSession();
    this.updateYearToggleVisibility(this.router.url);
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.updateYearToggleVisibility(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private updateYearToggleVisibility(url: string): void {
    this.showYearToggle = url.includes('/students') || url.includes('/lessons');
  }

  switchYearLevel(year: 1 | 2): void {
    this.session.switchYearLevel(year);
  }

  logout(): void {
    this.session.logout();
  }
}
