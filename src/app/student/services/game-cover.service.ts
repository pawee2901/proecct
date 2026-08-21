import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';

// Games (~21 built-in mechanics, see GameEngineService.activeGameType) are
// now real rows in the `games` table (2026-08-12), keyed by `game_type` for
// the built-in ones so this service can still be looked up by the same
// string keys every component already uses ('scramble', 'dialogue', ...).
// Loads GET /games once and exposes cover/title/description lookups by key,
// so teacher edits (Teacher → Game Covers) show up everywhere a given game
// is rendered (Games tab grid, roadmap pre/post-game steps) without each
// component re-fetching it separately. `getGames()` also exposes the raw
// list for the new dynamic ("custom-quiz") games.
@Injectable({ providedIn: 'root' })
export class GameCoverService {
  private byType: { [gameType: string]: any } = {};
  private allGames: any[] = [];
  loaded = false;

  constructor(private apiService: ApiService) {
    this.reload();
  }

  reload(): void {
    this.apiService.getGames().subscribe({
      next: (data: any) => {
        this.allGames = Array.isArray(data) ? data : [];
        this.byType = {};
        this.allGames.forEach((g) => {
          // เกม builtin เป็นหลักต่อ game_type (คีย์เดิม), เกม custom-quiz
          // หลายเกมใช้ game_type ซ้ำกันหมด จึงไม่ทับกันเพราะไม่มีใครมา
          // getCover('custom-quiz') ค้นหาเดี่ยวๆ อยู่แล้ว (ดู CustomGamesService)
          if (!this.byType[g.game_type] || g.is_builtin) {
            this.byType[g.game_type] = g;
          }
        });
        this.loaded = true;
      },
      error: () => {
        this.byType = {};
        this.allGames = [];
        this.loaded = true;
      }
    });
  }

  getCover(gameKey: string): string | null {
    return this.byType[gameKey]?.cover_image || null;
  }

  getTitle(gameKey: string): string | null {
    return this.byType[gameKey]?.title || null;
  }

  getDescription(gameKey: string): string | null {
    return this.byType[gameKey]?.description || null;
  }

  getGames(): any[] {
    return this.allGames;
  }
}
