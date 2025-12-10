# DB Architect

DB Architect is a client-side visual database schema designer built with React and TypeScript. It lets you create tables, columns, and relationships via a sidebar editor and renders an interactive ER (Entity-Relationship) diagram using `reactflow`.

## Features
- Create / edit / delete tables and columns inline
- Define primary keys and common constraints (NOT NULL, UNIQUE, etc.)
- Create relationships by marking a column as a foreign key using `Table.Column` syntax
- Automatic layout of the ER diagram with editable nodes
- Export schema as JSON and export diagram as PNG

## Architecture (short)
- Frontend: React + TypeScript + Vite
- ER rendering: `reactflow` with a custom `TableNode` and a sidebar `Editor`
- Layout logic: `utils/layoutUtils.ts`
# DB Architect

DB Architect is a client-side visual database schema designer built with React and TypeScript. It lets you create tables, columns, and relationships via a sidebar editor and renders an interactive ER (Entity-Relationship) diagram using `reactflow`.

## Features
- Create / edit / delete tables and columns inline
- Define primary keys and common constraints (NOT NULL, UNIQUE, etc.)
- Create relationships by marking a column as a foreign key using `Table.Column` syntax
- Automatic layout of the ER diagram with editable nodes
- Export schema as JSON and export diagram as PNG

## Architecture (short)
- Frontend: React + TypeScript + Vite
- ER rendering: `reactflow` with a custom `TableNode` and a sidebar `Editor`
- Layout logic: `utils/layoutUtils.ts`

## Security note — keep secrets on the server
- Do not put secret API keys or other sensitive values in the frontend bundle. If you need to call external services that require secrets, keep those secrets on a server and call them through a backend/proxy endpoint.

## How to run (development)
1. Install dependencies

```powershell
npm install
```

2. (Optional) Server environment variables

If you run a backend/proxy service, set any required environment variables on the server and do not commit them into the repository.

3. Start development server

```powershell
npm run dev
```

## Where to look
- `App.tsx` — main state and ReactFlow integration
- `components/Editor.tsx` — sidebar editor UI
- `components/TableNode.tsx` — node rendering for tables
- `utils/layoutUtils.ts` — auto layout implementation


แอปนี้เป็นเครื่องมือแบบหน้าจอ (client-side) สำหรับออกแบบโครงสร้างฐานข้อมูล (Database Schema) ให้คุณสร้างตาราง คอลัมน์ และความสัมพันธ์ (foreign keys) ผ่านอินเทอร์เฟซ แล้วแสดงผลเป็นแผนภาพ ER (Entity-Relationship) แบบอินเตอร์แอคทีฟโดยใช้ `reactflow`.

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

ข้อความปลอดภัยสำคัญ — อย่าใส่ API key ใน bundle
- หากคุณต้องการเรียกใช้บริการภายนอก ให้ตั้งค่า endpoint ฝั่งเซิร์ฟเวอร์ที่เก็บคีย์อย่างปลอดภัย และให้ frontend เรียกผ่าน proxy/API route แทนการฝังคีย์ใน bundle ของคลไอเอ็นท์

วิธีใช้งาน (พัฒนาบนเครื่อง)
1. ติดตั้ง dependencies

```powershell
npm install
```

2. สร้างไฟล์ตัวแปรสภาพแวดล้อม (ถ้าจำเป็น)

- หากคุณต้องการเก็บคีย์หรือความลับ ให้ตั้งค่าบนเซิร์ฟเวอร์หรือใช้วิธีจัดการ env ที่ไม่ถูก commit ลงใน repository.

3. รันในโหมดพัฒนา

```powershell
npm run dev
```

โครงสร้างไฟล์สำคัญ
- `App.tsx` — จัดการ state หลัก, สร้าง nodes/edges และรวม `ReactFlow` กับ `Editor`
- `components/Editor.tsx` — UI สำหรับแก้ไข schema (sidebar)
- `components/TableNode.tsx` — การเรนเดอร์ node ของตารางในแผนภาพ
- `utils/layoutUtils.ts` — อัลกอริทึมจัดวางอัตโนมัติ

ข้อแนะนำสำหรับ deploy / production
- อย่าใส่ความลับ (API keys) ลงในตัว bundleของ frontend — ให้เรียกผ่าน backend/proxy
- พิจารณาเพิ่มการตรวจสอบข้อมูลนำเข้า (validation) ก่อนนำเข้า JSON schema
- เพิ่มกระบวนการ lint/format และทดสอบก่อน deploy


