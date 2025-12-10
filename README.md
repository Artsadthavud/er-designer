**DB Architect — คำอธิบายการทำงาน**

แอปนี้เป็นเครื่องมือแบบหน้าจอ (client-side) สำหรับออกแบบโครงสร้างฐานข้อมูล (Database Schema) แบบมือ — ให้คุณสร้างตาราง คอลัมน์ และความสัมพันธ์ (foreign keys) ผ่านอินเทอร์เฟซ แล้วแสดงผลเป็นแผนภาพ ER (Entity-Relationship) แบบอินเตอร์แอคทีฟโดยใช้ `reactflow`.

ฟีเจอร์หลัก
- สร้าง/แก้ไข/ลบตารางและคอลัมน์แบบอินไลน์
- กำหนดคีย์หลัก (`PRIMARY KEY`), คีย์เอกลักษณ์ (`UNIQUE`) และข้อจำกัด (`NOT NULL`, `CHECK`)
- สร้างความสัมพันธ์ระหว่างตารางโดยการตั้งคอลัมน์เป็น `Foreign Key` (รูปแบบ `Table.Column`)
- แสดงแผนภาพ ER พร้อมเส้นเชื่อมที่สามารถจัดตำแหน่งอัตโนมัติได้ (Auto layout)
- ส่งออก schema เป็นไฟล์ JSON และส่งออกภาพ (PNG) ของแผนภาพ

สถาปัตยกรรมสั้น ๆ
- Frontend: React + TypeScript + Vite
- แสดงผล ER: `reactflow` พร้อม node แบบกำหนดเอง (`TableNode`) และ sidebar editor (`Editor`)
- การคำนวณ layout: logic ใน `utils/layoutUtils.ts`
- (Optional) การสร้าง schema จากคำอธิบายภาษา: มีโค้ดตัวอย่างเชื่อมต่อกับ Gemini (`services/gemini.ts`) — แต่วิธีการเรียกใช้งานนี้ต้องทำผ่านเซิร์ฟเวอร์ (ไม่ควรฝัง API key ในฝั่ง client)

ความปลอดภัยสำคัญ — อย่าใส่ API key ใน bundle
- หากคุณต้องการเรียกใช้บริการ AI (เช่น Gemini) ให้ตั้งค่า endpoint ฝั่งเซิร์ฟเวอร์ที่เก็บ `GEMINI_API_KEY` อย่างปลอดภัย และให้ frontend เรียกผ่าน proxy/API route แทนการฝังคีย์ใน bundle ของคลไอเอ็นท์

วิธีใช้งาน (พัฒนาบนเครื่อง)
1. ติดตั้ง dependencies

```powershell
npm install
```

2. สร้างไฟล์ตัวแปรสภาพแวดล้อม (ถ้าจำเป็น)

- หากคุณใช้ฟีเจอร์ที่เรียก AI ให้ตั้งไฟล์ `.env.local` (หรือวิธีจัดการ env ของคุณ) แล้วใส่ค่า:

```text
GEMINI_API_KEY=your_gemini_api_key_here
```

- หมายเหตุ: อย่า commit `.env.local` ลง Git และอย่า expose คีย์นี้ใน frontend bundle.

3. รันในโหมดพัฒนา

```powershell
npm run dev
```

4. สร้างไฟล์ schema/export และส่งออกภาพ
- ใช้ปุ่มใน sidebar เพื่อนำเข้า/ส่งออก JSON และส่งออกภาพ PNG ของแผนภาพ

โครงสร้างไฟล์สำคัญ
- `App.tsx` — จัดการ state หลัก, สร้าง nodes/edges และรวม `ReactFlow` กับ `Editor`
- `components/Editor.tsx` — UI สำหรับแก้ไข schema (sidebar)
- `components/TableNode.tsx` — การเรนเดอร์ node ของตารางในแผนภาพ
- `utils/layoutUtils.ts` — อัลกอริทึมจัดวางอัตโนมัติ
- `services/gemini.ts` — ตัวอย่างการเรียก Gemini (ห้ามเรียกโดยตรงจาก client ใน production)

ข้อแนะนำสำหรับ deploy / production
- อย่าใส่ความลับ (API keys) ลงในตัว bundleของ frontend — ให้เรียกผ่าน backend/proxy
- พิจารณาเพิ่มการตรวจสอบข้อมูลนำเข้า (validation) ก่อนนำเข้า JSON schema
- เพิ่มกระบวนการ lint/format และทดสอบก่อน deploy

ต้องการให้ผมแก้ README เพิ่มเติม (เช่น เพิ่มภาพประกอบ, ตัวอย่าง JSON, หรือลิงก์ API proxy ตัวอย่าง) หรือให้ผมเปิด patch สำหรับการแก้โค้ดที่เกี่ยวข้องกับการไม่ฝัง API key หรือไม่ครับ?

---

English

**DB Architect — Overview**

This application is a client-side visual database schema designer that lets you create tables, columns and relationships (foreign keys) via a sidebar editor and renders an interactive ER (Entity-Relationship) diagram using `reactflow`.

Key features
- Create/edit/delete tables and columns inline
- Define primary keys, unique constraints and other column constraints (NOT NULL, CHECK)
- Create relationships by marking a column as a foreign key using the `Table.Column` syntax
- Automatic layout of the ER diagram with editable nodes
- Export schema as JSON and export diagram as PNG

Architecture (short)
- Frontend: React + TypeScript + Vite
- ER rendering: `reactflow` with a custom `TableNode` and a sidebar `Editor`
- Layout logic: `utils/layoutUtils.ts`
- Note: The project previously included an example service to call an external AI (Gemini). That service has been removed from the codebase to avoid shipping API keys with the frontend bundle.

Security note — do not embed API keys in the client
- If you need to call external AI services, put the API key on a secure server and call it through a backend/proxy endpoint rather than exposing it in the frontend bundle.

How to run (development)
1. Install dependencies

```powershell
npm install
```

2. (Optional) Environment variables

If you use a backend or proxy for AI features, set your environment variables (for example `GEMINI_API_KEY`) on the server side and **do not** commit them into the repository.

3. Start development server

```powershell
npm run dev
```

Where to look
- `App.tsx` — main state and ReactFlow integration
- `components/Editor.tsx` — sidebar editor UI
- `components/TableNode.tsx` — node rendering for tables
- `utils/layoutUtils.ts` — auto layout implementation

If you'd like, I can also:
- Add a small example backend proxy (Express) to demonstrate safe AI calls
- Add `.env.example` and update docs further

Which of these would you like me to do next?
