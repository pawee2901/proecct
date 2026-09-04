import { Injectable } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { StudentSessionService } from './student-session.service';
import { Unit } from '../models/unit.model';
import {
  LESSON_1_DIALOGUES,
  LESSON_2_DIALOGUES,
  LESSON_3_DIALOGUES,
  LESSON_4_DIALOGUES,
  LESSON_5_DIALOGUES,
} from '../../shared/lesson-dialogue-defaults';

// Extracted verbatim from student.component.ts:
//  - `units` default seed value (original lines 654-2269)
//  - `loadLessonsFromDb()` (original lines 3079-3172)
//  - `getYearFallbackUnits()` (original lines 3173-3297)
// Two independent hardcoded seed datasets existed in the original file
// (the `units` field default and `getYearFallbackUnits()`) — preserved
// as-is here rather than deduplicated, to avoid changing behavior during
// this structural split.
@Injectable({ providedIn: 'root' })
export class LessonsDataService {
  constructor(private apiService: ApiService, private sessionService: StudentSessionService) {}

  // Full seed data for year-1 units, including the multi-part `fullQuiz`
  // (Pre-Test/Post-Test Part A/B/C exam). getYearFallbackUnits(1) below
  // returns a separate, lighter duplicate of these same 5 units (single-
  // question preQuiz/postQuiz, no fullQuiz) — since initForSession() always
  // overwrites `units` with that lighter set on session bootstrap, fullQuiz
  // is merged back in there by id so the built exam UI is actually reachable
  // instead of silently never appearing.
  private readonly richYear1Seed: Unit[] = [
    {
      id: 1,
      number: 'Unit 1',
      title: 'Welcoming Students',
      description:
        'เรียนรู้ทักษะการกล่าวทักทายนักศึกษา การเป็นเจ้าบ้านที่ดี แนะนำตัวเอง และประเพณีทักทายทั่วโลก',
      lessons: [
        'การกล่าวทักทายทั่วไป (Greetings)',
        'วัฒนธรรมการทักทายในแต่ละประเทศ',
        'บทบาทครูในฐานะพนักงานต้อนรับ (Teacher as Receptionist)',
        'ภาษาในชั้นเรียนช่วงเริ่มต้นการสอน',
      ],
      vocabularies: [
        { word: 'Welcoming', pos: 'adj.', reading: 'เวล-คัม-มิง', meaning: 'การต้อนรับ / อบอุ่น' },
        {
          word: 'Icebreaker',
          pos: 'n.',
          reading: 'ไอซ์-เบรก-เกอร์',
          meaning: 'กิจกรรมละลายพฤติกรรม',
        },
        {
          word: 'Face-to-face',
          pos: 'adj.',
          reading: 'เฟส-ทู-เฟส',
          meaning: 'เผชิญหน้า / ส่วนตัว',
        },
        {
          word: 'Course overview',
          pos: 'n.',
          reading: 'คอร์ส โอ-เวอร์-วิว',
          meaning: 'ภาพรวมรายวิชา',
        },
        {
          word: 'Receptions duties',
          pos: 'n.',
          reading: 'รี-เซ็ป-ชัน ดู-ตี้ส์',
          meaning: 'หน้าที่พนักงานต้อนรับ',
        },
        {
          word: 'Receptionist',
          pos: 'n.',
          reading: 'รี-เซ็ป-ชัน-นิสต์',
          meaning: 'พนักงานต้อนรับ',
        },
        { word: 'Appointment', pos: 'n.', reading: 'อะ-พอยต์-เมนท์', meaning: 'การนัดหมาย' },
        { word: 'Service-mind', pos: 'n.', reading: 'เซอร์-วิส-ไมนด์', meaning: 'ใจรักบริการ' },
        { word: 'Expectation', pos: 'n.', reading: 'เอ็ก-สเปก-เท-ชัน', meaning: 'ความคาดหวัง' },
        { word: 'Schedule', pos: 'n.', reading: 'สเกด-จูล', meaning: 'กำหนดการ / ตารางเวลา' },
      ],
      dialogues: [
        {
          role1: 'Teacher (Ms. Adams)',
          text1:
            "Good morning, everyone! I'm Ms. Adams, your teacher for this course. Welcome to the class! How is everyone feeling today?",
          role2: 'Student (Sarah)',
          text2: "Good morning, Ms. Adams! I'm excited to start this course and learn new things.",
        },
        {
          role1: 'Teacher (Ms. Adams)',
          text2:
            "Wonderful, Sarah! If you have any questions or need help along the way, feel free to reach out. Let's make this a productive semester!",
          role2: 'Student (Sarah)',
          text1:
            "Thank you, Ms. Adams! I'll definitely keep that in mind. I'm ready to get started!",
        },
      ],
      cultureTips: [
        'Japan: Bowing is a common form of greeting. The depth of the bow signifies respect.',
        'India: Greetings include "Namaste" with a slight bow and folded hands.',
        'France: Handshake accompanied by "Bonjour", or cheek kissing (air kisses) for friends.',
        'China: Greetings involve a nod or a slight bow. Handshakes are common in business.',
        'Brazil: Cheek kissing is common among friends. Handshakes are used in formal settings.',
      ],
      lessonSections: [
        {
          icon: '🏫',
          title: 'A. Greetings & Introduction',
          subtitle: 'Creating a welcoming classroom',
          color: 'blue',
          items: [
            {
              label: '1.',
              text: 'Introductions',
              sub: 'Have students introduce themselves to create a comfortable and inclusive atmosphere.',
            },
            {
              label: '2.',
              text: 'Course Overview',
              sub: 'Provide an outline of what will be covered and highlight key learning objectives.',
            },
            {
              label: '3.',
              text: 'Expectations',
              sub: 'Clarify classroom rules, participation requirements, and grading criteria.',
            },
            {
              label: '4.',
              text: 'Icebreakers',
              sub: 'Use fun activities to help break the ice and foster connections among students.',
            },
            {
              label: '5.',
              text: 'Resources',
              sub: 'Share important course materials, textbooks, and online platforms.',
            },
            {
              label: '6.',
              text: 'Schedule',
              sub: 'Review the lesson schedule, assignment due dates, and upcoming assessments.',
            },
          ],
        },
        {
          icon: '💼',
          title: 'B. 4 Steps to Welcome Guests',
          subtitle: 'Teacher as a Receptionist',
          color: 'green',
          items: [
            {
              label: 'Step 1',
              text: 'Greeting People',
              sub: 'Greet people with a smile and service mind.',
            },
            {
              label: 'Step 2',
              text: "Ask Guest's Information",
              sub: "Ask the purpose of visit, guest's name or company name, and appointment details.",
            },
            {
              label: 'Step 3',
              text: 'Show Service Mind',
              sub: 'Take guests to the lounge. Contact the department or person in charge immediately.',
            },
            {
              label: 'Step 4',
              text: 'Direct to Department',
              sub: 'Give short, clear, and correct directions to the contact department.',
            },
          ],
        },
        {
          icon: '📝',
          title: 'C. Classroom Language',
          subtitle: 'Useful expressions for daily teaching',
          color: 'yellow',
          items: [
            { text: 'Good morning/afternoon, everyone! How are you today?' },
            { text: 'Who is away or absent today?' },
            { text: 'Open your book at page (10) / Turn to page (10)' },
            { text: "Let's say it together. / All together!" },
            { text: 'Who knows the answer? / In English, please.' },
            { text: 'Collect the books please. / Give me your homework please.' },
          ],
        },
        {
          icon: '💬',
          title: 'Key Greeting Sentences',
          subtitle: 'Sentences for welcoming students',
          color: 'pink',
          items: [
            { text: 'Welcome students to our exciting journey and learning in this course.' },
            { text: 'Greetings, future scholars! Get ready to dive into a world of knowledge.' },
            {
              text: 'Hello, bright minds! I am thrilled to kick off this course with all of you today.',
            },
            {
              text: "Welcome aboard, eager learners! Let's start with enthusiasm and a hunger for knowledge.",
            },
            {
              text: "Welcome, newcomers! I'm thrilled to be your teacher and guide as you start this course.",
            },
          ],
        },
      ],
      preQuiz: [
        {
          question:
            'How can a teacher create a welcoming environment for students on the first day of class?',
          options: [
            'Ignore the students and focus on setting up materials',
            'Greet each student individually with a smile and ask about their interests',
            'Assign seats randomly to prevent interaction',
            'Begin the lesson immediately without introductions',
          ],
          answer: 1,
        },
        {
          question: 'Why is it important for teachers to greet students warmly on the first day?',
          options: [
            'To establish a positive and inclusive learning environment',
            'To intimidate the students',
            'To discourage student participation',
            'To create a competitive atmosphere',
          ],
          answer: 0,
        },
        {
          question: 'What is the primary purpose of an icebreaker on the first day?',
          options: [
            'To test students academic knowledge',
            'To enforce strict classroom rules',
            'To help students get to know each other and lower anxiety',
            'To select class leaders',
          ],
          answer: 2,
        },
        {
          question: 'When acting as a receptionist, what is important for a teacher to show?',
          options: [
            'Kindness and service-mind by smiling',
            'Strictness and authority',
            'Impatience and rush',
            'Indifference to visitors',
          ],
          answer: 0,
        },
      ],
      postQuiz: [
        {
          question:
            'Which extracurricular activity are you interested in? belongs to which category?',
          options: [
            'Sentences for class attendance',
            'Sentences for organizing activities',
            'Sentences for checking in or out',
            'Sentences for contacting parents',
          ],
          answer: 1,
        },
        {
          question: 'If a student is absent, what is the best phone question to contact parents?',
          options: [
            'Could you please tell me your classroom number?',
            "Can you give me your mother's name?",
            "What's your parent or guardian's phone number?",
            "Is there a specific teacher you'd like to speak with?",
          ],
          answer: 2,
        },
        {
          question: 'What is a common form of greeting in Japan?',
          options: [
            'Cheek kissing',
            'Namaste with folded hands',
            'Bowing with depth signifying respect',
            'A firm handshake only',
          ],
          answer: 2,
        },
        {
          question: 'What is the meaning of "Icebreaker" in educational settings?',
          options: [
            'A tool to break actual ice in classroom',
            'A fun activity to foster connections and reduce tension',
            'A difficult exam to filter weak students',
            'A penalty for late submissions',
          ],
          answer: 1,
        },
      ],
      scrambleWords: ['WELCOMING', 'ICEBREAKER', 'RECEPTIONIST', 'GREETING'],
      scrambleHints: [
        'การต้อนรับอย่างอบอุ่น',
        'กิจกรรมละลายพฤติกรรม',
        'พนักงานต้อนรับ',
        'การกล่าวทักทาย',
      ],
      unscrambleDialogue: [
        { id: 1, text: "Teacher: Hello, class! I'm Ms. Adams, your teacher.", order: 0 },
        { id: 2, text: 'Student: Hello, Ms. Adams! Nice to meet you.', order: 1 },
        { id: 3, text: "Teacher: Nice to meet you too! Let's start with an icebreaker.", order: 2 },
        { id: 4, text: 'Student: Sounds fun! What should we do first?', order: 3 },
      ],
      fullQuiz: {
        partA: [
          {
            question:
              'Which sentence is the most appropriate for a teacher to welcome new students on the first day of class?',
            options: [
              'You are late. Sit down quickly and be quiet.',
              "Welcome aboard, eager learners! Let's start this course with enthusiasm and a hunger for knowledge.",
              'Open your books to page 10 right now.',
              'Who is absent today?',
            ],
            answer: 1,
          },
          {
            question:
              'According to the lesson, what is the correct order of the 4 steps a receptionist uses to welcome guests?',
            options: [
              "Greet people → Ask about the guest's information → Show your service mind → Direct the guest to the contact department",
              'Ask for information → Greet people → Direct the guest → Show service mind',
              'Show service mind → Greet people → Direct the guest → Ask for information',
              'Direct the guest → Ask for information → Greet people → Show service mind',
            ],
            answer: 0,
          },
          {
            question:
              "A guest is waiting at the front desk. Which sentence best shows the receptionist's service mind?",
            options: [
              'What do you want from me?',
              "Please have a seat. I'll see whether Mr. David is available.",
              "I'm too busy to help you now.",
              'Find the office by yourself.',
            ],
            answer: 1,
          },
          {
            question: 'When you arrive at a company as a visitor, what should you do first?',
            options: [
              "Walk straight into the director's office.",
              'Sit in the lounge and wait without speaking.',
              "Walk to the front desk and introduce your name and your company's name.",
              'Phone the secretary from outside the building.',
            ],
            answer: 2,
          },
          {
            question: 'Which sentence would a teacher most likely use to begin the lesson?',
            options: [
              'Collect the books, please.',
              "Good morning, everyone. How are you today? Let's start the lesson.",
              'Give me your homework, please.',
              "What is your guardian's phone number?",
            ],
            answer: 1,
          },
          {
            question:
              'Which of these is an instruction a teacher uses to manage the class during a lesson?',
            options: [
              'Can I have your full name and grade, please?',
              'Turn to page 10 and look at exercise 1.',
              'What time did the issue occur?',
              'Do you have any allergies we should know about?',
            ],
            answer: 1,
          },
          {
            question:
              'In Japan, what is a common form of greeting, in which the depth can signify the level of respect?',
            options: [
              'Cheek kissing (air kisses)',
              'Touching feet',
              'Bowing',
              'Folding the hands and saying "Namaste"',
            ],
            answer: 2,
          },
        ],
        partB: {
          expressions: [
            'May I know your name, please?',
            'Anything I can do for you?',
            'I have an appointment with Mr. Jones.',
            'Is Mr. Jones expecting you?',
          ],
          replies: [
            { key: 'a', text: 'Please take a seat.' },
            { key: 'b', text: 'Yes. I made an appointment with him.' },
            { key: 'c', text: "It's Chutintorn from ABC International School." },
            {
              key: 'd',
              text: 'I would like to see Mr. David, the Head of the English Department.',
            },
          ],
          answers: ['c', 'd', 'a', 'b'],
        },
        partC: [
          {
            contextText:
              "Receptionist: Good morning. What can I do for you?\nGuest: (1) ____________________\nReceptionist: Who shall I say would like to see him?\nGuest: (2) ____________________\nReceptionist: Please take a seat. I'll see whether he is available.",
            subQuestions: [
              {
                label: 'Guest พูดว่า (1):',
                sampleAnswer: 'Good morning. I would like to see Mr. David, the school director.',
              },
              { label: 'Guest พูดว่า (2):', sampleAnswer: "It's Kelvin, a sales representative." },
            ],
          },
          {
            contextText:
              'Situation: Today is the first day of the semester and you are meeting your students for the first time.\nSpeak TWO sentences you would say to greet and welcome them in a way that builds a good relationship.',
            subQuestions: [
              {
                label: 'ประโยคที่ 1:',
                sampleAnswer:
                  "Good morning, everyone! Welcome to our class — I'm so happy to have you all here.",
              },
              {
                label: 'ประโยคที่ 2:',
                sampleAnswer:
                  "I'm really looking forward to getting to know each of you and learning together this semester.",
              },
            ],
          },
        ],
      },
    },
    {
      id: 2,
      number: 'Unit 2',
      title: 'Telephoning',
      description:
        'ฝึกการสนทนาทางโทรศัพท์ การรับโทรศัพท์สำหรับครู/พนักงานต้อนรับ การโอนสาย และการจดข้อความ',
      lessons: [
        'หลักการโทรศัพท์ที่มีประสิทธิภาพ (Effective Telephoning)',
        'ครูในฐานะเจ้าหน้าที่รับสาย (Teacher as Receptionist)',
        'ประโยคการรับสายโทรศัพท์ (Picking Up Calls)',
        'ประโยคแจ้งจุดประสงค์และการฝากข้อความ (Message Taking)',
      ],
      vocabularies: [
        { word: 'Concise', pos: 'adj.', reading: 'คอน-ไซส์', meaning: 'กระชับ / ได้ใจความ' },
        { word: 'Etiquette', pos: 'n.', reading: 'เอท-ทิ-เก็ต', meaning: 'มารยาท / สมบัติผู้ดี' },
        { word: 'Transferring', pos: 'v.', reading: 'ทรานส์-เฟอร์-ริง', meaning: 'การโอนสาย' },
        {
          word: 'Unavailable',
          pos: 'adj.',
          reading: 'อัน-อะ-แว-ละ-เบิล',
          meaning: 'ไม่สะดวก / ไม่อยู่',
        },
        { word: 'Verify', pos: 'v.', reading: 'เว-ริ-ไฟ', meaning: 'ยืนยันความถูกต้อง' },
        {
          word: 'Professionalism',
          pos: 'n.',
          reading: 'โปร-เฟส-ชัน-นัล-ลิ-ซึม',
          meaning: 'ความเป็นมืออาชีพ',
        },
        {
          word: 'Multitasking',
          pos: 'n.',
          reading: 'มัล-ติ-ทาส-กิง',
          meaning: 'การทำงานหลายอย่างพร้อมกัน',
        },
        { word: 'Extension', pos: 'n.', reading: 'เอ็ก-สเตน-ชัน', meaning: 'เบอร์ต่อภายใน' },
        { word: 'Reachable', pos: 'adj.', reading: 'รีช-อะ-เบิล', meaning: 'สามารถติดต่อได้' },
        { word: 'Assist', pos: 'v.', reading: 'อะ-ซิสต์', meaning: 'ช่วยเหลือ' },
      ],
      dialogues: [
        {
          role1: 'Teacher (Ms. Parker)',
          text1: 'Hello, this is Ms. Parker calling. Is this Sarah?',
          role2: 'Student (Sarah)',
          text2: 'Yes, this is Sarah. How can I help you, Ms. Parker?',
        },
        {
          role1: 'Teacher (Ms. Parker)',
          text2:
            "I wanted to check if you're available to meet tomorrow after school to discuss your exam.",
          role2: 'Student (Sarah)',
          text1: 'Yes, I can meet tomorrow. What time works for you?',
        },
      ],
      lessonSections: [
        {
          icon: '📞',
          title: '6 Steps: Making a Phone Call',
          subtitle: 'การโทรศัพท์อย่างมืออาชีพ (Professional Calling)',
          color: 'purple',
          items: [
            {
              label: 'Step 1',
              text: 'Introduce yourself & state purpose',
              sub: 'แนะนำตัวและบอกจุดประสงค์ทันที',
            },
            {
              label: 'Step 2',
              text: 'Speak clearly, avoid slang',
              sub: 'พูดชัดเจน หลีกเลี่ยงคำสแลง',
            },
            {
              label: 'Step 3',
              text: 'Ask politely when needed',
              sub: 'ถามด้วยความสุภาพเมื่อต้องการข้อมูล',
            },
            {
              label: 'Step 4',
              text: 'Listen actively and take notes',
              sub: 'ตั้งใจฟังและจดบันทึกหากจำเป็น',
            },
            {
              label: 'Step 5',
              text: 'Confirm agreements or next steps',
              sub: 'ยืนยันข้อตกลงหรือขั้นตอนต่อไป',
            },
            {
              label: 'Step 6',
              text: 'End the call gracefully',
              sub: 'วางสายอย่างสุภาพและน่าประทับใจ',
            },
          ],
        },
        {
          icon: '🗂️',
          title: 'Toolkit 1: Opening & Purpose',
          subtitle: 'การรับสายและถามจุดประสงค์',
          color: 'blue',
          items: [
            { label: '📱', text: 'Hello, this is [Your Name].' },
            { label: '📱', text: 'Good morning/afternoon, [Your Name] speaking.' },
            { label: '📱', text: 'Thank you for calling [School Name]. How can I help you?' },
            { label: '❓', text: 'May I ask what the nature of your call is today?' },
            { label: '❓', text: 'Could you please let me know the reason for your call?' },
            {
              label: '❓',
              text: 'Before we proceed, would you mind sharing the purpose of your call?',
            },
          ],
        },
        {
          icon: '🔄',
          title: 'Toolkit 2: Managing the Call',
          subtitle: 'การจัดการสายเรียกเข้า',
          color: 'green',
          items: [
            { label: '✉️', text: "I'll note down your message and ensure it gets to [person]." },
            {
              label: '✉️',
              text: 'May I ask who is calling, and can I take a message for [person]?',
            },
            { label: '🔀', text: 'Let me transfer your call to [name/department].' },
            { label: '🔀', text: 'Please hold for a moment while I transfer your call.' },
            { label: '🔀', text: "One moment, please. I'll transfer you to the right department." },
            {
              label: '⏳',
              text: "I'm sorry, [Name] is unavailable. Would you like to leave a message?",
            },
          ],
        },
        {
          icon: '👋',
          title: 'Toolkit 3: Ending Gracefully',
          subtitle: 'การวางสายอย่างน่าประทับใจ',
          color: 'yellow',
          items: [
            { text: 'Thank you for calling. Have a great day!' },
            { text: 'It was a pleasure speaking with you. Take care.' },
            { text: 'I appreciate your time. Goodbye for now.' },
            { text: 'If you need any further assistance, feel free to call back. Goodbye!' },
            { text: "I'll make sure to pass on the message. Goodbye and have a nice day!" },
          ],
        },
      ],
      preQuiz: [
        {
          question: 'What is the first step you should take immediately when making a phone call?',
          options: [
            'Speak about random topics',
            'Introduce yourself and state the purpose of your call',
            'Ask for advice on homework',
            'Confirm the next steps',
          ],
          answer: 1,
        },
        {
          question: 'Which phrase is most appropriate for picking up a phone call professionally?',
          options: [
            'Hey, who is this?',
            'Thank you for calling ABC School. How can I assist you?',
            'Wait a minute, what do you want?',
            'Speak up please!',
          ],
          answer: 1,
        },
        {
          question: 'If the person a caller wants to talk to is unavailable, what should you say?',
          options: [
            'They are not here, call back next week',
            'Unfortunately, they are dead',
            "I'm sorry, but it seems like [Name] is unavailable. Would you like to leave a message?",
            "I don't know where they are",
          ],
          answer: 2,
        },
        {
          question:
            'What does the receptionist mean by: Please hold for a moment while I transfer your call?',
          options: [
            'Hang up immediately',
            'Please wait while I connect you to the other person',
            'Write down a message',
            'Call again later',
          ],
          answer: 1,
        },
      ],
      postQuiz: [
        {
          question: 'Which phrase is used for taking a message during phone calls?',
          options: [
            'Let me transfer your call',
            "I'll note down your message and ensure it gets to them",
            'Could you explain the reason for your call?',
            'Good morning, [Name] speaking',
          ],
          answer: 1,
        },
        {
          question: "How do you politely ask for the caller's phone number for verification?",
          options: [
            'Give me your number now',
            'Could you please repeat your phone number for verification?',
            'Why did you call this number?',
            'What is your number?',
          ],
          answer: 1,
        },
        {
          question: 'Which of the following is a polite sentence for ending a phone call?',
          options: [
            'Bye, I am busy',
            'Thank you for calling. Have a great day!',
            'Get lost!',
            'Okay, finish now',
          ],
          answer: 1,
        },
        {
          question: 'What does "multitasking" mean for a teacher handling calls?',
          options: [
            'Doing only one task at a time',
            'Juggling teaching, administrative tasks, and phone calls efficiently',
            'Ignoring phone calls entirely',
            'Playing games while teaching',
          ],
          answer: 1,
        },
      ],
      scrambleWords: ['TELEPHONE', 'ETIQUETTE', 'VERIFICATION', 'UNAVAILABLE'],
      scrambleHints: ['โทรศัพท์', 'มารยาท', 'การยืนยันความถูกต้อง', 'ไม่สะดวก/ไม่อยู่'],
      unscrambleDialogue: [
        { id: 1, text: 'A: Thank you for calling ABC High School. How can I help you?', order: 0 },
        { id: 2, text: "B: Hello, I'd like to speak with Mr. Davis, please.", order: 1 },
        { id: 3, text: 'A: Please hold for a moment while I transfer your call.', order: 2 },
        { id: 4, text: 'B: Thank you very much.', order: 3 },
      ],
      fullQuiz: {
        partA: [
          {
            question: 'According to the lesson, what should you do first when making a phone call?',
            options: [
              'Talk about the weather for a while to be friendly.',
              'Introduce yourself and state the purpose of your call immediately.',
              'Wait for the other person to guess who you are.',
              'Use as much slang as possible to sound natural.',
            ],
            answer: 1,
          },
          {
            question:
              'You are a teacher answering the school phone. Which sentence is the most appropriate way to pick up the call?',
            options: [
              '"Who is this and what do you want?"',
              '"Thank you for calling Sunshine School. How can I help you?"',
              '"I\'m busy, call again later."',
              '"Just a second, I don\'t have time."',
            ],
            answer: 1,
          },
          {
            question:
              'A caller has not said why they are calling. Which sentence politely asks for the purpose of the call?',
            options: [
              '"Could you please let me know the reason for your call?"',
              '"Why are you bothering me?"',
              '"Goodbye and have a nice day."',
              '"Please hold while I transfer your call."',
            ],
            answer: 0,
          },
          {
            question:
              'The person the caller wants is out, and you want to write down what the caller says. Which phrase should you use?',
            options: [
              '"Let me transfer your call to another department."',
              '"Thank you for calling. Goodbye."',
              '"I\'ll note down your message and make sure it gets to him."',
              '"Good morning, who am I speaking with?"',
            ],
            answer: 2,
          },
          {
            question:
              'A caller has reached the wrong person and needs to speak to someone else. Which sentence is used to transfer the call?',
            options: [
              '"Please hold for a moment while I transfer your call."',
              '"I\'m sorry, you have the wrong number, goodbye."',
              '"Could you repeat your phone number for verification?"',
              '"It was a pleasure speaking with you."',
            ],
            answer: 0,
          },
          {
            question:
              'Ms. Garcia is not available when a parent calls. What is the best thing for the receptionist to say?',
            options: [
              '"She will never call you back."',
              '"I\'m sorry, Ms. Garcia is unavailable at the moment. Would you like to leave a message?"',
              '"Stop calling this number."',
              '"Turn to page 10 of your book."',
            ],
            answer: 1,
          },
          {
            question: 'Which sentence is the most suitable way to end a phone call politely?',
            options: [
              '"Thank you for calling. Have a great day!"',
              '"Why did you call me?"',
              '"Please state the reason for your call."',
              '"Who am I speaking with?"',
            ],
            answer: 0,
          },
        ],
        partB: {
          expressions: [
            'Answering an incoming call',
            'Asking the reason for the call',
            'Transferring the call to someone else',
            'Ending the call politely',
          ],
          replies: [
            { key: 'a', text: '"Please hold for a moment while I transfer your call."' },
            { key: 'b', text: '"Thank you for calling Greenfield School. How can I help you?"' },
            { key: 'c', text: '"It was a pleasure speaking with you. Take care."' },
            { key: 'd', text: '"May I ask what the nature of your call is today?"' },
          ],
          answers: ['b', 'd', 'a', 'c'],
        },
        partC: [
          {
            contextText:
              "Teacher: Hello, this is Ms. Parker calling. Is this Sarah?\nStudent: (1) ____________________\nTeacher: I wanted to check if you're available to meet tomorrow after school to discuss your exam.\nStudent: (2) ____________________\nTeacher: Great. Let's meet in my classroom at 3:30 pm. Goodbye.",
            subQuestions: [
              { label: 'Student พูดว่า (1):', sampleAnswer: 'Yes, this is Sarah.' },
              {
                label: 'Student พูดว่า (2):',
                sampleAnswer: 'Yes, I can meet tomorrow. What time works for you?',
              },
            ],
          },
          {
            contextText:
              'Situation: You are a teacher acting as the school receptionist. A parent phones and asks to speak to Mr. Lee, but Mr. Lee is teaching and is not available right now.\nSpeak TWO sentences: answer the call + explain that Mr. Lee is unavailable and offer to help.',
            subQuestions: [
              {
                label: 'ประโยคที่ 1 (รับสายและทักทาย):',
                sampleAnswer: 'Good morning, thank you for calling Riverside School.',
              },
              {
                label: 'ประโยคที่ 2 (แจ้งว่าไม่อยู่และเสนอช่วยเหลือ):',
                sampleAnswer:
                  "I'm sorry, but Mr. Lee is in class and unavailable at the moment. Would you like to leave a message, or shall I ask him to call you back?",
              },
            ],
          },
        ],
      },
    },
    {
      id: 3,
      number: 'Unit 3',
      title: 'Giving Presentation',
      description:
        'เรียนรู้เทคนิคการนำเสนอผลงานเชิงวิชาการ โครงสร้างสไลด์ การตอบคำถามและการควบคุมอารมณ์',
      lessons: [
        'โครงสร้างการนำเสนอ (Presentation Structure)',
        'ประโยคแนะนำตัวและเริ่มนำเสนอ',
        'การใช้ทัศนูปกรณ์ (Visual Aids)',
        'การตอบคำถามผู้ฟัง (Q&A Session)',
      ],
      vocabularies: [
        {
          word: 'Visual aids',
          pos: 'n.',
          reading: 'วิ-ชวล เอดส์',
          meaning: 'ทัศนูปกรณ์ / สื่อช่วยสอน',
        },
        { word: 'Takeaway', pos: 'n.', reading: 'เทค-อะ-เวย์', meaning: 'ข้อคิดหลัก / ข้อสรุป' },
        { word: 'Outline', pos: 'n.', reading: 'เอาต์-ไลน์', meaning: 'โครงร่าง / หัวข้อหลัก' },
        { word: 'Transition', pos: 'n.', reading: 'ทราน-ซิ-ชัน', meaning: 'การเชื่อมต่อส่วนต่างๆ' },
        {
          word: 'Q&A session',
          pos: 'n.',
          reading: 'คิว-แอนด์-เอ เซส-ชัน',
          meaning: 'ช่วงตอบคำถาม',
        },
        { word: 'Hook', pos: 'n.', reading: 'ฮุก', meaning: 'ประโยคดึงดูดความสนใจ' },
        {
          word: 'Interactive',
          pos: 'adj.',
          reading: 'อิน-เทอร์-แอก-ทีฟ',
          meaning: 'ที่มีปฏิสัมพันธ์สื่อสารสองทาง',
        },
        {
          word: 'Articulation',
          pos: 'n.',
          reading: 'อาร์-ทิ-คิว-เล-ชัน',
          meaning: 'การออกเสียงอย่างชัดเจน',
        },
        {
          word: 'Adaptability',
          pos: 'n.',
          reading: 'อะ-แดป-ทา-บิ-ลิ-ตี้',
          meaning: 'ความสามารถในการปรับตัว',
        },
        { word: 'Storytelling', pos: 'n.', reading: 'สโต-รี่-เทล-ลิง', meaning: 'การเล่าเรื่อง' },
      ],
      dialogues: [
        {
          role1: 'Presenter',
          text1:
            'Good morning, everyone. My name is Sarah, and I am excited to be here today to discuss environmental safety.',
          role2: 'Audience member',
          text2:
            'Thank you for the introduction. Can you explain how this plan relates to school safety?',
        },
        {
          role1: 'Presenter',
          text2: "That's a great question. Let's transition to Slide 3 to look at the school data.",
          role2: 'Audience member',
          text1: 'Ah, I see. Thank you.',
        },
      ],
      preQuiz: [
        {
          question: 'What is the first step you should take when preparing for a presentation?',
          options: [
            'Create your PowerPoint slides',
            'Understand your audience',
            'Practice your speech',
            'Choose your outfit',
          ],
          answer: 1,
        },
        {
          question: 'When should you start practicing your presentation?',
          options: [
            'The day before',
            'A few minutes before',
            'Several days or weeks in advance',
            'Only after you finish slides',
          ],
          answer: 2,
        },
        {
          question: 'What is the recommended length for an effective presentation?',
          options: ['5 minutes', '15-30 minutes', '1 hour', 'As long as possible'],
          answer: 1,
        },
        {
          question: 'Which of the following is an effective way to engage your audience?',
          options: [
            'Reading directly from slides',
            'Asking questions to get them involved',
            'Speaking in a monotone voice',
            'Avoiding eye contact',
          ],
          answer: 1,
        },
      ],
      postQuiz: [
        {
          question: 'What is the primary purpose of the introduction in a presentation?',
          options: [
            'To summarize all data points',
            "To grab the audience's attention and provide an overview",
            'To show references',
            'To answer questions',
          ],
          answer: 1,
        },
        {
          question:
            "What should you do if an audience member asks a question you don't know the answer to?",
          options: [
            'Make up a fake answer',
            'Ignore the question and move on',
            "Admit you don't know and offer to follow up later",
            'Tell the audience they are wrong',
          ],
          answer: 2,
        },
        {
          question: 'During a presentation, how should you use slides?',
          options: [
            'Read every word on slides verbatim',
            'Speak as fast as possible to finish slides',
            'Use visuals to reinforce key points and maintain eye contact',
            'Do not look at the audience at all',
          ],
          answer: 2,
        },
        {
          question: 'Which phrase is best to introduce a key takeaway?',
          options: [
            'Next slide please',
            'This brings us to a key takeaway: [Point]',
            'I am done with this part',
            'Look at this picture',
          ],
          answer: 1,
        },
      ],
      scrambleWords: ['PRESENTATION', 'AUDIENCE', 'OUTLINE', 'TAKEAWAY'],
      scrambleHints: ['การนำเสนอ', 'ผู้ฟัง/ผู้ชม', 'โครงร่าง', 'ประเด็นสำคัญ/ข้อสรุป'],
      unscrambleDialogue: [
        {
          id: 1,
          text: 'Presenter: Good morning. Today I will discuss classroom technology.',
          order: 0,
        },
        { id: 2, text: "Presenter: First, let's look at the overview of devices.", order: 1 },
        {
          id: 3,
          text: 'Presenter: Next, I will show you student engagement statistics.',
          order: 2,
        },
        { id: 4, text: 'Finally, we will have a Q&A session.', order: 3 },
      ],
      fullQuiz: {
        partA: [
          {
            question: 'What is the FIRST step you should take when preparing for a presentation?',
            options: [
              'Create your slides.',
              'Understand your audience.',
              'Practice your speech.',
              'Choose your outfit.',
            ],
            answer: 1,
          },
          {
            question: 'When should you start practicing your presentation?',
            options: [
              'The day before.',
              'A few minutes before your presentation.',
              'Several days or weeks in advance.',
              'Only after you finish creating the slides.',
            ],
            answer: 2,
          },
          {
            question: 'What is the primary purpose of the introduction in a presentation?',
            options: [
              'To summarize the main points.',
              "To grab the audience's attention and provide an overview.",
              'To show all the data and visuals.',
              'To answer questions from the audience.',
            ],
            answer: 1,
          },
          {
            question: 'How can visual aids enhance your presentation?',
            options: [
              'They distract the audience.',
              'They can make complex information easier to understand.',
              'They should be used instead of spoken words.',
              'They are unnecessary.',
            ],
            answer: 1,
          },
          {
            question: 'Which body language is most effective during a presentation?',
            options: [
              'Standing still with your hands in your pockets.',
              'Using overly aggressive gestures.',
              'An open, confident posture with appropriate gestures and eye contact.',
              'Avoiding eye contact with the audience.',
            ],
            answer: 2,
          },
          {
            question: 'Which of the following is an effective way to engage your audience?',
            options: [
              'Reading directly from your slides.',
              'Asking questions to get them involved.',
              'Speaking in a monotone voice.',
              'Avoiding eye contact.',
            ],
            answer: 1,
          },
          {
            question:
              "What should you do if an audience member asks a question and you don't know the answer?",
            options: [
              'Make up an answer.',
              "Admit you don't know and offer to find out and follow up later.",
              'Change the subject.',
              'Ignore the question.',
            ],
            answer: 1,
          },
        ],
        partB: {
          expressions: [
            'Introducing yourself',
            'Transitioning to a new section',
            'Presenting data',
            'Concluding the presentation',
          ],
          replies: [
            {
              key: 'a',
              text: '"Now that we\'ve covered the background, let\'s move on to our main findings."',
            },
            {
              key: 'b',
              text: '"Good afternoon, everyone. My name is Anna, and I\'m here to discuss today\'s topic."',
            },
            { key: 'c', text: '"To summarize, we have discussed our three main points."' },
            { key: 'd', text: '"Here is a graph that illustrates this data point."' },
          ],
          answers: ['b', 'a', 'd', 'c'],
        },
        partCOrder: {
          instruction: 'เรียงลำดับส่วนประกอบของการนำเสนอจากต้น (1) ถึงปลาย (5)',
          items: [
            {
              text: 'Conclusion: summarize the key points and give a call to action.',
              correctPosition: 4,
            },
            {
              text: 'Background information that sets the stage for the topic.',
              correctPosition: 2,
            },
            { text: 'Greeting and self-introduction (title slide).', correctPosition: 1 },
            { text: 'Q&A: invite questions from the audience.', correctPosition: 5 },
            { text: 'Body: present the key points with examples and data.', correctPosition: 3 },
          ],
        },
        partC: [
          {
            contextText:
              'Situation: You have just finished a 20-minute presentation in English. Five listeners raise their hands to ask questions, but there is no time left.\nSpeak TWO sentences to respond politely — thank them and offer another way to answer their questions.',
            subQuestions: [
              {
                label: 'ประโยคที่ 1 (ขอบคุณผู้ฟัง):',
                sampleAnswer: 'Thank you so much for all of your questions.',
              },
              {
                label: 'ประโยคที่ 2 (เสนอทางแก้):',
                sampleAnswer:
                  "Unfortunately, we're out of time, but I'll be available right after this session, and you're welcome to email me with any further questions.",
              },
            ],
          },
        ],
      },
    },
    {
      id: 4,
      number: 'Unit 4',
      title: 'Teacher Meeting & Conference',
      description:
        'เรียนรู้คำศัพท์การประชุมครู โครงสร้างขั้นตอนการประชุม การเจรจาต่อรอง และการเสนอข้อตกลง',
      lessons: [
        'การเตรียมตัวก่อนประชุม (Meeting Preparation)',
        'คำศัพท์ที่ใช้ในการประชุม (Meeting Vocabulary)',
        'การนำเสนอวาระและการเปลี่ยนประเด็น',
        'การเจรจาต่อรองและการโหวตเสนอความเห็น',
      ],
      vocabularies: [
        { word: 'Agenda', pos: 'n.', reading: 'อะ-เจน-ดา', meaning: 'ระเบียบวาระการประชุม' },
        { word: 'Minutes', pos: 'n.', reading: 'มิน-นิทส์', meaning: 'รายงานการประชุม' },
        {
          word: 'Stakeholders',
          pos: 'n.',
          reading: 'สเตก-โฮล-เดอร์ส',
          meaning: 'ผู้มีส่วนได้ส่วนเสีย',
        },
        { word: 'Brainstorming', pos: 'v.', reading: 'เบรน-สตรอม-มิง', meaning: 'การระดมความคิด' },
        { word: 'Chairperson', pos: 'n.', reading: 'แชร์-เพอร์-ซัน', meaning: 'ประธานในที่ประชุม' },
        {
          word: 'Action item',
          pos: 'n.',
          reading: 'แอก-ชัน ไอ-เทม',
          meaning: 'หัวข้อที่ต้องดำเนินงานต่อ',
        },
        {
          word: 'Decision-making',
          pos: 'n.',
          reading: 'ดิ-ซิ-ชัน-เมก-กิง',
          meaning: 'การตัดสินใจ',
        },
        { word: 'Negotiation', pos: 'n.', reading: 'เน-โก-ชิ-เอ-ชัน', meaning: 'การเจรจาต่อรอง' },
        { word: 'Curriculum', pos: 'n.', reading: 'คิว-ริ-คิว-ลัม', meaning: 'หลักสูตร' },
        {
          word: 'Common ground',
          pos: 'n.',
          reading: 'คอม-มอน กราวด์',
          meaning: 'ข้อตกลงร่วมกัน / จุดร่วม',
        },
      ],
      dialogues: [
        {
          role1: 'Meeting Leader',
          text1:
            "Let's review the budget proposal for the next term. Can someone provide an update?",
          role2: 'Participant A',
          text2:
            'I believe we should allocate more funds to teaching technology to support new classes.',
        },
        {
          role1: 'Meeting Leader',
          text2: "I understand your point. Let's discuss how we can balance the fund allocation.",
          role2: 'Participant A',
          text1: 'Yes, that sounds like a fair approach.',
        },
      ],
      preQuiz: [
        {
          question: 'What is the "Agenda" of a meeting?',
          options: [
            'A list of people attending',
            'A list of items to be discussed or acted upon',
            'The minutes document',
            'A break time schedule',
          ],
          answer: 1,
        },
        {
          question: 'Who is typically responsible for taking meeting minutes?',
          options: ['The chairperson', 'The secretary', 'All participants', 'The principal only'],
          answer: 1,
        },
        {
          question: 'What does "Brainstorming" refer to?',
          options: [
            'A storm causing meeting cancellation',
            'A creative technique to generate a large number of ideas',
            'Strict decision-making by leader',
            'An argument in the room',
          ],
          answer: 1,
        },
        {
          question: 'Which phrase is suitable for transitioning to the next topic?',
          options: [
            "With that settled, let's move on to our next agenda item",
            'Stop talking about this',
            "I don't want to discuss this",
            'Time is up!',
          ],
          answer: 0,
        },
      ],
      postQuiz: [
        {
          question: 'Which of the following describes "Minutes" in a meeting context?',
          options: [
            'Time units (60 seconds)',
            'A written record of what was discussed and decided',
            'A summary of teacher salaries',
            'The agenda list',
          ],
          answer: 1,
        },
        {
          question: 'Which sentence is polite for negotiation in a meeting?',
          options: [
            "I appreciate your perspective, and I'm hopeful we can find common ground",
            'My idea is the only correct one',
            "You don't understand school policies",
            'We must do it my way',
          ],
          answer: 0,
        },
        {
          question: 'What role does a "Chairperson" play in a meeting?',
          options: [
            'Cleans the meeting room',
            'Leads the meeting and ensures it stays on track',
            'Takes minutes of the meeting',
            'Serves coffee to guests',
          ],
          answer: 1,
        },
        {
          question: 'Which phrase is best for ending a meeting?',
          options: [
            'I am leaving now',
            'Thank you all for your valuable contributions. This concludes our meeting.',
            "Okay, let's argue next week",
            'Get out of the room',
          ],
          answer: 1,
        },
      ],
      scrambleWords: ['AGENDA', 'MINUTES', 'CHAIRPERSON', 'STAKEHOLDER'],
      scrambleHints: [
        'วาระการประชุม',
        'รายงานการประชุม',
        'ประธานที่ประชุม',
        'ผู้มีส่วนได้ส่วนเสีย',
      ],
      unscrambleDialogue: [
        { id: 1, text: "Leader: Good afternoon. Let's start our teacher meeting.", order: 0 },
        { id: 2, text: 'Leader: First, we will review the safety protocols.', order: 1 },
        { id: 3, text: 'Member: I suggest we hold a drill next Friday.', order: 2 },
        { id: 4, text: "Leader: Great. Let's vote on this suggestion.", order: 3 },
      ],
      fullQuiz: {
        partA: [
          {
            question:
              'According to the lesson, what is the FIRST thing you should do when preparing a successful meeting?',
            options: [
              'Identify the purpose of the meeting.',
              'Send out the invitations first.',
              'Prepare the handouts and slides.',
              'Take the meeting minutes.',
            ],
            answer: 0,
          },
          {
            question:
              'Who is usually responsible for taking the minutes and managing the meeting documents?',
            options: ['The meeting leader', 'The advisors', 'The secretary', 'The audience'],
            answer: 2,
          },
          {
            question: 'In a meeting, what is an "agenda"?',
            options: [
              'A written record of what was discussed and decided.',
              'A list of items to be discussed during the meeting.',
              'The person who leads the meeting.',
              'Tasks that must be completed after the meeting.',
            ],
            answer: 1,
          },
          {
            question: 'Which sentence would a chairperson use to move on to the next agenda item?',
            options: [
              '"Thank you all; this concludes our meeting."',
              '"Let me introduce our meeting leader."',
              '"Could you please repeat that?"',
              '"With that settled, let\'s move on to our next agenda item."',
            ],
            answer: 3,
          },
          {
            question: 'Which sentence is used to close (end) a meeting?',
            options: [
              '"Let\'s begin with our first agenda item."',
              '"Could you elaborate on your proposal?"',
              '"I appreciate everyone\'s time and input today. Let\'s adjourn the meeting."',
              '"Who am I speaking with?"',
            ],
            answer: 2,
          },
          {
            question:
              'During a disagreement, which sentence shows polite negotiation and a willingness to find common ground?',
            options: [
              '"You are wrong, and we will do it my way."',
              '"I appreciate your perspective, and I\'m hopeful we can find common ground."',
              '"This meeting is over; I don\'t want to discuss it."',
              '"I don\'t care about your opinion."',
            ],
            answer: 1,
          },
          {
            question: 'Why should the agenda be shared with participants before the meeting?',
            options: [
              'So that participants can prepare in advance.',
              'So that the meeting can start late.',
              'So that no one needs to attend.',
              "So that the secretary doesn't have to take minutes.",
            ],
            answer: 0,
          },
        ],
        partB: {
          expressions: ['Minutes', 'Stakeholders', 'Chairperson', 'Follow-up'],
          replies: [
            { key: 'a', text: 'The person who leads the meeting and keeps it on track.' },
            { key: 'b', text: 'A written record of what was discussed and decided.' },
            {
              key: 'c',
              text: 'Actions taken after the meeting to ensure decisions are carried out.',
            },
            {
              key: 'd',
              text: 'Individuals or groups who have an interest in the outcome of the meeting.',
            },
          ],
          answers: ['b', 'd', 'a', 'c'],
        },
        partC: [
          {
            contextText:
              "Chairperson: Let's move on to the budget for next year. Does anyone have a suggestion?\nTeacher A: (1) ____________________\nChairperson: Thank you for your input. (2) ____________________\nTeacher B: I'd like us to talk about the upcoming school event.",
            subQuestions: [
              {
                label: 'Teacher A พูดว่า (1):',
                sampleAnswer: 'I suggest we allocate more funds to the STEM program.',
              },
              {
                label: 'Chairperson พูดว่า (2):',
                sampleAnswer: "Now that we've covered that, let's move on to our next agenda item.",
              },
            ],
          },
          {
            contextText:
              'Situation: You are the chairperson of a teacher meeting and you have finished discussing all the agenda items.\nSpeak TWO sentences to close the meeting politely — thank everyone and adjourn.',
            subQuestions: [
              {
                label: 'ประโยคที่ 1 (ขอบคุณ):',
                sampleAnswer: 'Thank you all for your valuable contributions today.',
              },
              {
                label: 'ประโยคที่ 2 (ปิดการประชุม):',
                sampleAnswer:
                  "With that, let's bring this meeting to a close — have a great day, everyone.",
              },
            ],
          },
        ],
      },
    },
    {
      id: 5,
      number: 'Unit 5',
      title: 'Giving Instruction in English',
      description:
        'เรียนรู้ภาษาอังกฤษสำหรับการสั่งงานนักศึกษา การจัดกลุ่มทำงาน และการให้ข้อเสนอแนะสะท้อนคิด',
      lessons: [
        'การสั่งงานที่มีประสิทธิภาพ (Effective Instructions)',
        'ประโยคจัดกลุ่มกิจกรรม (Group Work)',
        'การทดสอบความเข้าใจ (Checking Understanding)',
        'การให้และรับข้อเสนอแนะ (Feedback Stage)',
      ],
      vocabularies: [
        {
          word: 'Break down',
          pos: 'phr.v.',
          reading: 'เบรก ดาวน์',
          meaning: 'แบ่งเป็นขั้นตอนย่อย',
        },
        {
          word: 'Peer feedback',
          pos: 'n.',
          reading: 'เพียร์ ฟีด-แบ็ก',
          meaning: 'ข้อเสนอแนะจากเพื่อน',
        },
        {
          word: 'Sequence words',
          pos: 'n.',
          reading: 'ซี-เควนส์ เวิร์ดส์',
          meaning: 'คำลำดับขั้นตอน',
        },
        {
          word: 'Consensus',
          pos: 'n.',
          reading: 'คอน-เซน-ซัส',
          meaning: 'มติเอกฉันท์ / ข้อตกลงร่วม',
        },
        { word: 'Excel', pos: 'v.', reading: 'เอ็ก-เซล', meaning: 'ทำได้ดีเยี่ยม' },
        {
          word: 'Straightforward',
          pos: 'adj.',
          reading: 'สเตรท-ฟอร์-เวิร์ด',
          meaning: 'ตรงไปตรงมา / เข้าใจง่าย',
        },
        { word: 'Comprehension', pos: 'n.', reading: 'คอม-พรี-เฮน-ชัน', meaning: 'ความเข้าใจ' },
        { word: 'Worksheet', pos: 'n.', reading: 'เวิร์ก-ชีต', meaning: 'ใบงาน' },
        {
          word: 'Collaboration',
          pos: 'n.',
          reading: 'โค-แลบ-โบ-เร-ชัน',
          meaning: 'การทำงานร่วมกัน',
        },
        {
          word: 'Enthusiasm',
          pos: 'n.',
          reading: 'เอ็น-ธู-ซิ-แอส-ซึม',
          meaning: 'ความกระตือรือร้น',
        },
      ],
      dialogues: [
        {
          role1: 'Teacher',
          text1:
            'Okay, everyone, for our practice stage, I want you to pair up with someone next to you. Take the math problems and work together.',
          role2: 'Student',
          text2: 'Teacher, what should we do if we finish early?',
        },
        {
          role1: 'Teacher',
          text2:
            'If you finish, please double-check your work or try the bonus exercises on the board.',
          role2: 'Student',
          text1: 'Understood. We will start now.',
        },
      ],
      preQuiz: [
        {
          question: 'To ensure clear instructions, what should a teacher do?',
          options: [
            'Use complex vocabulary and jargon',
            'Use simple and clear language, and break tasks down',
            'Speak as quickly as possible',
            'Give instructions only once without checks',
          ],
          answer: 1,
        },
        {
          question: 'Which of the following is a sequence word?',
          options: ['Red', 'Table', 'Finally', 'School'],
          answer: 2,
        },
        {
          question: 'Which sentence is suitable for the practice stage in class?',
          options: [
            'Please pair up with a partner to discuss your answers',
            'Be quiet and sleep',
            'Write a test for 2 hours',
            'Go to the school principal',
          ],
          answer: 0,
        },
        {
          question: 'What does "Check for understanding" mean?',
          options: [
            'Write down notes',
            'Encourage listeners to ask questions or repeat instructions back',
            'Ignore student confusion',
            'Mark student attendance',
          ],
          answer: 1,
        },
      ],
      postQuiz: [
        {
          question: 'Which phrase is best for giving constructive feedback to a student?',
          options: [
            'Your work is bad',
            'Your presentation was clear; however, consider slowing down a bit',
            'You failed this unit',
            'Do it again!',
          ],
          answer: 1,
        },
        {
          question: 'What should a teacher say when starting the warm-up stage?',
          options: [
            "What's your favorite book, and why do you love it?",
            'Read Chapter 5 now',
            'The exam starts today',
            'Good bye, class',
          ],
          answer: 0,
        },
        {
          question: 'Which of the following is a student-to-teacher feedback sentence?',
          options: [
            'Excellent job on your essay!',
            'I appreciate the extra resources you provided; they helped clarify my understanding',
            'Keep up the good work!',
            'One area for improvement is...',
          ],
          answer: 1,
        },
        {
          question: 'What does "Consensus" refer to in group instructions?',
          options: [
            'An argument between friends',
            'An agreement reached by a group as a whole',
            "A teacher's direct command",
            'A test score sheet',
          ],
          answer: 1,
        },
      ],
      scrambleWords: ['INSTRUCTION', 'CONSENSUS', 'FEEDBACK', 'SEQUENCE'],
      scrambleHints: ['การสั่งงาน/คำสั่ง', 'มติร่วมกัน', 'ข้อเสนอแนะ', 'ลำดับขั้นตอน'],
      unscrambleDialogue: [
        { id: 1, text: 'Teacher: Everyone, please take out your notebooks.', order: 0 },
        { id: 2, text: 'Teacher: First, write down the new vocabularies.', order: 1 },
        { id: 3, text: 'Teacher: Next, discuss the meaning with your partner.', order: 2 },
        { id: 4, text: 'Teacher: Finally, share your sentences with the class.', order: 3 },
      ],
      fullQuiz: {
        partA: [
          {
            question: 'According to the lesson, what is the best way to give clear instructions?',
            options: [
              'Use complex vocabulary and technical jargon to sound professional.',
              'Speak as fast as possible to save time.',
              'Use simple and clear language that is easy to understand.',
              'Give all the steps at once without stopping.',
            ],
            answer: 2,
          },
          {
            question: 'What does it mean to "break it down" when giving instructions?',
            options: [
              'Speak very loudly.',
              'Divide a complex task into smaller, manageable steps.',
              'Skip the difficult parts of the task.',
              'Let students figure it out on their own.',
            ],
            answer: 1,
          },
          {
            question: 'Which is a good way to check that learners understand your instructions?',
            options: [
              'Move on quickly without asking anything.',
              'Tell them not to ask questions.',
              'Assume everyone already understands.',
              'Ask them to repeat the instructions back to you.',
            ],
            answer: 3,
          },
          {
            question: 'Which set of words is used to show the ORDER of steps in an instruction?',
            options: [
              'First, Next, Then, Finally',
              'Because, Although, However, Therefore',
              'Big, Small, Tall, Short',
              'Happy, Sad, Angry, Excited',
            ],
            answer: 0,
          },
          {
            question:
              'Which sentence would a teacher most likely use during the WARM-UP stage of a lesson?',
            options: [
              '"Please complete the exercises in your textbook for homework."',
              '"First, gather all your ingredients and tools."',
              '"What\'s your favorite book, and why do you love it?"',
              '"As we conclude this unit, let\'s review the key concepts."',
            ],
            answer: 2,
          },
          {
            question:
              'Which sentence is an example of constructive feedback from a teacher to a student?',
            options: [
              '"Your work is terrible."',
              '"Your presentation was clear and engaging; however, consider slowing down a bit."',
              '"I don\'t want to read this."',
              '"Just try harder next time."',
            ],
            answer: 1,
          },
        ],
        partB: {
          expressions: ['Warm-up', 'Presentation (steps)', 'Practice', 'Ending the unit'],
          replies: [
            {
              key: 'a',
              text: '"Now, work in small groups to solve the problems on this worksheet."',
            },
            {
              key: 'b',
              text: '"As we conclude this unit, let\'s review the key concepts we\'ve covered."',
            },
            { key: 'c', text: '"If you could travel anywhere in the world, where would you go?"' },
            { key: 'd', text: '"First, the process begins with selecting the perfect location."' },
          ],
          answers: ['c', 'd', 'a', 'b'],
        },
        partCOrder: {
          instruction: 'เรียงลำดับขั้นตอนการส่งอีเมล จากขั้นแรก (1) ถึงขั้นสุดท้าย (5)',
          items: [
            { text: 'Then, write a subject and type your message.', correctPosition: 3 },
            { text: 'Finally, click "Send."', correctPosition: 5 },
            { text: 'First, open your email and click "Compose."', correctPosition: 1 },
            { text: 'After that, attach any files if you need to.', correctPosition: 4 },
            {
              text: 'Next, type the recipient\'s email address in the "To" box.',
              correctPosition: 2,
            },
          ],
        },
        partC: [
          {
            contextText:
              'Using the sequencing words First, Next, Then, and Finally, speak a short instruction (3–4 steps) explaining how to do ONE of these: make a cup of tea, log in to a website, or search for a video online.',
            subQuestions: [
              {
                label: 'ขั้นตอนที่ 1-2 (First, Next):',
                sampleAnswer: 'First, boil some water. Next, put a tea bag in a cup.',
              },
              {
                label: 'ขั้นตอนที่ 3-4 (Then, Finally):',
                sampleAnswer:
                  'Then, pour the hot water into the cup and wait two minutes. Finally, remove the tea bag and add sugar or milk if you like.',
              },
            ],
          },
          {
            contextText:
              'Situation: A student has just given a presentation. It had good content, but the student spoke very fast and quietly.\nSpeak TWO sentences of constructive feedback — say something positive AND give one helpful suggestion.',
            subQuestions: [
              {
                label: 'ประโยคเชิงบวก (Positive comment):',
                sampleAnswer:
                  'You did a great job explaining your main ideas, and your slides were clear.',
              },
              {
                label: 'ข้อเสนอแนะ (Suggestion):',
                sampleAnswer:
                  'Next time, try to speak a little more slowly and loudly so everyone can follow you easily.',
              },
            ],
          },
        ],
      },
    },
  ];

