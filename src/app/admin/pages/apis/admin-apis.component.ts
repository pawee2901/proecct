import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { AdminApiHubService, ApiEndpointItem, ApiKeyItem } from '../../services/admin-api-hub.service';
import { AdminMonitorService } from '../../services/admin-monitor.service';
import { escapeHtml } from '../../utils/escape-html';

// "จัดการ & เพิ่ม API (API Hub)" tab extracted verbatim from the old
// AdminComponent. apiEndpointsList/activeApiCount/apiKeysList live in
// AdminApiHubService (shared with the Overview page); the endpoint/key
// "Add" modals also live there for the same reason. Everything else here
// (search/filter, endpoint status/delete/test, key visibility/status/
// delete, AI prompts) is only ever used from this page, so it stays local.
@Component({
  selector: 'app-admin-apis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-apis.component.html',
  styleUrl: './admin-apis.component.scss',
})
export class AdminApisComponent implements OnInit {
  apiSearchQuery = '';
  apiCategoryFilter = 'all';

  // AI Prompts (ระดับระบบ) — โหลดจาก GET /admin/ai-prompts, ค่าเริ่มต้นว่างไว้ก่อน
  // จนกว่าจะโหลดจริง (ไม่มี mock fallback เพราะต้องสะท้อนค่าจริงใน DB เท่านั้น)
  aiPromptsList: { scope_key: string; description: string; prompt_text: string | null; is_customized: boolean; updated_at: string | null }[] = [];
  aiPromptDrafts: { [scopeKey: string]: string } = {};
  aiPromptSaving: { [scopeKey: string]: boolean } = {};

  constructor(
    public adminApiHub: AdminApiHubService,
    private adminMonitor: AdminMonitorService,
    private apiService: ApiService,
  ) {}

  ngOnInit(): void {
    // Endpoints are already loaded once by AdminShellComponent; re-fetch
    // here too so this page shows fresh data on direct navigation.
    this.adminApiHub.loadApiEndpoints();
    this.adminApiHub.loadApiKeys();
    this.loadAiPrompts();
  }

  openAddApiEndpointModal(): void {
    this.adminApiHub.openAddApiEndpointModal();
  }

  openAddApiKeyModal(): void {
    this.adminApiHub.openAddApiKeyModal();
  }

  get filteredApiEndpoints(): ApiEndpointItem[] {
    return this.adminApiHub.apiEndpointsList.filter(api => {
      const matchQuery = !this.apiSearchQuery ||
        api.name.toLowerCase().includes(this.apiSearchQuery.toLowerCase()) ||
        api.url.toLowerCase().includes(this.apiSearchQuery.toLowerCase()) ||
        api.description.toLowerCase().includes(this.apiSearchQuery.toLowerCase());

      const matchCategory = this.apiCategoryFilter === 'all' || api.category === this.apiCategoryFilter;
      return matchQuery && matchCategory;
    });
  }

