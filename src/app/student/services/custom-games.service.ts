import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';

// เกมที่ครูสร้างเอง (games.game_type = 'custom-quiz') — ไม่มีกลไกเฉพาะในโค้ด
// เหมือน 21 เกมเดิม (ดู GameCoverService) เลยเล่นผ่าน CustomQuizPlayerComponent
// (ตัวเดียว ใช้ได้กับทุกเกม ไม่จำกัดจำนวน) โดยโหลดคำถาม/คำตอบจริงจาก
// GET /games/:id/questions ต่อเกม
@Injectable({ providedIn: 'root' })
export class CustomGamesService {
  games: any[] = [];
  loaded = false;

  constructor(private apiService: ApiService) {
    this.reload();
  }

  reload(): void {
    this.apiService.getGames().subscribe({
      next: (data: any) => {
        const all = Array.isArray(data) ? data : [];
        this.games = all.filter((g) => g.game_type === 'custom-quiz');
        this.loaded = true;
      },
      error: () => {
        this.games = [];
        this.loaded = true;
      }
    });
  }

  loadQuestions(gameId: number) {
    return this.apiService.getGameQuestions(gameId);
  }
}
