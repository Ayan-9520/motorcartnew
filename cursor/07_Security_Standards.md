# MotorCart — Security Standards

---

## Authentication & authorization

- JWT access + refresh tokens; store secrets in environment variables only
- bcrypt for password hashing
- `ProtectedRoute` on frontend; server-side validation on every protected API
- RBAC via roles + permissions matrix — new features must declare required roles

---

## Input validation

- Validate all user input at API boundary
- Sanitize file uploads (type, size, path traversal)
- Parameterize database queries (Prisma — no raw string concatenation)

---

## API security

- CORS: configured via `CORS_ORIGIN` — do not use `*` in production
- Rate limiting on auth and public write endpoints (extend existing patterns)
- Audit logs for admin actions and sensitive mutations

---

## Secrets

- Never commit `.env`, `.env.docker`, credentials, or API keys
- Use `.env.example` / `.env.docker.example` for documentation only

---

## Data protection

- Encrypt sensitive data at rest where required (finance, KYC)
- Minimize PII in logs
- Soft delete for user-generated content where appropriate

---

## File upload

- Use `POST /api/upload` with auth where required
- Serve from `/uploads` — validate MIME and size server-side
- Do not allow executable uploads

---

## AI / external services

- API keys server-side only
- Do not expose provider keys to frontend
- Log AI usage for audit; redact PII in prompts when possible
