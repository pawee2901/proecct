// shared/game-default-content.ts — เนื้อหาเริ่มต้น (default bank) ของเกม builtin
// ที่เคยเป็น literal ฝังอยู่ตรงๆ ใน GameEngineService (ฝั่งนักศึกษา) เพียงที่เดียว
// ทำให้อาจารย์มองไม่เห็น/แก้ไม่ได้เพราะฟอร์ม "เนื้อหาเกม" (TeacherGameCoversComponent)
// เริ่มต้นด้วยแถวว่างเปล่าเสมอเมื่อยังไม่มี override ใน DB (2026-08-12)
//
// ย้ายมาไว้ตรงนี้ที่เดียว แล้วให้ทั้งสองฝั่ง import ไปใช้:
//   - GameEngineService  → ใช้เป็นค่าเริ่มต้นตอนเล่นจริง (พฤติกรรมเดิมทุกประการ)
//   - TeacherGameCoversComponent → ใช้พรีฟิลฟอร์ม "จัดการเนื้อหา" ให้เห็น/แก้เนื้อหา
//     จริงที่กำลังใช้อยู่ได้ทันที แทนที่จะเห็นแถวว่างเปล่าแล้วเดาว่าต้องกรอกอะไร
//
// เกมที่ "ไม่มี" อยู่ในไฟล์นี้ (scramble, fill-blank, sentence-reorder, open-reply)
// เพราะเนื้อหาเริ่มต้นของเกมเหล่านั้นไม่ใช่ list ตายตัว แต่คำนวณสดจากบทสนทนา/แบบฝึกหัด
// ของทุกบทเรียนรวมกัน (buildDialogueSentencePool/buildFillBlankPool/buildOpenReplyPool
// ใน GameEngineService) — ไม่มี "ค่าเริ่มต้นเดียว" ให้แสดงแบบเกมอื่นๆ ในไฟล์นี้

export const TYPO_FIX_DEFAULT_BANK: { wrong: string; correct: string }[] = [
  { wrong: 'Please have a sit and wait for a moment.', correct: 'Please have a seat and wait for a moment.' },
  { wrong: 'Thank you for calling, how i can help you?', correct: 'Thank you for calling, how can I help you?' },
  { wrong: 'I would like to schedule a meeting for tommorow.', correct: 'I would like to schedule a meeting for tomorrow.' },
  { wrong: 'He is not available right now, would you like to leave a massage?', correct: 'He is not available right now, would you like to leave a message?' },
  { wrong: "Could you please repeat you're phone number?", correct: 'Could you please repeat your phone number?' },
  { wrong: 'We are exciting to welcome you to our school.', correct: 'We are excited to welcome you to our school.' },
  { wrong: "Let's begin the meeting, please turn to page 10 of you book.", correct: "Let's begin the meeting, please turn to page 10 of your book." },
  { wrong: "I appreciate you're patience while we transfer the call.", correct: 'I appreciate your patience while we transfer the call.' },
  { wrong: 'Our next agenda item are the budget report.', correct: 'Our next agenda item is the budget report.' },
  { wrong: 'Please let me no if you have any questions.', correct: 'Please let me know if you have any questions.' },
];

