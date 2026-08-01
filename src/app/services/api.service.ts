import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000';

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
