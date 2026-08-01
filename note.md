# สรุปโปรเจค: AI Speaking Assistant

> เอกสารนี้สรุปโครงสร้างและการทำงานของโปรเจคทั้งหมด อ่านจากโค้ดจริงในโฟลเดอร์ `src/app/` ณ วันที่ 2026-07-08

## 1. ภาพรวมโปรเจคคืออะไร

เป็นเว็บแอป **"AI Speaking Assistant"** — ระบบฝึกพูดภาษาอังกฤษสำหรับนักศึกษามหาวิทยาลัย (มีข้อความอ้างอิง "มหาวิทยาลัยราชภัฏ" ในฟอร์มสมัครสมาชิก) โดยมี 3 บทบาทผู้ใช้งาน:

- **นักศึกษา (student)** — เรียนบทเรียน, ทำแบบทดสอบ, เล่นเกมฝึกคำศัพท์, ฝึกพูดกับ AI
- **อาจารย์ (teacher)** — ดูสถิติ/ผลการเรียนนักศึกษา, สร้างและจัดการบทเรียน
- **ผู้ดูแลระบบ (admin)** — อนุมัติบัญชีอาจารย์, จัดการสิทธิ์ผู้ใช้, ดูสถานะระบบ

เป็น **โปรเจค Angular (frontend เพียงอย่างเดียว)** — ยังไม่มีโค้ด backend อยู่ในโฟลเดอร์นี้ ตัวแอปคาดหวังว่าจะมีเซิร์ฟเวอร์ (น่าจะเป็น Flask ตามคอมเมนต์ log จำลองในหน้า admin ที่พูดถึง "Flask Server", "Gemini-2.5-flash", ฐานข้อมูล MySQL ชื่อ `projectai`) รันอยู่ที่ `http://localhost:5000` ต่างหาก

## 2. เทคโนโลยีที่ใช้

- **Angular 21** (standalone components ทั้งหมด ไม่มี NgModule แล้ว — ใช้ `app.config.ts` + `app.routes.ts` แทน `app-module.ts` แบบเก่า ซึ่งเป็นเหตุผลที่ไฟล์เดิมถูกลบไปตาม git status)
- **RxJS** — ใช้กับ `HttpClient` (Observable pattern) ทุกการเรียก API
- **SweetAlert2** — popup แจ้งเตือน/ยืนยันสวยงาม ใช้ในหน้า admin/teacher/student
- **PDF.js** (`pdfjsLib`) — render สไลด์ PDF ของบทเรียนในหน้านักศึกษา
- **Web Speech API ของเบราว์เซอร์เอง** (`SpeechRecognition`, `speechSynthesis`) — ใช้ทำฟีเจอร์พูด/ฟังในหน้านักศึกษา (ไม่ได้อัดเสียงส่งขึ้นเซิร์ฟเวอร์)
- **localStorage** — เก็บ session ผู้ใช้ (`currentUser`), คะแนนแบบทดสอบ/เกม, ประวัติการสร้างคำศัพท์ ฯลฯ (ไม่มีการเก็บ token/JWT แยก — auth แบบง่ายด้วยการเก็บ user object ทั้งก้อนไว้ที่ client)
- **proxy.conf.json** — ตอน dev จะ proxy path อย่าง `/api`, `/students`, `/lessons`, `/teacher`, `/admin`, `/ai-speaking` ฯลฯ ไปที่ `localhost:5000`

## 3. โครงสร้างเส้นทาง (Routing)

ไฟล์ [app.routes.ts](src/app/app.routes.ts) กำหนด route แบบเรียบง่าย ไม่มี route guard ระดับ router (การเช็คสิทธิ์ทำอยู่ใน `ngOnInit()` ของแต่ละหน้าแทน):

| Path | Component | หมายเหตุ |
|---|---|---|
| `/` | redirect → `/login` | |
| `/login` | `LoginRegisterComponent` | หน้าล็อกอิน/สมัคร/ลืมรหัสผ่าน |
| `/student` | `StudentComponent` | หน้าเรียนของนักศึกษา (ใหญ่ที่สุด) |
| `/teacher` | `TeacherComponent` | หน้าจัดการของอาจารย์ |
| `/admin` | `AdminComponent` | หน้าผู้ดูแลระบบ |
| `**` | redirect → `/login` | |