  // ── Toggle API Status ──
  toggleApiStatus(endpoint: ApiEndpointItem): void {
    const nextStatus = endpoint.status === 'active' ? 'inactive' : 'active';
    const previousStatus = endpoint.status;
    endpoint.status = nextStatus;
    this.adminApiHub.activeApiCount = this.adminApiHub.apiEndpointsList.filter(e => e.status === 'active').length;
    this.apiService.updateApiEndpoint(endpoint.id, { status: nextStatus }).subscribe({
      error: () => {
        // เชื่อม backend ไม่ได้ — ย้อนกลับสถานะ ไม่ให้ UI โชว์ค่าที่ไม่ได้บันทึกจริง
        endpoint.status = previousStatus;
        this.adminApiHub.activeApiCount = this.adminApiHub.apiEndpointsList.filter(e => e.status === 'active').length;
        Swal.fire({ icon: 'error', title: 'บันทึกสถานะไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
      }
    });
    Swal.fire({
      icon: 'info',
      title: `เปลี่ยนสถานะ API`,
      text: `เปลี่ยนสถานะของ ${endpoint.name} เป็น ${nextStatus.toUpperCase()}`,
      confirmButtonColor: '#0d9488',
      background: '#ffffff',
      color: '#0f172a',
      timer: 1200
    });
    this.adminMonitor.addLog('INFO', `Changed status for API '${endpoint.name}' to ${nextStatus.toUpperCase()}`);
  }

  // ── Delete API Endpoint ──
  deleteApiEndpoint(endpoint: ApiEndpointItem): void {
    Swal.fire({
      title: 'ลบ API Endpoint?',
      text: `คุณต้องการลบ "${endpoint.name}" (${endpoint.url}) หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ลบ API / Delete',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deleteApiEndpoint(endpoint.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'ลบ API สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminApiHub.apiEndpointsList = this.adminApiHub.apiEndpointsList.filter(e => e.id !== endpoint.id);
            this.adminApiHub.activeApiCount = this.adminApiHub.apiEndpointsList.filter(e => e.status === 'active').length;
            this.adminMonitor.addLog('WARNING', `Deleted API Endpoint '${endpoint.name}'`);
          },
          error: () => {
            this.adminApiHub.apiEndpointsList = this.adminApiHub.apiEndpointsList.filter(e => e.id !== endpoint.id);
            this.adminApiHub.activeApiCount = this.adminApiHub.apiEndpointsList.filter(e => e.status === 'active').length;
            Swal.fire({ icon: 'success', title: 'ลบ API สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminMonitor.addLog('WARNING', `Deleted API Endpoint '${endpoint.name}'`);
          }
        });
      }
    });
  }

  // ── Live Test API Endpoint ──
  openTestApiModal(endpoint: ApiEndpointItem): void {
    const defaultPayload = JSON.stringify({
      action: 'ping',
      sample_input: 'Testing API Endpoint connection',
      timestamp: new Date().toISOString()
    }, null, 2);

    Swal.fire({
      title: `ทดสอบการเชื่อมต่อ API / Test Connection`,
      width: 680,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <div style="text-align:left; font-family:'Inter', 'Mitr', sans-serif;">
          <p style="font-size:0.88rem; color:#334155; margin-bottom:0.5rem;">
            <strong>API Name:</strong> ${escapeHtml(endpoint.name)}<br>
            <strong>Endpoint:</strong> <code>${endpoint.method} ${escapeHtml(endpoint.url)}</code>
          </p>
          <label style="font-size:0.78rem; font-weight:700; color:#334155;">Test Payload (JSON Format)</label>
          <textarea id="test-payload" class="swal2-textarea" style="margin:0.4rem 0 1rem 0; width:100%; font-family:monospace; font-size:0.82rem; height:120px; background:#0f172a; color:#38bdf8; border:1px solid #e2e8f0; border-radius:16px;">${defaultPayload}</textarea>
        </div>
      `,
      confirmButtonText: 'ส่งคำขอทดสอบ / Send Request',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ปิด / Close',
      focusConfirm: false,
      preConfirm: () => {
        const payloadStr = (document.getElementById('test-payload') as HTMLTextAreaElement)?.value.trim();
        let parsed = {};
        try {
          if (payloadStr) parsed = JSON.parse(payloadStr);
        } catch {
          Swal.showValidationMessage('รูปแบบ JSON ไม่ถูกต้อง');
          return false;
        }
        return parsed;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // ทดสอบจริง — backend เรียก route นั้นภายในเครื่องเดียวกันเท่านั้น (ไม่มีการยิง
        // request ออกนอกเครื่อง server เลยแม้แต่ครั้งเดียว กัน SSRF เพราะระบบนี้ไม่มี auth
        // คุ้มกัน endpoint ไหนเลย) ดูรายละเอียดที่ db/admin_apis.py:test_api_endpoint_safe()
        this.apiService.testApiEndpoint({ endpointId: endpoint.id, url: endpoint.url, payload: result.value }).subscribe({
          next: (res: any) => {
            const elapsed = res.latency_ms ?? 0;
            const ok = res.status_code && res.status_code >= 200 && res.status_code < 400;
            endpoint.latency_ms = elapsed;
            endpoint.last_tested = 'เมื่อสักครู่';
            Swal.fire({
              icon: ok ? 'success' : 'warning',
              title: ok ? `เชื่อมต่อ API สำเร็จ (${res.status_code})` : `ทดสอบไม่ผ่าน (${res.status_code ?? 'error'})`,
              background: '#ffffff',
              color: '#0f172a',
              html: `<div style="text-align:left;">
                <p><strong>Latency:</strong> ${elapsed} ms</p>
                <p style="color:#64748b; font-size:0.82rem;">${escapeHtml(res.note || '')}</p>
                <p><strong>Response:</strong></p>
                <pre style="background:#0f172a; color:#4ade80; padding:0.8rem; border-radius:16px; font-size:0.8rem; max-height:150px; overflow:auto;">${JSON.stringify(res, null, 2)}</pre>
              </div>`,
              confirmButtonColor: '#0d9488'
            });
            this.adminMonitor.addLog(ok ? 'SUCCESS' : 'WARNING', `Tested API '${endpoint.name}' -> ${res.status_code} (${elapsed}ms)`);
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'ทดสอบไม่สำเร็จ',
              text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง',
              confirmButtonColor: '#0d9488',
              background: '#ffffff',
              color: '#0f172a'
            });
            this.adminMonitor.addLog('ERROR', `Test failed for API '${endpoint.name}' — backend unreachable`);
          }
        });
      }
    });
  }

