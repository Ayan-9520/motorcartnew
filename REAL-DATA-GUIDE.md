# Motorcart — Real Data Guide (Hindi + English)

Yeh guide batata hai: **mock data band**, **database saaf**, aur **naya data kaise upload karein**.

---

## Database saaf (sab listings delete)

Marketplace data wipe ho chuka hai — **users (login) safe hain**, baaki sab 0:

| Table | Rows |
|-------|------|
| vehicles | 0 |
| parts | 0 |
| dealers | 0 |
| auctions | 0 |
| leads | 0 |
| **users** | 10 (login accounts) |

Dobara saaf karne ke liye:
```powershell
Get-Content scripts/clear-all-marketplace-data.sql | docker exec -i motorcart-postgres-1 psql -U motorcart -d motorcart
```

Frontend rebuild:
```powershell
docker compose --env-file .env.docker build frontend
docker compose --env-file .env.docker up -d frontend nginx
```

---

## Demo logins (upload test ke liye)

| Role | Email | Password |
|------|-------|----------|
| **Dealer** | dealer@gmail.com | Dealer@123 |
| **Admin** | admin@motorcart.in | Admin@12345 |
| **Customer** | customer@motorcart.in | Customer@123 |

---

## Vehicles add kaise karein? (New · Used · Bikes · Trucks)

### Option A — Ek-ek gaadi (Dealer form) ✅ Live

1. Login: `dealer@gmail.com` / `Dealer@123`
2. Open: **`/dashboard/dealer/inventory`**
3. **Add vehicle** → title, brand, model, year, price, category (cars/bikes/trucks…), photos
4. Save → status `available`

**Website par dikhega:**
- Homepage Featured / New / Pre-owned
- `/buy` hub
- `/buy/cars/used`, `/buy/cars/new`, `/buy/bikes/used`, …
- Search (Ctrl+K)
- `/buy/{category}/{condition}/{slug}`

### Option B — CSV / Excel bulk ✅ Live

1. Login as dealer
2. Open: **`/dashboard/dealer/inventory/excel`**
3. **Sample template download** karo
4. Excel/CSV bharo (brand, model, year, price, city, category, condition, images…)
5. Upload → validation → confirm

Same rows `/buy/*` aur homepage par dikhengi.

### Option C — Customer apni gaadi bechna ✅ Live

1. Login (customer ya koi user)
2. Open: **`/sell/cars`** (ya `/sell/bikes`, etc.)
3. Listing form complete karo

### Option D — New car dealer (OEM stock) ✅ Live

1. New car dealer account
2. Open: **`/dashboard/new-car/inventory`**
3. OEM stock add karo → `/buy/cars/new` par dikhega

### AI se vehicles?

❌ **AI automatically gaadi create nahi karta.**  
Bulk upload mein **AI specs helper** hai (optional field fill) — par listing **aap upload/form se** daaloge.

---

## Parts add kaise karein?

| Tarika | Status | Route |
|--------|--------|-------|
| Single SKU form | ✅ Live | `/dashboard/parts/upload` |
| CSV bulk | ⏳ Coming soon | `/dashboard/parts/bulk-upload` |
| AI auto-create | ❌ Nahi | PartsBot sirf recommend karta hai |

Dikhega: `/parts`, `/parts/browse`, `/parts/{category}/{slug}`

---

## Dealers directory

Pehle 14 seed dealers the — **ab 0 hain.**

Naya dealer:
1. **`/signup/business`** → business signup
2. Admin approve: **`/dashboard/super-admin/business-approvals`**
3. Dikhega: **`/dealers`**, **`/dealers/{slug}`**

---

## Services · Auctions · Community

| Type | Upload | Public URL |
|------|--------|------------|
| Services | DB / service partner (centers + catalog) | `/services` |
| Auctions | Dealer/admin auction create | `/auctions` |
| Community | Logged-in user new post | `/community` |

---

## Config (already set)

| Variable | Value | Meaning |
|----------|-------|---------|
| `VITE_REAL_DATA_ONLY=true` | ON | Public site sirf PostgreSQL data dikhati hai |
| `VITE_ADMIN_DEMO_FALLBACK=false` | OFF | Admin panel mock data nahi dikhata |

Docker rebuild ke baad apply hota hai:
```powershell
docker compose --env-file .env.docker build frontend
docker compose --env-file .env.docker up -d frontend nginx
```

---

## Demo logins (upload test ke liye)

| Role | Email | Password |
|------|-------|----------|
| **Dealer** | dealer@gmail.com | Dealer@123 |
| **Admin** | admin@motorcart.in | Admin@12345 |
| **Customer** | customer@motorcart.in | Customer@123 |

---

## 1. Vehicles (Cars / Bikes / Trucks)

### Upload kahan se?

| Kaun | Route | Method |
|------|-------|--------|
| **Dealer** | `/dashboard/dealer/inventory` | Form — ek-ek gaadi add |
| **Dealer bulk** | `/dashboard/dealer/inventory/excel` | Excel/CSV upload |
| **Customer** | `/sell/cars` (ya `/sell/bikes`, etc.) | Apni gaadi bechna |
| **New car dealer** | `/dashboard/new-car/inventory` | OEM stock |

### Website par kahan dikhega?

| Page | URL |
|------|-----|
| Homepage — Featured | `/` → Featured vehicles section |
| Homepage — New / Pre-owned | `/` → New cars & Pre-owned sections |
| Buy hub | `/buy` |
| Category listing | `/buy/cars/used`, `/buy/cars/new`, `/buy/bikes/used`, … |
| Vehicle detail | `/buy/{category}/{condition}/{slug}` |
| Search (Ctrl+K) | Live DB search |
| Search results | `/search?q=...` |
| Dealer storefront | `/dealers/{dealer-slug}` (dealer ki listings) |

