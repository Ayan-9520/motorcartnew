# MotorCart — Testing Guidelines

---

## When to add tests

Add tests when:

- User explicitly requests them
- Fixing a regression (add test to prevent recurrence)
- Implementing critical business logic (payments, auth, lead routing, auctions)

Do **not** add trivial tests that only assert mocks or static rendering.

---

## Types

| Type | Scope |
|------|-------|
| Unit | Pure functions, validators, service methods |
| Integration | API routes + database (test DB or containers) |
| API | HTTP contract, auth, error codes |
| E2E | Critical user journeys (when tooling exists) |

---

## Commands

Check `frontend/package.json` and `backend/package.json` for `test` scripts before assuming runner.

Always verify after changes:

```powershell
cd frontend; npm run build
cd backend; npm run build   # if applicable
```

---

## Manual test checklist (minimum)

- [ ] Happy path works
- [ ] Unauthorized access blocked
- [ ] Existing routes still load
- [ ] Mobile width (~400px) acceptable for touched UI
- [ ] No new console errors on primary flow

---

## Error handling tests

- 400 on invalid input
- 401/403 on missing or wrong role
- 404 on missing resources
- 500 paths logged server-side, safe message to client
