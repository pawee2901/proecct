import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';

export interface SystemLogEntry {
  id: number;
  timestamp: string;
  level: string;
  message: string;
}

// systemLogs/addLog() are written to from actions across the Users, APIs and
// Courses pages, and read from both the Overview page (recent 4 entries)
// and the System page (full list) — plus apiTokensUsed/cpuLoad/latencyMs/
// systemStatsIsLive, read by the Overview KPI cards *and* the shell's header
// "Online/Local Mode" badge. Extracted verbatim from the old monolithic
// AdminComponent so all of that can share one source of truth.
@Injectable({ providedIn: 'root' })
export class AdminMonitorService {
  // ค่าเริ่มต้นก่อนโหลดจริง — 0/ว่างไว้ก่อนเสมอ ไม่ใส่ตัวเลข/log ตัวอย่างหลอกๆ อีกต่อไป
  // เพราะ GET /admin/system-stats มี backend รองรับจริงแล้ว (CPU/latency จริงของเครื่อง,
  // token AI วันนี้จริง, log กิจกรรมจริง — ดู db/admin.py:get_system_stats())
  apiTokensUsed = 0;
  cpuLoad = 0;
  latencyMs = 0;
  systemStatsIsLive = false;

  systemLogs: SystemLogEntry[] = [];

  constructor(private apiService: ApiService) {}

  loadSystemStats(): void {
    this.apiService.getSystemStats().subscribe({
      next: (data: any) => {
        if (!data) return;
        this.apiTokensUsed = data.api_tokens_used ?? data.apiTokensUsed ?? this.apiTokensUsed;
        this.cpuLoad = data.cpu_load_percent ?? data.cpuLoad ?? this.cpuLoad;
        this.latencyMs = data.latency_ms ?? data.latencyMs ?? this.latencyMs;
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          this.systemLogs = data.logs.map((l: any, idx: number) => ({
            id: idx + 1,
            timestamp: l.timestamp || l.time || new Date().toISOString(),
            level: (l.level || 'INFO').toString().toUpperCase(),
            message: l.message || String(l),
          }));
        }
        this.systemStatsIsLive = true;
      },
      error: () => {
        this.systemStatsIsLive = false;
      }
    });
  }

  addLog(level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', message: string): void {
    const timeStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    this.systemLogs.unshift({
      id: Date.now(),
      timestamp: timeStr,
      level,
      message
    });
  }

  clearLogs(): void {
    this.apiService.clearSystemLogs().subscribe({
      next: () => {
        this.systemLogs = [];
        this.addLog('INFO', 'System logs cleared by administrator');
      },
      error: () => {
        // เชื่อม backend ไม่ได้ — ล้างเฉพาะที่แสดงผลอยู่ตอนนี้ (log จริงใน DB ยังอยู่
        // เหมือนเดิม, โหลดครั้งถัดไปจะกลับมาเห็นอีก)
        this.systemLogs = [];
      }
    });
  }

  exportLogs(): void {
    const logText = this.systemLogs.map(l => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
    this.addLog('INFO', 'Exported system audit logs to text file');
  }
}