export const SCENARIO_DEFAULT_BANK: { situationEn: string; situationTh: string; keywords: string[]; sampleAnswer: string }[] = [
  { situationEn: 'A caller asks for Mr. David, but he is not at his desk right now. What do you say?', situationTh: 'ลูกค้าโทรมาถามหา Mr. David แต่เขาไม่อยู่ที่โต๊ะ คุณจะพูดว่าอย่างไร', keywords: ['sorry', 'unavailable', 'message'], sampleAnswer: "I'm sorry, Mr. David is unavailable right now. Would you like to leave a message?" },
  { situationEn: 'A visitor arrives at the school gate for the first time. How do you greet them?', situationTh: 'มีแขกมาถึงประตูโรงเรียนเป็นครั้งแรก คุณควรทักทายอย่างไร', keywords: ['good morning', 'welcome', 'help'], sampleAnswer: 'Good morning, welcome to our school. How can I help you today?' },
  { situationEn: 'You are about to start your presentation in front of the class. Introduce yourself.', situationTh: 'คุณกำลังเริ่มนำเสนอผลงานหน้าชั้นเรียน แนะนำตัวเอง', keywords: ['good afternoon', 'my name', 'today'], sampleAnswer: "Good afternoon everyone, my name is Anna, and today I'm excited to present our project." },
  { situationEn: 'You are opening a meeting. Announce the first agenda item.', situationTh: 'เริ่มการประชุมและแจ้งวาระการประชุมแรก', keywords: ['agenda', 'begin', 'item'], sampleAnswer: "Let's begin the meeting. The first item on our agenda is the budget review." },
  { situationEn: 'A student arrives late to class. As the teacher, how do you politely ask them to sit down?', situationTh: 'นักเรียนมาสาย ในฐานะครูควรพูดอย่างไรให้เขานั่งลงอย่างสุภาพ', keywords: ['please', 'seat', 'quietly'], sampleAnswer: 'Please take a seat quietly, we have already started the lesson.' },
  { situationEn: "During your presentation, someone asks a question you don't know the answer to. How do you respond politely?", situationTh: 'ระหว่างพรีเซนต์ มีคำถามที่คุณไม่รู้คำตอบ ควรตอบอย่างสุภาพว่าอย่างไร', keywords: ['not sure', 'follow up', 'back to you'], sampleAnswer: "I'm not sure about that, but I will follow up and get back to you." },
  { situationEn: 'Ask the caller to hold the line for a moment while you transfer the call.', situationTh: 'ขอให้ผู้โทรถือสายรอสักครู่ระหว่างโอนสาย', keywords: ['hold', 'moment', 'transfer'], sampleAnswer: 'Could you please hold for a moment while I transfer your call?' },
  { situationEn: 'Politely close the meeting and summarize the next action items.', situationTh: 'จบการประชุมอย่างสุภาพและสรุปงานที่ต้องทำต่อ', keywords: ['thank you', 'wrap up', 'action items'], sampleAnswer: "Thank you, everyone. Let's wrap up and review our action items." },
];

export const EMAIL_CAPSTONE_DEFAULT_BANK: { subject: string; body: string; keywords: string[]; minWords: number; sampleAnswer: string }[] = [
  { subject: "Question about tomorrow's schedule", body: "Hi, could you confirm what time the orientation starts tomorrow? I don't want to be late. Thanks, Anna", keywords: ['orientation', 'starts', 'thank'], minWords: 12, sampleAnswer: 'Hi Anna, the orientation starts at 9 AM tomorrow. Thank you for checking, see you there!' },
  { subject: 'Request to reschedule our meeting', body: "Hello, I'm unable to attend our meeting on Monday. Could we move it to Wednesday instead?", keywords: ['wednesday', 'reschedule', 'works'], minWords: 12, sampleAnswer: "Hello, Wednesday works for me. Let's reschedule the meeting to that day, same time." },
  { subject: 'Missing homework submission', body: 'Hi, I could not submit my homework on time because of an internet problem. Can I send it today?', keywords: ['understand', 'today', 'submit'], minWords: 12, sampleAnswer: 'Hi, I understand. Please submit your homework today and I will accept it without penalty.' },
  { subject: 'Asking about the presentation topic', body: 'Hello, I am not sure what topic to choose for my presentation next week. Do you have any suggestions?', keywords: ['suggest', 'topic', 'presentation'], minWords: 12, sampleAnswer: 'Hello, I suggest you choose a topic related to technology in education for your presentation.' },
  { subject: 'Confirming the phone call time', body: 'Hi, just confirming our phone call is at 3 PM today, is that still correct?', keywords: ['confirm', 'correct', '3 pm'], minWords: 10, sampleAnswer: 'Hi, yes that is correct, our phone call is confirmed for 3 PM today. Talk soon!' },
];

