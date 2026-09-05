# Communication OS + AI Sales OS (Batch 10)

**Status: implemented locally — Communication OS, dialer, multilingual AI agent, best-deal ranking.**  
**BATCH 11 = PARTNER / INDUSTRY OS** (`cursor/34_Partner_Industry_OS.md`). **BATCH 12 = CLOSED** (`cursor/35_Final_Platform_Gap_Audit.md`).

WhatsApp ≠ Dialer. VoIP/telephony is a separate `TELEPHONY` provider channel.

## What shipped

- Provider abstraction: WhatsApp, SMS, email, telephony, in-app
- Canonical `CommunicationThread` / `CommunicationMessage`
- Webhooks with HMAC + event-id idempotency; DELIVERED only from provider callback
- Dialer + `CallSession` / recording / transcript / AI summary (transcript required)
- Server-side AI conversations, permissioned tools, best-deal deterministic scoring
- Consent, quiet hours, frequency limits (reuses Batch 7 `CustomerConsent`)
- Usage ledger without invented costs
- Dialer / AI calling remain **plan-locked**; runtime requires flag + org entitlement grant + provider (+ AI key + phone consent for AI calling)

## Not this batch

Fake call success, fake delivery, hallucinated stock, client AI keys, arbitrary system prompts, `/api/db/query` as an AI tool, Batch 11 ERP.

## APIs

| Area | Path |
|------|------|
| Providers | `/api/communications/providers` |
| Messages / threads / timeline | `/api/communications/messages`, `/threads`, `/timeline` |
| Webhooks | `/api/communications/webhooks/[provider]` |
| Telephony | `/api/telephony/calls`, `/api/telephony/webhooks/[provider]` |
| AI | `/api/ai/conversations`, `/messages`, `/recommendations/best-deal`, `/lead-qualification`, `/call-summary`, `/usage`, `/handoff` |

## Tests

`npm run test:batch10` and `npm run test:batch10-db` in `backend/`.