  units: Unit[] = this.richYear1Seed;

  currentUnit: Unit = this.units[0];

  /** Mirrors the original ngOnInit sequence (student.component.ts:2960-2969):
   *  reset `units`/`currentUnit` from the year-specific fallback, then kick off
   *  the async DB load. Call once per student session bootstrap. */
  initForSession(): void {
    this.units = this.getYearFallbackUnits(this.sessionService.activeYearLevel);
    if (this.units.length > 0) {
      this.currentUnit = this.units[0];
    }
    this.loadLessonsFromDb();
  }

  loadLessonsFromDb(): void {
    const staticUnitsFallback = this.getYearFallbackUnits(this.sessionService.activeYearLevel);

    this.apiService.getLessons().subscribe({
      next: (data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          // กรองด้วยห้องเรียนที่นักศึกษาสังกัดจริง (classroom_id) แทนแค่ปี — นักศึกษาห้อง A
          // จะเห็นเฉพาะบทเรียนของห้อง A เท่านั้น ไม่เห็นของห้อง B แม้ปีเดียวกัน ถ้ายังไม่มีห้อง
          // สังกัดเลย (สมัครไว้ก่อนมีฟีเจอร์นี้/สมัครโดยไม่เลือกห้อง) fallback กลับไปกรองด้วย
          // ปีเหมือนเดิม กันไม่ให้เห็นรายการบทเรียนว่างเปล่าไปเฉยๆ
          const classroomId = this.sessionService.classroomId;
          const yearData = classroomId
            ? data.filter((les: any) => Number(les.classroom_id) === classroomId)
            : data.filter((les: any) => (les.year_level || 1) === this.sessionService.activeYearLevel);
          if (yearData.length > 0) {
            this.units = yearData.map((les: any, index: number) => {
              const fallbackUnit = staticUnitsFallback.find(u => u.id === les.id) || staticUnitsFallback[index];

              let allowed = ['scramble', 'dialogue'];
              if (les.contents && Array.isArray(les.contents)) {
                const gameItem = les.contents.find((c: any) => c.content_type === 'allowed_games');
                if (gameItem && gameItem.content_body) {
                  allowed = gameItem.content_body.split(',');
                }
              }

              // เนื้อหาเกมเฉพาะบทเรียนนี้ที่อาจารย์ตั้งเองจาก "Dedicated Game Creator
              // Studio" (custom_games) — ถ้ามีให้ใช้แทนคำศัพท์ที่ derive มาอัตโนมัติ/
              // ข้อมูล fallback ที่ตายตัวในโค้ด เฉพาะเกมที่มีข้อมูลจริงเท่านั้น
              let customGames: any = null;
              if (les.contents && Array.isArray(les.contents)) {
                const customGamesItem = les.contents.find((c: any) => c.content_type === 'custom_games');
                if (customGamesItem && customGamesItem.content_body) {
                  try {
                    customGames = JSON.parse(customGamesItem.content_body);
                  } catch {
                    customGames = null;
                  }
                }
              }

              let sentences: string[] = [];
              if (Array.isArray(les.speakingQuestions)) {
                sentences = les.speakingQuestions;
              } else if (les.speakingQuestions) {
                try {
                  sentences = typeof les.speakingQuestions === 'string' ? JSON.parse(les.speakingQuestions) : les.speakingQuestions;
                } catch {
                  sentences = [];
                }
              }

              if (sentences.length === 0 && fallbackUnit?.speakingQuestions) {
                sentences = fallbackUnit.speakingQuestions;
              }

              const vocabs = (les.vocabularies || []).map((v: any) => ({
                word: v.word || '',
                reading: v.pronunciation || 'คำอ่าน',
                pos: 'n.',
                meaning: v.meaning || '',
                example: v.example_sentence || ''
              }));

              let finalVocabs = vocabs.length > 0 ? vocabs : (fallbackUnit?.vocabularies || []);

              const topics = Array.isArray(les.topics) ? les.topics : (typeof les.topics === 'string' ? JSON.parse(les.topics) : []);
              const keywords = Array.isArray(les.keywords) ? les.keywords : (typeof les.keywords === 'string' ? JSON.parse(les.keywords) : []);
              const objectives = Array.isArray(les.objectives) ? les.objectives : (typeof les.objectives === 'string' ? JSON.parse(les.objectives) : []);
              const assessments = Array.isArray(les.assessments) ? les.assessments : (typeof les.assessments === 'string' ? JSON.parse(les.assessments) : []);

              // Word Scramble: ใช้คำที่อาจารย์กำหนดเองถ้ามี ไม่งั้น derive จากคำศัพท์เหมือนเดิม
              const customScrambleWords: string[] = (customGames?.scrambleWords || []).filter((w: string) => (w || '').trim());
              const scrambleWords = customScrambleWords.length > 0 ? customScrambleWords : finalVocabs.map((v: any) => v.word);
              const scrambleHints = customScrambleWords.length > 0
                ? customScrambleWords.map(() => '')
                : finalVocabs.map((v: any) => v.meaning);

              // Dialogue Sequencer: แปลงคู่บทสนทนาที่อาจารย์กำหนดเองเป็น 2 บรรทัดเรียงต่อกัน
              const customDialoguePairs = (customGames?.dialoguePairs || []).filter((p: any) => (p.speakerA || '').trim() && (p.speakerB || '').trim());
              let unscrambleDialogue = fallbackUnit?.unscrambleDialogue || [];
              if (customDialoguePairs.length > 0) {
                unscrambleDialogue = [];
                customDialoguePairs.forEach((pair: any, pIdx: number) => {
                  unscrambleDialogue.push({ id: pIdx * 2 + 1, text: pair.speakerA, order: pIdx * 2 });
                  unscrambleDialogue.push({ id: pIdx * 2 + 2, text: pair.speakerB, order: pIdx * 2 + 1 });
                });
              }

              // Picture → Word: โจทย์ที่อาจารย์กำหนดเอง (คำใบ้/คำตอบ/รูปที่อัปโหลด)
              const customPictureWords = (customGames?.pictureWords || [])
                .filter((p: any) => (p.correctWord || '').trim())
                .map((p: any) => ({ word: p.correctWord, meaning: p.hintText || '', clue: p.hintText || '', image: p.image || '' }));

              // Fill in the Blank: โจทย์ที่อาจารย์กำหนดเอง (ประโยคมี ___ อยู่แล้ว + คำตอบ)
              const customFillBlanks = (customGames?.fillBlanks || [])
                .filter((f: any) => (f.sentence || '').trim() && (f.missingWord || '').trim())
                .map((f: any) => ({
                  blanked: f.sentence,
                  answer: f.missingWord,
                  full: f.sentence.replace(/_{2,}/, f.missingWord),
                }));

              return {
                id: les.id,
                number: `Unit ${index + 1}`,
                title: les.name || fallbackUnit?.title || `Unit ${index + 1}`,
                description: les.description || fallbackUnit?.description || 'ไม่มีรายละเอียดเพิ่มเติม',
                lessons: fallbackUnit?.lessons || ['การเรียนรู้ตามหลักสูตร', 'การฝึกปฏิบัติและโต้ตอบ'],
                vocabularies: finalVocabs,
                dialogues: fallbackUnit?.dialogues || [{ role1: 'Teacher', text1: 'Welcome to the lesson.', role2: 'Student', text2: 'Hello teacher!' }],
                preQuiz: les.preQuiz || fallbackUnit?.preQuiz || [],
                postQuiz: les.postQuiz || fallbackUnit?.postQuiz || [],
                scrambleWords,
                scrambleHints,
                unscrambleDialogue,
                pictureWords: customPictureWords.length > 0 ? customPictureWords : undefined,
                fillBlankItems: customFillBlanks.length > 0 ? customFillBlanks : undefined,
                fullQuiz: les.fullQuiz || fallbackUnit?.fullQuiz,
                allowedGames: allowed,
                speakingQuestions: sentences,
                classHours: les.classHours || '⏱ 4 คาบเรียน',
                weekRange: les.weekRange || '📅 สัปดาห์ที่ 1',
                slidePath: les.slidePath || les.slide_path || '',
                coverImage: les.coverImage || les.cover_image || fallbackUnit?.coverImage || '',
                topics: topics,
                keywords: keywords,
                objectives: objectives,
                assessments: assessments
              };
            });
          } else {
            this.units = this.getYearFallbackUnits(this.sessionService.activeYearLevel);
          }
        } else {
          this.units = this.getYearFallbackUnits(this.sessionService.activeYearLevel);
        }

        if (this.units.length > 0) {
          this.currentUnit = this.units[0];
        }
      },
      error: () => {
        this.units = this.getYearFallbackUnits(this.sessionService.activeYearLevel);
        if (this.units.length > 0) {
          this.currentUnit = this.units[0];
        }
      }
    });
  }


  getYearFallbackUnits(year: number): Unit[] {
    if (year === 2) {
      return [
        {
          id: 6,
          number: 'Unit 1',
          title: 'Classroom Management & Discipline',
          description: 'การจัดการชั้นเรียนและการดูแลพฤติกรรมนักเรียนเป็นภาษาอังกฤษอย่างสร้างสรรค์',
          lessons: ['การตั้งกฎระเบียบในชั้นเรียน (Classroom Rules)', 'การเตือนและแก้ไขพฤติกรรมนักเรียนอย่างสุภาพ', 'การชมเชยและให้กำลังใจนักเรียน'],
          vocabularies: [
            { word: 'Discipline', pos: 'n.', reading: 'ดิส-ซิ-พลิน', meaning: 'วินัย', example: 'Discipline helps students stay focused in class.' },
            { word: 'Classroom rules', pos: 'n.', reading: 'คลาส-รูม รูลส์', meaning: 'กฎระเบียบในชั้นเรียน', example: "Let's review our classroom rules together." },
            { word: 'Misbehavior', pos: 'n.', reading: 'มิส-บิ-เฮฟ-เวียร์', meaning: 'พฤติกรรมไม่เหมาะสม', example: 'Please stop that misbehavior right now.' },
            { word: 'Warning', pos: 'n.', reading: 'วอร์น-นิ่ง', meaning: 'คำเตือน', example: 'This is your first warning.' },
            { word: 'Encourage', pos: 'v.', reading: 'เอ็น-เคอ-เรจ', meaning: 'ให้กำลังใจ', example: 'I want to encourage everyone to try their best.' }
          ],
          dialogues: [
            { role1: 'Teacher', text1: 'Please settle down and take your seats.', role2: 'Student', text2: "Sorry, teacher. We'll be quiet now." }
          ],
          cultureTips: ['ใช้น้ำเสียงหนักแน่นแต่ไม่ดุ เพื่อรักษาบรรยากาศเชิงบวกในชั้นเรียน'],
          lessonSections: [],
          preQuiz: [{ question: 'What phrase calms a noisy class?', options: ['Please settle down', 'Go away', 'Be quiet forever', 'I quit'], answer: 0 }],
          postQuiz: [{ question: 'How do you politely warn a student?', options: ['This is your first warning', 'You are bad', 'Get out', 'No talking ever'], answer: 0 }],
          scrambleWords: ['DISCIPLINE', 'WARNING', 'ENCOURAGE', 'BEHAVIOR'],
          scrambleHints: ['วินัย', 'คำเตือน', 'ให้กำลังใจ', 'พฤติกรรม'],
          speakingQuestions: [
            'Please settle down and take your seats, everyone.',
            'I want to encourage each of you to do your best today.',
            'Let us review our classroom rules together.'
          ]
        },
        {
          id: 7,
          number: 'Unit 2',
          title: 'Giving Feedback & Grading',
          description: 'การให้ข้อเสนอแนะเชิงสร้างสรรค์และการแจ้งผลคะแนนแก่นักเรียนเป็นภาษาอังกฤษ',
          lessons: ['การให้ Feedback เชิงบวกและเชิงพัฒนา', 'การอธิบายเกณฑ์การให้คะแนน (Grading Criteria)', 'การพูดคุยเรื่องผลการเรียนกับนักเรียน'],
          vocabularies: [
            { word: 'Feedback', pos: 'n.', reading: 'ฟีด-แบ็ค', meaning: 'ข้อเสนอแนะ', example: 'Thank you for your feedback on my essay.' },
            { word: 'Improve', pos: 'v.', reading: 'อิม-พรูฟ', meaning: 'พัฒนาให้ดีขึ้น', example: 'You need to improve your grammar.' },
            { word: 'Grading criteria', pos: 'n.', reading: 'เกรด-ดิ้ง ไคร-ทีเรีย', meaning: 'เกณฑ์การให้คะแนน', example: 'Let me explain the grading criteria for this project.' },
            { word: 'Strength', pos: 'n.', reading: 'สเตรงธ์', meaning: 'จุดแข็ง', example: 'Your strength is creative writing.' },
            { word: 'Weakness', pos: 'n.', reading: 'วีค-เนส', meaning: 'จุดอ่อน', example: 'Spelling is still a weakness for you.' }
          ],
          dialogues: [
            { role1: 'Teacher', text1: 'Your essay has great ideas, but you need to work on grammar.', role2: 'Student', text2: 'Thank you, I will practice more.' }
          ],
          cultureTips: ['เริ่มด้วยจุดแข็งก่อนแล้วค่อยแนะนำจุดที่ควรพัฒนา (Sandwich Feedback)'],
          lessonSections: [],
          preQuiz: [{ question: 'What should feedback start with?', options: ['A strength', 'A complaint', 'Silence', 'A grade only'], answer: 0 }],
          postQuiz: [{ question: 'What word means "to make something better"?', options: ['Improve', 'Ignore', 'Delete', 'Stop'], answer: 0 }],
          scrambleWords: ['FEEDBACK', 'IMPROVE', 'STRENGTH', 'WEAKNESS'],
          scrambleHints: ['ข้อเสนอแนะ', 'พัฒนาให้ดีขึ้น', 'จุดแข็ง', 'จุดอ่อน'],
          speakingQuestions: [
            'Your essay has great ideas, but you need to work on grammar.',
            'I really like how you structured this paragraph.',
            'Let me explain the grading criteria for this assignment.'
          ]
        },
        {
          id: 8,
          number: 'Unit 3',
          title: 'Parent-Teacher Conference',
          description: 'การประชุมพบปะผู้ปกครองเพื่อพูดคุยเรื่องพัฒนาการของนักเรียนเป็นภาษาอังกฤษ',
          lessons: ['การต้อนรับและแนะนำตัวกับผู้ปกครอง', 'การรายงานพัฒนาการด้านการเรียนของนักเรียน', 'การรับฟังและตอบคำถามผู้ปกครอง'],
          vocabularies: [
            { word: 'Progress', pos: 'n.', reading: 'โพร-เกรส', meaning: 'ความก้าวหน้า', example: 'He is making good progress in reading.' },
            { word: 'Concern', pos: 'n.', reading: 'คอน-เซิร์น', meaning: 'ข้อกังวล', example: 'I have a small concern about her attendance.' },
            { word: 'Development', pos: 'n.', reading: 'ดิ-เวล-ลัพ-เมนท์', meaning: 'พัฒนาการ', example: 'Her language development has improved a lot.' },
            { word: 'Attendance', pos: 'n.', reading: 'อะ-เทน-แดนซ์', meaning: 'การเข้าเรียน', example: 'His attendance record is excellent.' },
            { word: 'Recommend', pos: 'v.', reading: 'เรค-คอม-เมนด์', meaning: 'แนะนำ', example: 'I recommend more reading practice at home.' }
          ],
          dialogues: [
            { role1: 'Parent', text1: 'How is my son doing in class?', role2: 'Teacher', text2: 'He is making good progress, especially in reading.' }
          ],
          cultureTips: ['พูดถึงพัฒนาการเชิงบวกก่อนเสมอ แม้จะต้องแจ้งข้อกังวลก็ตาม'],
          lessonSections: [],
          preQuiz: [{ question: 'How do you start a positive conference?', options: ['He is making good progress', 'He is failing', 'No comment', 'I am busy'], answer: 0 }],
          postQuiz: [{ question: 'Which word means "to suggest something helpful"?', options: ['Recommend', 'Ignore', 'Refuse', 'Complain'], answer: 0 }],
          scrambleWords: ['PROGRESS', 'CONCERN', 'DEVELOPMENT', 'ATTENDANCE'],
          scrambleHints: ['ความก้าวหน้า', 'ข้อกังวล', 'พัฒนาการ', 'การเข้าเรียน'],
          speakingQuestions: [
            'He is making good progress, especially in reading.',
            'I have a small concern about her homework habits.',
            'I recommend more reading practice at home.'
          ]
        },
        {
          id: 9,
          number: 'Unit 4',
          title: 'Using Technology in the Classroom',
          description: 'การใช้สื่อเทคโนโลยีและการสอนออนไลน์เป็นภาษาอังกฤษ',
          lessons: ['คำศัพท์เกี่ยวกับอุปกรณ์และแอปพลิเคชันการสอน', 'การอธิบายขั้นตอนการใช้งานสื่อออนไลน์', 'การแก้ปัญหาเทคนิคเบื้องต้นระหว่างสอน'],
          vocabularies: [
            { word: 'Device', pos: 'n.', reading: 'ดิ-ไวซ์', meaning: 'อุปกรณ์', example: 'Please turn on your device.' },
            { word: 'Application', pos: 'n.', reading: 'แอพ-พลิ-เค-ชัน', meaning: 'แอปพลิเคชัน', example: 'Open the application on your tablet.' },
            { word: 'Screen share', pos: 'n.', reading: 'สกรีน แชร์', meaning: 'การแชร์หน้าจอ', example: 'I will start the screen share now.' },
            { word: 'Login', pos: 'v.', reading: 'ล็อก-อิน', meaning: 'เข้าสู่ระบบ', example: 'Please log in with your student ID.' },
            { word: 'Technical issue', pos: 'n.', reading: 'เทค-นิ-เคิล อิช-ชู', meaning: 'ปัญหาทางเทคนิค', example: 'We are having a technical issue, please wait.' }
          ],
          dialogues: [
            { role1: 'Teacher', text1: 'Please open the application and log in with your student ID.', role2: 'Student', text2: "I can't log in, teacher." }
          ],
          cultureTips: ['เตรียมแผนสำรองเสมอเมื่อใช้เทคโนโลยีในการสอน'],
          lessonSections: [],
          preQuiz: [{ question: 'What do you say to start a screen share?', options: ['I will start the screen share now', 'Close your eyes', 'No screens today', 'Turn off everything'], answer: 0 }],
          postQuiz: [{ question: 'What phrase helps when tech fails?', options: ['We are having a technical issue, please wait', 'It is broken forever', 'I give up', 'Never mind'], answer: 0 }],
          scrambleWords: ['DEVICE', 'APPLICATION', 'SCREEN', 'TECHNICAL'],
          scrambleHints: ['อุปกรณ์', 'แอปพลิเคชัน', 'หน้าจอ', 'ทางเทคนิค'],
          speakingQuestions: [
            'Please open the application and log in with your student ID.',
            'I will start the screen share now.',
            'We are having a technical issue, please wait a moment.'
          ]
        },
        {
          id: 10,
          number: 'Unit 5',
          title: 'Job Interview for Teaching Position',
          description: 'การเตรียมตัวและตอบคำถามสัมภาษณ์งานตำแหน่งครูเป็นภาษาอังกฤษ',
          lessons: ['การแนะนำตัวและประสบการณ์การสอน', 'การตอบคำถามสัมภาษณ์งานที่พบบ่อย', 'การเจรจาต่อรองเงื่อนไขการทำงาน'],
          vocabularies: [
            { word: 'Qualification', pos: 'n.', reading: 'ควอ-ลิ-ฟิ-เค-ชัน', meaning: 'คุณสมบัติ', example: 'She has excellent teaching qualifications.' },
            { word: 'Experience', pos: 'n.', reading: 'เอ็ก-สพี-เรียนซ์', meaning: 'ประสบการณ์', example: 'I have three years of teaching experience.' },
            { word: 'Teaching philosophy', pos: 'n.', reading: 'ทีช-ชิ่ง ฟิ-ลอ-โซ-ฟี', meaning: 'ปรัชญาการสอน', example: 'My teaching philosophy is student-centered learning.' },
            { word: 'Salary', pos: 'n.', reading: 'แซล-ละ-รี', meaning: 'เงินเดือน', example: 'What is the starting salary for this position?' },
            { word: 'Contract', pos: 'n.', reading: 'คอน-แทรคท์', meaning: 'สัญญาจ้าง', example: 'Please read the contract carefully before signing.' }
          ],
          dialogues: [
            { role1: 'Interviewer', text1: 'Why do you want to become a teacher?', role2: 'Candidate', text2: 'I love helping students grow and reach their potential.' }
          ],
          cultureTips: ['เตรียมตัวอย่างสุภาพ ตรงต่อเวลา และเตรียมคำถามกลับสำหรับผู้สัมภาษณ์'],
          lessonSections: [],
          preQuiz: [{ question: 'How do you describe your work history?', options: ['I have three years of teaching experience', 'I never worked', 'I forgot', 'No comment'], answer: 0 }],
          postQuiz: [{ question: 'What word means "a signed work agreement"?', options: ['Contract', 'Vacation', 'Holiday', 'Resume'], answer: 0 }],
          scrambleWords: ['QUALIFICATION', 'EXPERIENCE', 'SALARY', 'CONTRACT'],
          scrambleHints: ['คุณสมบัติ', 'ประสบการณ์', 'เงินเดือน', 'สัญญาจ้าง'],
          speakingQuestions: [
            'I love helping students grow and reach their potential.',
            'I have three years of teaching experience at the primary level.',
            'What is the starting salary and contract length for this position?'
          ]
        }
      ];
    }
    const lite = [
      {
        id: 1,
        number: 'Unit 1',
        title: 'Welcoming Students',
        description: 'เรียนรู้ทักษะการกล่าวทักทายนักศึกษา การเป็นเจ้าบ้านที่ดี แนะนำตัวเอง และประเพณีทักทายทั่วโลก',
        lessons: ['การกล่าวทักทายทั่วไป (Greetings)', 'วัฒนธรรมการทักทายในแต่ละประเทศ', 'ภาษาในชั้นเรียนช่วงเริ่มต้นการสอน'],
        vocabularies: [
          { word: 'Welcoming', pos: 'adj.', reading: 'เวล-คัม-มิง', meaning: 'การต้อนรับ / อบอุ่น', example: 'Thank you for the welcoming speech.' },
          { word: 'Icebreaker', pos: 'n.', reading: 'ไอซ์-เบรก-เกอร์', meaning: 'กิจกรรมละลายพฤติกรรม', example: 'Let us start with an icebreaker game.' }
        ],
        dialogues: LESSON_1_DIALOGUES,
        cultureTips: ['Greetings in different countries'],
        lessonSections: [],
        preQuiz: [{ question: 'What is a welcoming greeting?', options: ['Good morning', 'Bye', 'No', 'Wait'], answer: 0 }],
        postQuiz: [{ question: 'How do you say welcome in English?', options: ['Welcome', 'Go away', 'Stop', 'Silence'], answer: 0 }],
        scrambleWords: ['WELCOMING', 'ICEBREAKER', 'GREETING', 'STUDENT'],
        scrambleHints: ['การต้อนรับ', 'กิจกรรมละลายพฤติกรรม', 'การกล่าวทักทาย', 'นักเรียนนักศึกษา'],
        speakingQuestions: [
          'Hello, good morning. My name is Ms. Parker.',
          'Nice to meet you. How are you doing today?',
          'I am glad to welcome you all to our classroom.'
        ]
      },
      {
        id: 2,
        number: 'Unit 2',
        title: 'Telephoning & Office Calls',
        description: 'รับสายโทรศัพท์ โอนสาย และการบันทึกข้อความประสานงานในองค์กร',
        lessons: ['การรับสายโทรศัพท์ในที่ทำงาน', 'การโอนสายและการฝากข้อความ'],
        vocabularies: [
          { word: 'Telephoning', pos: 'n.', reading: 'เท-เล-โฟ-นิง', meaning: 'การติดต่อทางโทรศัพท์', example: 'She is experienced in office telephoning.' }
        ],
        dialogues: LESSON_2_DIALOGUES,
        cultureTips: ['Always state your name clearly on phone calls.'],
        lessonSections: [],
        preQuiz: [{ question: 'What to say when answering an office phone?', options: ['Good morning, Ms. Parker speaking', 'Who are you?', 'Stop calling', 'Nothing'], answer: 0 }],
        postQuiz: [{ question: 'What to say to transfer a call?', options: ['Please hold on, I will transfer your call', 'Hang up', 'Don’t know', 'Go away'], answer: 0 }],
        scrambleWords: ['TELEPHONING', 'RECEPTIONIST', 'TRANSFER', 'MESSAGE'],
        scrambleHints: ['การโทรศัพท์', 'พนักงานต้อนรับ', 'การโอนสาย', 'ข้อความ'],
        speakingQuestions: [
          'Hello, this is Ms. Parker calling from the administration office.',
          'Good morning, Ms. Parker speaking. How may I assist you?',
          'Could you please hold while I transfer your call?'
        ]
      },
      {
        id: 3,
        number: 'Unit 3',
        title: 'Academic Presentation',
        description: 'การนำเสนอผลงานวิชาการ การใช้สไลด์ และการตอบคำถามอาจารย์',
        lessons: ['การเปิดและปิดการนำเสนอ', 'การใช้คำเชื่อมภาษาอังกฤษ'],
        vocabularies: [
          { word: 'Presentation', pos: 'n.', reading: 'เพร-เซน-เท-ชัน', meaning: 'การนำเสนอ', example: 'Her presentation was clear and professional.' }
        ],
        dialogues: LESSON_3_DIALOGUES,
        cultureTips: ['Structure your presentation clearly into 3 parts.'],
        lessonSections: [],
        preQuiz: [{ question: 'What phrase starts a presentation?', options: ['Today I will present...', 'Good night', 'Stop', 'Bye'], answer: 0 }],
        postQuiz: [{ question: 'How to invite questions?', options: ['I am happy to answer any questions', 'No questions allowed', 'Go home', 'Quiet'], answer: 0 }],
        scrambleWords: ['PRESENTATION', 'RESEARCH', 'STRUCTURE', 'SLIDE'],
        scrambleHints: ['การนำเสนอ', 'การวิจัย', 'โครงสร้าง', 'สไลด์ประกอบ'],
        speakingQuestions: [
          'Good morning, everyone. Today I will discuss our research findings.',
          'I have divided my presentation into three main sections.',
          'Thank you for your time. I am happy to answer any questions.'
        ]
      },
      {
        id: 4,
        number: 'Unit 4',
        title: 'Teacher & Student Consultations',
        description: 'การขอคำปรึกษาอาจารย์และการสนทนาโต้ตอบในชั้นเรียนอย่างสุภาพ',
        lessons: ['การสอบถามเรื่องการเรียนและวิชาการ', 'การขอขยายเวลาส่งงาน'],
        vocabularies: [
          { word: 'Consultation', pos: 'n.', reading: 'คอน-ซัล-เท-ชัน', meaning: 'การปรึกษาหารือ', example: 'I scheduled a consultation with my advisor.' }
        ],
        dialogues: LESSON_4_DIALOGUES,
        cultureTips: ['Be polite and respectful when consulting teachers.'],
        lessonSections: [],
        preQuiz: [{ question: 'How to ask for a consultation?', options: ['Excuse me, do you have a moment?', 'Hey give me score', 'What', 'No'], answer: 0 }],
        postQuiz: [{ question: 'What to say after consultation?', options: ['Thank you for your time and advice', 'Whatever', 'Bye', 'Nothing'], answer: 0 }],
        scrambleWords: ['CONSULTATION', 'ADVISOR', 'ACADEMIC', 'GUIDANCE'],
        scrambleHints: ['การปรึกษาหารือ', 'อาจารย์ที่ปรึกษา', 'ทางวิชาการ', 'คำแนะนำ'],
        speakingQuestions: [
          'Excuse me, teacher, do you have a few minutes for a consultation?',
          'I would like to ask for your advice regarding my research topic.',
          'Thank you very much for your helpful guidance.'
        ]
      },
      {
        id: 5,
        number: 'Unit 5',
        title: 'Giving Instructions & Directions',
        description: 'การอธิบายขั้นตอนการทำงาน การบอกทิศทาง และข้อปฏิบัติ',
        lessons: ['การใช้คำบอกลำดับขั้นตอน (First, Next, Finally)', 'การบอกทิศทางสถานที่'],
        vocabularies: [
          { word: 'Instruction', pos: 'n.', reading: 'อิน-สตรัก-ชัน', meaning: 'คำสั่ง / คำแนะนำขั้นตอน', example: 'Follow the instructions carefully.' }
        ],
        dialogues: LESSON_5_DIALOGUES,
        cultureTips: ['Use step-by-step numbers to give clear instructions.'],
        lessonSections: [],
        preQuiz: [{ question: 'Which word indicates the first step?', options: ['First', 'Finally', 'Last', 'End'], answer: 0 }],
        postQuiz: [{ question: 'Which word indicates the final step?', options: ['Finally', 'First', 'Start', 'Begin'], answer: 0 }],
        scrambleWords: ['INSTRUCTION', 'DIRECTION', 'STEP', 'SEQUENCE'],
        scrambleHints: ['คำแนะนำขั้นตอน', 'ทิศทาง', 'ขั้นตอน', 'ลำดับ'],
        speakingQuestions: [
          'First, please open your English textbook to page twenty.',
          'Next, follow the step-by-step instructions provided.',
          'Finally, submit your completed work to the teacher.'
        ]
      }
    ];
    return lite.map((u) => ({
      ...u,
      fullQuiz: this.richYear1Seed.find((r) => r.id === u.id)?.fullQuiz,
      unscrambleDialogue: this.richYear1Seed.find((r) => r.id === u.id)?.unscrambleDialogue,
    })) as Unit[];
  }
}