export const PICTURE_WORD_DEFAULT_BANK: { word: string; meaning: string; emoji1?: string; emoji2?: string; clue?: string; unitId?: number; image?: string; icon?: string }[] = [
  { word: 'classroom', meaning: 'ห้องเรียน', emoji1: '🏫', emoji2: '🚪', clue: 'สถานที่เรียนในโรงเรียน/ห้องเรียน?', unitId: 1 },
  { word: 'icebreaker', meaning: 'กิจกรรมละลายพฤติกรรม', emoji1: '🧊', emoji2: '🔨', clue: 'กิจกรรมเปิดใจ/ละลายพฤติกรรม?', unitId: 1 },
  { word: 'face-to-face', meaning: 'เผชิญหน้า / ส่วนตัว', emoji1: '👦', emoji2: '👦', clue: 'การพบกันตรงๆ/แบบส่วนตัว?', unitId: 1 },
  { word: 'appointment', meaning: 'การนัดหมาย', emoji1: '📅', emoji2: '🤝', clue: 'การกำหนดวันเจอกันล่วงหน้า?', unitId: 1 },
  { word: 'schedule', meaning: 'กำหนดการ / ตารางเวลา', emoji1: '📅', emoji2: '⏱️', clue: 'แผนกำหนดเวลาหรือกิจกรรม?', unitId: 1 },
  { word: 'verify', meaning: 'ยืนยันความถูกต้อง', emoji1: '🔍', emoji2: '✅', clue: 'การตรวจทานเพื่อความถูกต้อง?', unitId: 2 },
  { word: 'multitasking', meaning: 'การทำงานหลายอย่างพร้อมกัน', emoji1: '🧑‍💻', emoji2: '🤹', clue: 'การทำงานหลายอย่างในเวลาเดียวกัน?', unitId: 2 },
  { word: 'extension', meaning: 'เบอร์ต่อภายใน', emoji1: '☎️', emoji2: '➡️', clue: 'หมายเลขโทรศัพท์ภายในองค์กร?', unitId: 2 },
  { word: 'takeaway', meaning: 'ข้อคิดหลัก / ข้อสรุป', emoji1: '🥡', emoji2: '📦', clue: 'ข้อคิดสำคัญที่ได้จากการเรียนรู้?', unitId: 3 },
  { word: 'outline', meaning: 'โครงร่าง / หัวข้อหลัก', emoji1: '✏️', emoji2: '📋', clue: 'โครงสร้างหรือแผนร่างเนื้อหาคร่าวๆ?', unitId: 3 },
  { word: 'transition', meaning: 'การเชื่อมต่อ', emoji1: '🔄', emoji2: '🌉', clue: 'การเปลี่ยนผ่านหรือส่วนเชื่อมโยง?', unitId: 3 },
  { word: 'audience', meaning: 'ผู้ฟัง / ผู้ชม', emoji1: '👥', emoji2: '👂', clue: 'กลุ่มคนที่มาร่วมฟังการบรรยาย?', unitId: 3 },
  { word: 'summarize', meaning: 'สรุปความ', emoji1: '📝', emoji2: '📑', clue: 'การเขียนย่อความประเด็นสำคัญ?', unitId: 3 },
  { word: 'handout', meaning: 'เอกสารแจก', emoji1: '📄', emoji2: '🤲', clue: 'เอกสารคู่มือที่ครูแจกในห้องเรียน?', unitId: 3 },
  { word: 'agenda', meaning: 'ระเบียบวาระการประชุม', emoji1: '📋', emoji2: '📅', clue: 'หัวข้อกำหนดการที่จะประชุมพูดคุย?', unitId: 4 },
  { word: 'perspective', meaning: 'มุมมอง / ทัศนะ', emoji1: '👁️', emoji2: '🧠', clue: 'ทัศนคติหรือมุมมองส่วนบุคคล?', unitId: 4 },
  { word: 'feedback', meaning: 'คำแนะนำป้อนกลับ', emoji1: '🗣️', emoji2: '🔄', clue: 'คำติชม/ข้อแนะนำเพื่อการปรับปรุง?', unitId: 4 },
  { word: 'consensus', meaning: 'มติเอกฉันท์', emoji1: '👥', emoji2: '🤝', clue: 'ความเห็นพ้องต้องกันของคณะทำงาน?', unitId: 5 },
  { word: 'collaboration', meaning: 'การร่วมมือทำงาน', emoji1: '🤝', emoji2: '👥', clue: 'การร่วมมือร่วมใจกันทำงานเป็นทีม?', unitId: 5 },
  { word: 'worksheet', meaning: 'ใบงาน / แบบฝึกหัด', emoji1: '📄', emoji2: '✏️', clue: 'กระดาษแบบฝึกหัดทบทวนบทเรียน?', unitId: 5 },
];

