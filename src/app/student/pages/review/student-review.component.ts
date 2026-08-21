import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MistakesTrackerService } from '../../services/mistakes-tracker.service';
import { StudentSessionService } from '../../services/student-session.service';
import { LearningLogService } from '../../services/learning-log.service';
import { GameFxService } from '../../services/game-fx.service';
import { FrequentlyWrongItem } from '../../models/unit.model';

// Phase 7 of the migration plan — new page, not a straight port. The
// backing logic already existed in student.component.ts (reviewMode/
// reviewItems/... ~361-366, loadFrequentlyWrongItems..speakReviewCurrent
// ~5164-5270) and MistakesTrackerService (Phase 0) already holds
// `frequentlyWrongItems`, written to by Practice + Games whenever a chat
// correction or wrong game answer happens — but nothing ever rendered a
// template for this tab, so students could never reach it. This component
// builds that missing UI: a list of frequently-missed words/sentences and a
// short recall quiz over the worst offenders.
//
// One deliberate simplification vs. the original: speakReviewCurrent/
// setupReviewRound called Practice's practiceSpeakText() (voice-settings
// aware TTS). Since Review has no reason to depend on the much larger
// Practice component, this uses GameFxService's plain speakText() instead —
// same "read the correct answer aloud" behavior, simpler dependency.
@Component({
  selector: 'app-student-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-review.component.html',
  styleUrl: './student-review.component.scss',
})
export class StudentReviewComponent implements OnInit {
  reviewMode: 'list' | 'quiz' | 'completed' = 'list';
  reviewItems: FrequentlyWrongItem[] = [];
  reviewIndex = 0;
  reviewInput = '';
  reviewFeedback: 'correct' | 'wrong' | '' = '';
  reviewScore = 0;

  constructor(
    public mistakes: MistakesTrackerService,
    private session: StudentSessionService,
    private learningLog: LearningLogService,
    public gameFx: GameFxService,
  ) {}

  ngOnInit(): void {
    this.mistakes.loadFrequentlyWrongItems();
    this.reviewMode = 'list';
  }

  startReviewQuiz(): void {
    if (this.mistakes.frequentlyWrongItems.length === 0) return;
    this.gameFx.playSoundEffect('click');
    // Pick up to 5 items with highest wrongCount
    this.reviewItems = [...this.mistakes.frequentlyWrongItems]
      .sort((a, b) => b.wrongCount - a.wrongCount)
      .slice(0, 5);
    this.reviewIndex = 0;
    this.reviewMode = 'quiz';
    this.reviewScore = 0;
    this.setupReviewRound();
  }

  setupReviewRound(): void {
    this.reviewInput = '';
    this.reviewFeedback = '';
    const item = this.reviewItems[this.reviewIndex];
    if (item && (item.type === 'word' || item.type === 'sentence')) {
      setTimeout(() => {
        this.gameFx.speakText(item.correct);
      }, 500);
    }
  }

  submitReviewAnswer(): void {
    const item = this.reviewItems[this.reviewIndex];
    if (!item || this.reviewFeedback !== '') return;

    const isCorrect = this.gameFx.normalizeAnswer(this.reviewInput) === this.gameFx.normalizeAnswer(item.correct);
    if (isCorrect) {
      this.reviewFeedback = 'correct';
      this.reviewScore++;
      this.gameFx.playSoundEffect('success');

      this.mistakes.recordCorrectReview(item.id);
    } else {
      this.reviewFeedback = 'wrong';
      this.gameFx.playSoundEffect('error');
    }
  }

  nextReviewRound(): void {
    if (this.reviewIndex < this.reviewItems.length - 1) {
      this.reviewIndex++;
      this.setupReviewRound();
    } else {
      this.reviewMode = 'completed';
      const xpReward = this.reviewScore * 5;
      if (this.session.currentUser) {
        this.session.currentUser.total_score = (this.session.currentUser.total_score || 0) + xpReward;
      }
      this.learningLog.log({
        type: 'Mistake Review',
        title: `ฝึกคำผิดประจำ เคลียร์ได้ ${this.reviewScore}/${this.reviewItems.length} ข้อ`,
        xp: xpReward,
      });
    }
  }

  speakReviewCurrent(): void {
    const item = this.reviewItems[this.reviewIndex];
    if (item) {
      this.gameFx.speakText(item.correct);
    }
  }

  backToList(): void {
    this.reviewMode = 'list';
  }
}