  toggleKeyVisibility(keyItem: ApiKeyItem): void {
    keyItem.show_key = !keyItem.show_key;
  }

  toggleApiKeyStatus(keyItem: ApiKeyItem): void {
    const nextStatus = keyItem.status === 'active' ? 'disabled' : 'active';
    const previousStatus = keyItem.status;
    keyItem.status = nextStatus;
    this.apiService.toggleApiKeyStatus(keyItem.id, nextStatus === 'active').subscribe({
      error: () => {
        keyItem.status = previousStatus;
        Swal.fire({ icon: 'error', title: 'บันทึกสถานะไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
      }
    });
    Swal.fire({
      icon: 'info',
      title: 'สลับสถานะ API Key',
      text: `เปลี่ยนสถานะ ${keyItem.key_name} เป็น ${nextStatus.toUpperCase()}`,
      confirmButtonColor: '#0d9488',
      background: '#ffffff',
      color: '#0f172a',
      timer: 1200
    });
    this.adminMonitor.addLog('INFO', `Toggled API Key '${keyItem.key_name}' status to ${nextStatus.toUpperCase()}`);
  }

  deleteApiKey(keyItem: ApiKeyItem): void {
    Swal.fire({
      title: 'ลบ API Key?',
      text: `คุณต้องการลบคีย์ "${keyItem.key_name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ลบ Key / Delete',
      cancelButtonText: 'ยกเลิก / Cancel',
      background: '#ffffff',
      color: '#0f172a'
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deleteApiKey(keyItem.id).subscribe({
          next: () => {
            this.adminApiHub.apiKeysList = this.adminApiHub.apiKeysList.filter(k => k.id !== keyItem.id);
            Swal.fire({ icon: 'success', title: 'ลบคีย์สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.adminMonitor.addLog('WARNING', `Deleted API Key '${keyItem.key_name}'`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'ลบคีย์ไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
          }
        });
      }
    });
  }

  // ── AI Prompts (ระดับระบบ — ทุกบทเรียน ทุกชั้นปีใช้ร่วมกัน) ──
  loadAiPrompts(): void {
    this.apiService.getAdminAiPrompts().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.aiPromptsList = data;
          this.aiPromptDrafts = {};
          data.forEach((p: any) => {
            this.aiPromptDrafts[p.scope_key] = p.prompt_text || '';
          });
        }
      },
      error: () => {}
    });
  }

  saveAiPrompt(scopeKey: string): void {
    const text = (this.aiPromptDrafts[scopeKey] || '').trim();
    if (!text) return;
    this.aiPromptSaving[scopeKey] = true;
    this.apiService.saveAdminAiPrompt(scopeKey, text).subscribe({
      next: () => {
        this.aiPromptSaving[scopeKey] = false;
        this.loadAiPrompts();
      },
      error: () => {
        this.aiPromptSaving[scopeKey] = false;
      }
    });
  }
}
