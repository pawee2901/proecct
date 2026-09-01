import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Swal from 'sweetalert2';

import { ApiService } from '../../../services/api.service';
import { StudentSessionService } from '../../services/student-session.service';
import { LessonsDataService } from '../../services/lessons-data.service';
import { ProgressService } from '../../services/progress.service';
import { LearningLogService } from '../../services/learning-log.service';
import { MistakesTrackerService } from '../../services/mistakes-tracker.service';
import { GameFxService } from '../../services/game-fx.service';
import { SharedUiStateService } from '../../services/shared-ui-state.service';
import { PracticeSessionService } from '../../services/practice-session.service';
import { LearningLogEntry } from '../../models/unit.model';

// Phase 6 of the migration plan — the most complex tab. Extracted from
// student.component.ts: Practice Center setup wizard + simulation data
// (~168-457), Learning History expandedLogIndex (~500) and the mock
// conversation bank aiResponseDb (~565-648, both stranded between other
// tabs' declarations in the original file), and the full method set
// (~3346-5012 excluding bits already migrated elsewhere, ~8641-9028 for
// history-panel replay). Template from student.component.html: the Practice
// tab (@if (activeTab === 'practice'), 2995-4137) plus a shell-level overlay
// only Practice ever triggers — the Evaluating spinner + Speaking Report
// Modal (6202-6367).
//
// Cross-tab coupling: Profile's "resume this session" button calls
// PracticeSessionService.requestResume(log) then navigates here; ngOnInit
// checks takePendingResumeLog() and replays it via loadPastChatSession(),
// the same method Practice's own history sidebar (handleHistoryClick) uses.
//
// Dropped (confirmed dead — no template/other-code reference): showHistoryModal,
// voiceSpeedSetting, voiceAccentSetting, thaiSubtitlesEnabled, useWhisperSpeech,
// #audioCache, practiceSuggestions, allPracticeSuggestions. The AI Video Call
// feature (its modal, SharedUiStateService.showVideoCallModal, and every
// videoCall*/vcall-* symbol) was removed entirely per product decision —
// see git history for the prior implementation if it's ever needed again.
@Component({
  selector: 'app-student-practice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-practice.component.html',
  styleUrl: './student-practice.component.scss',
})
export class StudentPracticeComponent implements OnInit, OnDestroy {
  @ViewChild('chatScroll') private chatScrollContainer!: ElementRef;

  expandedLogIndex: number | null = null;

  // 🎙️ PRACTICE CENTER VARIABLES & SIMULATION DATA
  // ====================================================
  // Duolingo Onboarding wizard variables
  practiceSetupActive = false;
  setupStep = 1;
  selectedCategory: 'teaching' | 'daily' | 'presentation' | 'interview' = 'teaching';
  selectedTeachingTopic: { key: string; titleTh: string; prompt: string; greeting: string } | null = null;
  selectedLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  selectedAvatar: 'jane' | 'david' | 'alex' | 'maria' = 'jane';
  pendingPracticeMode: 'menu' | 'text-to-text' | 'speech-to-text' | 'text-to-speech' | 'speech-to-speech' = 'menu';

  // Structured Job Interview Preparation state
  interviewQuestionIndex = 1;
  interviewQuestions: string[] = [];
  interviewTips: string[] = [
    'แนะนำตัวอย่างสั้น ๆ เล่าประวัติการศึกษา/การทำงาน และแรงบันดาลใจในการสมัครงานนี้ (Highlight your background and motivation)',
    'อธิบายเทคนิคการสอน เช่น การเรียนรู้แบบมีส่วนร่วม (Active Learning) หรือการใช้วัตถุสื่อสารช่วยสอน (Explain your student-centered teaching techniques)',
    'แสดงวิธีการจัดการพฤติกรรมในห้องเรียน เช่น การพูดคุยด้วยเหตุผล หรือการให้รางวัลเชิงบวก (Describe how you handle disengaged or disruptive behavior)',
    'เล่าเทคนิคการสร้างสัมพันธ์และการสื่อสารกับผู้ปกครองอย่างสร้างสรรค์ (Discuss positive parent-teacher communication and collaboration)',
    'บอกเล่าวิสัยทัศน์และการพัฒนาตัวเองในวิชาชีพครูในอีก 5 ปีข้างหน้า (Share your professional growth goals and long-term values)'
  ];
  interviewPresetQuestionsJane = [
    "Hello! I am Teacher Jane. I am glad to do this mock interview with you today. Let's start: Could you please introduce yourself and tell me why you want to become an English teacher?",
    "Thank you. In modern classroom teaching, how do you plan your lessons to ensure that students are engaged and active?",
    "Excellent. Classroom management is a key skill. If a student is constantly disruptive or refusing to participate, what would you do?",
    "Very professional. Working with parents is crucial. How would you handle a parent who is unhappy with their child's classroom performance?",
    "Lastly, what are your professional goals for the next 5 years, and how do you plan to keep developing your teaching skills?"
  ];
  interviewPresetQuestionsDavid = [
    "Good day. I am Mr. David, the Principal. Welcome to our mock interview. First, please introduce yourself and describe your training or experience in teaching English.",
    "Thank you. We prioritize student-centered education. How do you implement active learning in your lessons?",
    "I see. What is your approach to classroom discipline when dealing with highly disobedient students?",
    "Very interesting. Parents are important partners in our school. How do you maintain positive and professional communication with them?",
    "Finally, where do you see yourself professionally in five years, and what values do you believe are most important for an educator?"
  ];
  interviewPresetQuestionsAlex = [
    "Hey there! Alex here. Glad to help you practice your interview skills. Let's start with a quick intro: Tell me about yourself and why you're choosing this career path.",
    "Awesome. What kind of interactive activities or games do you like to use to keep students excited about learning English?",
    "Totally. Classroom behavior can get crazy sometimes. How do you handle disruptive kids without losing your cool?",
    "Great points. If a parent is worried or upset about their child's grade, how do you handle that conversation?",
    "And last one: What are your goals as an English teacher for the next few years? How do you want to grow?"
  ];
  interviewPresetQuestionsMaria = [
    "Hello! This is Mama Maria. I am looking for a professional English tutor/teacher for my child. Before we begin, could you please introduce yourself and tell me why you're interested in teaching children?",
    "Thank you. Children can have short attention spans. What teaching methods do you use to keep young learners focused and active in class?",
    "I see. If a child is crying, acting out, or refusing to study, how do you manage their behavior and encourage them?",
    "That makes sense. As a parent, I value daily updates. How do you communicate progress or issues to parents like me?",
    "Lastly, what are your main goals when teaching children, and how do you customize lessons for different student needs?"
  ];

  // Structured Academic Presentation state
  presentationTopic = 'Interactive Games in English Classrooms';
  presentationCustomTopic = '';
  presentationSlideIndex = 1;
  presentationPhase: 'setup' | 'presenting' | 'qa' | 'feedback' = 'setup';
  presentationQaCount = 0;
  presentationQaQuestions: string[] = [];
  presentationTopics = [
    { key: 'games', titleTh: 'การใช้เกมตอบโต้ในห้องเรียนภาษาอังกฤษ', titleEn: 'Interactive Games in English Classrooms', slides: [
      { title: 'Slide 1: Introduction & Goals', points: ['Introduction to gamified learning', 'Purpose: Increase student engagement and vocabulary retention', 'Target: Primary school students'] },
      { title: 'Slide 2: Methodology & Core Games', points: ['Use of word scrambles, typing sprints, and roleplays', 'Structuring 15-minute interactive sessions in every class', 'Combining grammar drill with game mechanics'] },
      { title: 'Slide 3: Expected Benefits', points: ['Expected 25% increase in weekly quiz scores', 'Lowering student anxiety when speaking English', 'Building natural competition and team spirit'] },
      { title: 'Slide 4: Conclusion & Q&A', points: ['Gamified learning is sustainable and effective', 'Preparing for committee evaluation', 'Q&A session with the AI evaluator'] }
    ]},
    { key: 'phonics', titleTh: 'การสอนโฟนิกส์สำหรับเด็กเล็ก', titleEn: 'Teaching Phonics to Young Learners', slides: [
      { title: 'Slide 1: The Phonics Approach', points: ['Phonics vs Whole Language learning', 'Importance of letter-sound relationships', 'Target: Kindergarten to Grade 2 students'] },
      { title: 'Slide 2: Activity Design', points: ['Daily 10-minute sound blending drills', 'Interactive sound-matching flashcards', 'Using songs and physical actions for phonetic reinforcement'] },
      { title: 'Slide 3: Key Outcomes', points: ['Improved reading speed and pronunciation accuracy', 'Helping students decode unfamiliar words independently', 'Boosting overall reading confidence'] },
      { title: 'Slide 4: Summary & Q&A', points: ['Phonics is the foundation of early literacy', 'Ready for parents and school board review', 'Q&A session with the AI evaluator'] }
    ]},
    { key: 'classroom', titleTh: 'แผนการจัดการระเบียบในชั้นเรียนเชิงบวก', titleEn: 'Positive Classroom Management Plan', slides: [
      { title: 'Slide 1: Positive Discipline Foundation', points: ['Focusing on positive reinforcement over punishment', 'Creating a safe and respectful classroom culture', 'Aligning student and teacher expectations'] },
      { title: 'Slide 2: Practical Strategies', points: ['Defining 3 simple classroom rules together', 'Using a "Streak System" for good team behavior', 'Implementing cool-down zones for overwhelmed students'] },
      { title: 'Slide 3: Impact on Learning', points: ['Minimizing teaching disruptions by 40%', 'Higher participation from introverted students', 'Better teacher-student relationships'] },
      { title: 'Slide 4: Final Wrap-up', points: ['Effective management requires consistency and empathy', 'Ready for Principal review', 'Q&A session with the AI evaluator'] }
    ]}
  ];

  
  avatarDetails: any = {
    jane: {
      name: 'Teacher Jane (ครูเจน)',
      icon: '👩‍🏫',
      image: 'jane.png',
      openMouthImage: null,
      desc: 'ครูไทยใจดี พูดช้า เข้าใจง่าย (เน้นภาษาอังกฤษสำหรับครู)',
      label: 'Teacher Jane',
      mouthTop: '35.2%',
      mouthLeft: '59.5%',
      mouthWidth: '0%',
      mouthHeight: '0%',
      lipColor: '#c86877'
    },
    david: {
      name: 'Mr. David (เดวิด)',
      icon: '👨‍💼',
      image: 'david.png',
      desc: 'ครูต่างชาติชาวอังกฤษ สุภาพ เป็นทางการ (เน้นสัมภาษณ์/ประชุม)',
      label: 'Mr. David',
      mouthTop: '55.5%',
      mouthLeft: '50.2%',
      mouthWidth: '5.5%',
      mouthHeight: '1.8%',
      lipColor: '#b0525d'
    },
    alex: {
      name: 'Alex (อเล็กซ์)',
      icon: '👦',
      image: 'alex.png',
      desc: 'เพื่อนคู่สนทนาสุดซี้ คุยสบาย ๆ สไตล์กันเอง (เน้นคุยชีวิตประจำวัน)',
      label: 'Alex',
      mouthTop: '56.0%',
      mouthLeft: '50.0%',
      mouthWidth: '6.0%',
      mouthHeight: '2.0%',
      lipColor: '#be5c66'
    },
    maria: {
      name: 'Mama Maria (มาเรีย)',
      icon: '👩‍🦱',
      image: 'maria.png',
      desc: 'ผู้ปกครองนักเรียนจำลอง ขี้กังวลเล็กน้อย (เน้นคุยกับผู้ปกครอง)',
      label: 'Mama Maria',
      mouthTop: '55.0%',
      mouthLeft: '50.0%',
      mouthWidth: '5.5%',
      mouthHeight: '1.8%',
      lipColor: '#ad4e59'
    }
  };

  private mediaRecorder: any = null;
  private audioChunks: any[] = [];
  isPlayingTTS = false;
  isRecordingCancelled = false;
  responseTimes: number[] = [];
  userTurnStartTime = 0;
  isEvaluating = false;
  showSpeakingReportModal = false;
  speakingEvaluationResult: any = null;
  sttSessionCount = 0;
  sttWrongSentences: string[] = [];
  sttOriginalSentences: string[] = [];
  showSttReviewModal = false;
  // --- Speech-to-Text: setup screen (level + accent, same pattern as the
  // Text-to-Speech dictation quiz) plus combined scoring -- speed 40% +
  // reading accuracy 60%. sttSentenceShownTime marks when the current
  // target sentence became visible, so speed is "how fast did you read it
  // and finish speaking", not just raw recording duration. ---
  sttStep: 'setup' | 'practice' = 'setup';
  sttLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  private sttSentencePool: string[] = [];
  private sttSentenceShownTime = 0;
  sttSpeedScore: number | null = null;
  sttFinalScore: number | null = null;
  // The per-attempt score above is local text-matching + timing, computed
  // instantly so each sentence gets immediate feedback -- no AI involved.
  // These accumulate the round's (target, transcript, elapsedSeconds) triples
  // so evaluateSttSession() can send the whole round to the same AI
  // evaluator speech-to-speech/text-to-text use, once, when the round ends
  // (see nextSentence()/evaluateSttSession() below).
  private sttLastElapsedSeconds = 0;
  private sttSessionAttempts: { target: string; transcript: string; elapsedSeconds: number }[] = [];
  sttSessionFeedback: string | null = null;
  isEvaluatingSttSession = false;

  practiceUnitId = 1;
  practiceMode: 'menu' | 'text-to-text' | 'speech-to-text' | 'text-to-speech' | 'speech-to-speech' =
    'menu';
  practiceIsRecording = false;
  isMicInitializing = false;
  activeUtterance: any = null;
  recognizedText = '';
  speechInputText = '';
  pronunciationScore: number | null = null;
  matchedWords: { text: string; matched: boolean }[] = [];
  ttsSpeed = 1.0;
  ttsVoiceType = 'US'; // 'US' or 'UK'
  recognition: any = null;

  // --- Text-to-Speech Mode: listening dictation quiz. No text is shown up
  // front -- the target word/sentence only plays as audio (auto, twice),
  // the student types what they heard, and each answer is scored on both
  // response speed and wording accuracy. See buildTtsDictationPool() /
  // nextTtsDictationQuestion() / submitTtsDictationAnswer() below. ---
  ttsDictationStep: 'setup' | 'question' | 'summary' = 'setup';
  ttsDictationLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  ttsDictationContentType: 'word' | 'sentence' | 'both' = 'both';
  private ttsDictationWordPool: { text: string; type: 'word' }[] = [];
  private ttsDictationSentencePool: { text: string; type: 'sentence' }[] = [];
  private ttsDictationWordQueue: { text: string; type: 'word' }[] = [];
  private ttsDictationSentenceQueue: { text: string; type: 'sentence' }[] = [];
  private ttsDictationNextIsWord = true; // alternation toggle, only used when contentType === 'both'
  ttsDictationCurrent: { text: string; type: 'word' | 'sentence' } | null = null;
  ttsDictationInput = '';
  ttsDictationIsPlaying = false;
  private ttsDictationQuestionStartTime = 0;
  ttsDictationResults: {
    text: string;
    type: 'word' | 'sentence';
    userAnswer: string;
    accuracyScore: number;
    speedScore: number;
    finalScore: number;
    elapsedSeconds: number;
  }[] = [];
  ttsDictationFeedback: string | null = null;
  isEvaluatingTtsDictation = false;