ทุกหน้า (ยกเว้น login) จะเช็คใน `ngOnInit()` ว่ามี `currentUser` ใน `localStorage` หรือไม่ และ role ตรงกับหน้านั้นหรือไม่ ถ้าไม่ตรงจะ redirect กลับไปหน้าตาม role จริงหรือกลับไป `/login`

## 4. `services/api.service.ts` — ตัวกลางคุยกับ backend

`ApiService` (`providedIn: 'root'`) รวมทุก endpoint ที่แอปเรียกไว้ที่เดียว แบ่งเป็นหมวด:

- **Authentication**: `login`, `register`, `resetPasswordCheck`, `resetPasswordUpdate`
- **นักศึกษา/สถิติ**: `getStudents`, `getLeaderboard`
- **บทเรียน**: `getLessons`, `getLessonDetail`, `saveLesson`, `deleteLesson`, `saveLessonMaterials`
- **อาจารย์**: `getTeacherClasses`, `getTeacherAssignments`, `getTeacherStudents`
- **แอดมิน**: `getAdminUsers`, `getAdminCourses`, `getPendingTeachers`, `approveTeacher`, `rejectTeacher`
- **AI Speaking**: `postAiSpeaking`, `postLessonAiSpeaking`, `postAiSpeakingGeneral`, `postAudioSpeaking`, `postLessonAudioSpeaking`, `postAiAssistantFile`, `uploadSlidePdf`, `generateVocab`, `draftTeacherLesson`, `generatePageImage`

> หมายเหตุ: มีหลาย method (เช่น `postAudioSpeaking`, `postAiAssistantFile`, `draftTeacherLesson`, `generatePageImage`) ที่ **ประกาศไว้แต่หน้า student ปัจจุบันไม่ได้เรียกใช้เลย** — ฟีเจอร์ฝึกพูดจริงในหน้านักศึกษาใช้ Web Speech API ของเบราว์เซอร์แทนการอัดเสียงส่งขึ้นเซิร์ฟเวอร์ ดูเหมือนเป็น API ที่เตรียมไว้สำหรับอนาคตหรือฟีเจอร์ที่ถูกเปลี่ยนแนวทางระหว่างพัฒนา

---

## 5. หน้า Login / Register (`src/app/login-register/`)

**ไฟล์**: `login-register.component.ts` (344 บรรทัด) + `.html` (429 บรรทัด)

เป็นหน้าเดียวที่มี 3 แท็บสลับกันด้วย `activeTab: 'login' | 'register' | 'forgot'`:

- **เข้าสู่ระบบ (login)**: กรอก username/password → เรียก `apiService.login()` → ถ้าสำเร็จเก็บ user object ลง `localStorage.currentUser` แล้ว redirect ไปหน้าใน role (`redirectByRole`: student → `/student`, teacher → `/teacher`, admin → `/admin`)
- **สมัครสมาชิก (register)**: ฟอร์มเลือก role (student/teacher/admin), กรอกชื่อ-นามสกุล, อีเมล, รหัสผ่าน + สำหรับนักศึกษามีรหัสนักศึกษา/คณะ/สาขา/ชั้นปี ตรวจสอบความถูกต้อง (รหัสผ่านตรงกัน, ยาวอย่างน้อย 4 ตัว) ก่อนส่ง หากสมัครเป็น**อาจารย์** ระบบจะแจ้งว่าต้องรอแอดมินอนุมัติก่อน (สอดคล้องกับฟีเจอร์ "Pending Teachers" ในหน้าแอดมิน)
- **ลืมรหัสผ่าน (forgot)**: ยืนยันตัวตนด้วยชื่อจริง+อีเมล (`resetPasswordCheck`) แล้วตั้งรหัสผ่านใหม่ (`resetPasswordUpdate`)

**จุดเด่นด้าน UI**: มีระบบตัวการ์ตูนเด้งขึ้นมาฉลอง (มาสคอตเป็ดสวมหูฟัง SVG วาดมือ พร้อมตัวการ์ตูนย่อยอย่างดาว/หัวใจ/แมว/หนังสือ/ดินสอ ที่ spawn ขึ้นแบบสุ่มตำแหน่งเมื่อกดปุ่ม login/register) และมีเสียง "ก๊าบ" สังเคราะห์ผ่าน `AudioContext`/oscillator (ไม่ใช้ไฟล์เสียง)

