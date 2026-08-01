import { Injectable } from '@angular/core';
import { SharedUiStateService } from './shared-ui-state.service';
import { ProgressService } from './progress.service';
import { LearningLogService } from './learning-log.service';

// Extracted from student.component.ts: generic utilities used across
// Games/Practice/Videos/Lessons that aren't specific to any one tab —
// triggerConfetti/triggerGameShake/playSoundEffect (~6001-6061, 9102-9135),
// normalizeAnswer/shuffleArray/escapeRegExp/normalizeSentence/extractKeywords
// (~6007-6231), iconColorClass (~6001), textOverlapRatio (~4587), awardGameXp
// (~6053).
@Injectable({ providedIn: 'root' })
export class GameFxService {
  showConfetti = false;
  confettiParticles: any[] = [];
  gameShake = false;

  /** Generic one-word/one-sentence TTS via window.speechSynthesis — used by
   *  Vocabulary flashcards/AI results and Games (Dictation, English→Thai).
   *  Distinct from Practice's own practiceSpeakText (has voice/speed options
   *  tied to SharedUiStateService), which stays with Practice (Phase 6).
   *  Original: student.component.ts:8065-8086. */
  speakingWord = '';

  private readonly iconColorClasses = ['icon-bg-green', 'icon-bg-purple', 'icon-bg-yellow', 'icon-bg-red', 'icon-bg-blue'];

  constructor(
    private sharedUi: SharedUiStateService,
    private progress: ProgressService,
    private learningLog: LearningLogService,
  ) {}

  triggerConfetti(): void {
    this.playSoundEffect('success');
    this.showConfetti = true;
    this.confettiParticles = [];
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 50; i++) {
      this.confettiParticles.push({
        left: Math.random() * 100 + '%',
        delay: Math.random() * 1.5 + 's',
        duration: Math.random() * 2 + 1.5 + 's',
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 8 + 'px',
        rotation: Math.random() * 360 + 'deg',
      });
    }
    setTimeout(() => {
      this.showConfetti = false;
      this.confettiParticles = [];
    }, 3500);
  }

  triggerGameShake(): void {
    this.playSoundEffect('error');
    this.gameShake = true;
    setTimeout(() => {
      this.gameShake = false;
    }, 500);
  }

  playSoundEffect(type: 'success' | 'click' | 'error'): void {
    if (!this.sharedUi.voiceEffectsEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  awardGameXp(amount: number, gameTitle?: string, score?: number): void {
    this.progress.currentXp = Math.min(this.progress.currentXp + amount, this.progress.dailyXpGoal);
    if (gameTitle) {
      this.learningLog.log({ type: 'Game', title: gameTitle, score, xp: amount });
    }
    if (score && score >= 70) {
      this.triggerConfetti();
    }
  }

  iconColorClass(word: string): string {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash += word.charCodeAt(i);
    return this.iconColorClasses[hash % this.iconColorClasses.length];
  }

  normalizeAnswer(value: string): string {
    return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  shuffleArray<T>(source: T[]): T[] {
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  normalizeSentence(value: string): string {
    return (value || '')
      .toLowerCase()
      .replace(/[.,!?;:"()]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  extractKeywords(sentence: string, max: number = 4): string[] {
    const stopwords = new Set([
      'this', 'that', 'with', 'from', 'have', 'your', 'about', 'please', 'today',
      'which', 'would', 'could', 'should', 'there', 'their', 'where', 'when',
      'what', 'will', 'shall', 'been', 'were', 'they', 'them', 'then', 'than',
      'also', 'just', 'into', 'over', 'some', 'more', 'very', 'call', 'calling',
    ]);
    const words = (sentence.toLowerCase().match(/[a-z']+/g) || []).filter(
      (w) => w.length >= 4 && !stopwords.has(w),
    );
    return Array.from(new Set(words)).slice(0, max);
  }

  speakText(text: string, lang = 'en-US'): void {
    if (!text) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (this.speakingWord === text) {
      this.speakingWord = '';
      return;
    }
    this.speakingWord = text;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.85;
    utter.onend = () => {
      this.speakingWord = '';
    };
    utter.onerror = () => {
      this.speakingWord = '';
    };
    synth.speak(utter);
  }

  /** Used by Profile's transcript viewer and Practice's chat bubbles
   *  (original student.component.ts:4668-4678). */
  stripMarkdown(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/###/g, '')
      .replace(/##/g, '')
      .replace(/#/g, '')
      .replace(/---/g, '')
      .trim();
  }

  /** Used by Practice's speech-to-speech scoring AND Lessons' Full Quiz Part C. */
  textOverlapRatio(target: string, actual: string): number {
    const cleanStr = (s: string) =>
      s
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
        .trim();
    const targetWords = cleanStr(target).split(/\s+/).filter(Boolean);
    const actualWords = cleanStr(actual).split(/\s+/).filter(Boolean);
    if (targetWords.length === 0) return actualWords.length > 0 ? 1 : 0;
    const matchedCount = targetWords.filter((tw) => actualWords.includes(tw)).length;
    return matchedCount / targetWords.length;
  }
}