  minimalPairsPool = [
    { word1: 'ship', word2: 'sheep', meaning1: 'เรือ', meaning2: 'แกะ', correct: 'sheep' },
    { word1: 'ship', word2: 'sheep', meaning1: 'เรือ', meaning2: 'แกะ', correct: 'ship' },
    { word1: 'bad', word2: 'bed', meaning1: 'เลว/แย่', meaning2: 'เตียงนอน', correct: 'bad' },
    { word1: 'bad', word2: 'bed', meaning1: 'เลว/แย่', meaning2: 'เตียงนอน', correct: 'bed' },
    { word1: 'think', word2: 'sink', meaning1: 'คิด', meaning2: 'อ่างล้างจาน/จม', correct: 'think' },
    { word1: 'think', word2: 'sink', meaning1: 'คิด', meaning2: 'อ่างล้างจาน/จม', correct: 'sink' },
    { word1: 'live', word2: 'leave', meaning1: 'อาศัยอยู่', meaning2: 'จากไป/ออกจาก', correct: 'live' },
    { word1: 'live', word2: 'leave', meaning1: 'อาศัยอยู่', meaning2: 'จากไป/ออกจาก', correct: 'leave' },
    { word1: 'fan', word2: 'van', meaning1: 'พัดลม', meaning2: 'รถตู้', correct: 'fan' },
    { word1: 'fan', word2: 'van', meaning1: 'พัดลม', meaning2: 'รถตู้', correct: 'van' },
    { word1: 'wet', word2: 'vet', meaning1: 'เปียก', meaning2: 'สัตวแพทย์', correct: 'wet' },
    { word1: 'wet', word2: 'vet', meaning1: 'เปียก', meaning2: 'สัตวแพทย์', correct: 'vet' },
    { word1: 'fit', word2: 'feet', meaning1: 'พอดี', meaning2: 'เท้า', correct: 'fit' },
    { word1: 'fit', word2: 'feet', meaning1: 'พอดี', meaning2: 'เท้า', correct: 'feet' }
  ];
  mpPool: any[] = [];
  mpIndex = 0;
  mpSelectedAnswer = '';
  mpFeedback: 'correct' | 'wrong' | '' = '';
  mpScore = 0;

  // Mistakes Review Hub
  frequentlyWrongItems: { id: string; type: 'word' | 'sentence' | 'grammar'; original: string; correct: string; clue?: string; wrongCount: number }[] = [];
  reviewMode: 'list' | 'quiz' | 'completed' = 'list';
  reviewItems: any[] = [];
  reviewIndex = 0;
  reviewInput = '';
  reviewFeedback: 'correct' | 'wrong' | '' = '';
  reviewScore = 0;

  // Real-time Chat & Audio Chat Messages
  practiceMessages: {
    sender: 'user' | 'ai';
    text: string;
    time: Date;
    grammarSuggestion?: string;
  }[] = [];
  aiWriting = false;

  // ปุ่ม "แปล" + "ตัวอย่างคำตอบ" บนข้อความล่าสุดของ AI (call screen, speech-to-speech)
  // เก็บ translatedForText/suggestionsForText คู่กับผลลัพธ์ไว้เทียบกับข้อความ AI ล่าสุด
  // ปัจจุบันเสมอ (แทนที่จะเคลียร์ state ตรงทุกจุดที่ push ข้อความ AI ใหม่ ซึ่งมีหลายจุดและ
  // เสี่ยงตกหล่น) — ถ้าไม่ตรงกันแปลว่าเป็นผลลัพธ์เก่าของข้อความก่อนหน้า ไม่โชว์
  lastAiTranslation: string | null = null;
  translatedForText: string | null = null;
  translatingLastAi = false;
  suggestedReplies: string[] = [];
  suggestionsForText: string | null = null;

  // "ตัวอย่างคำตอบ" ใช้ bank คงที่ในเครื่อง (ดูเหตุผลที่ getSuggestedReplies() ด้านล่าง)
  // -- ประโยคตั้งต้นทั่วไป ใช้ตอบได้เกือบทุกคำถามในบทสนทนาฝึกพูดจริง ไม่ผูกกับเนื้อหา
  // เฉพาะเจาะจงของคำถามใดคำถามหนึ่ง
  private readonly suggestedReplyBank: string[] = [
    "That's a good question, let me think for a moment.",
    "I think so, yes, but I'm not completely sure.",
    "Honestly, I haven't thought about that before.",
    "In my opinion, it really depends on the situation.",
    "Sure, I'd be happy to talk about that.",
    "That's interesting, can you tell me more about it?",
    "I'm not sure, but I'll try my best to explain.",
    "Yes, definitely. I feel the same way about it.",
    "Well, it's a bit complicated, but I'll try to answer.",
    "I see what you mean, let me give you an example.",
    "That reminds me of something similar that happened to me.",
    "To be honest, I'm still learning about this topic.",
  ];

  // Text-to-Text Sub-Modes Control
  textPracticeSubMode: 'menu' | 'chat' | 'qa' = 'menu';

  // ── Text-to-Text "Chat" sub-mode: random roleplay topic (Duolingo-style) ──
  practiceChatTopics: { id: number; icon: string; titleTh: string; titleEn: string; scenario: string }[] = [
    { id: 1, icon: '👋', titleTh: 'ทักทายและแนะนำตัว', titleEn: 'Greetings & Introductions', scenario: 'You are meeting a new international student on campus for the first time. Greet them and introduce yourself.' },
    { id: 2, icon: '🍽️', titleTh: 'สั่งอาหารที่ร้านอาหาร', titleEn: 'Ordering at a Restaurant', scenario: 'You are a waiter/waitress at a restaurant taking the customer\'s food order.' },
    { id: 3, icon: '📞', titleTh: 'รับสายโทรศัพท์ในสำนักงาน', titleEn: 'Answering an Office Call', scenario: 'You are a receptionist answering a phone call at a school office.' },
    { id: 4, icon: '🎤', titleTh: 'ถาม-ตอบหลังการนำเสนอ', titleEn: 'Q&A After a Presentation', scenario: 'You are an audience member asking a question after a student presentation.' },
    { id: 5, icon: '🏨', titleTh: 'จองห้องพักโรงแรม', titleEn: 'Booking a Hotel Room', scenario: 'You are a hotel receptionist helping a guest book a room.' },
    { id: 6, icon: '🧭', titleTh: 'ถามทางไปสถานที่', titleEn: 'Asking for Directions', scenario: 'A tourist stops you on the street to ask for directions to the library.' },
    { id: 7, icon: '💼', titleTh: 'สัมภาษณ์งานเบื้องต้น', titleEn: 'A Basic Job Interview', scenario: 'You are an interviewer asking a candidate basic job interview questions.' },
    { id: 8, icon: '🛒', titleTh: 'ซื้อของที่ร้านสะดวกซื้อ', titleEn: 'Shopping at a Convenience Store', scenario: 'You are a shop clerk helping a customer find and pay for items.' },
  ];
  currentChatTopic: { id: number; icon: string; titleTh: string; titleEn: string; scenario: string } | null = null;

  // ── End-of-conversation AI summary report ──
  chatSummaryVisible = false;
  chatSummaryLoading = false;
  showSummaryTranscript = false;
  // Playful cycling status lines shown under the spinner while the summary loads
  chatSummaryLoadingMessages = [
    '🔍 กำลังอ่านบทสนทนาของคุณอย่างละเอียด...',
    '📝 กำลังตรวจสอบไวยากรณ์และคำศัพท์...',
    '🗣️ กำลังประเมินความลื่นไหลในการตอบโต้...',
    '🎯 กำลังให้คะแนนและสรุปผลลัพธ์...',
    '✨ อีกสักครู่นะ ใกล้เสร็จแล้ว...',
  ];
  chatSummaryLoadingTipIndex = 0;
  private chatSummaryLoadingInterval: any = null;
  chatSummaryReport: {
    overall: string;
    scores?: { grammar: number; pronunciation: number; speed: number; total: number };
    corrections: { original: string; issue: string; suggestion: string }[];
    tips: string[];
  } | null = null;

  // Selected Unit Sentences for Speech-to-Text and Text-to-Speech
  practiceSentences: string[] = [
    'Hello, good morning. My name is Ms. Parker.',
    'Nice to meet you. How are you doing today?',
    'I am glad to welcome you all to our classroom.',
    'Could you please tell me your name?',
  ];
  selectedSentenceIndex = 0;

  // ====================================================
  // 🦉 DUOLINGO-STYLE EXTRA FEATURES
  // ====================================================
  showMoreSheet = false;
  showVoiceSettingsModal = false;
  showHistoryModal = false;
  showBadgesModal = false;

  // Profile History Sub-View Control
  profileSubView: 'main' | 'category-detail' = 'main';
  selectedHistoryCategory = 'practice';
  expandedProfileLogIndex: number | null = null;

  // History Sidebar Panel in Text-to-Text Mode
  showHistoryPanel = false;

  // Voice Settings Options
  voiceEffectsEnabled = true;
  voiceSpeedSetting: 'slow' | 'normal' | 'fast' = 'normal';
  voiceAccentSetting: 'US' | 'UK' = 'US';
  thaiTranslationsEnabled = true;
  thaiSubtitlesEnabled = true;
  useWhisperSpeech = true;

  // Speech Confirmation State
  stsPendingText = '';
  showStsConfirm = false;

  private aiResponseDb: { [key: number]: { userKeyword: string; reply: string }[] } = {
    1: [
      {
        userKeyword: 'hello',
        reply: 'Hello! It is so nice to meet you. What can I do for you today?',
      },
      { userKeyword: 'morning', reply: 'Good morning! Welcome to our introductory class.' },
      {
        userKeyword: 'how are you',
        reply: "I'm doing excellent, thank you! How are you doing today?",
      },
      {
        userKeyword: 'classroom',
        reply: 'The classroom is just down the hall on the left. Let me show you!',
      },
      { userKeyword: 'name', reply: 'I am Ms. Parker, your English teacher for this semester.' },
    ],
    2: [
      {
        userKeyword: 'calling',
        reply: 'Hello. Ms. Parker speaking. Could you please let me know the reason for your call?',
      },
      {
        userKeyword: 'speak to',
        reply: "I'm sorry, she is currently in a meeting. Would you like to leave a message?",
      },
      {
        userKeyword: 'phone number',
        reply: 'Of course, my number is 081-234-5678. Please verify it.',
      },
      {
        userKeyword: 'message',
        reply: 'Certainly, I have noted down your message and will ensure it is passed along.',
      },
    ],
    3: [
      {
        userKeyword: 'morning',
        reply: 'Good morning! Please feel free to start your presentation whenever you are ready.',
      },
      { userKeyword: 'present', reply: 'Great topic! The audience is eager to hear about it.' },
      {
        userKeyword: 'section',
        reply: 'Structuring it into sections is excellent. What is your first section about?',
      },
      {
        userKeyword: 'question',
        reply: 'Thank you for the explanation. Can you elaborate on the visual aid used?',
      },
    ],
    4: [
      {
        userKeyword: 'agenda',
        reply: "Yes, let's keep to the schedule. What is the next item on the agenda?",
      },
      {
        userKeyword: 'perspective',
        reply: "Thank you. Let's work together to find common ground for the curriculum.",
      },
      {
        userKeyword: 'agree',
        reply: "Perfect. We have a consensus on this topic. Let's document this in the minutes.",
      },
      {
        userKeyword: 'wrap up',
        reply: "Yes, let's adjourn the meeting. Thank you for your contributions.",
      },
    ],
    5: [
      {
        userKeyword: 'open',
        reply: "Excellent. Let's look at the first instruction. Is it clear to everyone?",
      },
      { userKeyword: 'page', reply: 'Yes, turn to page ten. We will study classroom commands.' },
      {
        userKeyword: 'question',
        reply: "No questions? Great! Let's start the speaking practice now.",
      },
      {
        userKeyword: 'pairs',
        reply: 'Perfect! Choose your partner and start practicing the dialogue.',
      },
    ],
  };

  constructor(
    private apiService: ApiService,
    public session: StudentSessionService,
    public lessonsData: LessonsDataService,
    public progress: ProgressService,
    public learningLog: LearningLogService,
    public mistakes: MistakesTrackerService,
    public gameFx: GameFxService,
    public sharedUi: SharedUiStateService,
    private practiceSession: PracticeSessionService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.initPracticeCenter();
    const pendingLog = this.practiceSession.takePendingResumeLog();
    if (pendingLog) {
      this.loadPastChatSession(pendingLog);
    }
  }

  getInitial(): string {
    return (this.session.currentUser?.firstName || 'U')[0].toUpperCase();
  }

  initPracticeCenter(): void {
    this.practiceMode = 'menu';
    this.selectPracticeUnit(this.practiceUnitId);
  }

