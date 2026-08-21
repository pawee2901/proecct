import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { AdminMonitorService, SystemLogEntry } from '../../services/admin-monitor.service';

// "สุขภาพระบบ & Logs" (System) tab extracted verbatim from the old
// AdminComponent. systemLogs/loadSystemStats() live in AdminMonitorService
// (shared with the Overview page + the shell's header badge); only the
// search/filter state and the destructive-action confirm dialogs are local
// to this page.
@Component({
  selector: 'app-admin-system',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-system.component.html',
  styleUrl: './admin-system.component.scss',
})
export class AdminSystemComponent {
  logSearchQuery = '';
  logLevelFilter = 'ALL';

  constructor(public adminMonitor: AdminMonitorService) {}

  loadSystemStats(): void {
    this.adminMonitor.loadSystemStats();
  }

  exportLogs(): void {
    this.adminMonitor.exportLogs();
  }

  get filteredLogs(): SystemLogEntry[] {
    return this.adminMonitor.systemLogs.filter(log => {
      const matchQuery = !this.logSearchQuery ||
        log.message.toLowerCase().includes(this.logSearchQuery.toLowerCase()) ||
        log.timestamp.toLowerCase().includes(this.logSearchQuery.toLowerCase());

      const matchLevel = this.logLevelFilter === 'ALL' || log.level === this.logLevelFilter;
      return matchQuery && matchLevel;
    });
  }

  // ── System Logs Controls ──
  clearLogs(): void {
    Swal.fire({
      title: 'ล้างบันทึกระบบ?',
      text: 'คุณต้องการลบบันทึกกิจกรรมระบบทั้งหมดหรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ล้างข้อมูล / Clear',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminMonitor.clearLogs();
        Swal.fire({ icon: 'success', title: 'ล้างบันทึกสำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1200 });
      }
    });
  }
}
