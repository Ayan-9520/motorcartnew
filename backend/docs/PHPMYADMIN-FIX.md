# phpMyAdmin mein tables nahi dikh rahi? — Fix

## Problem
phpMyAdmin mein `motorcart` database **khali** dikhti hai, lekin backend theek kaam karta hai.

**Reason:** Kabhi-kabhi **2 alag MySQL** chalte hain Windows par:
- XAMPP ka MySQL (phpMyAdmin isi se connect hota hai)
- Dusra MySQL service (Prisma / Node isse connect ho sakta hai)

---

## Step 1 — phpMyAdmin refresh

1. Left side par **motorcart** par dubara click karo  
2. Browser **F5** (refresh)  
3. **Structure** tab kholo  

Agar tables dikhen → done.

---

## Step 2 — XAMPP MySQL port check

1. XAMPP Control Panel → **MySQL** → **Config** → `my.ini`  
2. Line dekho: `port=3306` ya `port=3307`

Agar **3307** hai, `backend/.env` update karo:

```
DATABASE_URL="mysql://root:@127.0.0.1:3307/motorcart"
```

Phir terminal mein:

```powershell
cd backend
npx prisma db push
npm run db:seed
```

phpMyAdmin dubara kholo — ab tables dikhni chahiye.

---

## Step 3 — Tables XAMPP wale MySQL par banao (recommended)

Terminal (project folder):

```powershell
cd e:\Projects\motorcartcursor\backend
npx prisma db push
npm run db:seed
npm run seed:vehicles
```

Ye **70 tables** banata hai + demo users.

Verify:

```powershell
npx tsx scripts/list-tables.ts
```

Output: `Found 70 tables...`

---

## Step 4 — phpMyAdmin SQL tab (optional)

Agar sirf database create karni ho:

```sql
CREATE DATABASE IF NOT EXISTS motorcart
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Tables **SQL file se import mat karo** (wo Postgres/Supabase ke liye thi).  
Tables **sirf Prisma** se banti hain: `npx prisma db push`

---

## Login (seed ke baad)

| Email | Password |
|-------|----------|
| customer@motorcart.in | Customer@123 |
| admin@motorcart.in | Admin@12345 |

---

## App chalao

```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Frontend: http://localhost:3000  
Backend: http://localhost:3001

**Supabase keys frontend mein mat rakho** — sirf:

```
VITE_API_URL=http://localhost:3001
```
