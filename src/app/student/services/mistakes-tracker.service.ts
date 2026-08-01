import { Injectable } from '@angular/core';
import { StudentSessionService } from './student-session.service';
import { FrequentlyWrongItem } from '../models/unit.model';

// Extracted from student.component.ts: `frequentlyWrongItems` (line ~360),
// `loadFrequentlyWrongItems`/`saveFrequentlyWrongItems`/`trackWrongItem` (~5164-5197).
// Written to by Practice + Games; previously nothing read it back — this
// becomes the real data source for the new Review tab (see plan Phase 7).
@Injectable({ providedIn: 'root' })
export class MistakesTrackerService {
  frequentlyWrongItems: FrequentlyWrongItem[] = [];

  constructor(private session: StudentSessionService) {}

  loadFrequentlyWrongItems(): void {
    try {
      const key = `frequently_wrong_${this.session.currentUser?.id || 'guest'}`;
      const raw = localStorage.getItem(key);
      this.frequentlyWrongItems = raw ? JSON.parse(raw) : [];
    } catch {
      this.frequentlyWrongItems = [];
    }
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
  }
}
