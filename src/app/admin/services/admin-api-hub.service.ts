import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';
import { AdminMonitorService } from './admin-monitor.service';

export interface ApiEndpointItem {
  id: number;
  name: string;
  category: 'ai' | 'speech' | 'user' | 'course' | 'custom';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  auth_type: 'bearer' | 'api_key' | 'none';
  auth_key?: string;
  api_key_value?: string;
  description: string;
  status: 'active' | 'inactive';
  last_tested?: string;
  latency_ms?: number;
  success_rate?: number;
}

export interface ApiKeyItem {
  id: number;
  provider: string;
  key_name: string;
  api_key: string;
  daily_limit: number;
  used_today: number;
  status: 'active' | 'disabled';
  show_key?: boolean;
}

// apiEndpointsList/activeApiCount and apiKeysList are read by both
// AdminOverviewComponent (KPI card + the activeApiCount nav badge in the
// shell, plus the "Add API Endpoint"/"Add API Key" quick actions) and
// AdminApisComponent (the full tables + CRUD actions) — extracted verbatim
// from the old monolithic AdminComponent so both can share them.
// openAddApiEndpointModal()/openAddApiKeyModal() live here for the same
// reason openAddUserModal() lives on AdminUsersService: they're fired from
// two different pages. aiPromptsList and the rest of the APIs tab's CRUD
// methods (toggleApiStatus, deleteApiEndpoint, ...) are only ever used from
// AdminApisComponent, so they stay local to that page instead.
@Injectable({ providedIn: 'root' })
export class AdminApiHubService {
  // ว่างไว้ก่อนโหลดจริงจาก backend (GET /admin/api-management/endpoints,
  // /admin/api-keys) — ไม่ใส่ข้อมูลตัวอย่าง/คีย์ปลอมเป็นค่าเริ่มต้นอีกต่อไป เพราะทั้งสอง
  // endpoint นี้มี backend รองรับจริงแล้ว (ดู db/admin_apis.py) ไม่ต้องมี mock fallback
  apiEndpointsList: ApiEndpointItem[] = [];
  activeApiCount = 0;

  apiKeysList: ApiKeyItem[] = [];

  constructor(private apiService: ApiService, private adminMonitor: AdminMonitorService) {}