---

## 6. หน้า Admin (`src/app/admin/`)

**ไฟล์**: `admin.component.ts` (167 บรรทัด) + `.html` (181 บรรทัด) — เล็กและตรงไปตรงมาที่สุด

มี 2 แท็บย่อย (`activeSubTab: 'users' | 'system'`):

1. **จัดการสิทธิ์การใช้งาน (users)**
   - ตาราง "อาจารย์รอการอนุมัติ" — ปุ่ม อนุมัติ/ปฏิเสธ เรียก `approveTeacher()` / `rejectTeacher()` (มี popup ยืนยันก่อนปฏิเสธ)
   - ตาราง "บัญชีผู้ใช้งานทั้งหมด" แสดง role และสถานะ (เปิดใช้งาน/รอตรวจสอบ)
   - **เพิ่มผู้ใช้ใหม่**: ปุ่ม "➕ เพิ่มผู้ใช้ใหม่" เปิดฟอร์มที่ตกแต่งสไตล์เดียวกับหน้าสมัครสมาชิก (label เหนือ input, การ์ดโค้งมนสีม่วงอ่อน) มีปุ่มสลับบทบาทนักศึกษา/อาจารย์/ผู้ดูแลระบบ — ถ้าเลือก "นักศึกษา" จะโชว์ช่องรหัสนักศึกษา/ชั้นปี/คณะ/สาขาเพิ่มขึ้นมา (เหมือนฟอร์มสมัครสมาชิกจริง) ส่วนอาจารย์/ผู้ดูแลระบบจะซ่อนช่องพวกนี้ไว้ กรอกครบแล้วเรียก `openAddUserModal()` → `apiService.adminCreateUser()` → `POST /admin/users`
   - **แก้ไขผู้ใช้**: ปุ่ม "แก้ไข" ต่อแถว เปิดฟอร์มแก้ชื่อ/อีเมล เรียก `openEditUserModal()` → `apiService.adminUpdateUser()` → `PUT /admin/users/{id}`
   - **ปรับยศ (เปลี่ยน role)**: dropdown ในคอลัมน์ "บทบาท" ของแต่ละแถว เปลี่ยนแล้วมี popup ยืนยันก่อนเรียก `changeUserRole()` → `apiService.adminUpdateUserRole()` → `POST /admin/users/{id}/role`
   - ทั้ง 3 endpoint ใหม่นี้ยังไม่มีอยู่ใน backend ปัจจุบัน (ฝั่ง frontend พร้อมเรียกแล้ว แต่ยังต้องรอ backend เพิ่ม route ให้ตรงกัน) ถ้าเรียกไม่สำเร็จจะขึ้น popup แจ้งเตือนข้อผิดพลาดชัดเจน **ไม่ fallback เป็นข้อมูลปลอมเหมือนหน้าอื่น** เพราะเป็นการเขียนข้อมูล (create/update) ไม่ใช่แค่การอ่านข้อมูลมาแสดง
2. **สุขภาพระบบและคีย์ AI (system)** — ตอนนี้พยายามดึงข้อมูลจริงจาก backend ก่อนแล้ว (`loadSystemStats()` → `apiService.getSystemStats()` → `GET /admin/system-stats`, มีปุ่ม "รีเฟรช"): จำนวน API Token ที่ใช้, CPU load, latency เฉลี่ยของ Gemini API, และ log console ของเซิร์ฟเวอร์ พร้อมป้าย "🟢 ข้อมูลสด" / "🟡 ข้อมูลจำลอง" บอกให้ชัดว่าค่าที่เห็นมาจากไหน — ถ้า backend ยังไม่มี endpoint นี้ (หรือเรียกไม่สำเร็จ) จะ fallback ไปใช้ค่าจำลองชุดเดิมและติดป้าย "ข้อมูลจำลอง" ให้รู้ตัวแทนที่จะแสดงเหมือนเป็นของจริงเงียบๆ

ถ้าเรียก API แล้ว error จะ fallback ไปใช้ mock data (ผู้ใช้ตัวอย่าง 3 คน) เพื่อให้หน้ายังแสดงผลได้แม้ backend ไม่พร้อม

---

## 7. หน้า Teacher (`src/app/teacher/`)

