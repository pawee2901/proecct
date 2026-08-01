import { Component, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { LessonsDataService } from '../../services/lessons-data.service';
import { ProgressService } from '../../services/progress.service';
import { StudentSessionService } from '../../services/student-session.service';
import { GameEngineService } from '../../services/game-engine.service';
import { GameFxService } from '../../services/game-fx.service';
import { LearningLogService } from '../../services/learning-log.service';
import { Unit } from '../../models/unit.model';

declare const pdfjsLib: any;

// Phase 5 of the migration plan. Extracted from student.component.ts:
//  - lessonDetailUnit/currentLessonPage (~110-111), roadmap state (~2273-2279),
//    stepFullscreen (~2888), Full Quiz state (~2891-2913), pdf/slide state
//    (~8109-8132)
//  - enterLesson/selectUnit/selectOption/startStep/startRoadmapGame/submitQuiz
//    (~5071-5795), roadmap config helpers getRoadmapGame*/isRoadmapSlotEnabled
//    (~3309-3345), slide/PDF viewer + Full Quiz A/B/C methods (~8099-8591)
// and student.component.html: the Lessons tab (233-395) + the two shell-level
// overlays that were siblings of the tab blocks — Fullscreen Quiz Overlay
// (4681-5103) and Step Overlays (5104-5808), since both are only ever
// triggered from this tab.
//
// The roadmap's game-pre/game-post steps and Full Quiz Part C both call into
// GameEngineService for the actual mini-game logic (scramble/dialogue/
// picture-word/fill-blank) — see GameEngineService.roadmapQuizType, which
// this component sets/clears instead of GameEngineService reading Lessons'
// own `currentStep` enum (kept the two services decoupled).
//
// Dropped (confirmed dead — no template/other-code reference at all):
// getCurrentSlidePdfUrl, roadmapGameTypes. Both were declared but the
// template drives slides via loadPdfForUnit()/renders via <canvas> instead.
@Component({
  selector: 'app-student-lessons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-lessons.component.html',
  styleUrl: './student-lessons.component.scss',
})
export class StudentLessonsComponent implements OnDestroy {
  lessonDetailUnit: Unit | null = null;
  currentLessonPage = 0;

  currentStep: 'pre-test' | 'game-pre' | 'lesson' | 'game-post' | 'post-test' | null = null;
  activeStepGameType: 'scramble' | 'dialogue' | 'picture-word' | 'fill-blank' | 'none' = 'scramble';
  quizAnswers: number[] = [];
  quizSubmitted = false;
  quizScore = 0;

  stepFullscreen = false;

  quizFullscreen = false;
  fullQuizPartAAnswers: number[] = [];
  fullQuizPartBSelected: number | null = null;
  fullQuizPartBAnswers: string[] = [];
  draggedPartBKey = '';
  selectedPartBKey = '';
  partCOrderItems: { text: string; correctPosition: number }[] = [];
  partCAnswers: string[][] = [];
  partCRecording: boolean[][] = [];
  partCRecordingDuration: number[][] = [];
  private partCRecognitions: any[][] = [];
  private partCRecordingStartTime: number[][] = [];
  fullQuizSubmitted = false;
  fullQuizResult: {
    partAScore: number;
    partBScore: number;
    orderScore: number;
    partCScore: number;
    total: number;
  } | null = null;

  pdfDoc: any = null;
  pdfLoading = false;
  isSlideFullscreen = false;

  constructor(
    public lessonsData: LessonsDataService,
    public progress: ProgressService,
    public session: StudentSessionService,
    public engine: GameEngineService,
    public gameFx: GameFxService,
    private learningLog: LearningLogService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnDestroy(): void {
    this.partCRecognitions.forEach((row) =>
      row.forEach((rec: any) => {
        if (rec) {
          try {
            rec.stop();
          } catch {}
        }
      }),
    );
  }

  enterLesson(u: Unit): void {
    this.lessonDetailUnit = u;
    this.lessonsData.currentUnit = u;
    this.currentStep = null;
    this.quizSubmitted = false;
  }

  selectUnit(unit: Unit): void {
    this.lessonsData.currentUnit = unit;
    this.currentStep = null;
  }

  // ── Roadmap config helpers ──
  getRoadmapGame(unitId: number, slot: 'pre' | 'post'): string {
    const unit = this.lessonsData.units.find((u) => u.id === unitId);
    if (!unit || !unit.allowedGames || !Array.isArray(unit.allowedGames) || unit.allowedGames.length === 0) {
      return slot === 'pre' ? 'scramble' : 'dialogue';
    }
    if (slot === 'pre') {
      return unit.allowedGames[0] || 'scramble';
    } else {
      return unit.allowedGames[1] || 'dialogue';
    }
  }

  isRoadmapSlotEnabled(unitId: number, slot: 'pre' | 'post'): boolean {
    return this.getRoadmapGame(unitId, slot) !== 'none';
  }

  getRoadmapGameLabel(unitId: number, slot: 'pre' | 'post'): string {
    const labels: { [key: string]: string } = {
      scramble: '🧩 Word Scramble · สลับตัวอักษร',
      dialogue: '💬 Dialogue Sequencer · เรียงประโยค',
      'picture-word': '🖼️ Picture → Word · ดูภาพทายคำ',
      'fill-blank': '✏️ Fill in the Blank · เติมคำในประโยค',
    };
    return labels[this.getRoadmapGame(unitId, slot)] || '🧩 กิจกรรมฝึกฝน';
  }

  getRoadmapGameScore(unitId: number, slot: 'pre' | 'post'): number | null {
    const gameType = this.getRoadmapGame(unitId, slot);
    if (gameType === 'none' || !this.session.currentUser) return null;
    const key = `game_${gameType.replace('-', '')}_${this.session.currentUser.id}_unit${unitId}`;
    const raw = localStorage.getItem(key);
    return raw ? parseInt(raw, 10) : null;
  }

  // ── Learning Path Step Controllers ──
  startStep(step: typeof this.currentStep): void {
    this.currentStep = step;
    this.quizSubmitted = false;
    this.quizAnswers = [];
    this.fullQuizSubmitted = false;
    this.fullQuizResult = null;
    this.engine.roadmapQuizType = null;

    if (step === 'pre-test') {
      if (this.lessonsData.currentUnit.fullQuiz) {
        this.initFullQuiz();
        this.quizFullscreen = true;
      } else {
        this.quizAnswers = new Array(this.lessonsData.currentUnit.preQuiz.length).fill(-1);
        this.stepFullscreen = true;
      }
    } else if (step === 'post-test') {
      if (this.lessonsData.currentUnit.fullQuiz) {
        this.initFullQuiz();
        this.quizFullscreen = true;
      } else {
        this.quizAnswers = new Array(this.lessonsData.currentUnit.postQuiz.length).fill(-1);
        this.stepFullscreen = true;
      }
    } else if (step === 'game-pre') {
      this.engine.roadmapQuizType = 'pre_game';
      this.activeStepGameType = this.getRoadmapGame(this.lessonsData.currentUnit.id, 'pre') as any;
      this.startRoadmapGame(this.activeStepGameType, this.lessonsData.currentUnit.id);
      this.stepFullscreen = true;
    } else if (step === 'lesson') {
      this.currentLessonPage = 0;
      this.stepFullscreen = true;
      this.loadPdfForUnit(this.lessonsData.currentUnit.id);
    } else if (step === 'game-post') {
      this.engine.roadmapQuizType = 'post_game';
      this.activeStepGameType = this.getRoadmapGame(this.lessonsData.currentUnit.id, 'post') as any;
      this.startRoadmapGame(this.activeStepGameType, this.lessonsData.currentUnit.id);
      this.stepFullscreen = true;
    }
  }

  private startRoadmapGame(gameType: string, unitId: number): void {
    switch (gameType) {
      case 'dialogue':
        this.engine.initDialogueGame();
        break;
      case 'picture-word':
        this.engine.initPictureWordGame(unitId);
        break;
      case 'fill-blank':
        this.engine.initFillBlankGame(unitId);
        break;
      case 'scramble':
      default:
        this.engine.initScrambleGame();
        break;
    }
  }

  // ── Quiz Mechanics (simple pre/post quiz, non-Full-Quiz units) ──
  selectOption(qIndex: number, optIndex: number): void {
    if (this.quizSubmitted) return;
    this.quizAnswers[qIndex] = optIndex;
  }

  submitQuiz(type: 'pre' | 'post'): void {
    if (this.quizAnswers.includes(-1)) {
      Swal.fire({
        icon: 'warning',
        title: 'ตอบคำถามไม่ครบ',
        text: 'กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งคำตอบค่ะ',
        confirmButtonColor: '#6B21A8',
      });
      return;
    }

    const questions = type === 'pre' ? this.lessonsData.currentUnit.preQuiz : this.lessonsData.currentUnit.postQuiz;
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (this.quizAnswers[idx] === q.answer) {
        correctCount++;
      }
    });

    this.quizScore = Math.round((correctCount / questions.length) * 100);
    this.quizSubmitted = true;

    const key = `score_${this.session.currentUser.id}_unit${this.lessonsData.currentUnit.id}_${type}`;
    localStorage.setItem(key, this.quizScore.toString());

    this.progress.currentXp += 25;
    if (this.progress.currentXp > this.progress.dailyXpGoal) this.progress.currentXp = this.progress.dailyXpGoal;

    this.learningLog.log({
      type: type === 'pre' ? 'Pre-Test' : 'Post-Test',
      title: `${type === 'pre' ? 'Pre-Test' : 'Post-Test'} Unit ${this.lessonsData.currentUnit.id}`,
      score: this.quizScore,
      xp: 25,
    });
    this.progress.submitQuizResultToBackend(type === 'pre' ? 'pre_test' : 'post_test', this.quizScore);

    this.progress.loadProgressHistory();
  }

  closeStepOverlay(): void {
    this.stepFullscreen = false;
    this.currentStep = null;
    this.quizSubmitted = false;
    this.engine.dialogueFinished = false;
    this.engine.dialogueSuccessMessage = '';
    this.currentLessonPage = 0;
    this.engine.roadmapGameUnitId = null;
    this.engine.roadmapQuizType = null;
  }

  // ── Slide Deck (PDF) Viewer ──
  // Slides are served by the backend's /uploads folder; a bare slidePath
  // (no http/https prefix) is resolved against it, never against local assets.
  private readonly slidesBaseUrl = 'http://localhost:5000/uploads/';
  private readonly fallbackPdfFiles: { [key: number]: string } = {
    1: 'บทที่ 1.pdf',
    2: 'บทที่ 2.pdf',
    3: 'บทที่ 3.pdf',
    4: 'บทที่ 4.pdf',
    5: 'บทที่ 5.pdf',
  };

  private resolveSlideUrl(unitId: number, slidePath?: string): string {
    const path = slidePath || this.fallbackPdfFiles[unitId] || this.fallbackPdfFiles[1];
    return path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${this.slidesBaseUrl}${path}`;
  }

  downloadCurrentUnitPdf(): void {
    if (!this.lessonsData.currentUnit) return;
    const url = this.resolveSlideUrl(this.lessonsData.currentUnit.id, this.lessonsData.currentUnit.slidePath);
    const filename = decodeURIComponent(url.substring(url.lastIndexOf('/') + 1));

    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => console.error('Error downloading PDF:', err));
  }

  toggleSlideFullscreen(): void {
    this.isSlideFullscreen = !this.isSlideFullscreen;
    setTimeout(() => {
      this.renderPdfPage();
    }, 350);
  }

  onCanvasClick(event: MouseEvent): void {
    if (this.pdfLoading) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width / 2) {
      this.prevLessonPage();
    } else {
      this.nextLessonPage();
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.pdfLoading) return;
    const canvas = event.currentTarget as HTMLCanvasElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width / 2) {
      canvas.style.cursor = 'w-resize';
    } else {
      canvas.style.cursor = 'e-resize';
    }
  }

  loadPdfForUnit(unitId: number): void {
    const currentUnitObj = this.lessonsData.units.find((u) => u.id === unitId);
    const url = this.resolveSlideUrl(unitId, currentUnitObj?.slidePath);

    this.pdfLoading = true;
    this.pdfDoc = null;

    if (typeof pdfjsLib === 'undefined') {
      console.error('pdfjsLib is not loaded');
      this.pdfLoading = false;
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    pdfjsLib
      .getDocument(url)
      .promise.then((pdf: any) => {
        this.pdfDoc = pdf;
        this.currentLessonPage = 0;
        this.pdfLoading = false;
        this.cdr.detectChanges();
        this.renderPdfPage();
      })
      .catch((err: any) => {
        console.error('Error loading PDF:', err);
        this.pdfLoading = false;
        this.cdr.detectChanges();
      });
  }

  renderPdfPage(): void {
    if (!this.pdfDoc) return;

    const pageNum = this.currentLessonPage + 1;

    setTimeout(() => {
      const canvas = document.getElementById('pdf-canvas-element') as HTMLCanvasElement;
      if (!canvas) {
        console.warn('Canvas element not found, retrying...');
        return;
      }

      this.pdfDoc.getPage(pageNum).then((page: any) => {
        const context = canvas.getContext('2d');
        if (!context) return;

        const container = canvas.parentElement;
        const containerWidth = container ? container.clientWidth : 800;

        let viewport = page.getViewport({ scale: 1 });
        const baseScale = containerWidth / viewport.width;

        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        const scale = baseScale * dpr;

        viewport = page.getViewport({ scale: scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        page.render(renderContext);
      });
    }, 50);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.currentStep === 'lesson') {
      this.renderPdfPage();
    }
  }

  nextLessonPage(): void {
    if (this.currentLessonPage < this.totalLessonPages - 1) {
      this.currentLessonPage++;
      this.renderPdfPage();
    }
  }

  prevLessonPage(): void {
    if (this.currentLessonPage > 0) {
      this.currentLessonPage--;
      this.renderPdfPage();
    }
  }

  setLessonPage(page: number): void {
    this.currentLessonPage = page;
    this.renderPdfPage();
  }

  get totalLessonPages(): number {
    if (this.pdfDoc) {
      return this.pdfDoc.numPages;
    }
    return 1;
  }

  get lessonPagesArray(): number[] {
    return Array.from({ length: this.totalLessonPages }, (_, i) => i);
  }

  closeQuizOverlay(): void {
    this.partCRecognitions.forEach((row) =>
      row.forEach((rec: any) => {
        if (rec) {
          try {
            rec.stop();
          } catch {}
        }
      }),
    );
    this.quizFullscreen = false;
    this.stepFullscreen = false;
    this.currentStep = null;
  }

  getSpeedLabel(seconds: number, transcript: string): string {
    if (seconds === 0) return '';
    const words = transcript
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    if (words < 4) return 'คำตอบสั้นเกินไป ⚠️';
    if (seconds <= 5) return 'เร็วมาก ⚡';
    if (seconds <= 12) return 'ดีมาก ✓';
    return 'ใช้เวลานาน 📝';
  }

  getSpeedClass(seconds: number, transcript: string): string {
    if (seconds === 0) return '';
    const words = transcript
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length;
    if (words < 4) return 'speed-short';
    if (seconds <= 5) return 'speed-fast';
    if (seconds <= 12) return 'speed-good';
    return 'speed-slow';
  }

  // ── Full Quiz (3/4-Part: A / B / (Order) / C) ──
  initFullQuiz(): void {
    const fq = this.lessonsData.currentUnit.fullQuiz!;
    this.fullQuizPartAAnswers = new Array(fq.partA.length).fill(-1);
    this.fullQuizPartBAnswers = new Array(fq.partB.expressions.length).fill('');
    this.fullQuizPartBSelected = null;
    this.partCOrderItems = fq.partCOrder
      ? [...fq.partCOrder.items].sort(() => Math.random() - 0.5)
      : [];
    this.partCAnswers = fq.partC.map((q) => new Array(q.subQuestions.length).fill(''));
    this.partCRecording = fq.partC.map((q) => new Array(q.subQuestions.length).fill(false));
    this.partCRecordingDuration = fq.partC.map((q) => new Array(q.subQuestions.length).fill(0));
    this.partCRecordingStartTime = fq.partC.map((q) => new Array(q.subQuestions.length).fill(0));
    this.partCRecognitions = fq.partC.map((q) => new Array(q.subQuestions.length).fill(null));
    this.fullQuizSubmitted = false;
    this.fullQuizResult = null;
  }

  selectFullQuizA(qIdx: number, optIdx: number): void {
    if (this.fullQuizSubmitted) return;
    this.fullQuizPartAAnswers[qIdx] = optIdx;
  }

  clickPartBExpression(idx: number): void {
    if (this.fullQuizSubmitted) return;
    this.fullQuizPartBSelected = this.fullQuizPartBSelected === idx ? null : idx;
  }

  clickPartBReply(key: string): void {
    if (this.fullQuizSubmitted || this.fullQuizPartBSelected === null) return;
    this.fullQuizPartBAnswers[this.fullQuizPartBSelected] = key;
    this.fullQuizPartBSelected = null;
  }

  getReplyText(key: string): string {
    if (!this.lessonsData.currentUnit.fullQuiz) return '';
    return this.lessonsData.currentUnit.fullQuiz.partB.replies.find((r) => r.key === key)?.text || '';
  }

  isReplySelectedElsewhere(key: string, rowIndex: number): boolean {
    return this.fullQuizPartBAnswers.some((ans, i) => i !== rowIndex && ans === key);
  }

  onPartBDragStart(event: DragEvent, key: string): void {
    if (this.fullQuizPartBAnswers.includes(key)) {
      event.preventDefault();
      return;
    }
    this.draggedPartBKey = key;
    this.selectedPartBKey = '';
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', key);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onPartBDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  onPartBDrop(event: DragEvent, exprIndex: number): void {
    event.preventDefault();
    if (this.fullQuizSubmitted) return;
    const key = event.dataTransfer?.getData('text/plain') || this.draggedPartBKey;
    if (!key) return;
    this.fullQuizPartBAnswers[exprIndex] = key;
    this.draggedPartBKey = '';
    this.selectedPartBKey = '';
  }

  tapPartBChip(key: string): void {
    if (this.fullQuizSubmitted || this.fullQuizPartBAnswers.includes(key)) return;
    this.selectedPartBKey = this.selectedPartBKey === key ? '' : key;
  }

  tapPartBSlot(index: number): void {
    if (this.fullQuizSubmitted) return;
    if (this.selectedPartBKey) {
      this.fullQuizPartBAnswers[index] = this.selectedPartBKey;
      this.selectedPartBKey = '';
    } else {
      this.fullQuizPartBAnswers[index] = '';
    }
  }

  togglePartCRecording(qIdx: number, subIdx: number): void {
    if (this.fullQuizSubmitted) return;

    if (this.partCRecording[qIdx][subIdx]) {
      const rec = this.partCRecognitions[qIdx]?.[subIdx];
      if (rec) {
        try {
          rec.stop();
        } catch {}
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      Swal.fire({
        icon: 'error',
        title: 'ไม่รองรับการพิมพ์ด้วยเสียง',
        text: 'เบราว์เซอร์ของคุณไม่รองรับการรู้จำเสียงค่ะ กรุณาพิมพ์คำตอบในช่องด้านล่าง',
        confirmButtonColor: '#6B21A8',
      });
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    this.partCRecognitions[qIdx][subIdx] = recognition;
    this.partCRecording[qIdx][subIdx] = true;
    this.partCRecordingStartTime[qIdx][subIdx] = Date.now();
    this.cdr.detectChanges();

    recognition.onresult = (event: any) => {
      this.partCAnswers[qIdx][subIdx] = event.results[0][0].transcript;
      this.partCRecordingDuration[qIdx][subIdx] = Math.round(
        (Date.now() - this.partCRecordingStartTime[qIdx][subIdx]) / 1000,
      );
      this.partCRecording[qIdx][subIdx] = false;
      this.partCRecognitions[qIdx][subIdx] = null;
      this.cdr.detectChanges();
    };
    recognition.onerror = () => {
      this.partCRecording[qIdx][subIdx] = false;
      this.partCRecognitions[qIdx][subIdx] = null;
      this.cdr.detectChanges();
    };
    recognition.onend = () => {
      this.partCRecording[qIdx][subIdx] = false;
      this.partCRecognitions[qIdx][subIdx] = null;
      this.cdr.detectChanges();
    };

    try {
      recognition.start();
    } catch {
      this.partCRecording[qIdx][subIdx] = false;
      this.partCRecognitions[qIdx][subIdx] = null;
      this.cdr.detectChanges();
    }
  }

  moveOrderItem(index: number, dir: 'up' | 'down'): void {
    const target = dir === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.partCOrderItems.length) return;
    const temp = this.partCOrderItems[index];
    this.partCOrderItems[index] = this.partCOrderItems[target];
    this.partCOrderItems[target] = temp;
  }

  submitFullQuiz(): void {
    const fq = this.lessonsData.currentUnit.fullQuiz!;

    if (this.fullQuizPartAAnswers.includes(-1)) {
      Swal.fire({
        icon: 'warning',
        title: 'ตอบคำถามไม่ครบ',
        text: 'กรุณาตอบคำถาม ตอนที่ 1 (Part A) ให้ครบทุกข้อก่อนส่งค่ะ',
        confirmButtonColor: '#6B21A8',
      });
      return;
    }
    if (this.fullQuizPartBAnswers.some((a) => !a)) {
      Swal.fire({
        icon: 'warning',
        title: 'ตอบคำถามไม่ครบ',
        text: 'กรุณาเลือกคำตอบ ตอนที่ 2 (Part B) ให้ครบทุกข้อก่อนส่งค่ะ',
        confirmButtonColor: '#6B21A8',
      });
      return;
    }
    if (fq.partC.length > 0 && this.partCAnswers.some((q) => q.some((a) => !a.trim()))) {
      const partLabel = fq.partCOrder ? 'ตอนที่ 4 (Part D)' : 'ตอนที่ 3 (Part C)';
      Swal.fire({
        icon: 'warning',
        title: 'ตอบคำถามไม่ครบ',
        text: `กรุณาพูดตอบคำถาม ${partLabel} ให้ครบทุกข้อก่อนส่งค่ะ`,
        confirmButtonColor: '#6B21A8',
      });
      return;
    }

    const partAMax = Math.min(fq.partA.length * 10, 70);
    let partACorrect = 0;
    fq.partA.forEach((q, i) => {
      if (this.fullQuizPartAAnswers[i] === q.answer) partACorrect++;
    });
    const partAScore = Math.round((partACorrect / fq.partA.length) * partAMax);

    let partBCorrect = 0;
    fq.partB.answers.forEach((ans, i) => {
      if (this.fullQuizPartBAnswers[i] === ans) partBCorrect++;
    });
    const partBScore = Math.round((partBCorrect / fq.partB.expressions.length) * 10);

    let orderScore = 0;
    if (fq.partCOrder) {
      let orderCorrect = 0;
      this.partCOrderItems.forEach((item, i) => {
        if (item.correctPosition === i + 1) orderCorrect++;
      });
      orderScore = Math.round((orderCorrect / fq.partCOrder.items.length) * 10);
    }

    const speakMax = 100 - partAMax - 10 - (fq.partCOrder ? 10 : 0);
    let partCScore = 0;
    if (fq.partC.length > 0) {
      let ratioSum = 0;
      let subCount = 0;
      fq.partC.forEach((q, qIdx) => {
        q.subQuestions.forEach((sub, subIdx) => {
          const answer = this.partCAnswers[qIdx]?.[subIdx] || '';
          ratioSum += this.gameFx.textOverlapRatio(sub.sampleAnswer, answer);
          subCount++;
        });
      });
      partCScore = subCount > 0 ? Math.round((ratioSum / subCount) * speakMax) : 0;
    }

    const total = partAScore + partBScore + orderScore + partCScore;
    this.fullQuizResult = { partAScore, partBScore, orderScore, partCScore, total };
    this.fullQuizSubmitted = true;

    const type = this.currentStep === 'pre-test' ? 'pre' : 'post';
    localStorage.setItem(
      `score_${this.session.currentUser.id}_unit${this.lessonsData.currentUnit.id}_${type}`,
      total.toString(),
    );
    this.progress.submitQuizResultToBackend(type === 'pre' ? 'pre_test' : 'post_test', total);

    this.progress.currentXp += 25;
    if (this.progress.currentXp > this.progress.dailyXpGoal) this.progress.currentXp = this.progress.dailyXpGoal;
    this.progress.loadProgressHistory();

    this.learningLog.log({
      type: type === 'pre' ? 'Pre-Test' : 'Post-Test',
      title: `${type === 'pre' ? 'Pre-Test' : 'Post-Test'} Unit ${this.lessonsData.currentUnit.id}`,
      score: total,
      xp: 25,
    });
  }
}