  ngOnDestroy(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.practiceIsRecording) {
      this.stopPracticeRecordingFlow();
    }
    this.stopChatSummaryLoadingTips();
  }

  selectPracticeUnit(unitId: number) {
    this.practiceUnitId = unitId;

    // Collect speaking sentences from units dynamically
    const allSentences: string[] = [];
    this.lessonsData.units.forEach((u: any) => {
      if (u.speakingQuestions && Array.isArray(u.speakingQuestions)) {
        u.speakingQuestions.forEach((s: string) => {
          if (s && s.trim()) {
            allSentences.push(s.trim());
          }
        });
      }
    });

    if (allSentences.length > 0) {
      this.practiceSentences = allSentences;
    } else {
      // Fallback
      this.practiceSentences = [
        'Hello, good morning. My name is Ms. Parker.',
        'Nice to meet you. How are you doing today?',
        'I am glad to welcome you all to our classroom.',
        'Could you please tell me your name?',
      ];
    }

    this.selectedSentenceIndex = 0;
    this.resetModeState();
  }

  resetModeState() {
    this.practiceIsRecording = false;
    this.recognizedText = '';
    this.speechInputText = '';
    this.pronunciationScore = null;
    this.matchedWords = [];
    this.practiceMessages = [];
    this.aiWriting = false;
  }

  startPracticeMode(
    mode: 'menu' | 'text-to-text' | 'speech-to-text' | 'text-to-speech' | 'speech-to-speech',
  ) {
    this.resetModeState();

    if (mode === 'speech-to-speech') {
      this.practiceMode = mode;
      this.pendingPracticeMode = mode;
      this.practiceSetupActive = true;
      this.setupStep = 1;
    } else {
      this.practiceMode = mode;
      this.practiceSetupActive = false;
      if (mode === 'text-to-text') {
        this.textPracticeSubMode = 'menu';
      }
      if (mode === 'speech-to-text') {
        this.sttStep = 'setup';
        this.sttSessionCount = 0;
        this.sttWrongSentences = [];
        this.sttOriginalSentences = [...this.practiceSentences];
        this.showSttReviewModal = false;
        this.sttSpeedScore = null;
        this.sttFinalScore = null;
        this.sttSessionAttempts = [];
        this.sttSessionFeedback = null;
      }
      if (mode === 'text-to-speech') {
        this.ttsDictationStep = 'setup';
        this.ttsDictationCurrent = null;
        this.ttsDictationInput = '';
        this.ttsDictationResults = [];
        this.ttsDictationFeedback = null;
      }
    }
  }

  nextSetupStep() {
    if (this.setupStep < 3) {
      this.setupStep++;
      this.gameFx.playSoundEffect('click');
    } else {
      this.applyPracticeSetup();
    }
  }

  prevSetupStep() {
    if (this.setupStep > 1) {
      this.setupStep--;
      this.gameFx.playSoundEffect('click');
    }
  }

  cancelPracticeSetup() {
    this.practiceSetupActive = false;
    if (this.pendingPracticeMode === 'text-to-text') {
      this.textPracticeSubMode = 'menu';
    } else {
      this.practiceMode = 'menu';
    }
    this.gameFx.playSoundEffect('click');
  }

  startConversationalChatSetup() {
    this.practiceSetupActive = true;
    this.setupStep = 1;
    this.pendingPracticeMode = 'text-to-text';
    this.gameFx.playSoundEffect('click');
  }

  selectAvatar(avatar: string): void {
    if (avatar === 'jane' || avatar === 'david' || avatar === 'alex' || avatar === 'maria') {
      this.selectedAvatar = avatar;
    }
  }

  initInterviewQuestions() {
    const avatar = this.selectedAvatar;
    if (avatar === 'jane') {
      this.interviewQuestions = [...this.interviewPresetQuestionsJane];
    } else if (avatar === 'david') {
      this.interviewQuestions = [...this.interviewPresetQuestionsDavid];
    } else if (avatar === 'alex') {
      this.interviewQuestions = [...this.interviewPresetQuestionsAlex];
    } else if (avatar === 'maria') {
      this.interviewQuestions = [...this.interviewPresetQuestionsMaria];
    } else {
      this.interviewQuestions = [...this.interviewPresetQuestionsJane];
    }
    this.interviewQuestionIndex = 1;
  }

  applyPracticeSetup() {
    this.practiceSetupActive = false;
    this.gameFx.playSoundEffect('success');

    // Initialize structured states
    if (this.selectedCategory === 'interview') {
      this.initInterviewQuestions();
    } else if (this.selectedCategory === 'presentation') {
      this.presentationPhase = 'setup';
      this.presentationSlideIndex = 1;
      this.presentationQaCount = 0;
      this.presentationQaQuestions = [];
    }
    
    // Randomize teaching topic if category is teaching
    if (this.selectedCategory === 'teaching') {
      const studentName = this.session.currentUser?.firstName || 'there';
      const topics = [
        { key: 'welcome', titleTh: 'ต้อนรับนักเรียนหน้าชั้นเรียน', prompt: 'welcoming students to the classroom on the first day of school', greeting: `Hello ${studentName}! I am Teacher Jane. I'll be your mentor today. Let's practice welcoming students to the classroom on the first day. Are you ready?` },
        { key: 'rules', titleTh: 'อธิบายกฎระเบียบในห้องเรียน', prompt: 'explaining classroom rules to students (like raising hands to speak)', greeting: `Hello ${studentName}! I am Teacher Jane. I'll be your mentor today. Let's practice explaining the classroom rules to our students.` },
        { key: 'parent', titleTh: 'คุยโทรศัพท์กับผู้ปกครองของนักเรียน', prompt: 'calling a parent on the phone to discuss their child\'s progress', greeting: `Hello ${studentName}! This is Teacher Jane. Let's practice calling a parent to discuss their child's progress.` },
        { key: 'meeting', titleTh: 'ประชุมปรึกษาหารือครูร่วมวิชา', prompt: 'a school teacher meeting discussing lesson planning and syllabus design', greeting: `Hello ${studentName}! I am Teacher Jane. Let's practice conducting a teacher meeting for lesson planning.` }
      ];
      this.selectedTeachingTopic = topics[Math.floor(Math.random() * topics.length)];
    } else {
      this.selectedTeachingTopic = null;
    }

    const mode = this.pendingPracticeMode;
    if (mode === 'text-to-text') {
      this.textPracticeSubMode = 'chat';
      if (!this.currentChatTopic) {
        this.currentChatTopic = this.practiceChatTopics[Math.floor(Math.random() * this.practiceChatTopics.length)];
      }
      this.practiceMessages = [];
      const greeting = this.getCustomGreeting();
      this.practiceMessages.push({ sender: 'ai', text: greeting, time: new Date() });
    } else if (mode === 'speech-to-speech') {
      this.practiceMessages = [];
      const greeting = this.getCustomGreeting();
      this.practiceMessages.push({ sender: 'ai', text: greeting, time: new Date() });
      setTimeout(() => {
        this.practiceSpeakText(greeting);
      }, 500);
    }
  }

  startPresentationQa() {
    this.presentationPhase = 'qa';
    this.presentationQaCount = 1;
    this.practiceMessages = [];
    
    // Choose examiner questions based on presentation topic
    if (this.presentationTopic === 'games') {
      this.presentationQaQuestions = [
        "That was a very detailed presentation. How do you plan to handle students who get too competitive or noisy during these interactive classroom games?",
        "Interesting strategy. Also, how do you align these games with the formal English curriculum guidelines of the school?"
      ];
    } else if (this.presentationTopic === 'phonics') {
      this.presentationQaQuestions = [
        "Phonics instruction is vital. However, English spelling can be highly irregular. How do you teach irregular sight words in this curriculum?",
        "Thank you. How do you assess individual phonemic awareness progress in a large classroom of children?"
      ];
    } else {
      // classroom management
      this.presentationQaQuestions = [
        "A positive classroom management plan is key. How do you handle a student who repeatedly violates classroom rules despite positive reinforcement?",
        "Excellent response. How do you plan to train and share this discipline strategy with other teachers in the school?"
      ];
    }

    const examinerName = this.selectedAvatar === 'jane' ? 'Teacher Jane' : this.selectedAvatar === 'david' ? 'Mr. David' : this.selectedAvatar === 'alex' ? 'Alex' : 'Mama Maria';
    const initialQaGreeting = `Thank you for your presentation. I am ${examinerName}, and I will now ask you two follow-up questions. Here is my first question: ${this.presentationQaQuestions[0]}`;
    
    this.practiceMessages.push({ sender: 'ai', text: initialQaGreeting, time: new Date() });
    this.scrollChatToBottom();
    setTimeout(() => {
      this.practiceSpeakText(initialQaGreeting);
    }, 500);
  }

  private parseChatSummary(raw: string): {
    overall: string;
    scores?: { grammar: number; pronunciation: number; speed: number; total: number };
    corrections: { original: string; issue: string; suggestion: string }[];
    tips: string[];
  } {
    try {
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('no JSON found');
      const parsed = JSON.parse(raw.substring(start, end + 1));
      
      let scores = undefined;
      if (parsed.scores) {
        // 50-30-20 Weighted Score Calculation
        const g = Math.min(50, Math.max(0, Number(parsed.scores.grammar) || 40));
        const p = Math.min(30, Math.max(0, Number(parsed.scores.pronunciation) || 24));
        const s = Math.min(20, Math.max(0, Number(parsed.scores.speed) || 16));
        const total = Math.min(100, Math.max(0, Number(parsed.scores.total) || (g + p + s)));
        scores = { grammar: g, pronunciation: p, speed: s, total };
      } else {
        const correctionsCount = parsed.corrections?.length || 0;
        const g = Math.max(25, 50 - correctionsCount * 5);
        const p = 25;
        const s = 17;
        scores = { grammar: g, pronunciation: p, speed: s, total: g + p + s };
      }

      return {
        overall: parsed.overall || 'เยี่ยมมาก! คุณฝึกสนทนาจบแล้ว',
        scores,
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
        tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      };
    } catch {
      return this.buildFallbackChatSummary();
    }
  }

  // ถ้า AI สรุปไม่สำเร็จ ใช้คำแนะนำไวยากรณ์ที่เก็บสะสมไว้ระหว่างแชท (grammarSuggestion) แทน
  private buildFallbackChatSummary(): {
    overall: string;
    scores?: { grammar: number; pronunciation: number; speed: number; total: number };
    corrections: { original: string; issue: string; suggestion: string }[];
    tips: string[];
  } {
    const corrections = this.practiceMessages
      .filter((m) => m.sender === 'user' && m.grammarSuggestion)
      .map((m) => ({ original: m.text, issue: m.grammarSuggestion as string, suggestion: '' }));
    const g = Math.max(25, 50 - corrections.length * 5);
    const p = 25;
    const s = 17;
    return {
      overall:
        corrections.length > 0
          ? 'ระบบสรุปผลจาก AI ไม่สำเร็จ แต่นี่คือจุดที่ควรทบทวนจากบทสนทนาของคุณ'
          : 'เยี่ยมมาก! คุณฝึกสนทนาจบแล้วโดยไม่มีข้อผิดพลาดที่เก็บไว้ระหว่างทาง',
      scores: {
        grammar: g,
        pronunciation: p,
        speed: s,
        total: g + p + s
      },
      corrections,
      tips: [
        'ลองฝึกหัวข้อใหม่เพื่อฝึกคำศัพท์ที่หลากหลายขึ้น',
        'ทบทวนคำแนะนำไวยากรณ์ (ป้ายสีเหลือง) ที่เจอระหว่างแชทอีกครั้ง',
      ],
    };
  }

  // Cycle the fun status line under the loading spinner while the AI summary is generating
  private startChatSummaryLoadingTips(): void {
    this.chatSummaryLoadingTipIndex = 0;
    this.stopChatSummaryLoadingTips();
    this.chatSummaryLoadingInterval = setInterval(() => {
      this.chatSummaryLoadingTipIndex =
        (this.chatSummaryLoadingTipIndex + 1) % this.chatSummaryLoadingMessages.length;
    }, 1800);
  }

  private stopChatSummaryLoadingTips(): void {
    if (this.chatSummaryLoadingInterval) {
      clearInterval(this.chatSummaryLoadingInterval);
      this.chatSummaryLoadingInterval = null;
    }
  }

  closeChatSummary(startNewTopic: boolean): void {
    this.chatSummaryVisible = false;
    this.chatSummaryReport = null;
    this.stopChatSummaryLoadingTips();
    if (startNewTopic) {
      this.enterTextPracticeSubMode('chat');
    } else {
      this.textPracticeSubMode = 'menu';
      this.practiceMessages = [];
      this.currentChatTopic = null;
    }
  }

  practiceSpeakText(text: string, onEnd?: () => void) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      this.activeUtterance = utterance; // Keep reference to prevent GC
      utterance.lang = 'en-US';
      utterance.rate = this.sharedUi.ttsSpeed;

      const voices = window.speechSynthesis.getVoices();
      const isFemaleTutor = this.selectedAvatar === 'jane' || this.selectedAvatar === 'maria';
      const accent = this.sharedUi.ttsVoiceType === 'US' ? 'en-US' : 'en-GB';

      // Let's filter english voices first
      let englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en-'));

      // Filter by accent if possible
      let accentVoices = englishVoices.filter(v => v.lang.toLowerCase().includes(accent.toLowerCase()));
      if (accentVoices.length === 0) {
        accentVoices = englishVoices;
      }

      // Now filter/sort by gender and prioritize natural/online/google/neural voices
      let voice = null;
      const isNaturalVoice = (v: SpeechSynthesisVoice) => {
        const n = v.name.toLowerCase();
        return n.includes('natural') || n.includes('online') || n.includes('google') || n.includes('neural');
      };

      if (isFemaleTutor) {
        // Look for typical female names or indicators
        const femaleVoices = accentVoices.filter(v => {
          const name = v.name.toLowerCase();
          return name.includes('female') || name.includes('zira') || name.includes('susan') || name.includes('hazel') || name.includes('google us english') || name.includes('samantha') || name.includes('karen') || name.includes('moira') || name.includes('tessa') || name.includes('veena') || name.includes('aria') || name.includes('emma') || name.includes('natasha') || name.includes('sonia') || name.includes('lisa') || (name.includes('microsoft') && !name.includes('david') && !name.includes('george') && !name.includes('mark') && !name.includes('andrew') && !name.includes('brian') && !name.includes('guy') && !name.includes('ryan'));
        });
        
        femaleVoices.sort((a, b) => {
          const aNat = isNaturalVoice(a) ? 1 : 0;
          const bNat = isNaturalVoice(b) ? 1 : 0;
          return bNat - aNat;
        });
        
        if (femaleVoices.length > 0) {
          voice = femaleVoices[0];
        }
      } else {
        // Look for typical male names or indicators
        const maleVoices = accentVoices.filter(v => {
          const name = v.name.toLowerCase();
          return name.includes('male') || name.includes('david') || name.includes('george') || name.includes('mark') || name.includes('ravi') || name.includes('google uk english male') || name.includes('daniel') || name.includes('oliver') || name.includes('andrew') || name.includes('brian') || name.includes('guy') || name.includes('ryan') || name.includes('ian');
        });
        
        maleVoices.sort((a, b) => {
          const aNat = isNaturalVoice(a) ? 1 : 0;
          const bNat = isNaturalVoice(b) ? 1 : 0;
          return bNat - aNat;
        });
        
        if (maleVoices.length > 0) {
          voice = maleVoices[0];
        }
      }

      // Fallback if gender-specific voice not found
      if (!voice) {
        voice = accentVoices.find(v => v.lang.toLowerCase().includes(accent.toLowerCase()));
      }
      if (!voice) {
        voice = englishVoices[0];
      }

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.isPlayingTTS = true;
        this.cdr.detectChanges();
      };
      utterance.onend = () => {
        this.isPlayingTTS = false;
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        this.userTurnStartTime = Date.now();
        this.cdr.detectChanges();
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        this.isPlayingTTS = false;
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        this.cdr.detectChanges();
        if (onEnd) onEnd();
      };
      window.speechSynthesis.speak(utterance);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ไม่รองรับระบบเสียง',
        text: 'ขออภัย เบราว์เซอร์ของคุณไม่รองรับระบบสังเคราะห์เสียงอ่าน (Text-to-Speech)',
        confirmButtonColor: '#6B21A8'
      });
      if (onEnd) onEnd();
    }
  }

  // ====================================================
  // Text-to-Speech Mode: Listening Dictation Quiz
  // ====================================================

  startTtsDictationQuiz(): void {
    this.buildTtsDictationPools();

    const hasWords = this.ttsDictationWordPool.length > 0;
    const hasSentences = this.ttsDictationSentencePool.length > 0;
    const canStart =
      this.ttsDictationContentType === 'word' ? hasWords :
      this.ttsDictationContentType === 'sentence' ? hasSentences :
      hasWords || hasSentences;

    if (!canStart) {
      Swal.fire({
        icon: 'info',
        title: 'ไม่พบคำศัพท์/ประโยคในระดับนี้',
        text: 'ลองเลือกระดับความยากอื่น หรือเปลี่ยนประเภทเนื้อหาดูนะคะ',
        confirmButtonColor: '#6B21A8'
      });
      return;
    }

    this.ttsDictationResults = [];
    this.ttsDictationFeedback = null;
    this.ttsDictationWordQueue = [];
    this.ttsDictationSentenceQueue = [];
    this.ttsDictationNextIsWord = true;
    this.ttsDictationStep = 'question';
    this.gameFx.playSoundEffect('click');
    this.nextTtsDictationQuestion();
  }

  // Pulls vocabulary words + speaking-practice sentences from every unit,
  // then buckets each into beginner/intermediate/advanced by length -- there's
  // no difficulty tag on this content in the lesson data, so length is the
  // stand-in. Bucketed by RELATIVE tertile (shortest third / middle third /
  // longest third of THIS pool), not fixed cutoffs: this content is mostly
  // professional/teacher vocabulary, so fixed absolute thresholds (e.g. "<=5
  // characters = beginner") left "beginner" almost empty -- only 3 of 79
  // words and 1 of 30 sentences qualified. Relative tertiles always split
  // whatever content exists into 3 usably-sized groups.
  private buildTtsDictationPools(): void {
    const words: { text: string; type: 'word' }[] = [];
    const sentences: { text: string; type: 'sentence' }[] = [];
    const seen = new Set<string>();

    this.lessonsData.units.forEach((u: any) => {
      (u.vocabularies || []).forEach((v: any) => {
        const w = (v?.word || '').trim();
        if (w && !seen.has('w:' + w.toLowerCase())) {
          seen.add('w:' + w.toLowerCase());
          words.push({ text: w, type: 'word' });
        }
      });
      (u.speakingQuestions || []).forEach((s: string) => {
        const t = (s || '').trim();
        if (t && !seen.has('s:' + t.toLowerCase())) {
          seen.add('s:' + t.toLowerCase());
          sentences.push({ text: t, type: 'sentence' });
        }
      });
    });

    const wordBuckets = this.bucketByLengthTertile(words, w => w.text.replace(/\s+/g, '').length);
    const sentenceBuckets = this.bucketByLengthTertile(sentences, s => s.text.trim().split(/\s+/).filter(Boolean).length);

    this.ttsDictationWordPool = wordBuckets[this.ttsDictationLevel];
    this.ttsDictationSentencePool = sentenceBuckets[this.ttsDictationLevel];
  }

  // Sorts by length and splits into 3 roughly-equal groups (shortest third
  // = beginner, longest third = advanced) instead of a fixed length cutoff.
  private bucketByLengthTertile<T>(
    items: T[],
    getLength: (item: T) => number
  ): { beginner: T[]; intermediate: T[]; advanced: T[] } {
    const sorted = [...items].sort((a, b) => getLength(a) - getLength(b));
    const third = Math.ceil(sorted.length / 3);
    return {
      beginner: sorted.slice(0, third),
      intermediate: sorted.slice(third, third * 2),
      advanced: sorted.slice(third * 2)
    };
  }

  private shuffleCopy<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Draws the next item from a shuffled queue, reshuffling from the full
  // pool once the queue runs dry -- keeps the quiz going indefinitely
  // (session length is unbounded; the student ends it manually) without
  // repeating an item before the rest of the pool has been seen.
  private nextTtsWordItem(): { text: string; type: 'word' } | null {
    if (this.ttsDictationWordQueue.length === 0) {
      if (this.ttsDictationWordPool.length === 0) return null;
      this.ttsDictationWordQueue = this.shuffleCopy(this.ttsDictationWordPool);
    }
    return this.ttsDictationWordQueue.shift()!;
  }

  private nextTtsSentenceItem(): { text: string; type: 'sentence' } | null {
    if (this.ttsDictationSentenceQueue.length === 0) {
      if (this.ttsDictationSentencePool.length === 0) return null;
      this.ttsDictationSentenceQueue = this.shuffleCopy(this.ttsDictationSentencePool);
    }
    return this.ttsDictationSentenceQueue.shift()!;
  }

  nextTtsDictationQuestion(): void {
    let item: { text: string; type: 'word' | 'sentence' } | null = null;

    if (this.ttsDictationContentType === 'word') {
      item = this.nextTtsWordItem();
    } else if (this.ttsDictationContentType === 'sentence') {
      item = this.nextTtsSentenceItem();
    } else {
      // 'both' -> strictly alternate word/sentence each turn; if the
      // preferred type's pool is empty, fall back to the other one.
      item = this.ttsDictationNextIsWord ? this.nextTtsWordItem() : this.nextTtsSentenceItem();
      if (!item) {
        item = this.ttsDictationNextIsWord ? this.nextTtsSentenceItem() : this.nextTtsWordItem();
      }
      this.ttsDictationNextIsWord = !this.ttsDictationNextIsWord;
    }

    if (!item) {
      // Pool is entirely empty for this level/type combo -- nothing left to ask.
      this.finishTtsDictationSession();
      return;
    }

    this.ttsDictationCurrent = item;
    this.ttsDictationInput = '';
    this.ttsDictationQuestionStartTime = 0;
    this.cdr.detectChanges();

    // Auto-play the target audio twice, back to back. The response-time
    // clock only starts once both plays finish (see playTtsDictationAudio).
    this.playTtsDictationAudio(item.text, 2);
  }

  // Bumped every time playback is started/skipped/torn down -- lets a
  // stale timer or a late speechSynthesis callback recognize it no longer
  // applies (see playTtsDictationAudio/skipTtsDictationAudio).
  private ttsDictationPlaybackToken = 0;

  private playTtsDictationAudio(text: string, playsRemaining: number): void {
    if (playsRemaining <= 0) {
      this.ttsDictationIsPlaying = false;
      this.ttsDictationQuestionStartTime = Date.now();
      this.cdr.detectChanges();
      return;
    }

    const token = ++this.ttsDictationPlaybackToken;
    this.ttsDictationIsPlaying = true;
    this.cdr.detectChanges();

    let settled = false;
    const proceed = () => {
      // Ignore if a newer play/skip/next-question already superseded this one,
      // or if this already fired once (onend AND the safety timer both landing).
      if (settled || token !== this.ttsDictationPlaybackToken) return;
      settled = true;

      const nextRemaining = playsRemaining - 1;
      if (nextRemaining > 0) {
        // ~2s breathing gap between repeats -- back-to-back with zero pause
        // felt too rushed to make out the word/sentence the second time.
        setTimeout(() => {
          if (token !== this.ttsDictationPlaybackToken) return;
          this.playTtsDictationAudio(text, nextRemaining);
        }, 2000);
      } else {
        this.playTtsDictationAudio(text, nextRemaining);
      }
    };

    // Safety net: SpeechSynthesisUtterance occasionally never fires onend/
    // onerror in some browsers (e.g. after the tab loses focus) -- without
    // this, ttsDictationIsPlaying would stay stuck `true` forever and the
    // answer box would stay permanently disabled/un-typeable. Cap the wait
    // at a generous, text-length-based estimate.
    const estimatedMs = Math.max(2500, text.length * 90) / (this.sharedUi.ttsSpeed || 1);
    const safetyTimer = setTimeout(proceed, estimatedMs + 4000);

    this.practiceSpeakText(text, () => {
      clearTimeout(safetyTimer);
      proceed();
    });
  }

  // Manual escape hatch shown next to the audio icon while it's playing --
  // in case playback gets stuck for any reason, the student isn't stuck
  // waiting on it and can jump straight to typing the answer.
  skipTtsDictationAudio(): void {
    if (!this.ttsDictationIsPlaying) return;
    this.ttsDictationPlaybackToken++; // invalidate any pending timer/callback for this play
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.ttsDictationIsPlaying = false;
    this.ttsDictationQuestionStartTime = Date.now();
    this.cdr.detectChanges();
  }

  // Word-overlap accuracy (0-100): same technique as calculatePronunciationScore,
  // kept separate so it doesn't touch that function's pronunciationScore/
  // matchedWords state (those belong to the unrelated Speech-to-Text mode).
  private calculateDictationAccuracyScore(target: string, actual: string): number {
    const cleanStr = (s: string) =>
      s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '').trim();
    const targetWords = cleanStr(target).split(/\s+/).filter(Boolean);
    const actualWords = cleanStr(actual).split(/\s+/).filter(Boolean);
    if (targetWords.length === 0) return 0;
    const matchedCount = targetWords.filter(tw => actualWords.some(aw => aw === tw)).length;
    return Math.round((matchedCount / targetWords.length) * 100);
  }

  // Speed score (0-100): full marks inside a per-item time budget (a flat
  // base allowance + a per-word allowance), decaying to 0 by double that
  // budget. Simple and explainable rather than scientifically tuned. Shared
  // by both the Text-to-Speech dictation quiz (typing what was heard) and
  // Speech-to-Text (reading a sentence aloud) -- each just passes its own
  // per-word pace, since speaking a visible sentence is naturally faster
  // than typing out an unknown one heard only twice.
  private calculateSpeedScore(wordCount: number, elapsedSeconds: number, baseSeconds: number, perWordSeconds: number): number {
    const expectedSeconds = baseSeconds + wordCount * perWordSeconds;
    if (elapsedSeconds <= expectedSeconds) return 100;
    const over = elapsedSeconds - expectedSeconds;
    return Math.max(0, Math.round(100 - (over / expectedSeconds) * 100));
  }

  private calculateDictationSpeedScore(target: string, elapsedSeconds: number): number {
    const wordCount = target.trim().split(/\s+/).filter(Boolean).length;
    return this.calculateSpeedScore(wordCount, elapsedSeconds, 3, 2.5);
  }

  private calculateSttSpeedScore(target: string, elapsedSeconds: number): number {
    const wordCount = target.trim().split(/\s+/).filter(Boolean).length;
    return this.calculateSpeedScore(wordCount, elapsedSeconds, 3, 1.5);
  }

  submitTtsDictationAnswer(): void {
    if (!this.ttsDictationCurrent) return;
    const answer = this.ttsDictationInput.trim();
    if (!answer || this.ttsDictationIsPlaying) return;

    const elapsedSeconds = this.ttsDictationQuestionStartTime > 0
      ? (Date.now() - this.ttsDictationQuestionStartTime) / 1000
      : 0;

    const target = this.ttsDictationCurrent.text;
    const accuracyScore = this.calculateDictationAccuracyScore(target, answer);
    const speedScore = this.calculateDictationSpeedScore(target, elapsedSeconds);
    // ตอบไว (speed) 60% + ไวยากรณ์/คำถูก (accuracy) 40%
    const finalScore = Math.round(speedScore * 0.6 + accuracyScore * 0.4);

    this.ttsDictationResults.push({
      text: target,
      type: this.ttsDictationCurrent.type,
      userAnswer: answer,
      accuracyScore,
      speedScore,
      finalScore,
      elapsedSeconds: Math.round(elapsedSeconds * 10) / 10
    });

    if (finalScore < 80) {
      this.mistakes.trackWrongItem(
        this.ttsDictationCurrent.type,
        target,
        target,
        'Text-to-Speech Dictation'
      );
    }

    this.gameFx.playSoundEffect(finalScore >= 80 ? 'success' : 'click');
    this.nextTtsDictationQuestion();
  }

  finishTtsDictationSession(): void {
    this.ttsDictationPlaybackToken++; // invalidate any pending timer/callback
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.ttsDictationIsPlaying = false;
    this.ttsDictationCurrent = null;
    this.ttsDictationStep = 'summary';

    if (this.ttsDictationResults.length > 0) {
      const avgScore = Math.round(
        this.ttsDictationResults.reduce((sum, r) => sum + r.finalScore, 0) / this.ttsDictationResults.length
      );
      this.learningLog.learningLogs.unshift({
        date: new Date(),
        type: 'Speaking',
        title: `Text-to-Speech Dictation (${this.ttsDictationResults.length} ข้อ)`,
        score: avgScore,
        xp: Math.min(30, this.ttsDictationResults.length * 3),
        // เดิมยัดผล "target -> answer (score%)" ลงในช่อง transcript แล้วโชว์เป็นบับเบิล
        // แชท ทั้งที่แบบฝึกหัดนี้ไม่มีบทสนทนาจริง (แค่ฟัง-พิมพ์ทีละคำ) ทำให้ดูแปลกเพราะ
        // ทุกบับเบิลถูก label เป็น "คุณ" หมด — เก็บเป็น report (shape เดียวกับ
        // chatSummaryReport ที่ modal "ผลสรุปการฝึกพูด" ใช้) ให้หน้าประวัติแสดงผลด้วย
        // การ์ดสรุปแบบเดียวกัน + wordResults (รายการคำดิบ) แทนบทสนทนาปลอม
        wordResults: this.ttsDictationResults.map(r => ({
          text: r.text,
          userAnswer: r.userAnswer,
          score: r.finalScore
        })),
        report: this.buildTtsDictationReport(this.ttsDictationResults, avgScore)
      });
      this.learningLog.saveLearningLogs();
      this.evaluateTtsDictationSession();
    }

    this.gameFx.playSoundEffect('success');
    this.cdr.detectChanges();
  }

  // Same "evaluate the whole round once, via the shared AI evaluator" pattern
  // as evaluateSttSession() -- local accuracy/speed scoring above already
  // gives instant per-item feedback, this adds an AI-judged pronunciation/
  // grammar pass on top so the round shows up properly for teachers too
  // (see get_teacher_student_activity() parsing get_teacher_student_activity's
  // ai_feedback prefix, backend db/teacher.py).
  private evaluateTtsDictationSession(): void {
    const userId = this.session.currentUser?.id;
    if (!userId || this.ttsDictationResults.length === 0) return;

    const messages: { sender: 'ai' | 'user'; text: string }[] = [];
    const responseTimes: number[] = [];
    this.ttsDictationResults.forEach((r) => {
      messages.push({ sender: 'ai', text: `Listen and type what you hear: "${r.text}"` });
      messages.push({ sender: 'user', text: r.userAnswer || '(no answer typed)' });
      responseTimes.push(r.elapsedSeconds);
    });

    this.isEvaluatingTtsDictation = true;
    this.apiService
      .postSpeakingEvaluation({
        user_id: userId,
        mode: 'text_to_speech',
        category: 'listening_dictation',
        messages,
        response_times: responseTimes,
      })
      .subscribe({
        next: (res: any) => {
          this.isEvaluatingTtsDictation = false;
          this.ttsDictationFeedback = res?.feedback || null;
        },
        error: () => {
          this.isEvaluatingTtsDictation = false;
        },
      });
  }

  /** สรุปผลรอบ Text-to-Speech Dictation หนึ่งรอบ ด้วย shape เดียวกับ chatSummaryReport
   *  (ดูที่มาที่ finishTtsDictationSession) เพื่อให้หน้าประวัติใช้การ์ดสรุปแบบเดียวกันได้ */
  private buildTtsDictationReport(
    results: { text: string; userAnswer: string; finalScore: number; accuracyScore: number; speedScore: number }[],
    avgScore: number
  ): NonNullable<LearningLogEntry['report']> {
    const avgSpeed = Math.round(results.reduce((sum, r) => sum + r.speedScore, 0) / results.length);
    const avgAccuracy = Math.round(results.reduce((sum, r) => sum + r.accuracyScore, 0) / results.length);
    const missed = results.filter(r => r.finalScore < 80);

    let tip: string;
    if (avgScore >= 80) {
      tip = 'ทำได้ดีมากค่ะ ฟังและพิมพ์ตามได้แม่นยำ ลองเพิ่มความเร็วในการพิมพ์ในรอบถัดไปได้เลย';
    } else if (avgScore >= 50) {
      tip = 'ทำได้ปานกลางค่ะ ลองฟังซ้ำให้ชัดก่อนพิมพ์ และเช็คตัวสะกดให้ตรงกับที่ได้ยิน';
    } else {
      tip = 'ควรฝึกฟังคำศัพท์พื้นฐานเพิ่มเติม ลองเปิดความเร็วเสียงให้ช้าลงและฟังทีละคำก่อนพิมพ์';
    }

    return {
      overall: `ทำแบบฝึกหัด Text-to-Speech Dictation ทั้งหมด ${results.length} ข้อ คะแนนเฉลี่ย ${avgScore}%`,
      scoreItems: [
        { icon: '⚡', label: 'ความไวในการตอบ', value: avgSpeed, max: 100 },
        { icon: '✅', label: 'ความถูกต้อง', value: avgAccuracy, max: 100 },
      ],
      total: { value: avgScore, max: 100 },
      corrections: missed.map(r => ({
        original: `พิมพ์ว่า "${r.userAnswer}"`,
        suggestion: `คำที่ถูกต้อง: "${r.text}"`,
        issue: `ได้คะแนนความแม่นยำ ${r.finalScore}%`,
      })),
      tips: [
        tip,
        'ลองฝึกคำที่พลาดซ้ำได้ในแท็บ "ฝึกฝน ▸ คำผิดประจำ" เพื่อจำได้แม่นขึ้น',
      ],
    };
  }

  restartTtsDictationQuiz(): void {
    this.ttsDictationStep = 'setup';
    this.ttsDictationResults = [];
    this.ttsDictationFeedback = null;
    this.ttsDictationCurrent = null;
    this.ttsDictationInput = '';
  }

  getTtsDictationAverageScore(): number {
    if (this.ttsDictationResults.length === 0) return 0;
    return Math.round(
      this.ttsDictationResults.reduce((sum, r) => sum + r.finalScore, 0) / this.ttsDictationResults.length
    );
  }

  getTtsDictationAverageSpeed(): number {
    if (this.ttsDictationResults.length === 0) return 0;
    return Math.round(
      this.ttsDictationResults.reduce((sum, r) => sum + r.speedScore, 0) / this.ttsDictationResults.length
    );
  }

  getTtsDictationAverageAccuracy(): number {
    if (this.ttsDictationResults.length === 0) return 0;
    return Math.round(
      this.ttsDictationResults.reduce((sum, r) => sum + r.accuracyScore, 0) / this.ttsDictationResults.length
    );
  }

  getTtsDictationPerfectCount(): number {
    return this.ttsDictationResults.filter(r => r.finalScore >= 80).length;
  }

  getCustomGreeting(): string {
    const avatar = this.selectedAvatar;
    const cat = this.selectedCategory;
    const studentName = this.session.currentUser?.firstName || 'there';

    // If it's structured job interview, initialize and return first question directly
    if (cat === 'interview') {
      if (this.interviewQuestions.length === 0) {
        this.initInterviewQuestions();
      }
      return this.interviewQuestions[0];
    }

    if (cat === 'presentation') {
      let examiner = 'Teacher Jane';
      if (avatar === 'david') examiner = 'Mr. David';
      else if (avatar === 'alex') examiner = 'Alex';
      else if (avatar === 'maria') examiner = 'Mama Maria';

      return `Hello ${studentName}! I am ${examiner}, your presentation evaluator today. Please select a presentation topic and click "Start Presentation" when you are ready to begin!`;
    }

    if (avatar === 'jane') {
      if (cat === 'teaching') {
        if (this.selectedTeachingTopic) {
          return this.selectedTeachingTopic.greeting;
        }
        return `Hello ${studentName}! I am Teacher Jane, your senior mentor. Let's practice English for classroom teaching. Are you ready?`;
      }
      return `Hello ${studentName}! I am Teacher Jane. Let's chat in English! How are you doing today?`;
    }
    
    if (avatar === 'david') {
      return `Good day, ${studentName}. I am Mr. David. Welcome to our academic English practice. What would you like to discuss today?`;
    }

    if (avatar === 'alex') {
      if (cat === 'daily') {
        return `Hey ${studentName}! I'm Alex. Great to connect with you today! How has your day been?`;
      }
      return `Hey ${studentName}! I'm Alex. Glad to practice English with you today! What's on your mind?`;
    }

    if (avatar === 'maria') {
      if (cat === 'teaching') {
        return `Hello, Teacher ${studentName}! This is Mama Maria, Sarah's mother. Thank you for speaking with me today about Sarah's progress.`;
      }
      return `Hello ${studentName}! I am Maria, your neighbor. Nice to meet you. How are you today?`;
    }

    return `Hello ${studentName}! I am your AI partner. Let's start practicing!`;
  }

  closePracticeChat(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlayingTTS = false;
    this.aiWriting = false;

    this.textPracticeSubMode = 'menu';
    this.practiceMode = 'menu';
    this.currentChatTopic = null;
    this.chatSummaryVisible = false;
  }

  enterTextPracticeSubMode(subMode: 'chat' | 'qa') {
    this.textPracticeSubMode = subMode;
    this.practiceMessages = [];
    this.chatSummaryVisible = false;
    this.chatSummaryReport = null;

    if (subMode === 'chat') {
      // สุ่มหัวข้อสนทนาใหม่ทุกครั้งที่เข้าโหมดนี้ (สไตล์ Duolingo)
      this.currentChatTopic =
        this.practiceChatTopics[Math.floor(Math.random() * this.practiceChatTopics.length)];
      this.startChatOpener();
    } else if (subMode === 'qa') {
      this.currentChatTopic = null;
      const greeting = "สวัสดีครับ! ผมเป็นติวเตอร์วิชาภาษาอังกฤษประจำชั้นเรียนของคุณ (Q&A English Tutor) สงสัยศัพท์ ไวยากรณ์ แกรมม่าตรงไหน สอบถามผมได้ทันทีเลยนะครับ!";
      this.practiceMessages.push({ sender: 'ai', text: greeting, time: new Date() });
    }
  }

  toggleHistoryPanel() {
    this.showHistoryPanel = !this.showHistoryPanel;
    this.gameFx.playSoundEffect('click');
    if (this.showHistoryPanel) {
      this.learningLog.loadLearningLogs();
    }
  }

  // ให้ AI เป็นคนเปิดบทสนทนาตามหัวข้อที่สุ่มได้ (เรียก backend จริง ไม่ใช้ข้อความตายตัว)
  private startChatOpener(): void {
    if (!this.currentChatTopic) return;
    this.aiWriting = true;

    const systemPrompt = `You are roleplaying as a character in an English conversation practice session for a university student.
Scenario: ${this.currentChatTopic.scenario}
Start the conversation naturally and in character with a short opening line (1-2 sentences) to begin this scenario. Do not explain the scenario or break character. Do not greet with "Hello, how can I help with your English" - stay fully in the roleplay role.`;

    this.apiService
      .postAiSpeaking('text-to-text', {
        message: 'Please start the roleplay scenario now.',
        context: systemPrompt,
        user_id: this.session.currentUser?.id,
      })
      .subscribe({
        next: (res: any) => {
          this.aiWriting = false;
          const opener = res.reply || `Hi! Let's practice: ${this.currentChatTopic?.titleEn}. Go ahead!`;
          this.practiceMessages.push({ sender: 'ai', text: opener, time: new Date() });
          this.scrollChatToBottom();
        },
        error: () => {
          this.aiWriting = false;
          const opener = `Hi! Let's practice this scenario: ${this.currentChatTopic?.titleEn}. Go ahead and start!`;
          this.practiceMessages.push({ sender: 'ai', text: opener, time: new Date() });
          this.scrollChatToBottom();
        },
      });
  }

  // ปุ่ม "จบการสนทนา" — ให้ AI สรุปบทสนทนาทั้งหมดและชี้จุดที่ต้องแก้ไข
  finishTextChat(): void {
    const hasUserTurn = this.practiceMessages.some((m) => m.sender === 'user');
    if (!hasUserTurn) {
      Swal.fire({
        icon: 'info',
        title: 'ยังไม่ได้เริ่มสนทนา',
        text: 'พิมพ์โต้ตอบอย่างน้อย 1 ข้อความก่อนจบการสนทนานะคะ',
        confirmButtonColor: '#6B21A8',
      });
      return;
    }

    this.chatSummaryVisible = true;
    this.chatSummaryLoading = true;
    this.chatSummaryReport = null;
    this.showSummaryTranscript = false;
    this.startChatSummaryLoadingTips();

    const transcript = this.practiceMessages
      .map((m) => `${m.sender === 'user' ? 'Student' : 'AI'}: ${m.text}`)
      .join('\n');

    const summaryPrompt = `You just finished a roleplay English conversation practice with a student${this.currentChatTopic ? ` about "${this.currentChatTopic.titleEn}"` : ''}.
            Here is the full transcript:
            ${transcript}

            Review ONLY the student's messages and evaluate their English skills out of 100 TOTAL POINTS using EXACTLY THIS WEIGHTED RUBRIC:
            1. "grammar": Grammar & Vocabulary Accuracy (Max score 50 points). Deduct points for grammatical errors or awkward wording.
            2. "pronunciation": Pronunciation & Word Transcription Accuracy (Max score 30 points). Evaluate based on phonetic clarity and phrasing.
            3. "speed": Response Speed & Conversational Fluency (Max score 20 points). Evaluate how smoothly and quickly they replied.
            The total score is the sum of these 3 scores: "total" = grammar + pronunciation + speed (Max 100 points).

            Respond with ONLY valid JSON in this exact shape and nothing else:
            {"overall": "1-2 sentence overall feedback in Thai, encouraging tone", "scores": {"grammar": 42, "pronunciation": 26, "speed": 17, "total": 85}, 
            "corrections": [{"original": "the student's original sentence", "issue": "what was wrong, explained in Thai", "suggestion": "the corrected sentence in English"}], 
            "tips": ["short actionable tip in Thai", "another tip in Thai"]}
            If the student made no mistakes, return max scores (grammar: 50, pronunciation: 30, speed: 20, total: 100) and praise them in "overall".`;

    this.apiService
      .postAiSpeaking('text-to-text', {
        message: 'Please summarize the conversation now.',
        context: summaryPrompt,
        user_id: this.session.currentUser?.id,
      })
      .subscribe({
        next: (res: any) => {
          this.chatSummaryLoading = false;
          this.stopChatSummaryLoadingTips();
          this.chatSummaryReport = this.parseChatSummary(res.reply || '');
          if (this.chatSummaryReport && Array.isArray(this.chatSummaryReport.corrections)) {
            this.chatSummaryReport.corrections.forEach(c => {
              this.mistakes.trackWrongItem('grammar', c.original, c.suggestion, c.issue);
            });
          }
          this.gameFx.awardGameXp(20);
          this.logChatSession();
          // ส่งคะแนนที่ AI เพิ่งให้ (grammar/pronunciation/speed ตามรูบริกเดียวกับ
          // evaluate-session -- ดูคอมเมนต์ที่ persistTextToTextEvaluation()) ไปบันทึกลง
          // practice_sessions ด้วย เพื่อให้อาจารย์เห็นในหน้า "ประวัติการทำ" ได้ (เดิมมีแต่
          // logChatSession() ซึ่งเก็บแค่ฝั่ง localStorage ของนักศึกษาเองเท่านั้น). เฉพาะ
          // เคสสำเร็จจริง -- ไม่ส่งคะแนน fallback/heuristic ของ buildFallbackChatSummary()
          // (error branch ด้านล่าง) เพราะไม่ใช่ผลประเมินจริงจาก AI
          if (this.chatSummaryReport?.scores) {
            this.persistTextToTextEvaluation(this.chatSummaryReport.scores, this.chatSummaryReport.overall);
          }
        },
        error: () => {
          this.chatSummaryLoading = false;
          this.stopChatSummaryLoadingTips();
          this.chatSummaryReport = this.buildFallbackChatSummary();
          this.gameFx.awardGameXp(20);
          this.logChatSession();
        },
      });
  }

  // บันทึกบทสนทนาที่จบแล้วลงประวัติการเรียนรู้ พร้อมแนบบทสนทนาทั้งหมด เพื่อย้อนดูภายหลังได้
  // เดิมทิ้ง chatSummaryReport ที่ AI เพิ่งสรุปให้ (คะแนนแยกองค์ประกอบ/จุดที่ควรแก้/คำแนะนำ
  // — โชว์ใน modal "ผลสรุปการฝึกพูด" ตอนจบสดๆ) ไปเฉยๆ ไม่เคยบันทึกลงประวัติเลย มีแต่
  // transcript เปล่าๆ ทำให้เข้าประวัติย้อนหลังแล้วไม่เห็นการ์ดสรุปแบบเดียวกับตอนจบสด — ตอนนี้
  // แปลง scores {grammar,pronunciation,speed,total} เป็น report.scoreItems/.total (shape
  // เดียวกับที่ buildTtsDictationReport ใช้) แล้วบันทึกไปด้วย
  private logChatSession(): void {
    const report: LearningLogEntry['report'] = this.chatSummaryReport ? {
      overall: this.chatSummaryReport.overall,
      scoreItems: this.chatSummaryReport.scores ? [
        { icon: '📝', label: 'ไวยากรณ์', value: this.chatSummaryReport.scores.grammar, max: 50 },
        { icon: '🗣️', label: 'ออกเสียง/ถอดคำ', value: this.chatSummaryReport.scores.pronunciation, max: 30 },
        { icon: '⏱️', label: 'ความเร็วโต้ตอบ', value: this.chatSummaryReport.scores.speed, max: 20 },
      ] : undefined,
      total: this.chatSummaryReport.scores ? { value: this.chatSummaryReport.scores.total, max: 100 } : undefined,
      corrections: this.chatSummaryReport.corrections || [],
      tips: this.chatSummaryReport.tips || [],
    } : undefined;

    this.learningLog.learningLogs.unshift({
      date: new Date(),
      type: 'Practice',
      title: `Text-to-Text Chat${this.currentChatTopic ? ': ' + this.currentChatTopic.titleTh : ''}`,
      score: this.chatSummaryReport?.scores?.total,
      xp: 20,
      transcript: this.practiceMessages.map((m) => ({
        sender: m.sender,
        text: m.text,
        grammarSuggestion: m.grammarSuggestion || null
      })),
      report,
    });
    this.learningLog.saveLearningLogs();
  }

  // Text-to-Text's end-of-chat summary (above) already asks the AI to grade the
  // student on the exact same rubric evaluate-session uses server-side for
  // speech-to-speech (grammar /50, pronunciation /30, speed /20 -- see
  // SPEAKING_EVALUATION_PROMPT in backend/ai/core.py, which explicitly handles
  // mode: 'text_to_text' too) -- just via its own richer prompt (also returns
  // corrections/tips for the on-screen summary card, which evaluate-session's
  // response doesn't). Re-running evaluate-session here would mean a second AI
  // call per chat *and* risk it scoring differently from what the student just
  // saw on screen, so instead this posts the scores already in hand to a small
  // save-only endpoint that stores them in the identical format
  // get_teacher_student_activity() (db/teacher.py) already knows how to parse
  // back out for the teacher's Activity History / skills-average card.
  private persistTextToTextEvaluation(
    scores: { grammar: number; pronunciation: number; speed: number },
    feedbackTh: string
  ): void {
    const userId = this.session.currentUser?.id;
    if (!userId) return;
    this.apiService
      .saveSpeakingSessionScores({
        user_id: userId,
        mode: 'text_to_text',
        pronunciation_score: scores.pronunciation,
        speed_score: scores.speed,
        grammar_score: scores.grammar,
        feedback_th: feedbackTh,
        messages: this.practiceMessages.map((m) => ({ sender: m.sender, text: m.text })),
      })
      .subscribe({ error: () => {} }); // best-effort -- student's own summary already shown either way
  }

  toggleLogTranscript(index: number): void {
    this.expandedLogIndex = this.expandedLogIndex === index ? null : index;
  }



  // --- Turn control: starts/stops both the live transcript and the audio
  // recording together (mic button click, and auto-resume between turns) ---
  practiceToggleRecording() {
    if (this.practiceIsRecording) {
      // Manual STOP
      this.stopPracticeRecordingFlow();
    } else {
      // START recording
      this.recognizedText = '';
      this.practiceIsRecording = true;
      this.isMicInitializing = true; // Mic is initializing
      this.gameFx.playSoundEffect('click');

      // Start Web Speech API for real-time transcription display
      this.startLiveTranscriptionOnly();

      // Start MediaRecorder to capture audio for Whisper uploader
      this.startAudioRecordingOnly();

      // May be triggered from a native speechSynthesis callback (outside
      // Angular's zone) when auto-resuming after the AI finishes talking.
      this.cdr.detectChanges();
    }
  }

  // Shared stop logic so both the manual click and the auto-stop
  // (triggered when the browser detects the user finished speaking)
  // go through the same path without double-firing.
  private stopPracticeRecordingFlow() {
    if (!this.practiceIsRecording) return;
    this.practiceIsRecording = false;
    this.isMicInitializing = false;
    this.stopLiveTranscriptionOnly();
    this.stopAudioRecordingOnly();
    this.gameFx.playSoundEffect('click');
    this.cdr.detectChanges();
  }

  resetPracticeSession(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlayingTTS = false;
    
    if (this.practiceIsRecording) {
      this.stopPracticeRecordingFlow();
    }
    
    this.practiceMessages = [];
    this.recognizedText = '';

    const greeting = this.getCustomGreeting();
    this.practiceMessages.push({ sender: 'ai', text: greeting, time: new Date() });
    
    this.gameFx.playSoundEffect('click');
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.practiceSpeakText(greeting);
    }, 400);
  }

  cancelCurrentRecording(): void {
    if (!this.practiceIsRecording) return;
    this.isRecordingCancelled = true;
    this.stopPracticeRecordingFlow();
    this.recognizedText = '';
    this.gameFx.playSoundEffect('click');
    this.cdr.detectChanges();
  }

  exitPracticeMode(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlayingTTS = false;
    this.aiWriting = false;

    if (this.practiceIsRecording) {
      this.stopPracticeRecordingFlow();
    }

    this.practiceMessages = [];
    this.recognizedText = '';
    this.practiceMode = 'menu';
    this.ttsDictationStep = 'setup';
    this.ttsDictationPlaybackToken++; // invalidate any pending timer/callback
    this.ttsDictationIsPlaying = false;
    this.ttsDictationCurrent = null;
    this.ttsDictationInput = '';
    this.ttsDictationResults = [];

    this.gameFx.playSoundEffect('click');
    this.cdr.detectChanges();
  }

  evaluateCurrentSession(): void {
    if (this.practiceMessages.length <= 1) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่มีบทสนทนาที่เพียงพอ',
        text: 'กรุณาพูดคุยกับ AI อย่างน้อย 1 รอบตอบรับก่อน เพื่อรับคะแนนวิเคราะห์ผลลัพธ์ค่ะ',
        confirmButtonColor: '#6B21A8'
      });
      return;
    }

    if (this.practiceIsRecording) {
      this.stopPracticeRecordingFlow();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlayingTTS = false;
    this.aiWriting = false;

    const messagesToEvaluate = this.practiceMessages.map(m => ({
      sender: m.sender,
      text: m.text
    }));

    this.isEvaluating = true;
    this.cdr.detectChanges();

    this.apiService.postSpeakingEvaluation({
      user_id: this.session.currentUser?.id,
      mode: this.practiceMode,
      category: this.selectedCategory,
      messages: messagesToEvaluate,
      response_times: this.responseTimes
    }).subscribe({
      next: (res: any) => {
        this.isEvaluating = false;
        this.speakingEvaluationResult = res;

        // Push the newly completed session log into history list — same report
        // shape as buildTtsDictationReport()/logChatSession() so history shows
        // the same score-breakdown card for every speaking activity type
        this.learningLog.learningLogs.unshift({
          date: new Date(),
          type: 'Speaking',
          title: `Speaking Practice (${this.practiceMode === 'speech-to-speech' ? 'Speech-to-Speech' : 'Video Call'})`,
          score: res.total_score,
          xp: 30,
          transcript: this.practiceMessages.map((m: any) => ({ sender: m.sender, text: m.text })),
          report: {
            overall: res.feedback || 'ประเมินผลการฝึกพูดของคุณเรียบร้อยแล้ว',
            scoreItems: [
              { icon: '📝', label: 'ไวยากรณ์', value: res.grammar_score ?? 0, max: 50 },
              { icon: '🗣️', label: 'ออกเสียง/ถอดคำ', value: res.pronunciation_score ?? 0, max: 30 },
              { icon: '⏱️', label: 'ความเร็วโต้ตอบ', value: res.speed_score ?? 0, max: 20 },
            ],
            total: { value: res.total_score ?? 0, max: 100 },
            corrections: [],
            tips: [],
          },
        });
        this.learningLog.saveLearningLogs();

        this.showSpeakingReportModal = true;
        this.gameFx.playSoundEffect('success');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isEvaluating = false;
        console.warn("Evaluation failed:", err);
        Swal.fire({
          icon: 'error',
          title: 'ประเมินผลล้มเหลว',
          text: 'ไม่สามารถประเมินผลได้ในขณะนี้ กรุณาลองใหม่อีกครั้งค่ะ',
          confirmButtonColor: '#6B21A8'
        });
        this.cdr.detectChanges();
      }
    });
  }

  closeSpeakingReportModal(): void {
    this.showSpeakingReportModal = false;
    this.speakingEvaluationResult = null;
    this.practiceMessages = [];
    this.responseTimes = [];
    this.recognizedText = '';
    this.practiceMode = 'menu';
    this.cdr.detectChanges();
  }

  getLastUserMessage(): string {
    const userMsgs = this.practiceMessages.filter(m => m.sender === 'user');
    return userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].text : '';
  }

  getLastAiMessage(): string {
    const aiMsgs = this.practiceMessages.filter(m => m.sender === 'ai');
    return aiMsgs.length > 0 ? aiMsgs[aiMsgs.length - 1].text : '';
  }

  // ปุ่ม "แปล" — กดซ้ำอีกครั้งบนข้อความเดิมเพื่อซ่อน (toggle), กดตอนมีข้อความ AI ใหม่
  // จะเรียก AI แปลใหม่เสมอเพราะ translatedForText ไม่ตรงกับข้อความล่าสุดแล้ว
  translateLastAiMessage(): void {
    const text = this.getLastAiMessage();
    if (!text || this.translatingLastAi) return;
    if (this.translatedForText === text) {
      this.translatedForText = null;
      this.lastAiTranslation = null;
      return;
    }
    this.translatingLastAi = true;
    this.apiService.translateToThai(text).subscribe({
      next: (res: any) => {
        this.translatingLastAi = false;
        this.translatedForText = text;
        this.lastAiTranslation = res?.translation || 'แปลไม่สำเร็จ ลองใหม่อีกครั้งค่ะ';
      },
      error: () => {
        this.translatingLastAi = false;
        this.translatedForText = text;
        this.lastAiTranslation = 'แปลไม่สำเร็จ ลองใหม่อีกครั้งค่ะ';
      },
    });
  }

  // ปุ่ม "ตัวอย่างคำตอบ" — เดิมเรียก AI (apiService.suggestReplies) ทุกครั้งที่กด
  // ทำให้ต้องรอ round-trip ไป Gemini 2-5 วิ ต่างจากปุ่ม "แปล" ที่ต้องแปลข้อความ
  // เฉพาะเจาะจงของ AI จึงพึ่ง AI จริงไม่ได้, "ตัวอย่างคำตอบ" เป็นแค่ประโยคตั้งต้น
  // ทั่วไปให้นักศึกษาไม่รู้จะตอบอะไรได้ดูเป็นไอเดีย จึงฟิกเป็น bank คงที่ในเครื่อง
  // (suggestedReplyBank ด้านบน) แสดงผลทันทีไม่มีดีเลย์ — toggle ปิดได้ถ้ากดซ้ำข้อความเดิม
  getSuggestedReplies(): void {
    const text = this.getLastAiMessage();
    if (!text) return;
    if (this.suggestionsForText === text && this.suggestedReplies.length > 0) {
      this.suggestionsForText = null;
      this.suggestedReplies = [];
      return;
    }
    // สุ่มหยิบ 3 ประโยคแบบไม่ซ้ำกันจาก bank ให้ดูมีความหลากหลายทุกครั้งที่กด
    const pool = [...this.suggestedReplyBank];
    const picks: string[] = [];
    while (picks.length < 3 && pool.length > 0) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    this.suggestionsForText = text;
    this.suggestedReplies = picks;
  }

  // --- Live transcript (Web Speech API): shows text on screen as the
  // student talks. Runs in parallel with startAudioRecordingOnly, which
  // captures the actual audio sent to Whisper — this one is display-only
  // (its 'onresult'/'onend' guard against a stale prior instance below,
  // since stop() fires 'onend' async and a new turn may already be live) ---
  startLiveTranscriptionOnly() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    // Tear down any still-running session from a previous turn first.
    this.stopLiveTranscriptionOnly();

    const rec = new SpeechRec();
    rec.lang = this.sharedUi.ttsVoiceType === 'UK' ? 'en-GB' : 'en-US';
    // Continuous: the browser's own non-continuous cutoff fires on ANY brief
    // pause (mid-sentence pauses while a learner thinks, breathing, etc.),
    // closing the mic before the student is actually done. The student now
    // decides when they're done by clicking stop themselves (no auto-cutoff).
    rec.continuous = true;
    rec.interimResults = true;

    let finalTranscript = '';

    rec.onresult = (event: any) => {
      if (this.recognition !== rec) return;
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += piece + ' ';
        } else {
          interimTranscript += piece;
        }
      }
      this.recognizedText = (finalTranscript + interimTranscript).trim();
      // Web Speech API callbacks run outside Angular's zone, so the view
      // won't refresh on its own — force it to show the live transcript.
      this.cdr.detectChanges();
    };

    rec.onend = () => {
      if (this.recognition !== rec) return;
      this.recognition = null;
      // Do not automatically stop recording when the browser's live transcription session ends.
      // The user will manually stop the recording by clicking the button.
    };


    rec.onerror = (err: any) => {
      if (this.recognition !== rec) return;
      console.warn('Live SpeechRecognition error:', err?.error);
    };

    this.recognition = rec;
    rec.start();
  }

  stopLiveTranscriptionOnly() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  // --- Mic audio capture: still records the raw audio for this turn (kept
  // for the noise-filtered stream / possible future use), but the text
  // that's actually sent to the AI now comes straight from the live
  // transcript in startLiveTranscriptionOnly() above -- see mediaRecorder.onstop. ---
  startAudioRecordingOnly() {
    this.audioChunks = [];

    // ร้องขอสิทธิ์ใช้ไมโครโฟนจากเบราว์เซอร์ พร้อมเปิดระบบตัดเสียงรบกวนระดับฮาร์ดแวร์
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true, // ตัดเสียงสะท้อนจากลำโพง
        noiseSuppression: true, // เปิดระบบตัดเสียงรบกวนเบราว์เซอร์
        autoGainControl: true,  // ปรับระดับความดังไมค์อัตโนมัติ
        channelCount: 1,        // บังคับอัดเสียงเป็น Mono 1 ช่องสัญญาณเพื่อลดขนาดไฟล์และเสียงรบกวน
        sampleRate: { ideal: 16000 }, // ความถี่สุ่มตัวอย่าง 16kHz ที่ดีที่สุดสำหรับ Whisper AI
      },
    })
      .then(stream => {
        let recordingStream = stream;
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const audioCtx = new AudioCtx();
            const source = audioCtx.createMediaStreamSource(stream);

            // 1. High-Pass Filter: ตัดเสียงรบกวนย่านความถี่ต่ำกว่า 85Hz ออกทั้งหมด (เช่น เสียงพัดลมแอร์, เสียงฮัมคอมพิวเตอร์, เสียงขยับโต๊ะ)
            const highPass = audioCtx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 85;

            // 2. Vocal Peaking Equalizer: ดึงความคมชัดของย่านเสียงพูดมนุษย์ (1.8kHz, +3.5dB) ให้พยัญชนะออกเสียงชัดเจนยิ่งขึ้น
            const vocalBoost = audioCtx.createBiquadFilter();
            vocalBoost.type = 'peaking';
            vocalBoost.frequency.value = 1800;
            vocalBoost.Q.value = 1.0;
            vocalBoost.gain.value = 3.5;

            // 3. Dynamics Compressor: ปรับระดับความดังเบา-ดังของเสียงพูดให้อยู่ในระดับมาตรฐานสม่ำเสมออัตโนมัติ
            const compressor = audioCtx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // เชื่อมต่อวงจร DSP: สัญญาณเสียงสด -> HighPass Filter -> Vocal Peaking -> Compressor -> สัญญาณเสียงใสสะอาด
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(highPass);
            highPass.connect(vocalBoost);
            vocalBoost.connect(compressor);
            compressor.connect(destination);

            recordingStream = destination.stream;
          }
        } catch (err) {
          console.warn('Web Audio DSP Noise Filter fallback:', err);
        }

        // ตรวจสอบชนิดไฟล์ออดิโอที่เบราว์เซอร์รองรับ (webm หรือ ogg) เพื่อให้ Whisper AI ถอดความได้ถูกต้อง
        const supportedMimeType = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/ogg',
        ].find(type => MediaRecorder.isTypeSupported(type));

        this.mediaRecorder = supportedMimeType
          ? new MediaRecorder(recordingStream, { mimeType: supportedMimeType })
          : new MediaRecorder(recordingStream);
        this.mediaRecorder.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          if (this.isRecordingCancelled) {
            this.isRecordingCancelled = false;
            return;
          }

          // The live transcript (startLiveTranscriptionOnly) was already
          // visible on screen the whole time the student was talking -- use
          // it directly instead of re-transcribing the same audio through
          // Whisper again (that was a second, redundant pass that only added
          // a network round-trip + "กำลังแปลงเสียงเป็นข้อความ..." wait).
          // Small grace delay: SpeechRecognition's own final 'onresult' for
          // the last word(s) can land a beat after we call .stop() on it, so
          // give that a moment to arrive before reading recognizedText.
          setTimeout(() => {
            const text = this.recognizedText.trim();
            if (text) {
              if (this.practiceMode === 'speech-to-text') {
                this.scoreSttAttempt(text);
              } else {
                this.confirmSendStsMessageDirect(text);
              }
            } else {
              // No live transcript captured (e.g. the browser doesn't support
              // the Web Speech API) -- fall back to a one-shot recognition pass.
              this.fallbackSpeechRecognition();
            }
            this.cdr.detectChanges();
          }, 300);

          // Stop microphone track to release it
          stream.getTracks().forEach(track => track.stop());
        };

        this.mediaRecorder.start();
        this.isMicInitializing = false;
        this.cdr.detectChanges();
      })
      .catch(err => {
        console.error("Error accessing microphone:", err);
        Swal.fire({
          icon: 'error',
          title: 'เข้าถึงไมโครโฟนไม่ได้',
          text: 'กรุณาอนุญาตการเข้าถึงไมโครโฟนของเบราว์เซอร์',
          confirmButtonColor: '#6B21A8'
        });
        this.isMicInitializing = false;
        this.practiceIsRecording = false;
        this.cdr.detectChanges();
      });
  }

  stopAudioRecordingOnly() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  // --- Last-resort transcription: only reached when both Whisper and the
  // live-transcript text came back empty. Runs a one-shot browser
  // recognition and sends whatever it captures straight to the AI/video call. ---
  fallbackSpeechRecognition() {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      Swal.fire({
        icon: 'warning',
        title: 'ระบบจำเสียงล้มเหลว',
        text: 'ไม่สามารถติดต่อหลังบ้านได้ และเบราว์เซอร์นี้ไม่รองรับการจำเสียงพูดท้องถิ่น',
        confirmButtonColor: '#6B21A8'
      });
      return;
    }
    
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    Toast.fire({
      icon: 'info',
      title: 'ใช้ระบบแปลงเสียงในเบราว์เซอร์ทดแทน...'
    });

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = false;
    
    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (this.practiceMode === 'speech-to-text') {
        this.scoreSttAttempt(text);
      } else {
        this.confirmSendStsMessageDirect(text);
      }
    };
    
    rec.onerror = (err: any) => {
      console.error("Browser fallback error:", err);
    };
    
    rec.start();
  }

  // --- Mic-off IS the "send" action: the live transcript was already
  // visible on screen the whole time the student was talking, and the
  // cancel/delete button next to the mic covers "that came out wrong" --
  // so once the transcript is ready, send it straight to the AI with no
  // separate review/confirm step. ---
  confirmSendStsMessageDirect(text: string): void {
    if (!text.trim()) return;
    this.recognizedText = '';
    this.sendPracticeMessage(text);
    this.gameFx.playSoundEffect('success');
  }

  calculatePronunciationScore(target: string, actual: string) {
    // Clean and split words
    const cleanStr = (s: string) =>
      s
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
        .trim();
    const targetWords = cleanStr(target).split(/\s+/);
    const actualWords = cleanStr(actual).split(/\s+/);

    let matchedCount = 0;
    this.matchedWords = targetWords.map((tw) => {
      const matched = actualWords.some((aw) => aw === tw);
      if (matched) matchedCount++;
      return { text: tw, matched: matched };
    });

    this.pronunciationScore = Math.round((matchedCount / targetWords.length) * 100);
  }

  // --- Speech-to-Text setup screen: same level-selection pattern as the
  // Text-to-Speech dictation quiz (relative-tertile length bucketing, since
  // there's no difficulty tag in the lesson data -- see buildTtsDictationPools
  // for why fixed length cutoffs don't work well on this content). ---
  private buildSttSentencePool(): void {
    const seen = new Set<string>();
    const sentences: string[] = [];
    this.lessonsData.units.forEach((u: any) => {
      (u.speakingQuestions || []).forEach((s: string) => {
        const t = (s || '').trim();
        if (t && !seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          sentences.push(t);
        }
      });
    });

    const buckets = this.bucketByLengthTertile(sentences, s => s.trim().split(/\s+/).filter(Boolean).length);
    this.sttSentencePool = buckets[this.sttLevel];
  }

  startSttSession(): void {
    this.buildSttSentencePool();
    if (this.sttSentencePool.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'ไม่พบประโยคในระดับนี้',
        text: 'ลองเลือกระดับความยากอื่นดูนะคะ',
        confirmButtonColor: '#6B21A8'
      });
      return;
    }

    this.practiceSentences = this.shuffleCopy(this.sttSentencePool);
    this.sttOriginalSentences = [...this.practiceSentences];
    this.selectedSentenceIndex = 0;
    this.sttSessionCount = 0;
    this.sttWrongSentences = [];
    this.showSttReviewModal = false;
    this.recognizedText = '';
    this.pronunciationScore = null;
    this.matchedWords = [];
    this.sttSpeedScore = null;
    this.sttFinalScore = null;
    this.sttSentenceShownTime = Date.now();
    this.sttSessionAttempts = [];
    this.sttSessionFeedback = null;
    this.sttStep = 'practice';
    this.gameFx.playSoundEffect('click');
  }

  // Called once the mic recording for this attempt has a final transcript
  // (see mediaRecorder.onstop / fallbackSpeechRecognition). Combines reading
  // accuracy (calculatePronunciationScore, 60%) with response speed (40%) --
  // how long it took from the sentence appearing to finishing speaking it.
  private scoreSttAttempt(text: string): void {
    const target = this.practiceSentences[this.selectedSentenceIndex];
    this.recognizedText = text;
    this.calculatePronunciationScore(target, text);

    const elapsedSeconds = this.sttSentenceShownTime > 0
      ? (Date.now() - this.sttSentenceShownTime) / 1000
      : 0;
    this.sttLastElapsedSeconds = elapsedSeconds;
    this.sttSpeedScore = this.calculateSttSpeedScore(target, elapsedSeconds);
    // ตอบไว (speed) 40% + อ่านถูก (accuracy) 60%
    this.sttFinalScore = Math.round(this.sttSpeedScore * 0.4 + (this.pronunciationScore || 0) * 0.6);

    this.gameFx.playSoundEffect(this.sttFinalScore >= 80 ? 'success' : 'click');
    this.cdr.detectChanges();
  }

  // สัดส่วนคำที่ตรงกัน (0-1) ใช้ตรวจคำตอบพูด/พิมพ์อิสระเทียบกับคำตอบตัวอย่าง

  nextSentence() {
    if (this.practiceMode === 'speech-to-text') {
      this.sttSessionCount++;
      const currentTarget = this.practiceSentences[this.selectedSentenceIndex];
      this.sttSessionAttempts.push({
        target: currentTarget,
        transcript: this.recognizedText,
        elapsedSeconds: this.sttLastElapsedSeconds,
      });
      // If the combined score is null or less than 100, add to wrong list
      if (this.sttFinalScore === null || this.sttFinalScore < 100) {
        if (!this.sttWrongSentences.includes(currentTarget)) {
          this.sttWrongSentences.push(currentTarget);
        }
        if (this.sttFinalScore === null || this.sttFinalScore < 80) {
          this.mistakes.trackWrongItem('sentence', currentTarget, currentTarget, 'Speech-to-Text Pronunciation');
        }
      }

      if (this.sttSessionCount >= 5) {
        this.showSttReviewModal = true;
        this.gameFx.playSoundEffect('success');
        this.evaluateSttSession();
        return;
      }
    }

    if (this.selectedSentenceIndex < this.practiceSentences.length - 1) {
      this.selectedSentenceIndex++;
    } else {
      this.selectedSentenceIndex = 0;
    }
    this.recognizedText = '';
    this.pronunciationScore = null;
    this.matchedWords = [];
    this.sttSpeedScore = null;
    this.sttFinalScore = null;
    this.sttSentenceShownTime = Date.now();
  }

  startSttReview() {
    this.practiceSentences = [...this.sttWrongSentences];
    this.selectedSentenceIndex = 0;
    this.sttSessionCount = 0;
    this.sttWrongSentences = [];
    this.showSttReviewModal = false;
    this.recognizedText = '';
    this.pronunciationScore = null;
    this.matchedWords = [];
    this.sttSpeedScore = null;
    this.sttFinalScore = null;
    this.sttSentenceShownTime = Date.now();
    this.sttSessionAttempts = [];
    this.sttSessionFeedback = null;
  }

  // Fires once per 5-sentence round (see nextSentence()) rather than per
  // attempt -- same "evaluate the whole session once" pattern as
  // speech-to-speech/text-to-text, and each attempt already got instant
  // local feedback (sttFinalScore) so there's no need to block that on a
  // round-trip. Reuses evaluate-session as-is: it doesn't care whether
  // "messages" is a real back-and-forth conversation or, like here, a set of
  // (AI asked to say X) / (student's transcript) pairs -- either way it's
  // just Gemini reading a transcript and scoring pronunciation/grammar.
  private evaluateSttSession(): void {
    const userId = this.session.currentUser?.id;
    if (!userId || this.sttSessionAttempts.length === 0) return;

    const messages: { sender: 'ai' | 'user'; text: string }[] = [];
    const responseTimes: number[] = [];
    this.sttSessionAttempts.forEach((a) => {
      messages.push({ sender: 'ai', text: `Please read this sentence aloud: "${a.target}"` });
      messages.push({ sender: 'user', text: a.transcript || '(no speech recognized)' });
      responseTimes.push(a.elapsedSeconds);
    });

    this.isEvaluatingSttSession = true;
    this.apiService
      .postSpeakingEvaluation({
        user_id: userId,
        mode: 'speech_to_text',
        category: 'reading_aloud',
        messages,
        response_times: responseTimes,
      })
      .subscribe({
        next: (res: any) => {
          this.isEvaluatingSttSession = false;
          this.sttSessionFeedback = res?.feedback || null;
        },
        error: () => {
          this.isEvaluatingSttSession = false;
        },
      });
  }

  exitSttPractice() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isPlayingTTS = false;
    this.aiWriting = false;

    if (this.practiceIsRecording) {
      this.stopPracticeRecordingFlow();
    }

    this.practiceSentences = [...this.sttOriginalSentences];
    this.practiceMode = 'menu';
    this.sttStep = 'setup';
    this.showSttReviewModal = false;
  }

  // --- AI reply: shared by Text-to-Text chat and Speech-to-Speech (this is
  // where the transcribed turn actually gets sent to the backend/AI) ---
  getPresentationTopicName(): string {
    if (this.presentationTopic === 'custom') {
      return this.presentationCustomTopic || 'Academic Topic';
    }
    const topic = this.presentationTopics.find(t => t.key === this.presentationTopic);
    return topic ? topic.titleEn : 'Academic Topic';
  }


  formatMarkdown(text: string): SafeHtml {
    if (!text) return '';
    
    // Normalize and escape HTML characters
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings: ### title or ## title or # title
    escaped = escaped.replace(/^### (.*?)$/gm, '<h5 style="margin: 0.75rem 0 0.5rem 0; font-size: 0.92rem; font-weight: 800; color: #0f766e;">$1</h5>');
    escaped = escaped.replace(/^## (.*?)$/gm, '<h4 style="margin: 1rem 0 0.75rem 0; font-size: 1rem; font-weight: 850; color: #0f766e;">$1</h4>');
    escaped = escaped.replace(/^# (.*?)$/gm, '<h3 style="margin: 1.25rem 0 1rem 0; font-size: 1.1rem; font-weight: 900; color: #0f766e;">$1</h3>');

    // Horizontal Rule: ---
    escaped = escaped.replace(/^---$/gm, '<hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.15); margin: 0.85rem 0;" />');

    // Bold text: **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e293b; font-weight: 800;">$1</strong>');

    // Bullet points: * text or - text
    escaped = escaped.replace(/^\* (.*?)$/gm, '<li style="margin-left: 1.25rem; margin-bottom: 0.35rem; list-style-type: disc; color: #334155;">$1</li>');
    escaped = escaped.replace(/^- (.*?)$/gm, '<li style="margin-left: 1.25rem; margin-bottom: 0.35rem; list-style-type: circle; color: #334155;">$1</li>');

    // Remove any residual double asterisks
    escaped = escaped.replace(/\*\*/g, '');

    // Line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(escaped);
  }

  sendPracticeMessage(text: string) {
    if (!text.trim()) return;

    // Track response time
    if (this.userTurnStartTime > 0) {
      const responseSeconds = (Date.now() - this.userTurnStartTime) / 1000;
      this.responseTimes.push(responseSeconds);
      this.userTurnStartTime = 0; // Reset
    }

    // Add user message
    const userMsgObj: any = { sender: 'user', text: text, time: new Date() };
    this.practiceMessages.push(userMsgObj);
    this.aiWriting = true;
    this.scrollChatToBottom();

    if (this.practiceMode === 'text-to-text' || this.practiceMode === 'speech-to-speech') {
      let systemPrompt = '';
      const chatHistory = this.practiceMessages
        .map((m) => `${m.sender === 'user' ? 'Student/User' : 'AI'}: ${m.text}`)
        .join('\n');

      if (this.textPracticeSubMode === 'qa') {
        systemPrompt = `You are the AI English Tutor. The student will ask you questions about English grammar, vocabulary, or pronunciation.
 
Current chat history:
${chatHistory}
 
Explain clearly and directly. Keep your reply extremely short, concise, and to the point (maximum 1-2 sentences). Do NOT add pleasantries, greetings, or repeat the student's question. Get straight to the point to keep response times fast.
IMPORTANT: If the student made any grammar or spelling mistake in their message, append 'GRAMMAR_SUGGESTION: [Explain the mistake and how to correct it]' at the end of your response.`;
      } else {
        // Conversational Chat (Text-to-Text or Speech-to-Speech)
        let categoryPrompt = '';
        if (this.currentChatTopic) {
          categoryPrompt = `You are roleplaying in the scenario: ${this.currentChatTopic.titleEn} (${this.currentChatTopic.scenario}). Help the student practice English language commonly used in this situation.`;
        } else if (this.selectedCategory === 'teaching') {
          if (this.selectedTeachingTopic) {
            categoryPrompt = `You are roleplaying in a School/Classroom setting. Specifically, the scenario is: ${this.selectedTeachingTopic.prompt}. Help the student practice English language commonly used in this situation.`;
          } else {
            categoryPrompt = `You are roleplaying in a School/Classroom setting. Help the student practice English language commonly used by English Teachers (e.g. welcoming students, managing the classroom, giving instructions, talking to parent).`;
          }
        } else if (this.selectedCategory === 'daily') {
          categoryPrompt = `You are roleplaying in a casual daily life setting. Chat about hobbies, routines, travel, food, or general greetings.`;
        } else if (this.selectedCategory === 'presentation') {
          const topicName = this.getPresentationTopicName();
          categoryPrompt = `You are an academic examiner evaluating the student's presentation on the topic "${topicName}".
          Currently in Q&A phase. The student just answered Q&A question ${this.presentationQaCount}.
          Ask the next follow-up question (Question ${this.presentationQaCount + 1} of 2) related to their presentation topic. Keep it realistic, brief and professional.`;
        } else if (this.selectedCategory === 'interview') {
          const currentQ = this.interviewQuestions[this.interviewQuestionIndex - 1];
          const nextQ = this.interviewQuestionIndex < 5 ? this.interviewQuestions[this.interviewQuestionIndex] : null;
          categoryPrompt = `You are conducting a job interview for an English Teacher position.
          The student is answering your question: "${currentQ}".
          Give a very brief evaluation of their response (1-2 sentences) in character, and then ask the next question exactly as follows:
          ${nextQ ? `"${nextQ}"` : `"The interview is now complete. Thank you very much for your time today!"`}
          Do not ask any other questions. Keep the total response short.`;
        }

        let levelPrompt = '';
        if (this.selectedLevel === 'beginner') {
          levelPrompt = `The student is an English BEGINNER (A1-A2 level). You MUST keep your responses very short (maximum 1-2 simple sentences), use basic vocabulary, speak slowly, and keep the sentence structure simple.`;
        } else if (this.selectedLevel === 'intermediate') {
          levelPrompt = `The student is an English INTERMEDIATE (B1-B2 level). Use natural conversation, standard vocabulary, and write responses of 2-3 sentences.`;
        } else if (this.selectedLevel === 'advanced') {
          levelPrompt = `The student is an English ADVANCED (C1-C2 level). Engage in deep conversation, use rich vocabulary, express complex ideas, and write responses of 3-4 sentences.`;
        }

        let personaPrompt = '';
        if (this.selectedAvatar === 'jane') {
          personaPrompt = `Your name is Teacher Jane. You are a helpful, encouraging Thai-English teacher trainer. You speak kindly, use simple language, and sometimes offer encouragement.`;
        } else if (this.selectedAvatar === 'david') {
          personaPrompt = `Your name is Mr. David. You are a British educator. You are polite, formal, professional, and speak in a precise British style.`;
        } else if (this.selectedAvatar === 'alex') {
          personaPrompt = `Your name is Alex. You are a friendly, cool English tutor. You are enthusiastic, casual, use slang/idioms occasionally, and speak like a supportive peer.`;
        } else if (this.selectedAvatar === 'maria') {
          personaPrompt = `Your name is Mama Maria. You are a parent of a student. You are caring, a bit anxious about your child's learning, and speak like a parent.`;
        }

        systemPrompt = `You are an AI roleplay conversation partner.
Persona details: ${personaPrompt}
Target student level: ${levelPrompt}
Scenario category: ${categoryPrompt}

Stay in character for this persona and scenario throughout the conversation.
Current chat history:
${chatHistory}

Keep your reply in character. Do NOT repeat or echo the student's input message.
CRITICAL: Keep your reply extremely short, concise, and direct (maximum 1-2 sentences). Do not add greetings, pleasantries, or repeat what the user said. Answer directly to keep response times fast.
IMPORTANT: If the student made any grammar or spelling mistake in their last message, append 'GRAMMAR_SUGGESTION: [Explain the mistake and how to correct it in Thai]' at the end of your response. Otherwise, do not include that label.`;
      }

      const payload = {
        message: text,
        context: systemPrompt,
        user_id: this.session.currentUser?.id
      };

      this.apiService.postAiSpeaking('text-to-text', payload).subscribe({
        next: (res: any) => {
          this.aiWriting = false;
          let reply = res.reply || "I received your message. Let's keep practicing!";
          let grammarFeedback = res.grammar_feedback || null;

          // Parse dynamic grammar suggestion from Gemini reply text if present
          if (reply.includes('GRAMMAR_SUGGESTION:')) {
            const parts = reply.split('GRAMMAR_SUGGESTION:');
            reply = parts[0].trim();
            grammarFeedback = parts[1].trim();
          }

          if (grammarFeedback) {
            userMsgObj.grammarSuggestion = grammarFeedback;
          }

          this.practiceMessages.push({
            sender: 'ai',
            text: reply,
            time: new Date()
          });
          this.scrollChatToBottom();

          if (this.selectedCategory === 'interview') {
            this.interviewQuestionIndex++;
          }
          if (this.selectedCategory === 'presentation' && this.presentationPhase === 'qa') {
            this.presentationQaCount++;
            if (this.presentationQaCount > 2) {
              this.presentationPhase = 'feedback';
            }
          }

          if (this.practiceMode === 'speech-to-speech') {
            this.practiceSpeakText(reply, () => this.autoResumeListening());
          }
        },
        error: (err: any) => {
          console.warn('Error contacting backend, using local fallback:', err);
          this.aiWriting = false;
          const reply = this.generateAiResponse(text);
          const grammarFeedback = this.simulateGrammarCheck(text);

          if (grammarFeedback) {
            userMsgObj.grammarSuggestion = grammarFeedback;
          }

          this.practiceMessages.push({
            sender: 'ai',
            text: reply,
            time: new Date()
          });
          this.scrollChatToBottom();

          if (this.selectedCategory === 'interview') {
            this.interviewQuestionIndex++;
          }
          if (this.selectedCategory === 'presentation' && this.presentationPhase === 'qa') {
            this.presentationQaCount++;
            if (this.presentationQaCount > 2) {
              this.presentationPhase = 'feedback';
            }
          }

          if (this.practiceMode === 'speech-to-speech') {
            this.practiceSpeakText(reply, () => this.autoResumeListening());
          }
        }
      });
    }
  }

  // --- Turn loop: called from practiceSpeakText's onEnd once the AI's reply
  // has finished playing, so the mic reopens for the next turn without the
  // student having to press the button again. No-ops if a turn was already
  // (re)started manually in the meantime, or if the conversation ended. ---
  private autoResumeListening(): void {
    if (this.practiceMode !== 'speech-to-speech') return;
    if (this.practiceIsRecording) return;
    if (this.chatSummaryVisible) return;

    // Delay to let browser audio engine release speakers before starting mic
    setTimeout(() => {
      if (this.practiceMode === 'speech-to-speech' && !this.practiceIsRecording && !this.chatSummaryVisible) {
        this.practiceToggleRecording();
      }
    }, 500);
  }

  // --- Offline fallbacks: used only when the backend AI call in
  // sendPracticeMessage's error handler fails, so practice can continue
  // without a live connection ---
  simulateGrammarCheck(text: string): string | null {
    const clean = text.toLowerCase().trim();
    if (clean.includes('i has')) {
      return "Grammar Note: Use 'I have' instead of 'I has' for first person singular subject.";
    }
    if (clean.includes('he have') || clean.includes('she have')) {
      return "Grammar Note: Subject-verb agreement. Third person singular requires 'has' (he has / she has).";
    }
    if (clean.includes('where is classroom') || clean.includes('where classroom')) {
      return "Grammar Note: Remember to add articles, e.g., 'Where is the classroom?'";
    }
    if (clean.includes('nice to meet you')) {
      return "Vocabulary: Excellent phrase for greeting someone for the first time!";
    }
    return null;
  }

  private generateAiResponse(text: string): string {
    const cleanText = text.toLowerCase().trim();

    // Check user intent keywords for custom fallback responses
    if (cleanText.includes('stressed') || cleanText.includes('sad') || cleanText.includes('tired') || cleanText.includes('problem')) {
      if (this.selectedAvatar === 'jane') {
        return "I'm sorry to hear that you are feeling stressed. Remember to take a break and breathe. You are doing great, and I am here to support you!";
      } else if (this.selectedAvatar === 'maria') {
        return "Oh dear, I understand how you feel. As a parent, I worry about stress too. Make sure to rest well and don't push yourself too hard.";
      } else if (this.selectedAvatar === 'alex') {
        return "Hey, sorry to hear you're feeling down. Study stress is real! What's bothering you? Let's talk about it.";
      } else {
        return "I am sorry to hear you are feeling stressed about your studies. Academic pressure can be challenging. How can I help you clear your mind?";
      }
    }

    if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
      if (this.selectedAvatar === 'jane') {
        return "Hello! How is your day going? Ready to practice some English today?";
      } else if (this.selectedAvatar === 'alex') {
        return "Hey there! What's up? Ready to chat?";
      } else if (this.selectedAvatar === 'david') {
        return "Good day. It is a pleasure to converse with you. How may I assist you today?";
      } else {
        return "Hello! It is wonderful to meet you. Let's practice speaking English together.";
      }
    }

    if (cleanText.includes('study') || cleanText.includes('learn') || cleanText.includes('homework') || cleanText.includes('class')) {
      return "Aha, studying is very important. What subject are you focusing on at the moment?";
    }

    // Global search across all units in the database
    for (const unitKey of Object.keys(this.aiResponseDb)) {
      const responses = this.aiResponseDb[+unitKey] || [];
      for (const r of responses) {
        if (cleanText.includes(r.userKeyword)) {
          return r.reply;
        }
      }
    }

    // Generic fallback response based on selected category
    if (this.selectedCategory === 'daily') {
      return "That sounds nice! Tell me more about your daily routine or hobbies. What do you like to do in your free time?";
    } else if (this.selectedCategory === 'presentation') {
      if (this.presentationPhase === 'qa') {
        if (this.presentationQaCount === 1) {
          return "That was a good answer. Let me ask you one last question: How do you plan to handle students of different learning speeds in this classroom setup?";
        } else {
          return "Thank you for your responses. The Q&A session is now complete. I will analyze your presentation score now.";
        }
      }
      return "Thank you for sharing that. How would you structure your presentation to make it engaging for the audience?";
    } else if (this.selectedCategory === 'interview') {
      const nextQ = this.interviewQuestionIndex < 5 ? this.interviewQuestions[this.interviewQuestionIndex] : null;
      return nextQ ? `Thank you for sharing that. Here is my next question: ${nextQ}` : "That is all for the interview today. Thank you for your time, we will let you know our decision soon!";
    } else {
      return "That sounds very interesting! In teaching and academic communication, speaking English clearly and naturally is the key to success. Let's keep practicing!";
    }
  }
  // ======================= END SPEECH-TO-SPEECH PRACTICE =======================

  // Shared by every chat/practice mode (not STS-specific): scrolls whichever
  // chat log container is currently on screen to the latest message.
  scrollChatToBottom() {
    const performScroll = () => {
      if (this.chatScrollContainer?.nativeElement) {
        try {
          this.chatScrollContainer.nativeElement.scrollTo({
            top: this.chatScrollContainer.nativeElement.scrollHeight,
            behavior: 'smooth'
          });
        } catch (err) {}
      }
      const chatWraps = document.querySelectorAll('.chat-history-wrap, .call-last-exchange, .qa-messages-wrap');
      chatWraps.forEach((wrap: any) => {
        try {
          wrap.scrollTo({
            top: wrap.scrollHeight,
            behavior: 'smooth'
          });
        } catch (err) {
          wrap.scrollTop = wrap.scrollHeight;
        }
      });
    };
    setTimeout(performScroll, 30);
    setTimeout(performScroll, 100);
    setTimeout(performScroll, 250);
    setTimeout(performScroll, 400);
  }

  loadPastChatSession(log: any): void {
    if (!log || !log.transcript || log.transcript.length === 0) return;
    
    this.practiceMessages = log.transcript.map((m: any) => ({
      sender: m.sender,
      text: m.text,
      time: new Date(log.date || new Date())
    }));
    
    this.practiceMode = 'text-to-text';
    this.textPracticeSubMode = log.title?.toLowerCase().includes('q&a') ? 'qa' : 'chat';
    
    if (this.textPracticeSubMode === 'chat') {
      const titleClean = log.title?.replace('Text-to-Text Chat: ', '')?.trim();
      const matchedTopic = this.practiceChatTopics.find(t => t.titleTh === titleClean || t.titleEn === titleClean);
      if (matchedTopic) {
        this.currentChatTopic = matchedTopic;
      }
    } else {
      this.currentChatTopic = null;
    }
    
    this.showHistoryPanel = false;
    this.chatSummaryVisible = false;
    this.chatSummaryReport = null;
    
    this.gameFx.playSoundEffect('success');
    this.scrollChatToBottom();
    this.cdr.detectChanges();
  }

  handleHistoryClick(log: any): void {
    if (log && log.transcript && log.transcript.length > 0) {
      this.loadPastChatSession(log);
    } else if (log) {
      const dateFormatted = new Date(log.date).toLocaleString('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      let icon: 'success' | 'info' | 'question' = 'success';
      if (log.type?.toLowerCase().includes('test')) {
        icon = 'info';
      }
      
      Swal.fire({
        title: log.title,
        html: `
          <div style="text-align: left; font-size: 0.9rem; line-height: 1.6; color: #475569; padding: 0.5rem 0;">
            <p style="margin: 6px 0;"><strong>ประเภทกิจกรรม:</strong> ${log.type || 'กิจกรรมทั่วไป'}</p>
            <p style="margin: 6px 0;"><strong>วันที่ทำกิจกรรม:</strong> ${dateFormatted}</p>
            ${log.score !== undefined ? `<p style="margin: 6px 0;"><strong>คะแนนสำเร็จ:</strong> <span style="color: #0d9488; font-weight: 800;">${log.score}%</span></p>` : ''}
            <p style="margin: 6px 0;"><strong>คะแนนประสบการณ์ที่ได้รับ:</strong> <span style="color: #10b981; font-weight: 800;">+${log.xp} XP</span></p>
            ${log.report?.overall ? `<p style="margin: 10px 0 0; padding-top: 10px; border-top: 1px solid #f1f5f9; white-space: pre-line;">${log.report.overall}</p>` : ''}
            ${log.report?.tips?.length ? `<p style="margin: 8px 0 0; padding-top: 8px; border-top: 1px solid #f1f5f9; white-space: pre-line;"><strong>💡 คำแนะนำ:</strong><br>${log.report.tips.join('<br>')}</p>` : ''}
          </div>
        `,
        icon: icon,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#6B21A8'
      });
    }
  }
}
