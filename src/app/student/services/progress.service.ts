import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { StudentSessionService } from './student-session.service';
import { LessonsDataService } from './lessons-data.service';
import { LearningLogService } from './learning-log.service';
import { ProgressReportEntry } from '../models/unit.model';

// Extracted from student.component.ts: progressReport/practiceCount/averageScore
// (~2915-2916, 147-149), loadProgressHistory (~8018-8063), getLessonStatusClass/
// Label + getCompletedCount (~5051-5069), gamification stats (~157-159).
//
// Fixed (2026-08-17): this data used to be computed purely from localStorage
// `score_*`/`game_*` keys and never read back the scores this same app also
// POSTs to the backend via /student/quiz-result — so progress never synced
// across devices/browsers. loadProgressHistory() now still paints instantly
// from localStorage (fast, works offline) then overlays real pre/post-test
// scores from GET /student/progress/<id> (practice_sessions) once it
// arrives, and recomputes averageScore/practiceCount from the merged result.
@Injectable({ providedIn: 'root' })
export class ProgressService {
  progressReport: ProgressReportEntry[] = [];
  averageScore = 84;
  practiceCount = 12;

  // Gamification stats (Profile tab)
  dailyStreak = 5;
  dailyXpGoal = 100;
  currentXp = 75;

  constructor(
    private session: StudentSessionService,
    private lessonsData: LessonsDataService,
    private learningLog: LearningLogService,
    private apiService: ApiService,
  ) {}

  /** Shared by Games (pre_game/post_game, via GameEngineService) and Lessons
   *  (pre_test/post_test, Phase 5) — original student.component.ts:5744-5754. */
  submitQuizResultToBackend(quizType: 'pre_test' | 'post_test' | 'pre_game' | 'post_game', score: number): void {
    if (!this.session.currentUser?.id || !this.lessonsData.currentUnit?.id) return;
    this.apiService
      .submitQuizResult({
        userId: this.session.currentUser.id,
        lessonId: this.lessonsData.currentUnit.id,
        quizType,
        score,
      })
      .subscribe({ error: () => {} });
  }

  loadProgressHistory(): void {
    this.progressReport = this.lessonsData.units.map((unit) => {
      const preScore = localStorage.getItem(`score_${this.session.currentUser?.id}_unit${unit.id}_pre`);
      const postScore = localStorage.getItem(`score_${this.session.currentUser?.id}_unit${unit.id}_post`);
      const gameScramble = localStorage.getItem(`game_scramble_${this.session.currentUser?.id}_unit${unit.id}`);
      const gameDialogue = localStorage.getItem(`game_dialogue_${this.session.currentUser?.id}_unit${unit.id}`);

      return {
        unitId: unit.id,
        number: unit.number,
        title: unit.title,
        preScore: preScore ? parseInt(preScore, 10) : null,
        postScore: postScore ? parseInt(postScore, 10) : null,
        gameScramble: gameScramble ? parseInt(gameScramble, 10) : null,
        gameDialogue: gameDialogue ? parseInt(gameDialogue, 10) : null,
      };
    });

    let totalScoreSum = 0;
    let count = 0;
    this.progressReport.forEach((p) => {
      if (p.preScore !== null) {
        totalScoreSum += p.preScore;
        count++;
      }
      if (p.postScore !== null) {
        totalScoreSum += p.postScore;
        count++;
      }
      if (p.gameScramble !== null) {
        totalScoreSum += p.gameScramble;
        count++;
      }
      if (p.gameDialogue !== null) {
        totalScoreSum += p.gameDialogue;
        count++;
      }
    });

    this.averageScore = count > 0 ? Math.round(totalScoreSum / count) : 0;
    this.practiceCount = this.learningLog.learningLogs.length;

    this.syncProgressFromBackend();
  }