  loadApiEndpoints(): void {
    this.apiService.getApiEndpoints().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.apiEndpointsList = data;
        }
        this.activeApiCount = this.apiEndpointsList.filter(e => e.status === 'active').length;
      },
      error: () => {
        this.activeApiCount = this.apiEndpointsList.filter(e => e.status === 'active').length;
      }
    });
  }

  loadApiKeys(): void {
    this.apiService.getApiKeys().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.apiKeysList = data;
        }
      },
      error: () => {}
    });
  }

  // ── Add API Endpoint Modal (Overview quick action + APIs page button) ──
  openAddApiEndpointModal(): void {
    Swal.fire({
      title: 'เพิ่ม API Endpoint ใหม่ / Add API Endpoint',
      width: 640,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <style>
          .api-form { text-align: left; font-family: 'Inter', 'Mitr', sans-serif; }
          .api-row { display: flex; gap: 0.75rem; margin-bottom: 0.85rem; }
          .api-group { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
          .api-label { font-size: 0.76rem; font-weight: 700; color: #334155; }
          .api-input, .api-select, .api-textarea {
            width: 100%; box-sizing: border-box; padding: 0.65rem 0.8rem; border-radius: 16px;
            border: 1px solid #e2e8f0; background: #ffffff; font-size: 0.88rem; color: #0f172a;
            outline: none; transition: border-color .15s; font-family: inherit;
          }
          .api-textarea { border-radius: 16px; }
          .api-input:focus, .api-select:focus, .api-textarea:focus { border-color: #0d9488; }
        </style>
        <div class="api-form">
          <div class="api-row">
            <div class="api-group">
              <span class="api-label">ชื่อ API / Service Name</span>
              <input id="api-name" class="api-input" type="text" placeholder="เช่น Gemini AI Assistant">
            </div>
            <div class="api-group">
              <span class="api-label">หมวดหมู่ / Category</span>
              <select id="api-category" class="api-select">
                <option value="ai">AI / LLM Model</option>
                <option value="speech">Speech & STT</option>
                <option value="user">Auth & User</option>
                <option value="course">Course & Content</option>
                <option value="custom">Custom Webhook</option>
              </select>
            </div>
          </div>

          <div class="api-row">
            <div class="api-group" style="flex:2;">
              <span class="api-label">URL Endpoint</span>
              <input id="api-url" class="api-input" type="text" placeholder="http://localhost:5000/api/custom">
            </div>
            <div class="api-group" style="flex:1;">
              <span class="api-label">HTTP Method</span>
              <select id="api-method" class="api-select">
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          <div class="api-row">
            <div class="api-group">
              <span class="api-label">ประเภท Authentication</span>
              <select id="api-authtype" class="api-select">
                <option value="bearer">Bearer Token</option>
                <option value="api_key">API Key Header</option>
                <option value="none">ไม่มี (Public)</option>
              </select>
            </div>
            <div class="api-group">
              <span class="api-label">Header Key / Token Secret (ถ้ามี)</span>
              <input id="api-authvalue" class="api-input" type="text" placeholder="sk_live_123456789">
            </div>
          </div>

          <div class="api-row">
            <div class="api-group">
              <span class="api-label">คำอธิบายหน้าที่ของ API</span>
              <textarea id="api-desc" class="api-textarea" rows="2" placeholder="อธิบายหน้าที่การทำงานสั้นๆ"></textarea>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: 'เพิ่ม API Endpoint / Save Endpoint',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก / Cancel',
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById('api-name') as HTMLInputElement)?.value.trim();
        const category = (document.getElementById('api-category') as HTMLSelectElement)?.value as any;
        const url = (document.getElementById('api-url') as HTMLInputElement)?.value.trim();
        const method = (document.getElementById('api-method') as HTMLSelectElement)?.value as any;
        const auth_type = (document.getElementById('api-authtype') as HTMLSelectElement)?.value as any;
        const api_key_value = (document.getElementById('api-authvalue') as HTMLInputElement)?.value.trim();
        const description = (document.getElementById('api-desc') as HTMLTextAreaElement)?.value.trim();

        if (!name || !url) {
          Swal.showValidationMessage('กรุณากรอกชื่อ API และ URL Endpoint ให้ครบถ้วน');
          return false;
        }

        return {
          name,
          category,
          url,
          method,
          auth_type,
          api_key_value,
          description: description || 'บริการ API ในระบบ',
          status: 'active' as const
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newApi = result.value;
        this.apiService.addApiEndpoint(newApi).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'เพิ่ม API สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1800 });
            this.loadApiEndpoints();
            this.adminMonitor.addLog('SUCCESS', `Added new API Endpoint: ${newApi.name} (${newApi.method} ${newApi.url})`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'เพิ่ม API ไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
            this.adminMonitor.addLog('ERROR', `Failed to add API Endpoint '${newApi.name}' — backend unreachable`);
          }
        });
      }
    });
  }

  // ── Add API Key Modal (Overview quick action + APIs page button) ──
  openAddApiKeyModal(): void {
    Swal.fire({
      title: 'เพิ่ม API Key ให้บริการ / Add API Key',
      width: 580,
      background: '#ffffff',
      color: '#0f172a',
      html: `
        <div style="text-align:left; font-family:'Inter', 'Mitr', sans-serif; display:flex; flex-direction:column; gap:0.8rem;">
          <div>
            <label style="font-size:0.78rem; font-weight:700; color:#334155;">ผู้ให้บริการ / Provider</label>
            <input id="key-provider" class="swal2-input" placeholder="เช่น Google Gemini, OpenAI, Whisper STT" style="margin:0.2rem 0; width:100%; background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; border-radius:16px;">
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; color:#334155;">ชื่อคีย์ / Key Name Label</label>
            <input id="key-name" class="swal2-input" placeholder="เช่น Gemini Flash Prod Key #2" style="margin:0.2rem 0; width:100%; background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; border-radius:16px;">
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; color:#334155;">API Secret Key Value</label>
            <input id="key-value" class="swal2-input" type="password" placeholder="AIzaSy..." style="margin:0.2rem 0; width:100%; background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; border-radius:16px;">
          </div>
          <div>
            <label style="font-size:0.78rem; font-weight:700; color:#334155;">โควตารายวัน (Daily Token / Request Limit)</label>
            <input id="key-limit" class="swal2-input" type="number" value="30000" style="margin:0.2rem 0; width:100%; background:#ffffff; color:#0f172a; border:1px solid #e2e8f0; border-radius:16px;">
          </div>
        </div>
      `,
      confirmButtonText: 'บันทึก API Key / Save Key',
      confirmButtonColor: '#0d9488',
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก / Cancel',
      preConfirm: () => {
        const provider = (document.getElementById('key-provider') as HTMLInputElement)?.value.trim();
        const key_name = (document.getElementById('key-name') as HTMLInputElement)?.value.trim();
        const api_key = (document.getElementById('key-value') as HTMLInputElement)?.value.trim();
        const daily_limit = Number((document.getElementById('key-limit') as HTMLInputElement)?.value) || 30000;

        if (!provider || !key_name || !api_key) {
          Swal.showValidationMessage('กรุณากรอกข้อมูล API Key ให้ครบถ้วน');
          return false;
        }

        return { provider, key_name, api_key, daily_limit, used_today: 0, status: 'active' as const };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const newKey = result.value;
        this.apiService.addApiKey(newKey).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'เพิ่ม API Key สำเร็จ', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a', timer: 1500 });
            this.loadApiKeys();
            this.adminMonitor.addLog('SUCCESS', `Added API Key '${newKey.key_name}' for ${newKey.provider}`);
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'เพิ่ม API Key ไม่สำเร็จ', text: 'เชื่อมต่อ backend ไม่ได้ กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488', background: '#ffffff', color: '#0f172a' });
            this.adminMonitor.addLog('ERROR', `Failed to add API Key '${newKey.key_name}' — backend unreachable`);
          }
        });
      }
    });
  }
}