// Post-Lesson Game: Unscramble Dialogue — fallback ตอนไม่มีทั้งบทสนทนาเฉพาะหน่วยเรียน
// (Game Creator Studio) และเนื้อหาที่แก้ทั่วระบบ
export const DIALOGUE_DEFAULT_BANK: { text: string }[] = [
  { text: 'Hello! Welcome to the course.' },
  { text: 'Thank you! Excited to learn.' },
];

export const POS_SORTER_DEFAULT_BANK: { word: string; pos: string; meaning: string }[] = [
  { word: 'colleague', pos: 'noun', meaning: 'เพื่อนร่วมงาน' },
  { word: 'collaborate', pos: 'verb', meaning: 'ร่วมมือ' },
  { word: 'deadline', pos: 'noun', meaning: 'กำหนดส่ง' },
  { word: 'strategic', pos: 'adjective', meaning: 'เชิงกลยุทธ์' },
  { word: 'efficiently', pos: 'adverb', meaning: 'อย่างมีประสิทธิภาพ' },
  { word: 'negotiate', pos: 'verb', meaning: 'เจรจาต่อรอง' },
  { word: 'responsibility', pos: 'noun', meaning: 'ความรับผิดชอบ' },
  { word: 'flexible', pos: 'adjective', meaning: 'ยืดหยุ่น' },
  { word: 'innovate', pos: 'verb', meaning: 'สร้างนวัตกรรม' },
  { word: 'successfully', pos: 'adverb', meaning: 'อย่างสำเร็จ' },
];

// คู่คำพ้องความหมาย (word -> synonym) ที่ initSynonymMatchGame() ใช้คำนวณทั้งคำตอบ
// ที่ถูกต้องและตัวลวง (distractors) เสมอ ไม่ว่าคลังคำหลักจะมาจาก DB จริงหรือ fallback
export const SYNONYM_WORD_MAP: { [word: string]: string } = {
  colleague: 'coworker',
  collaborate: 'cooperate',
  manage: 'direct',
  deadline: 'due date',
  responsibility: 'duty',
  overtime: 'extra hours',
  promote: 'advance',
  career: 'profession',
  strategy: 'plan',
  feedback: 'evaluation',
  agenda: 'schedule',
  negotiate: 'bargain',
  discuss: 'talk over',
  presentation: 'pitch',
  project: 'assignment',
  task: 'job',
  revenue: 'income',
  assistance: 'help',
  innovative: 'creative',
  improve: 'enhance',
  terminate: 'end',
  commence: 'start',
  object: 'goal',
  resolve: 'solve',
};