**ไฟล์**: `teacher.component.ts` (501 บรรทัด) + `.html` (557 บรรทัด)

มี 2 แท็บย่อย (`activeSubTab: 'students' | 'lessons'`):

1. **รายงานสถิตินักศึกษา (students)**
   - แสดงสถิติภาพรวมห้อง (จำนวนนักศึกษา, คะแนนเฉลี่ย, อัตราความสำเร็จ)
   - ตารางนักศึกษาพร้อมช่องค้นหา, คลิก "เปิดดูสถิติ" เพื่อดูรายละเอียดรายบุคคล: คะแนน pre/post/game แยกตามหน่วยเรียน, สกิล 4 ด้าน (fluency/pronunciation/grammar/vocabulary), log การฝึกพูดพร้อม feedback ภาษาไทย, log การเล่นเกม
   - ถ้าดึงจาก `getStudents()` ไม่ได้ จะ fallback เป็นข้อมูลตัวอย่าง 3 คน (Sarah Johnson, สมชาย ดีดี, ปวีณา แสนสวย)
2. **จัดการบทเรียนและข้อสอบ (lessons)**
   - รายการบทเรียน (`loadLessons`) พร้อมปุ่มแก้ไข/ลบ/สร้างใหม่ (`editLesson`, `startNewLesson`, `deleteLesson` มี popup ยืนยัน)
   - แบบฟอร์มแก้ไขบทเรียนละเอียด: ชื่อบท, คำอธิบาย, จำนวนคาบ/สัปดาห์, **อัปโหลดสไลด์ PDF** (`onSlideUpload` → `uploadSlidePdf`), เลือกเกมก่อนเรียน/หลังเรียนที่อนุญาต — ตอนนี้เลือกได้ 4 แบบ (Word Scramble, Dialogue Sequencer, Picture → Word, Fill in the Blank) หรือปิดขั้นตอนนั้นไปเลย (`setPreGame`/`setPostGame`), รายการ topics/keywords/objectives/assessments (เพิ่ม-ลบเป็น array ได้แบบ dynamic)
   - บันทึกด้วย `saveLesson()` → `apiService.saveLesson()`

ฟีเจอร์นี้คือจุดที่อาจารย์ "ปลดล็อก/ล็อก" เกมของแต่ละหน่วยเรียน ซึ่งหน้านักศึกษาจะไปเช็คค่า `allowedGames` นี้เพื่อโชว์/ซ่อนปุ่มเกมในหน้าเรียน

---

## 8. หน้า Student (`src/app/student/`) — หน้าใหญ่ที่สุดของระบบ

**ไฟล์**: `student.component.ts` (5,505 บรรทัด!) + `.html` (4,285 บรรทัด) — ใหญ่กว่า 3 หน้าที่เหลือรวมกันหลายเท่า เป็นหน้าหลักที่นักศึกษาใช้งานจริง

มี 6 แท็บหลัก (`activeTab`) ที่สลับได้ทั้งจาก top-nav (จอใหญ่) และ bottom-nav (มือถือ):

### 8.1 เข้าเรียน (lessons)
รายการหน่วยเรียน (`units`) 5 หน่วย แต่ละหน่วยมีเนื้อหาครบ: คำศัพท์, บทสนทนา, เกร็ดวัฒนธรรม, quiz ก่อน/หลังเรียน, และซิงค์ `allowedGames`/syllabus fields (topics/keywords/objectives/assessments) มาจากฝั่งอาจารย์ เมื่อเข้าหน่วยเรียนจะเจอ **roadmap 5 ขั้นตอน**:

`Pre-Test → เกมก่อนเรียน → บทเรียน (สไลด์ PDF) → เกมหลังเรียน → Post-Test`

