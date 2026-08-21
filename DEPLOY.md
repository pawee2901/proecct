# คู่มือ Deploy ขึ้น Hostinger (Business Web Hosting)

โปรเจกต์นี้มี 2 ส่วนที่ต้องขึ้นแยกกันบน Hostinger เดียวกัน:

| ส่วน | เทคโนโลยี | ไปอยู่ที่ไหนบน Hostinger |
|---|---|---|
| Frontend | Angular 21 (static build) | โดเมนหลัก เช่น `yourdomain.com` → `public_html` |
| Backend | Flask + MySQL | ซับโดเมน เช่น `api.yourdomain.com` → ตั้งเป็น **Python App** ผ่าน hPanel |

แพ็กเกจ Business Web Hosting ของคุณรองรับ "Web Applications" (Python App ผ่าน Passenger) และ MySQL อยู่แล้ว ไม่ต้องซื้อเพิ่ม

---

## ภาพรวม (Checklist)

- [ ] 1. สร้างซับโดเมน `api.yourdomain.com`
- [ ] 2. สร้าง MySQL database ใน hPanel
- [ ] 3. ย้ายข้อมูลจาก DB ในเครื่อง (`projectai`) ขึ้น DB บน Hostinger
- [ ] 4. ตั้งค่า Python App ให้ `api.yourdomain.com` ชี้มาที่ `backend/`
- [ ] 5. อัปโหลดโค้ด backend + ตั้งค่า Environment Variables + สั่ง pip install
- [ ] 6. แก้ `environment.prod.ts` ให้ชี้โดเมนจริง แล้ว `ng build`
- [ ] 7. อัปโหลดไฟล์ที่ build ได้ (`dist/projecct/browser`) ขึ้น `public_html`
- [ ] 8. ทดสอบเว็บจริง

---

## ขั้นตอนที่ 1 — สร้างซับโดเมนสำหรับ backend

hPanel → **Domains → Subdomains** → สร้าง `api` (จะได้ `api.yourdomain.com`)

รอสักครู่ให้ SSL ฟรีของ Hostinger ออกให้ซับโดเมนนี้อัตโนมัติ (เช็คที่ **Security → SSL**) — ต้องมี SSL ก่อนถึงจะเรียกจาก frontend (ที่เป็น https) ได้โดยไม่ติด mixed-content

---

## ขั้นตอนที่ 2 — สร้าง MySQL Database

hPanel → **Databases → MySQL Databases** → สร้างใหม่ จะได้:
- ชื่อ database (มักมี prefix ของ user นำหน้า เช่น `u123456789_projectai`)
- username / password (มักมี prefix เดียวกัน)
- host: ปกติคือ `localhost` (เพราะ backend กับ DB อยู่เซิร์ฟเวอร์เดียวกัน)

จดค่าพวกนี้ไว้ — จะใช้ในขั้นตอนที่ 5

---

## ขั้นตอนที่ 3 — ย้ายข้อมูลจาก DB เครื่อง → Hostinger

DB ในเครื่องคุณตอนนี้ชื่อ `projectai` (มีข้อมูลจริงอยู่แล้ว ไม่ใช่ DB เปล่า) วิธีย้ายที่ง่ายที่สุด:

1. **Export จากเครื่อง**: เปิด phpMyAdmin ของ XAMPP (`http://localhost/phpmyadmin`) → เลือก DB `projectai` → แท็บ **Export** → Quick → Go → จะได้ไฟล์ `.sql`
2. **Import เข้า Hostinger**: hPanel → **Databases → phpMyAdmin** → เลือก database ที่สร้างในขั้นตอนที่ 2 → แท็บ **Import** → เลือกไฟล์ `.sql` ที่ export มา → Go

> ทางเลือก: ถ้าอยากรัน `migrate.py` / `seed_lessons.py` ตรงจาก Hostinger DB โดยไม่ผ่าน phpMyAdmin ก็เปิด **Remote MySQL** (hPanel → Databases → Remote MySQL) แล้วเพิ่ม IP เครื่องคุณเข้า whitelist จากนั้นแก้ `.env` ในเครื่องชั่วคราวให้ `DB_HOST` ชี้ไปที่ host ของ Hostinger แล้วรันสคริปต์จากเครื่องได้เลย (อย่าลืมเปลี่ยน `.env` กลับเป็น `localhost` หลังรันเสร็จ)

---

## ขั้นตอนที่ 4 — ตั้งค่า Python App

hPanel → **Websites** → เลือกเว็บไซต์ (โดเมนหลัก) → **Advanced → Python App** (บางเวอร์ชันเรียก "Setup Python App")

ตั้งค่า:
- **Domain**: เลือก `api.yourdomain.com` (ซับโดเมนที่สร้างในขั้นตอนที่ 1)
- **Application root**: ปล่อยตามที่ hPanel เสนอ (จะได้ path เช่น `domains/api.yourdomain.com/` — จดไว้ ใช้อัปโหลดไฟล์ในขั้นตอนถัดไป)
- **Application startup file**: `app.py`
- **Application Entry point**: `app` (ตัวแปร Flask object ใน `app.py` ชื่อ `app` อยู่แล้ว ไม่ต้องแก้โค้ด)
- **Python version**: เลือกเวอร์ชันที่ใหม่ที่สุดที่มีให้ (3.10+)

