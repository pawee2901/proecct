import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../services/api.service';
import { StudentSessionService } from '../../services/student-session.service';
import { LessonsDataService } from '../../services/lessons-data.service';
import { GameFxService } from '../../services/game-fx.service';

interface AiVocabResult {
  vocab: { word: string; pos?: string; reading?: string; meaning: string; example: string }[];
  sentences: { en: string; th: string }[];
  tips: string[];
  conversations: { speaker: string; en: string; th: string }[];
}

interface VocabHistoryItem {
  id?: number;
  topic: string;
  level: string;
  levelLabel: string;
  createdAt: string;
  data: AiVocabResult;
}

// Phase 3 of the migration plan. Extracted from student.component.ts
// (vocabSubTab/aiVocabLevel/.../vocabHistory ~112-141, getAllVocabularies
// ~5014-5033, toggleFlip/toggleAiFlip/clearAiVocab ~5088-5111,
// loadVocabHistory..getMockAiResult ~5392-5657) and
// student.component.html (@if (activeTab === 'vocabulary') block, ~397-986).
//
// Dropped (confirmed dead — zero references anywhere in the template):
// selectVocabUnit/getVocabUnit/selectedVocabUnitId. The flashcard grid
// actually in use is driven by getAllVocabularies() (all units combined),
// not a per-unit selector.
@Component({
  selector: 'app-student-vocabulary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-vocabulary.component.html',
  styleUrl: './student-vocabulary.component.scss',
})
export class StudentVocabularyComponent implements OnInit, OnDestroy {
  vocabSubTab: 'lesson' | 'ai' = 'lesson';
  flippedCards: boolean[] = [];
  flippedAiCards: boolean[] = [];
  aiVocabLevel = 'beginner';
  aiVocabTopic = '';
  aiVocabLoading = false;
  streamingVocabCount = 0;
  private streamInterval: any = null;
  aiResultSubTab: 'vocab' | 'sentences' | 'tips' | 'conversation' = 'vocab';
  aiResultData: AiVocabResult | null = null;

  readonly loadingMessages: string[] = [
    'กำลังวิเคราะห์หัวข้อที่คุณเลือก...',
    'กำลังคิดคำศัพท์ที่เกี่ยวข้อง...',
    'กำลังแต่งตัวอย่างประโยค...',
    'กำลังเรียบเรียงบทสนทนา...',
    'กำลังตรวจสอบความถูกต้อง...',
    'ใกล้เสร็จแล้ว รอสักครู่...',
  ];
  currentLoadingMsgIndex = 0;
  private loadingMsgInterval: any = null;

  vocabHistory: VocabHistoryItem[] = [];

  constructor(
    private apiService: ApiService,
    public session: StudentSessionService,
    public lessonsData: LessonsDataService,
    public gameFx: GameFxService,
  ) {}

  ngOnInit(): void {
    this.loadVocabHistory();
  }

  ngOnDestroy(): void {
    if (this.streamInterval) clearInterval(this.streamInterval);
    this.stopLoadingMessages();
  }

  getAllVocabularies(): {
    word: string;
    pos?: string;
    reading?: string;
    meaning: string;
    unitId: number;
    unitNumber: string;
  }[] {
    const all: any[] = [];
    this.lessonsData.units.forEach((u) => {
      u.vocabularies.forEach((v) => {
        all.push({
          ...v,
          unitId: u.id,
          unitNumber: u.number,
        });
      });
    });
    return all;
  }

  toggleFlip(i: number): void {
    const arr = [...this.flippedCards];
    arr[i] = !arr[i];
    this.flippedCards = arr;
  }

  toggleAiFlip(i: number): void {
    const arr = [...this.flippedAiCards];
    arr[i] = !arr[i];
    this.flippedAiCards = arr;
  }