- ขั้น "บทเรียน" render สไลด์ PDF จริงด้วย PDF.js เลื่อนหน้าซ้าย-ขวา เข้าโหมดเต็มจอได้ ดาวน์โหลดได้
- Quiz มี 2 แบบ: แบบง่าย (pre/post) และแบบเต็ม 3 ส่วนคล้ายข้อสอบ TOEIC (`fullQuiz`) — ปรนัย, จับคู่ประโยค/ลากวาง, เรียงประโยค, และคำถามพูดตอบที่บันทึกเสียงผ่าน SpeechRecognition
- คะแนนทุกอย่างเก็บใน `localStorage` แยกตาม user/หน่วย แล้วดึงกลับมาแสดงเป็น progress bar
- **เกมก่อน/หลังเรียน (Step 2 และ Step 4) เลือกได้ 4 แบบ** จากหน้าอาจารย์ (ไม่ใช่แค่ Word Scramble/Dialogue Sequencer แบบเดิม): เพิ่ม **Picture → Word** และ **Fill in the Blank** เข้ามาด้วย — ทั้งสองแบบจะดึงคำศัพท์/ประโยคบทสนทนา**เฉพาะของหน่วยเรียนนั้น** (`buildUnitVocabPool`/`buildFillBlankPool(unitId)`) ไม่ปนกับหน่วยอื่น ป้ายชื่อ/สถานะล็อกบนแผนที่การเรียนจะอัปเดตตามเกมที่อาจารย์เลือกจริง (`getRoadmapGameLabel`, `isRoadmapSlotEnabled`, `getRoadmapGameScore`)
- **Word Scramble ไม่เรียงคำตายตัวอีกต่อไป**: แต่ละครั้งที่เริ่มเกม ระบบจะสุ่มทั้งลำดับคำและจำนวนคำที่หยิบมาเล่น (`initScrambleGame` → `scrambleRoundIndices`) ทำให้นักศึกษาแต่ละคน/แต่ละรอบเจอคำไม่เหมือนกัน

### 8.2 คลังคำศัพท์ (vocabulary)
2 แท็บย่อย: **การ์ดคำศัพท์ตามบทเรียน** (flashcard พลิกได้) และ **AI สร้างคำศัพท์ใหม่** — พิมพ์หัวข้อ+ระดับ แล้วเรียก `generateVocab()`; ถ้า backend ไม่ตอบตามรูปแบบที่ต้องการ จะ fallback เป็นชุดคำศัพท์ mock ขนาดใหญ่ที่เตรียมไว้ในไฟล์ ผลลัพธ์แสดงแบบ "พิมพ์ทีละตัวอักษร" จำลอง (setInterval) และบันทึกประวัติการค้นหาไว้ดูย้อนหลังได้

### 8.3 เกม (games) — arcade รวม 12 เกม
แต่ละเกมมี state machine, ระบบให้คะแนน, และบันทึกผลแยกกันใน `localStorage`:

1. **Word Scramble** — คลิกตัวอักษรเรียงเป็นคำศัพท์
2. **Dialogue Sequencer** — เรียงลำดับบทสนทนาให้ถูกต้อง
3. **Picture → Word** — ดูภาพ พิมพ์คำศัพท์ภาษาอังกฤษ
4. **Thai → English Typing Recall** — ดูความหมายไทย พิมพ์คำอังกฤษ (ตอบผิดครั้งเดียวคือจบ ไม่มีสิทธิ์แก้)
5. **Fill in the Blank** — เติมคำในประโยคบทสนทนาจริงจากบทเรียน
6. **Typing Sprint** — พิมพ์แข่งเวลา 45 วินาที นับคอมโบ
7. **Spot & Fix the Typo** — แก้ประโยคผิดให้ถูก
8. **Word Riddle** — ทายคำจากความหมาย+ตัวอักษรที่ค่อยๆ เปิดเผย
9. **Sentence Reorder** — เรียงคำ/พิมพ์ประโยคใหม่ให้ถูกลำดับ
10. **Open Dialogue Reply** — ตอบบทสนทนาแบบพิมพ์อิสระ ตรวจด้วยการจับคำสำคัญ
11. **Scenario Construction** — โจทย์สถานการณ์เป็น**คำถามภาษาอังกฤษ** (มีคำแปลไทยกำกับตัวเล็กด้านล่างไว้ช่วยทำความเข้าใจ) จำลองให้เจอคำถาม/สถานการณ์แบบภาษาอังกฤษเหมือนของจริง แล้วต้องแต่งประโยคตอบเป็นภาษาอังกฤษ
12. **Email Reply Capstone** — ด่านสุดท้าย ตอบอีเมลลูกค้าแบบมืออาชีพ