// เฉพาะคำที่รู้ความหมายไทยแน่นอน (ใช้เป็น fallback คลังคำตอนไม่มีคำศัพท์ของบทเรียนที่ตรง
// กับ SYNONYM_WORD_MAP อย่างน้อย 5 คำ) — คำอื่นใน SYNONYM_WORD_MAP ยังใช้เป็นตัวลวงได้เสมอ
const SYNONYM_MATCH_KNOWN_MEANINGS: { word: string; meaning: string }[] = [
  { word: 'colleague', meaning: 'เพื่อนร่วมงาน' },
  { word: 'collaborate', meaning: 'ร่วมมือ' },
  { word: 'manage', meaning: 'จัดการ' },
  { word: 'deadline', meaning: 'กำหนดส่ง' },
  { word: 'strategy', meaning: 'กลยุทธ์' },
  { word: 'negotiate', meaning: 'เจรจา' },
  { word: 'feedback', meaning: 'ข้อเสนอแนะ' },
  { word: 'agenda', meaning: 'วาระการประชุม' },
];

// ให้อาจารย์เห็น/แก้คู่คำพ้อง+ตัวลวงจริงในฟอร์ม "จัดการเนื้อหา" (เกมเล่นจริงคำนวณตัวลวง
// แบบสุ่มทุกรอบจาก SYNONYM_WORD_MAP เอง — ชุดนี้เป็นแค่ค่าเริ่มต้นให้แก้ ไม่ใช่ค่าตายตัว
// ที่ใช้เล่นจริง)
export const SYNONYM_MATCH_DEFAULT_BANK: { word: string; synonym: string; meaning: string; distractors: string[] }[] =
  SYNONYM_MATCH_KNOWN_MEANINGS.map(({ word, meaning }) => {
    const synonym = SYNONYM_WORD_MAP[word];
    const distractors = Object.entries(SYNONYM_WORD_MAP)
      .filter(([w]) => w !== word)
      .map(([, syn]) => syn)
      .slice(0, 3);
    return { word, synonym, meaning, distractors };
  });

// เกมลากคำ — sentenceTemplate ใช้ token [slot0]/[slot1]/... รูปแบบเดียวกับที่อาจารย์
// กรอกเองในฟอร์ม (initDragWordGame() parse token ของทั้งสองแหล่งด้วยโค้ดเดียวกัน)
export const DRAG_WORD_DEFAULT_BANK: { thaiHint: string; sentenceTemplate: string; slotWords: string[]; wordBank: string[]; explanation: string }[] = [
  {
    thaiHint: 'เราจำเป็นต้องจัดการประชุมด่วนกับลูกค้าในบ่ายวันนี้',
    sentenceTemplate: 'We need to [slot0] an urgent [slot1] with the client this afternoon.',
    slotWords: ['schedule', 'meeting'],
    wordBank: ['schedule', 'meeting', 'cancel', 'contract', 'feedback', 'deliver'],
    explanation: 'ใช้ "schedule an urgent meeting" หมายถึง นัดหมายประชุมด่วน',
  },
  {
    thaiHint: 'กรุณาส่งใบเสนอราคาให้ฝ่ายจัดซื้อภายในวันศุกร์นี้',
    sentenceTemplate: 'Please send the [slot0] to the [slot1] department by Friday.',
    slotWords: ['quotation', 'purchasing'],
    wordBank: ['quotation', 'purchasing', 'proposal', 'accounting', 'strategy', 'refund'],
    explanation: 'ใช้ "quotation" (ใบเสนอราคา) และ "purchasing department" (ฝ่ายจัดซื้อ)',
  },
  {
    thaiHint: 'ผลิตภัณฑ์ใหม่ของเราได้รับการตอบรับในเชิงบวกจากตลาด',
    sentenceTemplate: 'Our new [slot0] received [slot1] feedback from the market.',
    slotWords: ['product', 'positive'],
    wordBank: ['product', 'positive', 'invoice', 'negative', 'report', 'budget'],
    explanation: 'ใช้ "product" (ผลิตภัณฑ์) และ "positive feedback" (คำชม/ตอบรับในเชิงบวก)',
  },
  {
    thaiHint: 'ผู้จัดการเสนอกลยุทธ์ใหม่เพื่อเพิ่มยอดขายของบริษัท',
    sentenceTemplate: 'The manager proposed a new [slot0] to increase company [slot1].',
    slotWords: ['strategy', 'sales'],
    wordBank: ['strategy', 'sales', 'agenda', 'expenses', 'discount', 'timeline'],
    explanation: 'ใช้ "strategy" (กลยุทธ์) และ "company sales" (ยอดขายของบริษัท)',
  },
  {
    thaiHint: 'กรุณาตรวจสอบรายละเอียดก่อนอนุมัติงบประมาณโครงการ',
    sentenceTemplate: 'Please check the details before approving the project [slot0].',
    slotWords: ['budget'],
    wordBank: ['budget', 'deadline', 'partner', 'negotiation', 'vacancy', 'supplier'],
    explanation: 'ใช้ "project budget" หมายถึง งบประมาณของโครงการ',
  },
];

