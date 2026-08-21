import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { StudentSessionService } from '../../services/student-session.service';
import { LearningLogService } from '../../services/learning-log.service';
import { GameFxService } from '../../services/game-fx.service';
import { SharedUiStateService } from '../../services/shared-ui-state.service';

// Phase 1 of the migration plan. Extracted verbatim from student.component.ts
// (videoLessons/selectedVideoLesson/... ~460-497, selectVideoLesson/
// togglePlayVideo/simulateVideoPlayback/submitVideoQuiz ~9031-9100) and
// student.component.html (@if (activeTab === 'videos') block, ~4469-4597).
// This tab is a UI mockup — "playback" is a setTimeout progress simulation,
// there's no real video asset or <video> element, and the quiz answers are
// hardcoded per lesson id. Product decision (2026-08-17): keep the simulated
// playback as-is (no real video assets exist in this project), but wire
// completion/XP through the real backend (video_progress table) instead of
// only living in-memory — so "watched" state persists across reloads/devices
// via GET/POST /student/video-progress, same as every other quiz result.
@Component({
  selector: 'app-student-videos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-videos.component.html',
  styleUrl: './student-videos.component.scss',
})
export class StudentVideosComponent implements OnInit {
  videoLessons = [
    {
      id: 1,
      title: 'Welcoming Students in Classroom',
      level: 'Easy',
      keyWords: ['Greet', 'Welcome', 'Introduce'],
      subEn: 'Good morning class, welcome to the new term!',
      subTh: 'สวัสดีตอนเช้าทุกคน ยินดีต้อนรับสู่เทอมใหม่นะ!',
      xpReward: 20,
      completed: false,
    },
    {
      id: 2,
      title: 'Parent-Teacher Telephone Call',
      level: 'Medium',
      keyWords: ['Absence', 'Notify', 'Concern'],
      subEn: 'Hello, this is Ms. Parker. I am calling to discuss your daughter.',
      subTh: 'สวัสดีค่ะ ครูปาร์คเกอร์โทรมาเพื่อแจ้งเรื่องลูกสาวของคุณค่ะ',
      xpReward: 30,
      completed: false,
    },
    {
      id: 3,
      title: 'Giving Academic Presentations',
      level: 'Hard',
      keyWords: ['Presentation', 'Structure', 'Visuals'],
      subEn: 'Today I am excited to discuss our research findings.',
      subTh: 'วันนี้ฉันตื่นเต้นมากที่จะมาอภิปรายผลการวิจัยของเราค่ะ',
      xpReward: 40,
      completed: false,
    },
  ];
  selectedVideoLesson: any = null;
  videoPlaying = false;
  videoProgress = 0;
  videoCompleted = false;
  videoQuizStep = 'none'; // 'none' | 'question' | 'success'
  videoQuizAnswer = '';

  constructor(
    private apiService: ApiService,
    public session: StudentSessionService,
    public learningLog: LearningLogService,
    public gameFx: GameFxService,
    public sharedUi: SharedUiStateService,
  ) {}

  ngOnInit(): void {
    if (!this.session.currentUser?.id) return;
    this.apiService.getVideoProgress(this.session.currentUser.id).subscribe({
      next: (videoIds: number[]) => {
        if (!Array.isArray(videoIds)) return;
        this.videoLessons.forEach((lesson) => {
          if (videoIds.includes(lesson.id)) lesson.completed = true;
        });
      },
      error: () => {},
    });
  }

  selectVideoLesson(lesson: any): void {
    this.selectedVideoLesson = lesson;
    this.videoPlaying = false;
    this.videoProgress = 0;
    this.videoCompleted = false;
    this.videoQuizStep = 'none';
    this.gameFx.playSoundEffect('click');
  }

  togglePlayVideo(): void {
    this.videoPlaying = !this.videoPlaying;
    this.gameFx.playSoundEffect('click');

    if (this.videoPlaying) {
      this.simulateVideoPlayback();
    }
  }

  private simulateVideoPlayback(): void {
    if (!this.videoPlaying || this.videoCompleted) return;

    setTimeout(() => {
      if (this.videoPlaying) {
        this.videoProgress += 10;
        if (this.videoProgress >= 100) {
          this.videoProgress = 100;
          this.videoPlaying = false;
          this.videoCompleted = true;
          this.videoQuizStep = 'question';
          this.gameFx.playSoundEffect('success');
        } else {
          this.simulateVideoPlayback();
        }
      }
    }, 1000);
  }

  submitVideoQuiz(answer: string): void {
    this.videoQuizAnswer = answer;
    let isCorrect = false;
    if (this.selectedVideoLesson.id === 1 && answer === 'A') isCorrect = true;
    if (this.selectedVideoLesson.id === 2 && answer === 'A') isCorrect = true;
    if (this.selectedVideoLesson.id === 3 && answer === 'B') isCorrect = true;

    if (isCorrect) {
      this.gameFx.playSoundEffect('success');
      this.gameFx.triggerConfetti();
      this.videoQuizStep = 'success';
      this.selectedVideoLesson.completed = true;

      // Update global score
      this.session.currentUser.total_score = (this.session.currentUser.total_score || 0) + this.selectedVideoLesson.xpReward;

      // Log to history. Note: original bypassed saveLearningLogs() here too
      // (unlike LearningLogService.log()), so this entry only lives in
      // memory until something else triggers a save — preserved as-is.
      this.learningLog.learningLogs.unshift({
        date: new Date(),
        type: 'Video Learning',
        title: `Watch Video: ${this.selectedVideoLesson.title}`,
        xp: this.selectedVideoLesson.xpReward,
      });

      // บันทึกจริงลง backend (video_progress) ให้สถานะ "ดูจบแล้ว" คงอยู่ข้ามอุปกรณ์/
      // reload แทนที่จะอยู่แค่ใน memory ของแท็บนี้ — playback ยังจำลองเหมือนเดิม
      if (this.session.currentUser?.id) {
        this.apiService
          .saveVideoProgress(this.session.currentUser.id, this.selectedVideoLesson.id, this.selectedVideoLesson.xpReward)
          .subscribe({ error: () => {} });
      }
    } else {
      this.gameFx.triggerGameShake();
      Swal.fire({
        icon: 'error',
        title: 'คำตอบยังไม่ถูกต้อง',
        text: 'ลองวิเคราะห์บทสนทนาในวิดีโอและเลือกคำตอบอีกครั้งนะคะ',
        confirmButtonColor: '#6B21A8',
      });
    }
  }
}