ทุกเกมให้ XP (มี cap ต่อวัน `dailyXpGoal`) เกมส่วนใหญ่ตรวจให้คะแนน**ฝั่ง client ล้วนๆ** ไม่มีการยิง API ไปตรวจที่ backend (มีเพียง Scramble/Dialogue ที่ผูกกับ roadmap ของบทเรียน ส่วนที่เหลืออยู่แยกในแท็บเกมเท่านั้น)

### 8.4 ศูนย์ฝึกพูดกับ AI (practice)
"AI Practice Hub" มี 4 โหมดย่อย (`practiceMode`):

- **speech-to-text**: พูดใส่ไมค์ผ่าน `SpeechRecognition` ของเบราว์เซอร์ ระบบเทียบคำที่จับได้กับประโยคเป้าหมายแบบ word-overlap แล้วให้คะแนนความออกเสียง (**ตรวจในเครื่อง ไม่ส่งไป backend**)
- **text-to-speech**: พิมพ์/เลือกประโยค ให้ระบบอ่านออกเสียงด้วย `speechSynthesis` ปรับความเร็ว/สำเนียง US-UK ได้
- **text-to-text**: แชทถาม-ตอบกับ AI จริง ผ่าน `apiService.postAiSpeaking('text-to-text', ...)` — เป็นโหมดเดียวที่คุยกับ backend จริง มีระบบแยกข้อความปกติกับ "คำแนะนำไวยากรณ์" ที่ AI แนบมา แบ่งเป็น 2 แขนงย่อย:
  - **Q&A**: ถามตอบไวยากรณ์/คำศัพท์กับ AI Tutor ตรงไปตรงมา
  - **Chat (roleplay)**: ทุกครั้งที่เข้าโหมดนี้ระบบจะ**สุ่มหัวข้อสถานการณ์สนทนา** จาก `practiceChatTopics` (เช่น สั่งอาหารที่ร้านอาหาร, สัมภาษณ์งาน, รับสายโทรศัพท์ ฯลฯ สไตล์ Duolingo) แล้วโชว์เป็นป้ายหัวข้อเหนือกล่องแชท จากนั้น**ให้ AI เป็นคนเปิดบทสนทนาเอง** (`startChatOpener()` เรียก backend จริง ไม่ใช่ข้อความตายตัว) และคงบทบาทไว้ตลอดการสนทนาผ่าน system prompt ที่แนบ scenario ไปด้วย เมื่อกด **"✅ จบการสนทนา"** (`finishTextChat()`) ระบบจะส่งบทสนทนาทั้งหมดให้ AI วิเคราะห์ แล้วขอ JSON กลับมา (`parseChatSummary()`) เปิดเป็นหน้าสรุปผลเต็มจอ: ภาพรวม + รายการจุดที่ต้องแก้ (ประโยคเดิม/ประโยคที่ถูกต้อง/คำอธิบายเป็นไทย) + คำแนะนำเพิ่มเติม + **ปุ่มพับ/กางดูประวัติบทสนทนาทั้งหมด** (transcript) ในหน้าเดียวกัน พร้อมปุ่ม "สุ่มหัวข้อใหม่" ให้เล่นต่อได้ทันที — ถ้า AI ตอบไม่เป็น JSON หรือเรียกไม่สำเร็จ จะ fallback ไปรวบรวมป้าย "คำแนะนำไวยากรณ์" ที่สะสมไว้ระหว่างแชทแทน (`buildFallbackChatSummary()`) เมื่อจบบทสนทนาแล้วจะถูกบันทึกลง **"ประวัติการเรียนรู้" (`learningLogs`)** พร้อมแนบบทสนทนาทั้งหมดไปด้วย (`logChatSession()`) กดที่แถวในหน้าประวัติเพื่อกาง/พับดูบทสนทนาเก่าย้อนหลังได้ (`toggleLogTranscript()`) ทดสอบแล้วว่าทำงานจริงกับ backend AI (Gemini) ครบทุกจุด ทั้งการเปิดบทสนทนา, การแก้ไวยากรณ์ระหว่างแชท, หน้าสรุปผล, และการย้อนดูประวัติ
- **speech-to-speech**: โหมดแนะนำเด่น แต่เบื้องหลังใช้กลไกเดียวกับ speech-to-text + text-to-text ผสมกัน

