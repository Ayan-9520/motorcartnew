# Motorcart — local dev (exact steps)

## Problem you had

1. Port **3000** was busy → Vite moved to **3001**
2. Backend also needs **3001** → crash `EADDRINUSE`
3. Login called `localhost:3001` but got **Vite**, not API → **timeout 30s**

## Fix (do this every time)

### 1. Stop old servers

In **both** terminals where `npm run dev` is running: press **Ctrl+C**.

### 2. Free ports + start both apps

From project root:

```powershell
cd E:\Projects\motorcartcursor
npm run ports:free
npm run dev
```

- Frontend: **http://localhost:3000**
- Backend API: **http://localhost:3001/api/health** → must show `"status":"ok"`

### 3. XAMPP

Start **MySQL** in XAMPP (green).

### 4. Clear old login + reset DB users (once)

```powershell
cd E:\Projects\motorcartcursor\backend
npm run db:reset-auth
```

Then hard-refresh browser (Ctrl+Shift+R) on http://localhost:3000 — old Supabase tokens are cleared automatically.

### 5. Login credentials

| Email | Password | Role |
|-------|----------|------|
| `dealer@gmail.com` | `Dealer@123` | dealer |
| `admin@motorcart.in` | `Admin@12345` | super_admin |
| `customer@motorcart.in` | `Customer@123` | customer |

Open: **http://localhost:3000/login**

**Super Admin dashboard:** http://localhost:3000/dashboard/super-admin  
→ **Business approvals:** `/dashboard/super-admin/business-approvals` (approve pending dealer/DSA/parts/service signups)

New signup works at `/signup` and `/signup/business` (password min 6 chars, email auto-confirmed in dev).

## Wrong URLs

- Do **not** open **http://localhost:3001** in the browser for the app UI (that is the API port).
- Always use **http://localhost:3000** for the website.

## If port 3000 still busy

```powershell
npm run ports:free
```

Then only **one** `npm run dev` from root — not separate frontend/backend in two terminals unless you freed ports first.
