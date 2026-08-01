import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { StudentSessionService } from '../../services/student-session.service';
import { ProgressService } from '../../services/progress.service';
import { LearningLogService } from '../../services/learning-log.service';
import { PracticeSessionService } from '../../services/practice-session.service';
import { GameFxService } from '../../services/game-fx.service';

// Phase 2 of the migration plan. Extracted from student.component.ts
// (profileSubView/selectedHistoryCategory/expandedProfileLogIndex ~423-425,
// openProfileHistoryCategory/getFilteredProfileLogs ~8711-8733) and
// student.component.html (@if (activeTab === 'profile') block, ~4138-4467).
//
// loadLeaderboard/loadMockLeaderboard/leaderboardList were NOT migrated —
// confirmed dead (mutated but never rendered anywhere in the original
// template, same category as the AI Buddy widget/More sheet dropped in
// Phase 0). Flagged for the final review rather than silently resurrected.
@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.scss',
})
export class StudentProfileComponent {
  profileSubView: 'main' | 'category-detail' = 'main';
  selectedHistoryCategory = 'practice';
  expandedProfileLogIndex: number | null = null;

  constructor(
    public session: StudentSessionService,
    public progress: ProgressService,
    public learningLog: LearningLogService,
    private practiceSession: PracticeSessionService,
    public gameFx: GameFxService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  getInitial(): string {
    return (this.session.currentUser?.firstName || 'U')[0].toUpperCase();
  }

  logout(): void {
    this.session.logout();
  }

  openProfileHistoryCategory(category: string): void {
    this.selectedHistoryCategory = category;
    this.profileSubView = 'category-detail';
    this.expandedProfileLogIndex = null;
    this.gameFx.playSoundEffect('click');
  }

  getFilteredProfileLogs(category: string): any[] {
    if (!this.learningLog.learningLogs) return [];
    return this.learningLog.learningLogs.filter((log) => {
      const typeLower = (log.type || '').toLowerCase();
      if (category === 'practice') {
        return typeLower.includes('practice') || typeLower.includes('roleplay') || typeLower.includes('call') || typeLower.includes('speaking');
      } else if (category === 'test') {
        return typeLower.includes('test');
      } else if (category === 'game') {
        return typeLower.includes('game');
      } else if (category === 'speaking') {
        return typeLower.includes('speech-to-text') || typeLower.includes('pronunciation');
      }
      return true;
    });
  }

  stripMarkdown(text: string): string {
    return this.gameFx.stripMarkdown(text);
  }

  /** Original loadPastChatSession(log) reached directly into Practice's
   *  properties (student.component.ts:8641-8671). Now: hand the log to the
   *  mailbox service and navigate — StudentPracticeComponent (Phase 6)
   *  replays the session in its own ngOnInit. */
  loadPastChatSession(log: any): void {
    this.practiceSession.requestResume(log);
    this.router.navigate(['../practice'], { relativeTo: this.route });
  }
}
