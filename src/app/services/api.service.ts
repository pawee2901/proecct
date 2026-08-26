import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ── Authentication ──
  login(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/login`, data);
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/register`, data);
  }

  resetPasswordCheck(firstName: string, email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/reset-password-check`, { first_name: firstName, email });
  }

  resetPasswordUpdate(userId: number, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/reset-password-update`, { user_id: userId, new_password: newPassword });
  }

  // ต่างจาก resetPasswordUpdate ด้านบน (flow "ลืมรหัสผ่าน" ไม่ต้องรู้รหัสเดิม) — ใช้ตอน
  // ล็อกอินอยู่แล้วอยากเปลี่ยนรหัสผ่านเอง ต้องกรอกรหัสเดิมให้ถูกก่อน (Profile ▸ ข้อมูลโปรไฟล์)
  changePassword(userId: number, currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/change-password`, {
      user_id: userId,
      current_password: currentPassword,
      new_password: newPassword,
    });
  }


  // ── Student Stats & Details ──
  getStudents(): Observable<any> {
    return this.http.get(`${this.baseUrl}/students`);
  }

  getLeaderboard(): Observable<any> {
    return this.http.get(`${this.baseUrl}/leaderboard`);
  }

  // ── Lessons & Units ──
  getLessons(): Observable<any> {
    return this.http.get(`${this.baseUrl}/lessons`);
  }

  getLessonDetail(lessonId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/lesson/${lessonId}`);
  }

  saveLesson(lessonData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/save-lesson`, lessonData);
  }

  deleteLesson(lessonId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/lesson/${lessonId}`);
  }

  saveLessonMaterials(lessonId: number, materials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/teacher/lesson-materials`, {
      lesson_id: lessonId,
      ...materials
    });
  }

  submitQuizResult(payload: { userId: number; lessonId: number; quizType: string; score: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/student/quiz-result`, payload);
  }

  // ── Teacher-Specific ──
  getTeacherClasses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/classes`);
  }

  getTeacherAssignments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/assignments`);
  }

  getTeacherStudents(): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/students`);
  }

  getTeacherStudentScores(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/students/${userId}/scores`);
  }

  getTeacherStudentActivity(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/students/${userId}/activity`);
  }

  // เกณฑ์คะแนน/คำสั่งให้ AI ต่อบทเรียน — ตั้งค่าโดยอาจารย์เจ้าของบทเรียนนั้นเอง
  // (ai/core.py ผสมคำสั่งนี้เข้ากับ system prompt ตอนตรวจ/ให้ฟีดแบ็กนักเรียน)
  getLessonAiSettings(lessonId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/lessons/${lessonId}/ai-settings`);
  }

  saveLessonAiSettings(lessonId: number, data: {
    pass_threshold?: number | null;
    game_weight?: number | null;
    test_weight?: number | null;
    ai_grading_instruction?: string | null;
  }): Observable<any> {
    return this.http.put(`${this.baseUrl}/teacher/lessons/${lessonId}/ai-settings`, data);
  }

  // คำสั่งให้ AI แยกตามชั้นปี (ปี 1/ปี 2) — ต่างจาก getLessonAiSettings() ตรงไม่ผูกกับบท
  // เรียนเดียว ระบบดึงจาก year_of_study ของนักศึกษาที่ล็อกอินอยู่เอง จึงมีผลกับหน้าฝึกพูด
  // อิสระของนักศึกษาด้วย (ai/core.py:get_year_grading_instruction)
  getYearAiInstructions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/teacher/year-ai-instructions`);
  }

  saveYearAiInstruction(yearLevel: number, aiInstruction: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/teacher/year-ai-instructions/${yearLevel}`, { ai_instruction: aiInstruction });
  }

  // ── Admin-Specific ──
  getAdminUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`);
  }

  getAdminCourses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/courses`);
  }

  getPendingTeachers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/teachers/pending`);
  }

  approveTeacher(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/teachers/${userId}/approve`, {});
  }

  rejectTeacher(userId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/teachers/${userId}/reject`, {});
  }

  getSystemStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/system-stats`);
  }

  adminCreateUser(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users`, data);
  }

  adminUpdateUser(userId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/users/${userId}`, data);
  }

  adminUpdateUserRole(userId: number, role: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users/${userId}/role`, { role });
  }

  adminDeleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/users/${userId}`);
  }

  adminResetUserPassword(userId: number, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/users/${userId}/reset-password`, { new_password: newPassword });
  }

  // ── Admin API Management & Endpoints ──
  getApiEndpoints(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/api-management/endpoints`);
  }

  addApiEndpoint(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/api-management/endpoints`, data);
  }

  updateApiEndpoint(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/api-management/endpoints/${id}`, data);
  }

  deleteApiEndpoint(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/api-management/endpoints/${id}`);
  }

  testApiEndpoint(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/api-management/test`, data);
  }

  // ── Admin API Keys ──
  getApiKeys(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/api-keys`);
  }

  addApiKey(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/api-keys`, data);
  }

  toggleApiKeyStatus(id: number, active: boolean): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/api-keys/${id}/toggle`, { active });
  }

  deleteApiKey(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/api-keys/${id}`);
  }

  deleteAdminCourse(courseId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/courses/${courseId}`);
  }

  // Admin ▸ System — ล้าง log กิจกรรมทั้งหมด (คู่กับ getSystemStats() ด้านบนที่ดึง log ล่าสุด)
  clearSystemLogs(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/system-logs`);
  }

  // ── Student Progress / Video Progress / Mistakes (cross-device sync) ──
  getStudentProgress(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/student/progress/${userId}`);
  }

  saveVideoProgress(userId: number, videoId: number, xp: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/student/video-progress`, { user_id: userId, video_id: videoId, xp });
  }

  getVideoProgress(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/student/video-progress/${userId}`);
  }

  getMistakeItems(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/student/mistakes/${userId}`);
  }

  trackMistakeItem(userId: number, item: { type: string; original: string; correct: string; clue?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/student/mistakes/${userId}`, item);
  }

  decrementMistakeItem(userId: number, original: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/student/mistakes/${userId}/decrement`, { original });
  }

  // ข้อมูลโปรไฟล์เต็มจาก DB จริง (login คืนแค่ชุดที่จำเป็นตอนล็อกอิน ไม่ครบเท่านี้) — ใช้
  // รีเฟรชหน้า Profile ▸ ข้อมูลโปรไฟล์ ให้ตรงกับ DB เสมอ
  getStudentProfile(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/student/profile/${userId}`);
  }

  // แก้ไขได้แค่ email/avatar_url เท่านั้น (ชื่อ/คณะ/ภาค/ชั้นปียังแก้ได้เฉพาะทางแอดมิน)
  updateStudentProfile(userId: number, data: { email?: string; avatar_url?: string }): Observable<any> {
    return this.http.put(`${this.baseUrl}/student/profile/${userId}`, data);
  }

  // Prompt AI ระดับระบบ (เช่น บุคลิก/กฎหลักของ Pingo AI ที่ใช้ทุกบทเรียน ทุกชั้นปี)
  // — แก้ได้จากหน้า Admin เท่านั้น ต่างจาก getLessonAiSettings() ที่อาจารย์แก้ได้เองต่อบท
  getAdminAiPrompts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/ai-prompts`);
  }

  saveAdminAiPrompt(scopeKey: string, promptText: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/ai-prompts/${scopeKey}`, { prompt_text: promptText });
  }

  // ── AI Speaking Integration ──
  postAiSpeaking(modeRoute: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai-speaking/${modeRoute}`, data);
  }

  postLessonAiSpeaking(lessonId: number, modeRoute: string, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/lesson/${lessonId}/ai-speaking/${modeRoute}`, data);
  }

  postAiSpeakingGeneral(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai-speaking`, data);
  }

  // Live Speech recording upload (for speech_to_text/speech_to_speech)
  // Expects FormData containing 'audio', and other options
  postAudioSpeaking(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai-speaking`, formData);
  }

  postSpeakingEvaluation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai-speaking/evaluate-session`, data);
  }

  getSpeakingHistory(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/ai-speaking/history/${userId}`);
  }

  // ปุ่ม "แปล" + "ตัวอย่างคำตอบ" ในหน้าฝึกพูด (speech-to-speech)
  translateToThai(text: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai-speaking/translate`, { text });
  }

  suggestReplies(aiMessage: string, context?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/ai-speaking/suggest-replies`, { ai_message: aiMessage, context });
  }

  postLessonAudioSpeaking(lessonId: number, modeRoute: string, formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/lesson/${lessonId}/ai-speaking/${modeRoute}`, formData);
  }

  postAiAssistantFile(file: File, prompt: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);
    return this.http.post(`${this.baseUrl}/ai-assistant-file`, formData);
  }

  uploadSlidePdf(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  // Generic file upload (images, etc.) — hits the same backend /upload
  // endpoint as uploadSlidePdf(); kept as a neutrally-named alias so
  // callers uploading a lesson/game cover image aren't stuck naming it
  // after PDFs.
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  // ── Game Covers ──
  getGameCovers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/game-covers`);
  }

  saveGameCover(gameKey: string, imageUrl: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/game-covers`, { game_key: gameKey, image_url: imageUrl });
  }

  // ── Game Contents (เนื้อหา/ชุดคำถามของแต่ละเกม ที่อาจารย์แก้เองได้) ──
  getGameContents(): Observable<any> {
    return this.http.get(`${this.baseUrl}/game-contents`);
  }

  saveGameContent(gameKey: string, items: any[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/game-contents/${gameKey}`, { items });
  }

  // ── Games (Dynamic Game Management — Game Covers + Content ที่ผูกกับ
  // games.game_id จริง ไม่จำกัดจำนวนเกม, ดู backend/routes/games.py) ──
  getGames(): Observable<any> {
    return this.http.get(`${this.baseUrl}/games`);
  }

  getGame(gameId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/games/${gameId}`);
  }

  createGame(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/games`, data);
  }

  updateGame(gameId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/games/${gameId}`, data);
  }

  deleteGame(gameId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/games/${gameId}`);
  }

  getGameQuestions(gameId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/games/${gameId}/questions`);
  }

  addGameQuestion(gameId: number, data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/games/${gameId}/questions`, data);
  }

  updateGameQuestion(questionId: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/questions/${questionId}`, data);
  }

  deleteGameQuestion(questionId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/questions/${questionId}`);
  }

  generateVocab(topic: string, level: string, userId?: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/generate-vocab`, { topic, level, user_id: userId });
  }

  getVocabHistory(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/api/ai/vocab-history/${userId}`);
  }

  deleteVocabHistory(historyId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/api/ai/vocab-history/${historyId}`);
  }

  draftTeacherLesson(title: string, targetLevel: string, sectionCount: number, referenceText?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/draft-teacher-lesson`, {
      title,
      targetLevel,
      sectionCount,
      referenceText
    });
  }

  generatePageImage(prompt: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/generate-page-image`, { prompt });
  }
}
