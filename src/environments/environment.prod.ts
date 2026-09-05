// ใช้ตอน `ng build` (production) — ชี้ไปที่ backend ตัวจริงที่เว็บใช้งานอยู่บน
// Hostinger (ดู DEPLOY.md) ไม่ใช่ Render -- ค่า Render ตัวก่อนหน้านี้เป็นของ
// ที่เก่า/เทสต์ค้างไว้ ถ้า build ด้วยค่านั้นแอปที่ deploy จริงจะยิง API ผิดโดเมน
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.mymuay.com',
};
