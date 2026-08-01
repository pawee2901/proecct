# AI Speaking Assistant

ระบบฝึกพูดภาษาอังกฤษตามสถานการณ์จำลองด้วยปัญญาประดิษฐ์ สำหรับนักศึกษามหาวิทยาลัย

---

## สถาปัตยกรรมระบบ

```
Angular 21 Frontend (:4200)
        │
        │ HTTP (baseUrl ตายตัวใน api.service.ts)
        ▼
Flask Backend (:5000)
        │
        ├── MySQL Database (projectai)
        └── Gemini AI API (Flash 2.5)
```

---

## บทบาทผู้ใช้งาน

| บทบาท | Route | หน้าที่ |
|---|---|---|
| Student | `/student` | เรียนบทเรียน / เล่นเกม / ฝึกพูดกับ AI |
| Teacher | `/teacher` | ดูสถิตินักศึกษา / จัดการบทเรียน |
| Admin | `/admin` | อนุมัติครู / จัดการบัญชี / ดูสถานะระบบ |

> อาจารย์ที่สมัครใหม่ต้องรอ Admin อนุมัติก่อนเข้าระบบได้

---

## ฟีเจอร์หลัก (Student)

`/student` เป็น layout เดียว (navbar + modal ที่ใช้ร่วมกัน) ครอบ 7 หน้าย่อยที่ route แยกกันจริง:

| Route | หน้าที่ |
|---|---|
| `/student/lessons` | เข้าเรียนตาม Unit — `Pre-Test → เกมก่อนเรียน → สไลด์ PDF → เกมหลังเรียน → Post-Test` |
| `/student/vocabulary` | Flashcard คำศัพท์จากบทเรียน + สร้างคำศัพท์ใหม่ด้วย AI ตามหัวข้อที่พิมพ์ |
| `/student/games` | ศูนย์รวมมินิเกม 21 แบบ (Word Scramble, Dialogue Sequencer, Fill in the Blank, Typing Sprint, Word Riddle, Spot the Typo, Scenario Construction, Memory Match, Word Search, Drag & Drop Builder ฯลฯ) |
| `/student/practice` | ศูนย์ฝึกพูดกับ AI 4 โหมด — text-to-text (แชท/Q&A ต่อ Gemini จริง), speech-to-text, text-to-speech, speech-to-speech — บวก AI Video Call จำลองคุยกับอาจารย์ |
| `/student/profile` | สถิติ ความคืบหน้ารายบท และประวัติการฝึกแยกตามหมวด |
| `/student/videos` | คลังวิดีโอบทเรียน (mockup จำลองการเล่น) |
| `/student/review` | ทบทวนคำ/ประโยคที่เคยตอบผิดจากทุกกิจกรรม |

**บทเรียนเริ่มต้น 5 Unit** — Welcoming → Telephoning → Presentation → Meeting → Instruction

---

## การรันในเครื่อง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. รัน Frontend (port 4200)
ng serve

# 3. รัน Backend แยกต่างหาก (port 5000)
# ดูโฟลเดอร์ backend สำหรับคำสั่ง Flask
```

เปิด `http://localhost:4200` — จะ redirect ไป `/login` อัตโนมัติ

**บัญชีทดสอบ:** `student01` / `teacher01` / `admin01` (รหัสผ่าน: `1234`)

---

## Build สำหรับ Production

```bash
ng build
```

ไฟล์ output อยู่ที่ `dist/`

---

## โครงสร้างโปรเจค

```
src/app/
├── login-register/        หน้า Login / Register / ลืมรหัสผ่าน
├── student/                โซนนักศึกษา
│   ├── shell/                 Navbar + modal ที่ใช้ร่วมกัน + <router-outlet>
│   ├── pages/                 7 หน้าแยกไฟล์ตามแท็บ (lessons, vocabulary, games,
│   │                          practice, profile, videos, review)
│   ├── services/               State ที่ใช้ร่วมกันข้ามหน้า (session, ข้อมูลบทเรียน,
│   │                          progress, เกม, ประวัติการเรียน ฯลฯ)
│   ├── models/                 Type ของข้อมูล (Unit, FullQuiz, LearningLogEntry ฯลฯ)
│   └── _shared.scss            Style ที่ใช้ร่วมกันมากกว่า 1 หน้า
├── teacher/                หน้าอาจารย์
├── admin/                  หน้าผู้ดูแลระบบ
├── services/
│   └── api.service.ts       ตัวกลาง HTTP ทุก endpoint (baseUrl ชี้ localhost:5000 ตรงๆ)
├── app.routes.ts            กำหนด routing
└── app.config.ts            Angular providers (HttpClient, Router)
```

---

## เทคโนโลยี

- **Angular 21** — Standalone Components (ไม่มี NgModule)
- **RxJS** — HttpClient / Observable pattern
- **PDF.js** — render สไลด์ PDF ในหน้าเรียน
- **Web Speech API** — ฟังเสียง / อ่านออกเสียงในเบราว์เซอร์
- **SweetAlert2** — popup แจ้งเตือน
- **Gemini AI** — แชท / สร้างคำศัพท์ / วิเคราะห์บทสนทนา

---

## หมายเหตุสำหรับนักพัฒนา

- คะแนนเกมและ session ส่วนใหญ่เก็บใน `localStorage` เป็นหลัก (บาง endpoint ยิงขึ้น backend แบบ fire-and-forget แต่หน้าเว็บไม่เคยอ่านค่ากลับ) — ล้าง localStorage แล้วความคืบหน้าจะหาย
- ทุกหน้ามี mock data fallback เมื่อ API ล้มเหลว
- Auth ใช้วิธีเก็บ user object ใน localStorage (ไม่มี JWT, ไม่มี route guard) — ทุกหน้าเช็คสิทธิ์เองใน `ngOnInit`
- `proxy.conf.json` ที่ root ยังไม่ได้ต่อเข้ากับ `angular.json` และ `ApiService` ก็เรียกด้วย absolute URL อยู่แล้ว — จะเปลี่ยนที่อยู่ backend ต้องแก้ `baseUrl` ใน `src/app/services/api.service.ts` โดยตรง
