import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { GameEngineService } from '../../services/game-engine.service';
import { GameFxService } from '../../services/game-fx.service';
import { LessonsDataService } from '../../services/lessons-data.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './student-games.component.html',
  styleUrl: './student-games.component.scss',
})
export class StudentGamesComponent implements OnInit, OnDestroy {
  constructor(
    public engine: GameEngineService,
    public gameFx: GameFxService,
    public lessonsData: LessonsDataService,
  ) {}

  // Standalone Games-tab play should never accidentally submit a roadmap
  // quiz result — see GameEngineService.roadmapQuizType, which
  // StudentLessonsComponent sets/clears around its own game-pre/game-post
  // steps. Clearing it here guards against a stale value from a previous
  // roadmap visit leaking into a fresh standalone play session.
  ngOnInit(): void {
    this.engine.roadmapQuizType = null;
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
