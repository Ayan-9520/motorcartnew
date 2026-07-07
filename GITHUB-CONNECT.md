# GitHub Connect Guide - Motorcart (Hindi/English)

## Daily workflow (normal git commands)

Pehli baar sirf ek script chalao:

```powershell
cd E:\Projects\motorcartcursor
powershell -ExecutionPolicy Bypass -File scripts/git-setup-once.ps1
```

Phir **naya terminal** kholo (Ctrl+Shift+` ya Cursor restart).

Uske baad hamesha yeh:

```powershell
cd E:\Projects\motorcartcursor
git add .
git commit -m "code change"
git push origin main
```

Repo: **https://github.com/Ayan-9520/motorcartnew** | Branch: **main**

---

## Problem: `git not recognized`
Git install hai lekin terminal PATH update nahi kiya. **3 easy tarike:**

---

## TARIKA 1 - Sabse Aasaan (Double Click)

1. Folder kholo: `E:\Projects\motorcartcursor`
2. **`PUSH-TO-GITHUB.bat`** par double-click karo
3. Login maange to:
   - Username: `Ayan-9520`
   - Password: **GitHub Token** (niche dekho kaise banaye)

---

## TARIKA 2 - Cursor Terminal se

```powershell
cd E:\Projects\motorcartcursor
powershell -ExecutionPolicy Bypass -File scripts\push-motorcartnew.ps1
```

---

## TARIKA 3 - Git PATH fix (ek baar)

Cursor terminal mein copy-paste:

```powershell
cd E:\Projects\motorcartcursor
$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;" + $env:Path
git --version
```

Agar version dikhe to push:

```powershell
git -c safe.directory=E:/Projects/motorcartcursor push -u origin main
```

---

## GitHub Token kaise banaye (ZAROORI)

1. Browser: https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Note: `motorcart-push`
4. Expiry: 90 days (ya jo chaho)
5. Checkbox: **`repo`** (poora tick karo)
6. **Generate token** -> token copy karo (sirf ek baar dikhega!)

Push par password puche to **yeh token paste** karo (GitHub password NAHI).

---

## Repo URL

```
https://github.com/Ayan-9520/motorcartnew
```

Push ke baad yahan `frontend/`, `backend/`, `docker-compose.yml` dikhega.

---

## Agar "Authentication failed" aaye

- Password ki jagah **token** use karo
- Token mein `repo` scope hona chahiye
- Username exactly: `Ayan-9520`

## Agar "rejected" ya "fetch first" aaye

```powershell
cd E:\Projects\motorcartcursor
$env:Path = "C:\Program Files\Git\cmd;" + $env:Path
git -c safe.directory=E:/Projects/motorcartcursor pull origin main --rebase
git -c safe.directory=E:/Projects/motorcartcursor push -u origin main
```

---

## App chalana (Docker)

```powershell
cd E:\Projects\motorcartcursor
docker compose --env-file .env.docker up -d
```

Browser: **http://localhost:3000** (Chrome/Edge mein, Cursor browser mein nahi)