### DB table
`vehicles` — status `available` hona chahiye.

---

## 2. Parts

### Abhi database mein kya hai?

Parts table **empty** rakhi gayi hai — public `/parts` page sirf DB se data dikhati hai. Mock/demo SKUs code se hata diye gaye.

Database saaf karne ke liye (agar kabhi parts hon):
```powershell
Get-Content scripts/clear-parts-data.sql | docker exec -i motorcart-postgres-1 psql -U motorcart -d motorcart
```

---

### Data kaise aayega? (Upload vs AI vs CSV)

| Tarika | Status | Kahan | Kaise |
|--------|--------|-------|-------|
| **Single product form** | ✅ **Live abhi** | `/dashboard/parts/upload` | Login → naam, category, brand, price, stock, image URL, compatibility → **Publish product** |
| **CSV / Excel bulk** | ⏳ **Abhi nahi** (placeholder UI) | `/dashboard/parts/bulk-upload` | Template + validation — **develop ho raha hai**. Abhi single upload use karo. |
| **AI se auto parts** | ❌ **Nahi** | `/parts` PartsBot | AI sirf **existing SKUs rank/recommend** karta hai — naye parts khud se create **nahi** karta |
| **AI supplier desk** | Dashboard insights (mock tips) | `/dashboard/parts/ai` | Restock/margin suggestions — **inventory upload ke baad** useful |

### Upload steps (5 min)

1. Login: koi bhi registered user (supplier account best)
2. Open: **`http://localhost:3000/dashboard/parts/upload`**
3. Fill: Product name, Category, Brand, MRP, Stock, Image URL, Compatibility (comma separated)
4. Click: **Publish product**
5. Check: **`http://localhost:3000/parts`** → Featured / Browse mein dikhega

### CSV sheet kab aayegi?

Bulk page (`/dashboard/parts/bulk-upload`) abhi placeholder hai. Expected columns (jab build hoga):

- `name`, `slug`, `category`, `brand`, `price`, `wholesale_price`, `stock`, `gst_rate`, `compatibility`, `image_url`, `vehicle_hubs` (cars/bikes/trucks…)

Tab tak **ek-ek SKU** `/dashboard/parts/upload` se daalo.

### Website par kahan dikhega?

| Page | URL |
|------|-----|
| Parts hub | `/parts` |
| Category browse | `/parts/{category}` e.g. `/parts/brake-parts` |
| All parts | `/parts/browse` |
| Part detail | `/parts/{category}/{slug}` |
| Homepage parts strip | `/` (jab DB mein parts hon) |
| Search | Ctrl+K + `/search?q=...` |

### DB table
`parts` — `is_active: true`

---

## 3. Services (Workshop / Repair)

### Upload kaise?

Abhi **admin / service partner** ko DB mein entry karni hogi:

- `service_centers` — workshop details
- `services` — service catalog (price, type)

*(Dedicated public upload UI service partner ERP mein expand ho sakta hai.)*

### Website par kahan dikhega?

| Page | URL |
|------|-----|
| Services hub | `/services` |
| Service category | `/services/{type}` |
| Book service | Service detail + booking flow |

### DB tables
`service_centers`, `services`, `bookings`

---

## 4. Auctions

### Upload kaise?

Dealer / auction partner dashboard se `auctions` table mein entry.

Admin approve: `/dashboard/super-admin/auctions`

### Website par kahan dikhega?

| Page | URL |
|------|-----|
| Auctions hub | `/auctions` |
| Auction room | `/auctions/{slug}` |

---

## 5. Dealers directory

### Upload kaise?

1. Business signup → `/signup/business`
2. Admin approve → `/dashboard/super-admin/business-approvals`
3. Seed dealers already in DB (14 demo dealers from `seed.ts`)

### Website par kahan dikhega?

| Page | URL |
|------|-----|
| Dealers hub | `/dealers` |
| Dealer profile | `/dealers/{slug}` |

---

## 6. Community posts

### Upload kaise?

Logged-in user → Community feed → New post  
API: `POST /api/community/posts`

### Website par kahan dikhega?

| Page | URL |
|------|-----|
| Community hub | `/community` |
| Groups | `/community/groups` |
| Homepage community section | `/` |

---

## 7. Leads / Enquiries

Customer vehicle detail se enquiry → automatically `leads` table.

Dealer dekhega: `/dashboard/dealer/leads`

---

## Quick test flow (5 min)

1. Login: `dealer@gmail.com` / `Dealer@123`
2. Go: `/dashboard/dealer/inventory`
3. Add car: Hyundai Creta, price, city, photos
4. Open: `/buy/cars/used` — woh car dikhegi
5. Open: `/` homepage — Featured section mein (agar `is_featured` true ho)

---

## Agar kuch nahi dikhe?

- Hard refresh: **Ctrl+Shift+R**
- Check API: `http://localhost:3000/api/vehicles`
- Check health: `http://localhost:3000/api/health`
- Verify `VITE_REAL_DATA_ONLY=true` in `.env.docker` + frontend rebuild

---

## Mock wapas chahiye? (dev demo only)

`.env.docker` mein:
```
VITE_REAL_DATA_ONLY=false
VITE_ADMIN_DEMO_FALLBACK=true
```
Phir frontend rebuild karo.
