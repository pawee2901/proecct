import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { AdminUsersService } from '../../services/admin-users.service';
import { AdminApiHubService } from '../../services/admin-api-hub.service';
import { AdminMonitorService } from '../../services/admin-monitor.service';

// "ภาพรวมระบบ (Overview)" tab extracted verbatim from the old AdminComponent.
// isMaintenanceMode is only ever read/written here, so it stays local
// instead of living in a shared service. The three "quick action" modal
// openers live on AdminUsersService/AdminApiHubService instead of here
// because the Users/APIs pages fire the very same modals — see the comments
// on those services.
@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent {
  isMaintenanceMode = false;

  constructor(
    public adminUsers: AdminUsersService,
    public adminApiHub: AdminApiHubService,
    public adminMonitor: AdminMonitorService,
    private router: Router,
  ) {}

  goToSystemLogs(): void {
    this.router.navigate(['/admin/system']);
  }

  openAddUserModal(): void {
    this.adminUsers.openAddUserModal();
  }

  openAddApiEndpointModal(): void {
    this.adminApiHub.openAddApiEndpointModal();
  }

  openAddApiKeyModal(): void {
    this.adminApiHub.openAddApiKeyModal();
  }

  // ── Maintenance Mode Toggle ──
  toggleMaintenanceMode(): void {
    this.isMaintenanceMode = !this.isMaintenanceMode;
    const statusText = this.isMaintenanceMode ? 'เปิดใช้งาน (ON)' : 'ปิดใช้งาน (OFF)';
    Swal.fire({
      icon: this.isMaintenanceMode ? 'warning' : 'success',
      title: `โหมดปิดปรับปรุงระบบ`,
      text: `สถานะระบบปิดปรับปรุงปัจจุบัน: ${statusText}`,
      confirmButtonColor: '#0d9488',
      background: '#ffffff',
      color: '#0f172a',
      timer: 1800
    });
    this.adminMonitor.addLog(this.isMaintenanceMode ? 'WARNING' : 'INFO', `System Maintenance Mode set to ${statusText}`);
  }

  exportLogs(): void {
    this.adminMonitor.exportLogs();
  }
}
