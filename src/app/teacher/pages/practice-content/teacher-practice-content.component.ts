import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

import { ApiService } from '../../../services/api.service';
import { TeacherSessionService } from '../../services/teacher-session.service';

type ScenarioCategory = 'teaching' | 'daily' | 'interview';
type ActiveTab = ScenarioCategory | 'chat';

// Practice Content Manager — replaces what used to be teachingLessons/dailyLessons/
// interviewLessons/practiceChatTopics hardcoded in student-practice.component.ts:
// the exact same content for every year level, with zero teacher control. Now split
// per year level (session.activeYearLevel, same classroom picker as Lessons/Students)
// and editable here, with an AI "ให้ AI ช่วยแต่ง" draft assist per item.
@Component({
  selector: 'app-teacher-practice-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-practice-content.component.html',
  styleUrl: './teacher-practice-content.component.scss',
})
export class TeacherPracticeContentComponent implements OnInit, OnDestroy {
  activeTab: ActiveTab = 'teaching';
  readonly tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'teaching', label: 'ครู (Teaching)', icon: '👩‍🏫' },
    { key: 'daily', label: 'ชีวิตประจำวัน (Daily)', icon: '💬' },
    { key: 'interview', label: 'สัมภาษณ์งาน (Interview)', icon: '💼' },
    { key: 'chat', label: 'หัวข้อแชท (Chat Topics)', icon: '⌨️' },
  ];

  scenarios: any[] = [];
  chatTopics: any[] = [];
  loading = false;

  // { scenario_id?, titleTh, titleEn, description, article, vocab: [{en,th}], image }
  editingScenario: any = null;
  // { topic_id?, icon, titleTh, titleEn, scenario }
  editingChatTopic: any = null;

  draftTopicHint = '';
  drafting = false;
  saving = false;

  private yearChangedSub?: Subscription;

  constructor(public session: TeacherSessionService, private apiService: ApiService) {}

  ngOnInit(): void {
    this.loadData();
    this.yearChangedSub = this.session.yearChanged$.subscribe(() => {
      this.editingScenario = null;
      this.editingChatTopic = null;
      this.loadData();
    });
  }

  ngOnDestroy(): void {
    this.yearChangedSub?.unsubscribe();
  }

  get yearLevel(): number {
    return this.session.activeYearLevel || 1;
  }

  switchTab(tab: ActiveTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.editingScenario = null;
    this.editingChatTopic = null;
    this.draftTopicHint = '';
    this.loadData();
  }

  loadData(): void {
    if (!this.session.activeYearLevel) return;
    this.loading = true;
    if (this.activeTab === 'chat') {
      this.apiService.getPracticeChatTopics(this.yearLevel).subscribe({
        next: (data: any[]) => { this.chatTopics = Array.isArray(data) ? data : []; this.loading = false; },
        error: () => { this.chatTopics = []; this.loading = false; },
      });
    } else {
      this.apiService.getPracticeScenarios(this.yearLevel, this.activeTab).subscribe({
        next: (data: any[]) => { this.scenarios = Array.isArray(data) ? data : []; this.loading = false; },
        error: () => { this.scenarios = []; this.loading = false; },
      });
    }
  }

  // ── Scenario CRUD (teaching / daily / interview) ──
  startNewScenario(): void {
    this.editingChatTopic = null;
    this.editingScenario = { titleTh: '', titleEn: '', description: '', article: '', vocab: [], image: '' };
  }

  editScenario(item: any): void {
    this.editingChatTopic = null;
    this.editingScenario = { ...item, vocab: item.vocab ? item.vocab.map((v: any) => ({ ...v })) : [] };
  }

  cancelScenarioEdit(): void {
    this.editingScenario = null;
  }

  addScenarioVocab(): void {
    this.editingScenario.vocab.push({ en: '', th: '' });
  }

  removeScenarioVocab(idx: number): void {
    this.editingScenario.vocab.splice(idx, 1);
  }

  saveScenario(): void {
    if (!this.editingScenario.titleTh?.trim() || !this.editingScenario.titleEn?.trim() || !this.editingScenario.article?.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรอกข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกชื่อไทย ชื่ออังกฤษ และบริบทสำหรับ AI ให้ครบ', confirmButtonColor: '#0d9488' });
      return;
    }
    const payload = { ...this.editingScenario, year_level: this.yearLevel, category: this.activeTab };
    const isEdit = !!this.editingScenario.scenario_id;
    this.saving = true;
    const req = isEdit
      ? this.apiService.updatePracticeScenario(this.editingScenario.scenario_id, payload)
      : this.apiService.createPracticeScenario(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.editingScenario = null;
        this.loadData();
        Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1200, showConfirmButton: false });
      },
      error: () => {
        this.saving = false;
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', confirmButtonColor: '#0d9488' });
      },
    });
  }

  deleteScenario(item: any): void {
    Swal.fire({
      icon: 'warning',
      title: `ลบ "${item.titleTh}"?`,
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deletePracticeScenario(item.scenario_id).subscribe({
          next: () => this.loadData(),
          error: () => Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', confirmButtonColor: '#0d9488' }),
        });
      }
    });
  }

  // ── Chat Topic CRUD ──
  startNewChatTopic(): void {
    this.editingScenario = null;
    this.editingChatTopic = { icon: '💬', titleTh: '', titleEn: '', scenario: '' };
  }

  editChatTopic(item: any): void {
    this.editingScenario = null;
    this.editingChatTopic = { ...item };
  }

  cancelChatTopicEdit(): void {
    this.editingChatTopic = null;
  }

  saveChatTopic(): void {
    if (!this.editingChatTopic.titleTh?.trim() || !this.editingChatTopic.titleEn?.trim() || !this.editingChatTopic.scenario?.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรอกข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกชื่อไทย ชื่ออังกฤษ และบริบทสำหรับ AI ให้ครบ', confirmButtonColor: '#0d9488' });
      return;
    }
    const payload = { ...this.editingChatTopic, year_level: this.yearLevel };
    const isEdit = !!this.editingChatTopic.topic_id;
    this.saving = true;
    const req = isEdit
      ? this.apiService.updatePracticeChatTopic(this.editingChatTopic.topic_id, payload)
      : this.apiService.createPracticeChatTopic(payload);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.editingChatTopic = null;
        this.loadData();
        Swal.fire({ icon: 'success', title: 'บันทึกแล้ว', timer: 1200, showConfirmButton: false });
      },
      error: () => {
        this.saving = false;
        Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', confirmButtonColor: '#0d9488' });
      },
    });
  }

  deleteChatTopic(item: any): void {
    Swal.fire({
      icon: 'warning',
      title: `ลบ "${item.titleTh}"?`,
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (result.isConfirmed) {
        this.apiService.deletePracticeChatTopic(item.topic_id).subscribe({
          next: () => this.loadData(),
          error: () => Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', confirmButtonColor: '#0d9488' }),
        });
      }
    });
  }

  // ── AI Draft assist — fills whichever form (scenario/chat topic) is open,
  // opening a blank one first if neither is. Teacher still has to review and
  // press Save themselves; nothing here ever saves automatically. ──
  draftWithAi(): void {
    if (!this.draftTopicHint.trim()) {
      Swal.fire({ icon: 'warning', title: 'พิมพ์หัวข้อก่อน', text: 'พิมพ์หัวข้อสั้นๆ ที่ต้องการให้ AI ช่วยแต่งก่อนนะครับ', confirmButtonColor: '#0d9488' });
      return;
    }
    const isChat = this.activeTab === 'chat';
    if (isChat && !this.editingChatTopic) this.startNewChatTopic();
    if (!isChat && !this.editingScenario) this.startNewScenario();

    this.drafting = true;
    const kind = isChat ? 'chat_topic' : 'scenario';
    const category = isChat ? undefined : this.activeTab;
    this.apiService.draftPracticeContent(kind, this.draftTopicHint, this.yearLevel, category).subscribe({
      next: (draft: any) => {
        this.drafting = false;
        if (isChat) {
          this.editingChatTopic.icon = draft.icon;
          this.editingChatTopic.titleTh = draft.titleTh;
          this.editingChatTopic.titleEn = draft.titleEn;
          this.editingChatTopic.scenario = draft.scenario;
        } else {
          this.editingScenario.titleTh = draft.titleTh;
          this.editingScenario.titleEn = draft.titleEn;
          this.editingScenario.description = draft.description;
          this.editingScenario.article = draft.article;
          this.editingScenario.vocab = draft.vocab || [];
        }
      },
      error: () => {
        this.drafting = false;
        Swal.fire({ icon: 'error', title: 'AI ร่างไม่สำเร็จ', text: 'กรุณาลองใหม่อีกครั้ง', confirmButtonColor: '#0d9488' });
      },
    });
  }
}
