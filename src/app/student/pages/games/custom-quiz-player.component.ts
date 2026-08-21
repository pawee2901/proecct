import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CustomGamesService } from '../../services/custom-games.service';
import { GameFxService } from '../../services/game-fx.service';

// เครื่องเล่นเกมทั่วไป (generic quiz engine) — ใช้เล่นเกมที่ครูสร้างเอง
// (games.game_type = 'custom-quiz') ได้ทุกเกม ไม่จำกัดจำนวน ต่างจาก 21 เกมเดิม
// ที่แต่ละเกมมีกลไก/โค้ดเฉพาะของตัวเองใน GameEngineService — เกมใหม่ทุกเกมเล่น
// ผ่าน component ตัวนี้ตัวเดียว โดยโหลดคำถาม/คำตอบจริงจาก GET /games/:id/questions
@Component({
  selector: 'app-custom-quiz-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-quiz-player.component.html',
  styleUrl: './custom-quiz-player.component.scss',
})
export class CustomQuizPlayerComponent implements OnInit {
  @Input() game: any;
  @Output() closed = new EventEmitter<void>();

  questions: any[] = [];
  loading = true;
  index = 0;
  selectedAnswerId: number | null = null;
  answered = false;
  correctCount = 0;
  earnedPoints = 0;
  totalPoints = 0;
  finished = false;

  constructor(
    private customGames: CustomGamesService,
    private gameFx: GameFxService,
  ) {}

  ngOnInit(): void {
    this.customGames.loadQuestions(this.game.game_id).subscribe({
      next: (data: any[]) => {
        this.questions = Array.isArray(data) ? data : [];
        this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        this.loading = false;
      },
      error: () => {
        this.questions = [];
        this.loading = false;
      }
    });
  }

  get currentQuestion(): any {
    return this.questions[this.index] || null;
  }

  get isCorrectSelected(): boolean {
    const a = this.currentQuestion?.answers?.find((x: any) => x.answer_id === this.selectedAnswerId);
    return !!a?.is_correct;
  }

  selectAnswer(answer: any): void {
    if (this.answered) return;
    this.selectedAnswerId = answer.answer_id;
    this.answered = true;
    if (answer.is_correct) {
      this.correctCount++;
      this.earnedPoints += this.currentQuestion?.points || 0;
    }
  }

  next(): void {
    if (this.index < this.questions.length - 1) {
      this.index++;
      this.answered = false;
      this.selectedAnswerId = null;
    } else {
      this.finish();
    }
  }

  private finish(): void {
    this.finished = true;
    const percent = this.questions.length > 0 ? Math.round((this.correctCount / this.questions.length) * 100) : 0;
    this.gameFx.awardGameXp(20, this.game.title, percent, 'post_game');
  }

  restart(): void {
    this.index = 0;
    this.selectedAnswerId = null;
    this.answered = false;
    this.correctCount = 0;
    this.earnedPoints = 0;
    this.finished = false;
  }

  exit(): void {
    this.closed.emit();
  }
}
