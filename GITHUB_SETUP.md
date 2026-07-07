# Git + GitHub Push Setup (root se)

Poora project **repo root** (`motorcartcursor/`) se GitHub par push hota hai — `frontend/`, `backend/`, `docker-compose.yml` sab ek hi repo mein hain.

## 1. Git install (ek baar)

Windows par Git nahi hai to:

```powershell
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
```

Naya terminal kholo, phir check karo:

```powershell
git --version
```

## 2. Repo root par jao

```powershell
cd E:\Projects\motorcartcursor
```

## 2b. Git identity (pehli baar commit ke liye)

Sirf is repo ke liye (global config change nahi):

```powershell
git config --local user.name "Your Name"
git config --local user.email "your@email.com"
```

GitHub noreply email: `YOUR_USERNAME@users.noreply.github.com`

## 3. Automated setup (recommended)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1
```

Commit + push ek saath:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1 -Push
```

Naya GitHub repo URL set karna ho:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-git-github.ps1 -RemoteUrl "https://github.com/YOUR_USERNAME/motorcart.git" -Push
```

**Current remote (already configured):**

```
https://github.com/Ayan-9520/motorcart.in.git
```

## 4. GitHub login (push ke liye zaroori)

### Option A — GitHub CLI (easy)

```powershell
winget install --id GitHub.cli -e
gh auth login
gh auth setup-git
```

Phir push:

```powershell
git push -u origin main
```

### Option B — Personal Access Token (PAT)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token** → scope: `repo`
3. Push par password ki jagah **token** paste karo

```powershell
git push -u origin main
```

Username: apna GitHub username  
Password: PAT (plain password nahi)

### Option C — SSH

```powershell
ssh-keygen -t ed25519 -C "your@email.com"
# Public key (~/.ssh/id_ed25519.pub) GitHub → Settings → SSH keys mein add karo
git remote set-url origin git@github.com:Ayan-9520/motorcart.in.git
git push -u origin main
```

## 5. Manual steps (agar script use na karo)

```powershell
cd E:\Projects\motorcartcursor

# Windows ownership fix (repo-local)
git config --local safe.directory E:/Projects/motorcartcursor

git status
git remote -v

git add -A
git commit -m "Full stack: Docker, API fixes, frontend fallbacks"
git push -u origin main
```

## 6. Kya push NAHI hota (gitignore)

| File | Reason |
|------|--------|
| `.env`, `.env.docker` | Secrets / passwords |
| `node_modules/` | Dependencies — `npm install` se aate hain |
| `frontend/dist/`, `backend/.next/` | Build output |
| `backend/uploads/`, `backend/.data/` | Runtime data |

**Push hone chahiye:** `.env.example`, `.env.docker.example`, `docker-compose.yml`, source code.

Docker par run karne ke liye clone ke baad:

```powershell
copy .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

App: **http://localhost:3000**

## 7. Naya empty GitHub repo banana

1. GitHub → **New repository**
2. Name: `motorcart` (ya `motorcart.in`)
3. **Do NOT** add README / .gitignore (pehle se local repo hai)
4. Remote set karo:

```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

## 8. Common errors

| Error | Fix |
|-------|-----|
| `dubious ownership` | `git config --local safe.directory E:/Projects/motorcartcursor` |
| `git not recognized` | Git install karo, terminal restart |
| `Authentication failed` | PAT ya `gh auth login` |
| `rejected (fetch first)` | `git pull --rebase origin main` phir push |
| `npm.ps1 cannot be loaded` | PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

## 9. Daily workflow

```powershell
git add -A
git commit -m "Describe your change"
git push
```