  clearAiVocab(): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.stopLoadingMessages();
    this.aiResultData = null;
    this.aiVocabLoading = false;
    this.streamingVocabCount = 0;
    this.flippedAiCards = [];
    this.aiResultSubTab = 'vocab';
    this.aiVocabTopic = '';
  }

  private startLoadingMessages(): void {
    this.currentLoadingMsgIndex = 0;
    if (this.loadingMsgInterval) clearInterval(this.loadingMsgInterval);
    this.loadingMsgInterval = setInterval(() => {
      this.currentLoadingMsgIndex = (this.currentLoadingMsgIndex + 1) % this.loadingMessages.length;
    }, 1800);
  }

  private stopLoadingMessages(): void {
    if (this.loadingMsgInterval) {
      clearInterval(this.loadingMsgInterval);
      this.loadingMsgInterval = null;
    }
  }

  loadVocabHistory(): void {
    if (!this.session.currentUser || !this.session.currentUser.id) {
      this.vocabHistory = [];
      return;
    }
    this.apiService.getVocabHistory(this.session.currentUser.id).subscribe({
      next: (res: any) => {
        this.vocabHistory = Array.isArray(res) ? res : [];
      },
      error: (err) => {
        console.warn('Could not load vocab history from DB, falling back to localStorage:', err);
        try {
          const key = `vocab_history_${this.session.currentUser?.id || 'guest'}`;
          const raw = localStorage.getItem(key);
          this.vocabHistory = raw ? JSON.parse(raw) : [];
        } catch {
          this.vocabHistory = [];
        }
      },
    });
  }

  saveVocabHistory(): void {
    try {
      const key = `vocab_history_${this.session.currentUser?.id || 'guest'}`;
      const limited = this.vocabHistory.slice(0, 10);
      localStorage.setItem(key, JSON.stringify(limited));
    } catch {}
  }

  viewHistoryItem(item: VocabHistoryItem): void {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.aiResultData = { ...item.data, tips: this.normalizeTips(item.data.tips) };
    this.aiVocabTopic = item.topic;
    this.aiVocabLevel = item.level;
    this.aiResultSubTab = 'vocab';
    this.streamingVocabCount = item.data?.vocab?.length || 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private normalizeTips(tips: unknown): string[] {
    if (!Array.isArray(tips)) return [];
    return tips.map((t) => {
      if (typeof t === 'string') return t;
      if (t && typeof t === 'object') {
        const obj = t as Record<string, unknown>;
        const candidate = obj['tip'] ?? obj['text'] ?? obj['content'] ?? obj['th'] ?? obj['en'];
        if (typeof candidate === 'string') return candidate;
        const firstString = Object.values(obj).find((v) => typeof v === 'string');
        if (typeof firstString === 'string') return firstString;
      }
      return String(t);
    });
  }

  removeHistoryItem(index: number): void {
    const item = this.vocabHistory[index];
    if (item && item.id) {
      this.apiService.deleteVocabHistory(item.id).subscribe({
        next: () => {
          this.vocabHistory.splice(index, 1);
        },
        error: (err) => {
          console.error('Failed to delete history item from DB:', err);
          this.vocabHistory.splice(index, 1);
        },
      });
    } else {
      this.vocabHistory.splice(index, 1);
      this.saveVocabHistory();
    }
  }

  pushVocabHistory(data: AiVocabResult): void {
    const levelMap: Record<string, string> = {
      beginner: 'เริ่มต้น',
      intermediate: 'กลาง',
      advanced: 'สูง',
    };
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    this.vocabHistory.unshift({
      topic: this.aiVocabTopic,
      level: this.aiVocabLevel,
      levelLabel: levelMap[this.aiVocabLevel] || this.aiVocabLevel,
      createdAt: dateStr,
      data,
    });
    if (this.vocabHistory.length > 10) this.vocabHistory.pop();
    this.saveVocabHistory();
  }

  getLevelLabel(): string {
    const map: Record<string, string> = {
      beginner: 'เริ่มต้น',
      intermediate: 'กลาง',
      advanced: 'สูง',
    };
    return map[this.aiVocabLevel] || this.aiVocabLevel;
  }

  private startStreamDisplay(data: any): void {
    this.streamingVocabCount = 0;
    if (this.streamInterval) clearInterval(this.streamInterval);
    const total = data?.vocab?.length || 0;
    if (total === 0) {
      this.streamingVocabCount = 0;
      return;
    }

    this.streamInterval = setInterval(() => {
      this.streamingVocabCount++;
      if (this.streamingVocabCount >= total) {
        clearInterval(this.streamInterval);
        this.streamInterval = null;
      }
    }, 180);
  }

  generateAiVocab(): void {
    if (!this.aiVocabTopic.trim() || this.aiVocabLoading) return;
    this.gameFx.playSoundEffect('click');
    this.aiVocabLoading = true;
    this.aiResultData = null;
    this.streamingVocabCount = 0;
    this.aiResultSubTab = 'vocab';
    this.startLoadingMessages();

    this.apiService.generateVocab(this.aiVocabTopic.trim(), this.aiVocabLevel, this.session.currentUser?.id).subscribe({
      next: (res: any) => {
        this.aiVocabLoading = false;
        this.stopLoadingMessages();
        const isRealResult =
          res?.vocab &&
          Array.isArray(res.vocab) &&
          res.vocab.length > 0 &&
          res?.sentences &&
          res?.conversations;
        const data = isRealResult ? res : this.getMockAiResult();
        data.tips = this.normalizeTips(data.tips);
        this.aiResultData = data;
        this.startStreamDisplay(data);
        this.gameFx.playSoundEffect('success');
        if (isRealResult) {
          this.loadVocabHistory();
        } else {
          this.pushVocabHistory(data);
        }
      },
      error: () => {
        this.aiVocabLoading = false;
        this.stopLoadingMessages();
        const mock = this.getMockAiResult();
        this.aiResultData = mock;
        this.startStreamDisplay(mock);
        this.gameFx.playSoundEffect('success');
        this.pushVocabHistory(mock);
      },
    });
  }

  private getMockAiResult(): AiVocabResult {
    return {
      vocab: [
        { word: 'school', pos: 'n.', reading: 'สคูล', meaning: 'โรงเรียน', example: 'I go to school every morning.' },
        { word: 'classroom', pos: 'n.', reading: 'คลาส-รูม', meaning: 'ห้องเรียน', example: 'Our classroom is on the second floor.' },
        { word: 'teacher', pos: 'n.', reading: 'ที-เชอร์', meaning: 'ครู', example: 'My teacher is kind and friendly.' },
        { word: 'student', pos: 'n.', reading: 'สตู-เดนท์', meaning: 'นักเรียน/นักศึกษา', example: 'The students are ready for class.' },
        { word: 'backpack', pos: 'n.', reading: 'แบ็กแพ็ก', meaning: 'กระเป๋านักเรียน', example: 'My books are in my backpack.' },
        { word: 'notebook', pos: 'n.', reading: 'โน้ต-บุ๊ก', meaning: 'สมุดจด', example: 'Please open your notebook.' },
        { word: 'homework', pos: 'n.', reading: 'โฮม-เวิร์ก', meaning: 'การบ้าน', example: 'I do my homework after school.' },
        { word: 'library', pos: 'n.', reading: 'ไล-บรา-รี', meaning: 'ห้องสมุด', example: 'We study in the library after class.' },
      ],
      sentences: [
        { en: 'What time do you go to school?', th: 'คุณไปโรงเรียนกี่โมง?' },
        { en: 'I go to school at 7:30 a.m.', th: 'ฉันไปโรงเรียนตอนเจ็ดโมงครึ่ง' },
        { en: 'Do you have your backpack?', th: 'คุณมีกระเป๋านักเรียนแล้วหรือยัง?' },
        { en: 'Yes, I have my books and notebook.', th: 'มีค่ะ/ครับ ฉันมีหนังสือและสมุดจดแล้ว' },
        { en: "Let's go to the classroom.", th: 'ไปห้องเรียนกันเถอะ' },
      ],
      tips: [
        'ใช้ "go to school" โดยไม่มี "the" เพราะเป็น fixed expression ที่หมายถึงไปเรียนหนังสือ',
        'คำว่า "homework" เป็น uncountable noun ไม่ใส่ s ท้ายคำ เช่น "I have a lot of homework."',
        'ใช้ "study" เมื่อหมายถึงการตั้งใจเรียน และ "learn" เมื่อหมายถึงการรับรู้หรือเข้าใจสิ่งใหม่',
      ],
      conversations: [
        { speaker: 'A', en: 'Good morning! Are you ready for school?', th: 'สวัสดีตอนเช้า พร้อมไปโรงเรียนหรือยัง?' },
        { speaker: 'B', en: 'Yes, I am. My backpack is ready.', th: 'พร้อมแล้ว กระเป๋านักเรียนของฉันพร้อมแล้ว' },
        { speaker: 'A', en: 'Do you have your notebook and pencil?', th: 'คุณมีสมุดจดกับดินสอไหม?' },
        { speaker: 'B', en: 'Yes, I do. I also have my homework.', th: 'มีค่ะ/ครับ และฉันก็มีการบ้านด้วย' },
        { speaker: 'A', en: "Great! Let's go to the classroom.", th: 'ดีมาก ไปห้องเรียนกันเถอะ' },
        { speaker: 'B', en: 'Okay! I want to see our teacher.', th: 'ได้เลย ฉันอยากเจอครูของเราแล้ว' },
      ],
    };
  }
}
