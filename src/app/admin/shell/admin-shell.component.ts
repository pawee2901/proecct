import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

import { AdminSessionService } from '../services/admin-session.service';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminApiHubService } from '../services/admin-api-hub.service';
import { AdminMonitorService } from '../services/admin-monitor.service';

// Persistent chrome (top nav + tab bar) extracted from the old monolithic
// AdminComponent (admin.component.html original lines 1-100, minus the
// per-tab content) — mirrors StudentShellComponent's role in the Student
// area. Each tab button now navigates via routerLink instead of
// switchSubTab(), and owns the one-time load of whatever cross-page data
// the header badge ("Online"/"Local Mode") and the Users/API Hub nav
// badges need, same as StudentShellComponent's session bootstrap.
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent implements OnInit {
  constructor(
    public session: AdminSessionService,
    public adminUsers: AdminUsersService,
    public adminApiHub: AdminApiHubService,
    public adminMonitor: AdminMonitorService,
  ) {}

  ngOnInit(): void {
    if (!this.session.loadSession()) return;

    this.adminMonitor.loadSystemStats();
    this.adminUsers.loadUsers();
    this.adminUsers.loadPendingTeachers();
    this.adminApiHub.loadApiEndpoints();
  }

  logout(): void {
    this.session.logout();
  }
}
