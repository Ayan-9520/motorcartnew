# MotorCart — Security Risk Register

**Living register — update when risks are mitigated**

Severity: **Critical** · **High** · **Medium** · **Low**

---

## Active risks

| ID | Risk | Severity | Location | Mitigation | Status |
|----|------|----------|----------|------------|--------|
| SEC-001 | Generic `/api/db/query` = broad table access for authenticated users | **High** | `db/query/route.ts` | Role-based table allowlist; `STRICT_DB_QUERY` flag | Open |
| SEC-002 | JWT secrets placeholder in dev `.env.example` | **High** (prod) | Backend env | Rotate secrets on production deploy | Open |
| SEC-003 | Tokens in localStorage (XSS exposure) | **Med** | `axios.ts`, auth | Document; httpOnly cookies = future phase | Accepted |
| SEC-004 | Public `POST /api/leads` abuse | **Low–Med** | `leads/route.ts` | Rate limit + captcha | Open |
| SEC-005 | `DEV_WRITE_TABLES` unauthenticated writes | **Med** (dev only) | Query route | Ensure `NODE_ENV=production` on live | Open |
| SEC-006 | Upload path traversal | **Med** | `upload/route.ts` | Sanitize paths; validate MIME | Partial |
| SEC-007 | Client-side OpenAI key possible | **Med** | `ai/services/openai.service.ts` | Block in prod builds | Open |
| SEC-008 | No DB RLS — app-layer auth only | **Med** | All mutations | Enforce `account-access` on every mutation | Ongoing |
| SEC-009 | CORS single origin misconfiguration | **Low** | `server.ts` | Set prod domain in env | Monitor |
| SEC-010 | Admin demo fallback exposes mock data | **Low** | `VITE_ADMIN_DEMO_FALLBACK` | Disable in production | Open |

---

## Mitigation playbook

### SEC-001 — DB query allowlist

1. Define `TABLE_PERMISSIONS: Record<AppRole, string[]>`
2. Check table name against role before query execution
3. Feature flag `STRICT_DB_QUERY=true` in production
4. Log denied attempts
5. Gradually migrate hot paths to dedicated APIs

### SEC-002 — JWT secrets

```bash
# Generate strong secrets — never commit
openssl rand -base64 48
```

Set in production `.env` / secrets manager only.

### SEC-004 — Lead spam

- Rate limit by IP + fingerprint
- Honeypot field on public forms
- Optional captcha (Turnstile/reCAPTCHA)

### SEC-006 — Uploads

- Allowlist MIME types (image/jpeg, image/png, application/pdf)
- Max file size (e.g. 10MB default)
- Randomize stored filenames
- No user-controlled directory paths

---

## Security checklist (every PR)

- [ ] Auth required on mutations
- [ ] Role checked server-side
- [ ] Input validated
- [ ] No secrets in code or commits
- [ ] No new public query tables without allowlist entry
- [ ] Upload paths sanitized
- [ ] Errors don't leak stack traces to client in prod

---

## Compliance considerations (India)

- **PII:** Minimize collection; secure finance/KYC data
- **Audit:** Log admin actions and sensitive mutations
- **Data retention:** Soft delete + retention policy (document per module)

---

## Incident response (basic)

1. Rotate JWT secrets if token leak suspected
2. Disable compromised API keys (AI providers)
3. Review audit logs for anomalous `db/query` patterns
4. Patch and deploy via Docker — no force push to main

---

## Related

- `07_Security_Standards.md` — standards
- `16_Roles_and_Permissions.md` — RBAC
- `05_API_Standards.md` — API auth patterns
