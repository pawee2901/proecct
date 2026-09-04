import { Injectable } from '@angular/core';
import { StudentSessionService } from './student-session.service';

// Extracted from student.component.ts: modal visibility flags (~416-436),
// openVoiceSettings/saveVoiceSettings/loadVoiceSettings (~8602-8639),
// openBadges (~8735). The "More" bottom sheet itself was dead code (no
// open-trigger in the template) and was dropped rather than migrated, per
// the approved plan. showVideoCallModal/openVideoCallModal/closeVideoCallModal
// (the AI Video Call feature's shared open/close flag) were dropped when
// that feature was removed entirely — see git history.
@Injectable({ providedIn: 'root' })
export class SharedUiStateService {
  showVoiceSettingsModal = false;
  showBadgesModal = false;

  // Badges & Achievements — small static demo data, rendered only by the
  // shared Badges modal (original student.component.ts:513-518).
  badges = [
    { id: 'streak_3', title: 'Daily Streak', desc: 'เรียนต่อเนื่อง 3 วัน', icon: '🔥', unlocked: true },
    { id: 'speak_10', title: 'Speech Master', desc: 'พูดภาษาอังกฤษกับ AI 10 ครั้ง', icon: '🗣️', unlocked: false },
    { id: 'vocab_50', title: 'Vocab King', desc: 'เรียนรู้คำศัพท์มากกว่า 50 คำ', icon: '👑', unlocked: true },
    { id: 'quiz_perfect', title: 'Perfect Score', desc: 'ทำคะแนนแบบทดสอบได้ 100%', icon: '💯', unlocked: false },
  ];

  // Voice Settings Options
  voiceEffectsEnabled = true;
  voiceSpeedSetting: 'slow' | 'normal' | 'fast' = 'normal';
  voiceAccentSetting: 'US' | 'UK' = 'US';
  thaiTranslationsEnabled = true;
  thaiSubtitlesEnabled = true;
  useWhisperSpeech = true;
  ttsSpeed = 1.0;
  ttsVoiceType = 'US'; // 'US' or 'UK'

  constructor(private session: StudentSessionService) {}

  // Note: original also fired a click sound effect via playSoundEffect() here.
  // Omitted to avoid a circular dependency (GameFxService already depends on
  // this service for voiceEffectsEnabled) — call gameFx.playSoundEffect('click')
  // from the component that triggers this if the sound is wanted back.
  openVoiceSettings(): void {
    this.showVoiceSettingsModal = true;
  }

  saveVoiceSettings(): void {
    try {
      const key = `voice_settings_${this.session.currentUser?.id || 'guest'}`;
      const settings = {
        voiceEffectsEnabled: this.voiceEffectsEnabled,
        ttsSpeed: this.ttsSpeed,
        ttsVoiceType: this.ttsVoiceType,
        thaiTranslationsEnabled: this.thaiTranslationsEnabled,
      };
      localStorage.setItem(key, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save voice settings:', e);
    }
    this.showVoiceSettingsModal = false;
  }

  loadVoiceSettings(): void {
    try {
      const key = `voice_settings_${this.session.currentUser?.id || 'guest'}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const settings = JSON.parse(raw);
        if (settings.voiceEffectsEnabled !== undefined) this.voiceEffectsEnabled = settings.voiceEffectsEnabled;
        if (settings.ttsSpeed !== undefined) this.ttsSpeed = settings.ttsSpeed;
        if (settings.ttsVoiceType !== undefined) this.ttsVoiceType = settings.ttsVoiceType;
        if (settings.thaiTranslationsEnabled !== undefined) this.thaiTranslationsEnabled = settings.thaiTranslationsEnabled;
      }
    } catch (e) {
      console.warn('Failed to load voice settings:', e);
    }
  }

}
