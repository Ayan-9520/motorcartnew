# Motorcart API Documentation

Base URL: `http://localhost:3001`  
Auth: `Authorization: Bearer <accessToken>`

Frontend uses a Supabase-compatible client that calls these endpoints automatically.

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Email + password (requires verified email) |
| POST | `/api/auth/register` | Signup; sends 48h verification email when SMTP set |
| POST | `/api/auth/verify-email` | Confirm signup `{ email, code }` |
| POST | `/api/auth/resend-verification` | Resend 48h verification email |
| POST | `/api/auth/email-otp/send` | Email login OTP (10 min) |
| POST | `/api/auth/email-otp/verify` | Verify email OTP → session |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/session` | Session check |
| GET | `/api/auth/settings` | Auth provider settings |
| POST | `/api/auth/forgot-password` | Request reset email |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/otp/send` | Send phone OTP (SMS when configured) |
| POST | `/api/auth/otp/verify` | Verify phone OTP |
| POST | `/api/auth/oauth` | Google OAuth URL |
| POST | `/api/auth/oauth/callback` | Exchange OAuth code |

### Login example

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "customer@motorcart.in", "password": "Customer@123" }
```

Response:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "role": "customer", "email": "..." }
}
```

## Generic database (Supabase-compatible)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/db/query?table=users&action=select` | Select rows |
| POST | `/api/db/query` | Insert |
| PATCH | `/api/db/query` | Update |
| DELETE | `/api/db/query` | Delete |
| POST | `/api/db/rpc/:fn` | RPC functions |

### Tables supported

`users`, `dealers`, `vehicles`, `leads`, `auctions`, `bids`, `parts`, `part_orders`,  
`bookings`, `services`, `service_centers`, `finance_applications`, `insurance_*`,  
`customer_vehicles`, `social_posts`, `notifications`, `platform_*`, and more.

## REST resources

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vehicles` | List vehicles (category-aware images) |
| GET | `/api/leads` | Dealer leads |
| POST | `/api/leads` | Create lead |
| GET | `/api/auctions` | List auctions |
| GET | `/api/notifications` | User notifications |
| POST | `/api/upload` | File upload (multipart) |

## Realtime (Socket.io)

Connect to `http://localhost:3001` with socket.io-client.

Events:
- `join` `{ room }` — join auction/chat room
- `db:auctions:update` — auction updates
- `db:bids:insert` — new bids

## Roles

`customer`, `dealer`, `used_car_dealer`, `new_car_dealer`, `service_center`,  
`service_partner`, `parts_seller`, `dsa_agent`, `finance_partner`, `admin`, `super_admin`

## Upload buckets

`vehicle-images`, `profile-images`, `dealer-documents`, `finance-documents`,  
`part-images`, `community-media`

Files served at: `/uploads/{bucket}/{path}`

## Admin — Catalog Import (Phase 5A, dry-run)

Requires `FEATURE_CATALOG_ADMIN=true` and `admin` / `super_admin` JWT.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/catalog/import/start` | Start dry-run import job |
| GET | `/api/admin/catalog/import/:jobId` | Job status, progress, timings, errors |
| GET | `/api/admin/catalog/import/:jobId/report` | Full execution report + read-only `preview` (Phase 5C/5D) |
| POST | `/api/admin/catalog/import/:jobId/approve` | Approve selected preview records (dry-run) |
| POST | `/api/admin/catalog/import/:jobId/reject` | Reject selected preview records (dry-run) |
| GET | `/api/admin/catalog/import/:jobId/approval-audit` | Approval audit trail |
| POST | `/api/admin/catalog/import/:jobId/publish` | Publish APPROVED records to catalog DB (Phase 5E) |

Preview UI: `/dashboard/super-admin/catalog/import/:jobId/preview` · Docs: `docs/catalog-import-preview.md`, `docs/catalog-import-approval.md`, `docs/catalog-import-publish.md`

## Batch 10 Communication + AI (JWT)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/communications/providers` | Provider config (secrets never returned) |
| POST | `/api/communications/messages` | Send (fails if provider missing) |
| GET | `/api/communications/threads` | Dealer threads |
| GET | `/api/communications/timeline` | Unified lead timeline |
| POST | `/api/communications/webhooks/:provider` | HMAC + event id |
| GET/POST | `/api/telephony/calls` | Dialer sessions |
| POST | `/api/ai/conversations` | Server-owned agent chat |
| POST | `/api/ai/recommendations/best-deal` | Deterministic ranking |