นอกจากนี้ยังมี **AI Video Call** จำลอง (คุยกับอาจารย์ AI ผ่านหน้าจอ, พูดโต้ตอบด้วยเสียง) ซึ่งผลประเมิน pronunciation/fluency/grammar/vocabulary ตอนจบคอล **สุ่มด้วย `Math.random()` ทั้งหมด** ไม่ได้ประเมินจริงจาก backend

> พบโค้ดที่เขียนไว้ในไฟล์ TS แต่**ไม่ถูกอ้างอิงในหน้า HTML เลย** (dead code) ได้แก่ระบบ "AI Buddy" แชท + roleplay scenario (`sendBuddyMessage`, `selectScenario`, `callLiveAi` ฯลฯ) — เดาว่าเป็นดีไซน์เก่าที่ถูกแทนที่ด้วย Practice Hub + Video Call ตัวปัจจุบัน แต่ยังไม่ได้ลบทิ้ง

### 8.5 โปรไฟล์ (profile)
ข้อมูลผู้ใช้ (ชื่อ, รหัสนักศึกษา, คณะ, สาขา, ชั้นปี), stat tile 4 ค่า, progress การ์ดแต่ละบทเรียน, ปุ่มออกจากระบบ

### 8.6 คลังวิดีโอ (videos)
"Video Learning Vault" — วิดีโอบทเรียน mock 3 คลิป พร้อมจำลองการเล่น/ความคืบหน้า (setInterval ปลอม ไม่ใช่วิดีโอจริง) มีซับไตเติล TH/EN และแบบทดสอบท้ายคลิป

### 8.7 ระบบเกมมิฟิเคชันอื่นๆ
Streak รายวัน, แถบ XP/เป้าหมายรายวัน, เหรียญตรา/badges ปลดล็อกได้, ประวัติการเรียนรู้ (learning logs), เสียงเอฟเฟกต์คลิก/ถูก/ผิด

> **Leaderboard**: มีการดึงข้อมูล `getLeaderboard()` และ mock fallback ไว้พร้อม (`loadLeaderboard`, `leaderboardList`) แต่**ไม่มีจุดไหนในหน้า HTML แสดงผลลีดเดอร์บอร์ดนี้เลย** — ดึงมาเตรียมไว้ในหน่วยความจำเฉยๆ (อาจเป็นฟีเจอร์ที่ยังสร้าง UI ไม่เสร็จ)

---

## 9. ข้อสังเกตภาพรวม

- **ทุกหน้ามี fallback เป็น mock data** เมื่อเรียก API แล้ว error — ทำให้ frontend เดโมได้แม้ backend ยังไม่พร้อมหรือดับ เหมาะกับช่วงพัฒนา แต่ต้องระวังตอน production เพราะจะเงียบๆ โชว์ข้อมูลปลอมแทนข้อความ error จริง
- **การยืนยันตัวตน (auth) ยังเป็นแบบพื้นฐาน**: เก็บ user object เปล่าๆ ใน `localStorage` ไม่มี token/JWT, ไม่มี route guard ระดับ Router — การป้องกันหน้าทำด้วยการเช็คค่าใน `ngOnInit()` ของแต่ละ component เท่านั้น (ถ้าคนแก้ localStorage เองก็เข้าหน้าได้)
- **ฟีเจอร์ AI ส่วนใหญ่ในหน้านักศึกษาทำงานฝั่ง client เป็นหลัก** (Web Speech API + สุ่ม/คำนวณเอง) มีเพียงโหมด text-to-text แชท และ AI สร้างคำศัพท์ (`generateVocab`) เท่านั้นที่คุยกับ backend จริง ส่วน endpoint อัปโหลดเสียง/ไฟล์ที่เตรียมไว้ใน `ApiService` (`postAudioSpeaking`, `postAiAssistantFile` ฯลฯ) ยังไม่ถูกเรียกใช้จากหน้าไหนเลยในปัจจุบัน
- **หน้า Student ใหญ่มากในไฟล์เดียว** (~10,000 บรรทัดรวม ts+html) ยังไม่ได้ถูกแตกเป็น component ย่อย ซึ่งถ้าจะพัฒนาต่อ ควรพิจารณาแยกแต่ละแท็บ (เกม, practice hub, lessons) ออกเป็น component/ไฟล์ของตัวเองเพื่อให้ดูแลง่ายขึ้น
