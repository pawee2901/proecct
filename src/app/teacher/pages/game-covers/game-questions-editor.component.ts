import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { Game } from './teacher-game-covers.component';

interface EditableAnswer {
  answer_text: string;
  answer_image: string;
  is_correct: boolean;
}

interface EditableQuestion {
  question_id?: number;
  question_text: string;
  question_image: string;
  explanation: string;
  points: number;
  answers: EditableAnswer[];
  _saving?: boolean;
}

function newAnswer(): EditableAnswer {
  return { answer_text: '', answer_image: '', is_correct: false };
}

function newQuestion(): EditableQuestion {
  return {
    question_text: '',
    question_image: '',
    explanation: '',
    points: 10,
    answers: [newAnswer(), newAnswer()],
  };
}

// เนื้อหาของเกมที่ครูสร้างเอง (game_type='custom-quiz') — คำถาม/คำตอบ/รูป/
// คะแนน/คำอธิบายเฉลย ผูกกับ games.game_id ตรงๆ ไม่จำกัดจำนวนคำถาม สลับมาแสดง
// เป็นอีกหน้าในพาเนลเดียวกันจากปุ่ม "จัดการเนื้อหา" บนการ์ดเกม
// (TeacherGameCoversComponent — ไม่ใช่ modal popup, เหมือนวิธี "แก้ไขบทเรียน"
// ของหน้า Lessons ที่สลับพาเนลแทนรายการแทนการเปิด popup).
// คนละระบบกับ gameContentConfigs/gameContentItems ของเกม builtin 21 เกมเดิม
// (ซึ่งมีหน้าของตัวเองแยกต่างหากเหมือนกัน ไม่ยุ่งกับ component นี้)
@Component({
  selector: 'app-game-questions-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './game-questions-editor.component.html',
  styleUrl: './game-questions-editor.component.scss',
})
export class GameQuestionsEditorComponent implements OnInit {
  @Input() game!: Game;
  @Output() closed = new EventEmitter<void>();
  @Output() questionCountChanged = new EventEmitter<number>();

  questions: EditableQuestion[] = [];
  loading = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.apiService.getGameQuestions(this.game.game_id).subscribe({
      next: (data: any[]) => {
        this.questions = Array.isArray(data) && data.length > 0
          ? data.map((q) => ({
              question_id: q.question_id,
              question_text: q.question_text || '',
              question_image: q.question_image || '',
              explanation: q.explanation || '',
              points: q.points ?? 10,
              answers: (q.answers || []).map((a: any) => ({
                answer_text: a.answer_text || '',
                answer_image: a.answer_image || '',
                is_correct: !!a.is_correct,
              })),
            }))
          : [newQuestion()];
        this.loading = false;
      },
      error: () => {
        this.questions = [newQuestion()];
        this.loading = false;
      }
    });
  }

  addQuestion(): void {
    this.questions = [...this.questions, newQuestion()];
  }

  removeQuestion(i: number): void {
    const q = this.questions[i];
    if (!q.question_id) {
      this.questions.splice(i, 1);
      return;
    }
    Swal.fire({
      icon: 'warning',
      title: 'ลบคำถามนี้หรือไม่?',
      showCancelButton: true,
      confirmButtonText: 'ลบคำถาม',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#94a3b8',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.apiService.deleteGameQuestion(q.question_id!).subscribe({
        next: () => {
          this.questions = this.questions.filter((_, idx) => idx !== i);
          this.questionCountChanged.emit(this.questions.filter((x) => x.question_id).length);
        },
        error: () => {
          Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', confirmButtonColor: '#0f766e' });
        }
      });
    });
  }

  addAnswer(q: EditableQuestion): void {
    q.answers = [...q.answers, newAnswer()];
  }

  removeAnswer(q: EditableQuestion, i: number): void {
    q.answers.splice(i, 1);
  }

  markCorrect(q: EditableQuestion, i: number): void {
    q.answers.forEach((a, idx) => (a.is_correct = idx === i));
  }

  onQuestionImageUpload(q: EditableQuestion, event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.apiService.uploadFile(file).subscribe({
      next: (res: any) => {
        if (res?.url) q.question_image = res.url;
      },
      error: () => Swal.fire({ icon: 'error', title: 'อัปโหลดรูปไม่สำเร็จ', confirmButtonColor: '#0f766e' }),
    });
  }

  onAnswerImageUpload(a: EditableAnswer, event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.apiService.uploadFile(file).subscribe({
      next: (res: any) => {
        if (res?.url) a.answer_image = res.url;
      },
      error: () => Swal.fire({ icon: 'error', title: 'อัปโหลดรูปไม่สำเร็จ', confirmButtonColor: '#0f766e' }),
    });
  }

  saveQuestion(q: EditableQuestion): void {
    if (!q.question_text.trim()) {
      Swal.fire({ icon: 'warning', title: 'กรุณากรอกคำถาม', confirmButtonColor: '#0f766e' });
      return;
    }
    const validAnswers = q.answers.filter((a) => a.answer_text.trim());
    if (validAnswers.length < 2) {
      Swal.fire({ icon: 'warning', title: 'ต้องมีตัวเลือกคำตอบอย่างน้อย 2 ข้อ', confirmButtonColor: '#0f766e' });
      return;
    }
    if (!validAnswers.some((a) => a.is_correct)) {
      Swal.fire({ icon: 'warning', title: 'กรุณาเลือกคำตอบที่ถูกต้อง', confirmButtonColor: '#0f766e' });
      return;
    }

    q._saving = true;
    const payload = {
      question_text: q.question_text,
      question_image: q.question_image || null,
      explanation: q.explanation || null,
      points: q.points,
      answers: validAnswers,
    };

    const onSuccess = () => {
      q._saving = false;
      Swal.fire({ icon: 'success', title: 'บันทึกคำถามสำเร็จ', confirmButtonColor: '#0f766e', timer: 1200 });
      this.load();
      this.questionCountChanged.emit(this.questions.filter((x) => x.question_id).length);
    };
    const onError = () => {
      q._saving = false;
      Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', confirmButtonColor: '#0f766e' });
    };

    if (q.question_id) {
      this.apiService.updateGameQuestion(q.question_id, payload).subscribe({ next: onSuccess, error: onError });
    } else {
      this.apiService.addGameQuestion(this.game.game_id, payload).subscribe({ next: onSuccess, error: onError });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
