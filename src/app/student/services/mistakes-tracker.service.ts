import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { StudentSessionService } from './student-session.service';
import { FrequentlyWrongItem } from '../models/unit.model';

// Extracted from student.component.ts: `frequentlyWrongItems` (line ~360),
// `loadFrequentlyWrongItems`/`saveFrequentlyWrongItems`/`trackWrongItem` (~5164-5197).
// Written to by Practice + Games; previously nothing read it back — this
// becomes the real data source for the new Review tab (see plan Phase 7).
//
// Fixed (2026-08-17): this used to be localStorage-only (per-browser, never
// synced). Now GET/POST /student/mistakes/<id> (mistake_items table) is the
// source of truth — localStorage stays as an instant-paint cache/offline
// fallback only, matching the pattern used by LearningLogService/LessonsDataService.
@Injectable({ providedIn: 'root' })
export class MistakesTrackerService {
  frequentlyWrongItems: FrequentlyWrongItem[] = [];

  constructor(
    private session: StudentSessionService,
    private apiService: ApiService,
  ) {}

  loadFrequentlyWrongItems(): void {
    try {
      const key = `frequently_wrong_${this.session.currentUser?.id || 'guest'}`;
      const raw = localStorage.getItem(key);
      this.frequentlyWrongItems = raw ? JSON.parse(raw) : [];
    } catch {
      this.frequentlyWrongItems = [];
    }

    if (!this.session.currentUser?.id) return;
    this.apiService.getMistakeItems(this.session.currentUser.id).subscribe({
      next: (items: any[]) => {
        if (Array.isArray(items)) {
          this.frequentlyWrongItems = items.map((it) => ({
            id: it.id ? String(it.id) : 'wrong_' + Math.random().toString(36).substr(2, 9),
            type: it.type,
            original: it.original,
            correct: it.correct,
            clue: it.clue,
            wrongCount: it.wrongCount,
          }));
          this.saveFrequentlyWrongItems();
        }
      },
      error: () => {
        // เชื่อม backend ไม่ได้ — ใช้ค่า localStorage ที่โหลดไว้ด้านบนต่อไป
      },
    });
  }

  saveFrequentlyWrongItems(): void {
    try {
      const key = `frequently_wrong_${this.session.currentUser?.id || 'guest'}`;
      localStorage.setItem(key, JSON.stringify(this.frequentlyWrongItems));
    } catch {}
  }

  trackWrongItem(type: 'word' | 'sentence' | 'grammar', original: string, correct: string, clue?: string): void {
    if (!original || !original.trim()) return;
    const existing = this.frequentlyWrongItems.find(
      (item) => item.original.toLowerCase() === original.toLowerCase(),
    );
    if (existing) {
      existing.wrongCount++;
    } else {
      this.frequentlyWrongItems.push({
        id: 'wrong_' + Math.random().toString(36).substr(2, 9),
        type,
        original,
        correct,
        clue,
        wrongCount: 1,
      });
    }
    this.saveFrequentlyWrongItems();

    if (this.session.currentUser?.id) {
      this.apiService.trackMistakeItem(this.session.currentUser.id, { type, original, correct, clue }).subscribe({
        error: () => {},
      });
    }
  }

  /** เรียกตอนนักศึกษาตอบถูกในโหมดทบทวน (Review quiz) — ลด wrongCount ทั้ง local state
   *  และฝั่ง backend พร้อมกัน (แทนที่การ mutate array ตรงๆ ใน StudentReviewComponent เดิม
   *  ซึ่งไม่เคยแตะ backend เลย) ลบออกจาก list ถ้าลดจนเหลือ 0 */
  recordCorrectReview(itemId: string): void {
    const idx = this.frequentlyWrongItems.findIndex((i) => i.id === itemId);
    if (idx === -1) return;
    const item = this.frequentlyWrongItems[idx];
    item.wrongCount--;
    const shouldRemove = item.wrongCount <= 0;
    if (shouldRemove) {
      this.frequentlyWrongItems.splice(idx, 1);
    }
    this.saveFrequentlyWrongItems();

    if (this.session.currentUser?.id) {
      this.apiService.decrementMistakeItem(this.session.currentUser.id, item.original).subscribe({
        error: () => {},
      });
    }
  }
}