กด Create — hPanel จะสร้างโฟลเดอร์ + virtualenv ให้อัตโนมัติ

---

## ขั้นตอนที่ 5 — อัปโหลดโค้ด backend + ตั้งค่า

1. **อัปโหลดไฟล์**: hPanel → **Files → File Manager** ไปที่ path ที่จดไว้ (application root) → อัปโหลดไฟล์**ทั้งหมดในโฟลเดอร์ `backend/`** ของโปรเจกต์นี้ (หรือ zip แล้วอัปโหลด/แตกไฟล์ผ่าน File Manager) — **ไม่ต้อง**อัปโหลด `__pycache__`, `.env` (จะตั้งผ่าน hPanel แทนในข้อถัดไป)
2. **Environment Variables**: กลับไปหน้า Python App ของ `api.yourdomain.com` → ส่วน **Environment variables** → เพิ่มทีละตัว:
   ```
   DB_HOST=localhost
   DB_USER=<username จากขั้นตอนที่ 2>
   DB_PASSWORD=<password จากขั้นตอนที่ 2>
   DB_NAME=<database name จากขั้นตอนที่ 2>
   DB_PORT=3306
   GEMINI_API_KEY=<คีย์ Gemini ของคุณ>
   MODEL_NAME=gemini-2.5-flash
   ```
3. **ติดตั้ง dependencies**: หน้า Python App จะมีช่องให้ระบุ `requirements.txt` (ไฟล์นี้เตรียมไว้แล้วที่ `backend/requirements.txt`) แล้วกดปุ่ม **Run pip install**
4. กด **Restart** ที่หน้า Python App

ทดสอบเปิด `https://api.yourdomain.com/lessons` ในเบราว์เซอร์ — ถ้าเห็น JSON ข้อมูลบทเรียนกลับมา แปลว่า backend รันแล้ว

---

## ขั้นตอนที่ 6 — แก้ URL production แล้ว build frontend

เปิด [src/environments/environment.prod.ts](src/environments/environment.prod.ts) แก้บรรทัด `apiBaseUrl` ให้เป็นโดเมนจริง:

```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.yourdomain.com', // ← ใส่โดเมนจริงตรงนี้
};
```

แล้ว build:

```bash
ng build
```

ไฟล์ output จะอยู่ที่ **`dist/projecct/browser/`** (โฟลเดอร์ `browser` เท่านั้น ไม่ใช่ทั้ง `dist/projecct`)

---

## ขั้นตอนที่ 7 — อัปโหลด frontend

hPanel → **Files → File Manager** → ไปที่ `public_html` ของโดเมนหลัก → อัปโหลด**เนื้อหาข้างใน** `dist/projecct/browser/` ทั้งหมด (ไฟล์ `index.html` ต้องอยู่ตรงราก `public_html` เลย ไม่ใช่ในโฟลเดอร์ย่อย)

> Angular เป็น SPA ต้องมี URL rewrite ให้ทุก route ชี้กลับไปที่ `index.html` ไม่งั้น refresh หน้าเช่น `/student/lessons` จะเจอ 404 — สร้างไฟล์ `.htaccess` ใน `public_html` ใส่:
> ```apache
> <IfModule mod_rewrite.c>
>   RewriteEngine On
>   RewriteBase /
>   RewriteRule ^index\.html$ - [L]
>   RewriteCond %{REQUEST_FILENAME} !-f
>   RewriteCond %{REQUEST_FILENAME} !-d
>   RewriteRule . /index.html [L]
> </IfModule>
> ```

---

## ขั้นตอนที่ 8 — ทดสอบ

เปิด `https://yourdomain.com` → ลอง login ด้วยบัญชีทดสอบ (`student01` / `teacher01` / `admin01`, รหัส `1234`) → เช็คว่าหน้า lessons โหลดข้อมูลจริงจาก backend (ไม่ใช่ mock data fallback)

---

## หมายเหตุ

- `.gitignore` ถูกตั้งให้ไม่ commit `backend/.env`, `backend/__pycache__`, `backend/venv` เข้า git แล้ว — ค่า secret ทั้งหมดตั้งผ่าน hPanel Environment Variables แทน
- CORS ฝั่ง Flask เปิดกว้างทุก origin อยู่แล้ว (`CORS(app, resources={r"/*": {"origins": "*"}})`) ไม่ต้องแก้เพิ่มเพื่อให้ frontend เรียกได้ — แต่ถ้าอยากรัดกุมขึ้นภายหลัง ค่อยจำกัดเฉพาะ `https://yourdomain.com`
- `debug=True` ใน `app.py` มีผลเฉพาะตอนรันแบบ `python app.py` ตรงๆ เท่านั้น — บน Hostinger, Passenger เป็นคนเรียกใช้ตัวแปร `app` โดยตรง ไม่ผ่าน `app.run()` จึงไม่กระทบเรื่อง production
- โฟลเดอร์ต้นฉบับ `d:\ai-speaking-assistant` ยังอยู่ครบ ไม่ได้ถูกลบ — เก็บไว้เป็น backup ได้จนกว่าจะมั่นใจว่า `d:\projecct\backend` ใช้งานได้จริงบน production แล้ว