export const CONVERT_SENTENCE_DEFAULT_BANK: { instruction: string; originalSentence: string; hint: string; correctAnswers: string[]; explanation: string }[] = [
  {
    instruction: 'แปลงเป็น Past Simple Tense (เหตุการณ์ในอดีต)',
    originalSentence: 'She sends the weekly sales report to the manager every Friday.',
    hint: '💡 คำใบ้: ต้องเปลี่ยนกริยาแสดงการส่ง (send) ให้เป็นรูป Past Tense (ช่อง 2)',
    correctAnswers: [
      'She sent the weekly sales report to the manager every Friday.',
      'She sent the weekly sales report to the manager.',
      'She sent the weekly sales report to the manager last Friday.',
      'She sent the weekly sales report to the manager',
    ],
    explanation: 'Past Simple ใช้กริยาช่อง 2: send -> sent',
  },
  {
    instruction: 'แปลงเป็น Passive Voice (ประธานเป็นผู้ถูกกระทำ)',
    originalSentence: 'The marketing team created a brilliant campaign.',
    hint: '💡 คำใบ้: นำสิ่งที่ถูกกระทำ (A brilliant campaign) ขึ้นเป็นประธาน ตามด้วย was/were + V.3 + by...',
    correctAnswers: [
      'A brilliant campaign was created by the marketing team.',
      'A brilliant campaign was created by the marketing team',
    ],
    explanation: 'A brilliant campaign เป็นเอกพจน์ในอดีต ใช้ was created by...',
  },
  {
    instruction: 'แปลงเป็นประโยคปฏิเสธ (Negative Sentence)',
    originalSentence: 'We have approved the project proposal.',
    hint: '💡 คำใบ้: เติมคำปฏิเสธ (not) ต่อท้ายกริยาช่วย have',
    correctAnswers: [
      'We have not approved the project proposal.',
      "We haven't approved the project proposal.",
      'We have not approved the project proposal',
      "We haven't approved the project proposal",
    ],
    explanation: 'Present Perfect ปฏิเสธใส่ not หลัง have -> have not approved',
  },
  {
    instruction: 'แปลงเป็นประโยคคำถาม (Question Form)',
    originalSentence: 'The client accepts our pricing terms.',
    hint: '💡 คำใบ้: ขึ้นต้นประโยคด้วยกริยาช่วย (Does) สำหรับประธานเอกพจน์ แล้วเปลี่ยนกริยาหลักกลับเป็น V.inf',
    correctAnswers: [
      'Does the client accept our pricing terms?',
      'Does the client accept our pricing terms',
    ],
    explanation: 'ประโยคคำถาม Present Simple ใช้ Does + Subject + V.inf',
  },
  {
    instruction: 'แปลงเป็น Future Simple Tense (บอกอนาคตด้วย will)',
    originalSentence: 'They launch the new product next month.',
    hint: '💡 คำใบ้: แทรกกริยาช่วยบอกอนาคต (will) ไว้ข้างหน้ากริยาหลัก',
    correctAnswers: [
      'They will launch the new product next month.',
      'They will launch the new product next month',
    ],
    explanation: 'Future Simple ใช้ will + V.inf (will launch)',
  },
];

