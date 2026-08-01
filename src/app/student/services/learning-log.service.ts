import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { StudentSessionService } from './student-session.service';
import { LearningLogEntry } from '../models/unit.model';

// Extracted from student.component.ts: `learningLogs` (line ~501),
// `loadLearningLogs`/`saveLearningLogs` (~5113-5162), `logActivity` (~5381).
@Injectable({ providedIn: 'root' })
export class LearningLogService {
  learningLogs: LearningLogEntry[] = [];

  /** The original component called `this.cdr.detectChanges()` after DB logs
   *  merged in asynchronously. Services can't touch change detection, so
   *  consumers (e.g. ProfileComponent) should subscribe and call their own
   *  ChangeDetectorRef.detectChanges() when this fires. */
  readonly logsChanged$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private session: StudentSessionService,
  ) {}

  loadLearningLogs(): void {
    try {
      const key = `learning_logs_${this.session.currentUser?.id || 'guest'}`;
      const raw = localStorage.getItem(key);
      this.learningLogs = raw ? JSON.parse(raw) : [];
    } catch {
      this.learningLogs = [];
    }

    if (this.session.currentUser && this.session.currentUser.id) {
      this.apiService.getSpeakingHistory(this.session.currentUser.id).subscribe({
        next: (dbLogs: any[]) => {
          if (Array.isArray(dbLogs)) {
            const mappedDbLogs = dbLogs.map((sess: any) => ({
              date: new Date(sess.created_at),
              type: 'Speaking',
              title: `Speaking Practice (${sess.mode === 'speech-to-speech' ? 'Speech-to-Speech' : 'Video Call'})`,
              score: sess.total_score,
              xp: 30,
              transcript: sess.transcript,
            }));

            const filteredDbLogs = mappedDbLogs.filter((dbLog) => {
              return !this.learningLogs.some((localLog) => {
                const localDate = new Date(localLog.date);
                return Math.abs(localDate.getTime() - dbLog.date.getTime()) < 3000;
              });
            });

            if (filteredDbLogs.length > 0) {
              this.learningLogs = [...filteredDbLogs, ...this.learningLogs];
              this.learningLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              this.logsChanged$.next();
            }
          }
        },
        error: (err) => {
          console.warn('Could not load speaking history from database:', err);
        },
      });
    }
  }

  saveLearningLogs(): void {
    try {
      const key = `learning_logs_${this.session.currentUser?.id || 'guest'}`;
      const limited = this.learningLogs.slice(0, 50);
      localStorage.setItem(key, JSON.stringify(limited));
    } catch {}
  }

  log(entry: { type: string; title: string; score?: number; xp: number; transcript?: { sender: 'user' | 'ai'; text: string }[] }): void {
    this.learningLogs.unshift({ date: new Date(), ...entry });
    this.saveLearningLogs();
    this.logsChanged$.next();
  }
}
