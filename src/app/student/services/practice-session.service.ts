import { Injectable } from '@angular/core';

// Thin "mailbox" for the Profile↔Practice cross-tab coupling identified in
// the migration plan (original handleHistoryClick/loadPastChatSession,
// student.component.ts:8641-8671, used to reach directly into Practice's
// properties). Profile calls requestResume(log) then navigates to
// /student/practice; StudentPracticeComponent (Phase 6) calls
// takePendingResumeLog() in its ngOnInit and replays the original
// loadPastChatSession logic itself (it needs Practice-only data like
// practiceChatTopics to match the chat topic) into its own local
// practiceMessages/practiceMode/etc — those stay component-local exactly
// like the original class, so this service only carries the handoff, not a
// duplicate copy of the chat state.
@Injectable({ providedIn: 'root' })
export class PracticeSessionService {
  private pendingResumeLog: any | null = null;

  requestResume(log: any): void {
    this.pendingResumeLog = log;
  }

  takePendingResumeLog(): any | null {
    const log = this.pendingResumeLog;
    this.pendingResumeLog = null;
    return log;
  }
}