export const ENG_TO_THAI_DEFAULT_BANK: { englishSentence: string; thaiHint: string; primaryThai: string; keyKeywords: string[]; explanation: string }[] = [
  {
    englishSentence: 'Could you please confirm the meeting schedule with our client?',
    thaiHint: '💡 คำใบ้: ประโยคขอร้องอย่างสุภาพ ให้ช่วยตรวจสอบหรือยืนยันเวลาพบปะกับลูกค้า',
    primaryThai: 'คุณช่วยยืนยันกำหนดการประชุมกับลูกค้าของเราได้ไหม',
    keyKeywords: ['ยืนยัน', 'กำหนดการ', 'ประชุม', 'ลูกค้า'],
    explanation: 'confirm = ยืนยัน, meeting schedule = กำหนดการประชุม, client = ลูกค้า',
  },
  {
    englishSentence: 'We need to submit the financial report by the end of this week.',
    thaiHint: '💡 คำใบ้: บอกความจำเป็นในการส่งเอกสารสรุปตัวเลขการเงินก่อนถึงวันหยุดสัปดาห์',
    primaryThai: 'เราจำเป็นต้องส่งรายงานการเงินภายในสิ้นสัปดาห์นี้',
    keyKeywords: ['ส่ง', 'รายงานการเงิน', 'สิ้นสัปดาห์'],
    explanation: 'submit = ส่ง/ยื่น, financial report = รายงานการเงิน, end of this week = สิ้นสัปดาห์นี้',
  },
  {
    englishSentence: 'The customer service team provides 24-hour support.',
    thaiHint: '💡 คำใบ้: การทำงานของแผนกดูแลผู้ซื้อที่พร้อมช่วยเหลือตลอดทั้งวันทั้งคืน',
    primaryThai: 'ทีมบริการลูกค้าให้บริการช่วยเหลือตลอด 24 ชั่วโมง',
    keyKeywords: ['บริการลูกค้า', '24', 'ชั่วโมง'],
    explanation: 'customer service = บริการลูกค้า, provides support = ให้บริการช่วยเหลือ',
  },
  {
    englishSentence: 'Thank you for your valuable feedback on our new product.',
    thaiHint: '💡 คำใบ้: การแสดงความซาบซึ้งต่อข้อคิดเห็นหรือคำติชมที่มีประโยชน์ต่อสินค้าใหม่',
    primaryThai: 'ขอบคุณสำหรับข้อเสนอแนะที่มีคุณค่าต่อผลิตภัณฑ์ใหม่ของเรา',
    keyKeywords: ['ขอบคุณ', 'ข้อเสนอแนะ', 'ผลิตภัณฑ์'],
    explanation: 'valuable feedback = ข้อเสนอแนะที่มีคุณค่า, new product = ผลิตภัณฑ์ใหม่',
  },
  {
    englishSentence: 'Our manager will present the annual marketing strategy tomorrow.',
    thaiHint: '💡 คำใบ้: ผู้นำทีมกำลังจะนำเสนอแผนงานใหญ่ของฝ่ายการตลาดประจำปีในวันพรุ่งนี้',
    primaryThai: 'ผู้จัดการของเราจะนำเสนอกลยุทธ์การตลาดประจำปีในวันพรุ่งนี้',
    keyKeywords: ['ผู้จัดการ', 'นำเสนอ', 'กลยุทธ์', 'การตลาด'],
    explanation: 'present = นำเสนอ, annual marketing strategy = กลยุทธ์การตลาดประจำปี',
  },
];