  /** เติมค่า preScore/postScore จริงจาก practice_sessions ทับค่าที่คำนวณจาก localStorage
   *  ด้านบน (ถ้ามีคะแนนจริงใน DB) แล้วคำนวณ averageScore ใหม่ — ทำให้หน้า Lessons/Profile
   *  เห็น progress เดียวกันไม่ว่าจะเปิดจากเครื่อง/เบราว์เซอร์ไหน ไม่ใช่แค่เครื่องที่ทำข้อสอบ */
  private syncProgressFromBackend(): void {
    if (!this.session.currentUser?.id) return;
    this.apiService.getStudentProgress(this.session.currentUser.id).subscribe({
      next: (dbProgress: { [lessonId: string]: { pre_test: number | null; post_test: number | null } }) => {
        if (!dbProgress || typeof dbProgress !== 'object') return;

        let totalScoreSum = 0;
        let count = 0;
        this.progressReport.forEach((p) => {
          const dbEntry = dbProgress[String(p.unitId)];
          if (dbEntry) {
            if (dbEntry.pre_test !== null && dbEntry.pre_test !== undefined) p.preScore = dbEntry.pre_test;
            if (dbEntry.post_test !== null && dbEntry.post_test !== undefined) p.postScore = dbEntry.post_test;
          }
          if (p.preScore !== null) {
            totalScoreSum += p.preScore;
            count++;
          }
          if (p.postScore !== null) {
            totalScoreSum += p.postScore;
            count++;
          }
          if (p.gameScramble !== null) {
            totalScoreSum += p.gameScramble;
            count++;
          }
          if (p.gameDialogue !== null) {
            totalScoreSum += p.gameDialogue;
            count++;
          }
        });
        this.averageScore = count > 0 ? Math.round(totalScoreSum / count) : 0;
      },
      error: () => {
        // เชื่อม backend ไม่ได้ — ใช้ค่าจาก localStorage ที่คำนวณไว้แล้วต่อไป
      },
    });

    this.syncOverallScoresFromBackend();
  }

  /** เติม overallScore/passed/reasoning ต่อบทเรียน (ai/lesson_grading.py รวม pre/post/game
   *  เป็นคะแนนเดียว + ผ่านหรือไม่ ตามเกณฑ์ที่อาจารย์ตั้งไว้) ให้หน้า Profile ▸ ความก้าวหน้า
   *  เห็นเหมือนที่อาจารย์เห็นในหน้าคะแนนของนักศึกษาคนนี้ทุกประการ (endpoint เดียวกัน) —
   *  แยก request จาก syncProgressFromBackend() ด้านบนเพราะคนละ endpoint/shape กัน (นี่คืน
   *  array ที่มี lesson_id ในตัว ไม่ใช่ dict คีย์ด้วย lesson_id) และไม่อยากให้ endpoint หนึ่ง
   *  ล้มแล้วบล็อกอีกอันไม่ให้ทำงาน */
  private syncOverallScoresFromBackend(): void {
    if (!this.session.currentUser?.id) return;
    this.apiService.getStudentLessonScores(this.session.currentUser.id).subscribe({
      next: (rows: { lesson_id: number; overall?: number | null; passed?: boolean | null; reasoning?: string }[]) => {
        if (!Array.isArray(rows)) return;
        const byLessonId = new Map(rows.map((r) => [r.lesson_id, r]));
        this.progressReport.forEach((p) => {
          const row = byLessonId.get(p.unitId);
          if (!row) return;
          p.overallScore = row.overall ?? null;
          p.passed = row.passed ?? null;
          p.reasoning = row.reasoning || '';
        });
      },
      error: () => {
        // เชื่อม backend ไม่ได้ — แสดงแค่ pre/post-test เหมือนเดิม ไม่มีคะแนนรวม/ผ่านหรือไม่
      },
    });
  }

  getLessonStatusClass(unitId: number): string {
    const prog = this.progressReport[unitId - 1];
    if (!prog) return 'status-not-started';
    if (prog.postScore !== null) return 'status-completed';
    if (prog.preScore !== null) return 'status-in-progress';
    return 'status-not-started';
  }

  getLessonStatusLabel(unitId: number): string {
    const prog = this.progressReport[unitId - 1];
    if (!prog) return 'ยังไม่เริ่ม';
    if (prog.postScore !== null) return 'เรียนจบแล้ว';
    if (prog.preScore !== null) return 'กำลังเรียน';
    return 'ยังไม่เริ่ม';
  }

  getCompletedCount(): number {
    return this.progressReport.filter((p) => p?.postScore !== null).length;
  }
}
