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
// Known pre-existing issue (not introduced by this split, preserved as-is):
// this data is computed purely from localStorage `score_*`/`game_*` keys and
// never reads back the scores this same app also POSTs to the backend via
// /student/quiz-result — so progress does not sync across devices/browsers.
@Injectable({ providedIn: 'root' })
export class ProgressService {
  progressReport: ProgressReportEntry[] = [];
  averageScore = 84;
  practiceCount = 12;
  /** Static placeholder in the original code too — never recalculated. */
  totalTime = 180;

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
