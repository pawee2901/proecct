import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, ActivatedRoute } from '@angular/router';

import { CuteBackgroundComponent } from '../../shared/cute-background/cute-background.component';
import { StudentSessionService } from '../services/student-session.service';
import { LessonsDataService } from '../services/lessons-data.service';
import { ProgressService } from '../services/progress.service';
import { LearningLogService } from '../services/learning-log.service';
import { MistakesTrackerService } from '../services/mistakes-tracker.service';
import { GameEngineService } from '../services/game-engine.service';
import { GameFxService } from '../services/game-fx.service';
import { SharedUiStateService } from '../services/shared-ui-state.service';

// Persistent chrome (top nav, bottom nav, profile dropdown/sheet, the
// Voice Settings + Badges modals, confetti/shake FX) extracted from
// student.component.html — original lines 1-13 (confetti/orbs), 14-229
// (top nav), 4600-4679 (bottom nav), 5810-5885 (mobile profile sheet),
// 5963-6023 (voice settings modal), 6174-6200 (badges modal).
//
// Dropped rather than migrated (dead code, confirmed no open-trigger
// anywhere in the template): the "More" bottom sheet (5890-5958) and the
// AI Learning Buddy / Live Conversation widget.
//
// Also owns the one-time session bootstrap that used to live in
// StudentComponent.ngOnInit (original lines 2939-2972) — everything every
// tab route depends on (session, lesson seed data, progress, logs, mistakes
// tracker, game vocab pool, voice settings). loadLeaderboard() and
// loadVocabHistory() are intentionally NOT called here yet — they're
// Profile/Vocabulary-tab-specific and will be wired up when those routes
// are built (Phase 2/3 of the migration plan).
@Component({
  selector: 'app-student-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, CuteBackgroundComponent],
  templateUrl: './student-shell.component.html',
  styleUrl: './student-shell.component.scss',
})
export class StudentShellComponent implements OnInit {
  showProfileDropdown = false;

  constructor(
    public session: StudentSessionService,
    public lessonsData: LessonsDataService,
    public progress: ProgressService,
    public learningLog: LearningLogService,
    public mistakes: MistakesTrackerService,
    public gameEngine: GameEngineService,
    public gameFx: GameFxService,
    public sharedUi: SharedUiStateService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    if (!this.session.loadSession()) return;

    this.lessonsData.initForSession(); // original steps 1 & 6
    this.progress.loadProgressHistory(); // original step 2
    this.learningLog.loadLearningLogs(); // original step 5
    this.gameEngine.buildGameVocabPool(); // original step 7
    this.gameEngine.loadCustomGameContent(); // teacher-edited game content overrides (game_contents)
    this.mistakes.loadFrequentlyWrongItems(); // original step 8
    this.sharedUi.loadVoiceSettings(); // original step 9
  }

  getInitial(): string {
    return (this.session.currentUser?.firstName || 'U')[0].toUpperCase();
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
  }

  onWrapperClick(): void {
    this.showProfileDropdown = false;
  }

  openHistory(): void {
    this.learningLog.loadLearningLogs();
    this.gameFx.playSoundEffect('click');
    // Relative navigation (not an absolute '/student/profile' path), so this
    // still works if the Shell's mount point ever changes. ?view=history
    // makes StudentProfileComponent open straight to the history-categories
    // sub-view instead of its 4-button hub menu.
    this.router.navigate(['profile'], { relativeTo: this.route, queryParams: { view: 'history' } });
  }

  logout(): void {
    this.session.logout();
  }
}
