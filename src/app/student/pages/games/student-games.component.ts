import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GameEngineService } from '../../services/game-engine.service';
import { GameFxService } from '../../services/game-fx.service';
import { LessonsDataService } from '../../services/lessons-data.service';
import { GameCoverService } from '../../services/game-cover.service';
import { CustomGamesService } from '../../services/custom-games.service';
import { CustomQuizPlayerComponent } from './custom-quiz-player.component';

// Phase 4 of the migration plan — the biggest single move. All ~20 mini-game
// state/logic now lives in GameEngineService (shared with the Lessons
// roadmap step overlay, Phase 5); this component is a thin view over it plus
// the menu grid. Extracted from student.component.html
// (@if (activeTab === 'games') block, original lines 988-2993).
//
// onWordSearchPointerUp used to be a component-level @HostListener directly
// on StudentComponent; GameEngineService can't have one (services can't),
// so this wrapper re-declares the document-level listener and delegates.
@Component({
  selector: 'app-student-games',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomQuizPlayerComponent],
  templateUrl: './student-games.component.html',
  styleUrl: './student-games.component.scss',
})
export class StudentGamesComponent implements OnInit, OnDestroy {
  // เกมที่ครูสร้างเอง (custom-quiz) ที่กำลังเล่นอยู่ — ไม่ใช่ engine.activeGameType
  // เพราะเกมพวกนี้ไม่มีกลไกใน GameEngineService เลย เล่นผ่าน
  // CustomQuizPlayerComponent ตัวเดียวแทน (ดู custom-games.service.ts)
  playingCustomGame: any = null;

  constructor(
    public engine: GameEngineService,
    public gameFx: GameFxService,
    public lessonsData: LessonsDataService,
    public gameCover: GameCoverService,
    public customGames: CustomGamesService,
  ) {}

  // Standalone Games-tab play should never accidentally submit a roadmap
  // quiz result — see GameEngineService.roadmapQuizType, which
  // StudentLessonsComponent sets/clears around its own game-pre/game-post
  // steps. Clearing it here guards against a stale value from a previous
  // roadmap visit leaking into a fresh standalone play session.
  ngOnInit(): void {
    this.engine.roadmapQuizType = null;
    this.customGames.reload();
  }

  playCustomGame(game: any): void {
    this.playingCustomGame = game;
  }

  closeCustomGame(): void {
    this.playingCustomGame = null;
    this.customGames.reload();
  }

  @HostListener('document:pointerup')
  onWordSearchPointerUp(): void {
    this.engine.onWordSearchPointerUp();
  }

  ngOnDestroy(): void {
    if (this.engine.sprint_timerInterval) {
      clearInterval(this.engine.sprint_timerInterval);
    }
  }
}
