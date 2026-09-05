# Batch 6 — Real Community & Professional Automotive Network

**Status:** Implemented (additive)  
**Phase 4 / 5A / 5B / 5C:** COMPLETE — not rewritten  
**Batch 6:** COMPLETE. **Batch 12** did not rebuild Community; professional network remains automotive-focused.

## Purpose

MotorCart Community is a **persistent professional automotive network** (not a marketing page): profiles, posts, feed, follow, likes, comments, internal shares, saves, discovery, in-app notifications, and a report foundation.

Canonical feed object remains **`SocialPost`**. Community identity is **`CommunityUserProfile`** keyed to existing **`User`**. Businesses continue to use **`CommunityBusinessProfile.entityId`** pointing at existing Dealer/Organization — no second dealer graph.

## Completed

- Profiles (headline, bio, city/state, presentation `profileType`, optional dealer/org references)
- Posts (text + existing media/embed/poll kinds; `visibility`; optional vehicle/inventory/dealer/org **references**)
- Feed from the database (own + followed + recent public; guests see public only)
- Follow / unfollow (`UserFollow` + `CommunityFollow`)
- Reactions (LIKE via `PostLike`)
- Comments (`PostComment`, flat — no nested threads)
- Internal shares (`PostShare` reference, not a duplicated body)
- Saves (`CommunitySave`)
- In-app notifications (existing `Notification` table, `kind=community`)
- Discovery (people, dealers, businesses)
- Moderation foundation (`CommunityReport` — does **not** auto-delete)

## Not implemented

- AI feed ranking / advanced recommendations
- Paid promotion / creator monetization
- External social publishing (WhatsApp / LinkedIn / Facebook APIs)
- Advanced moderation AI
- Nested comment threads
- Lead Board, dialer, payments, GST (Lead Board implemented in Batch 7, still gated; dialer locked)

## APIs (dedicated REST — not `/api/db/query`)

| Method | Path |
|--------|------|
| GET/PATCH | `/api/community/profile/me` |
| GET | `/api/community/profile/user/[userId]` |
| GET | `/api/community/profile/[handle]` |
| GET | `/api/community/feed` |
| POST | `/api/community/posts` |
| GET/PATCH/DELETE | `/api/community/posts/[id]` |
| GET/POST | `/api/community/posts/[id]/comments` |
| POST/DELETE | `/api/community/posts/[id]/like` |
| POST | `/api/community/posts/[id]/share` |
| POST/DELETE | `/api/community/posts/[id]/save` |
| PATCH/DELETE | `/api/community/comments/[id]` |
| POST/DELETE | `/api/community/follow/[userId]` |
| GET | `/api/community/followers` |
| GET | `/api/community/following` |
| GET | `/api/community/saved` |
| GET | `/api/community/discover` |
| POST | `/api/community/reports` |

Writes require JWT. Author, dealer, and organization IDs are **server-resolved**. Forged `authorUserId` / `dealerId` / `organizationId` are rejected.

## Schema

Migration: `20260819120000_community_network`

Additive columns on `community_user_profiles` and `social_posts`. New tables: `community_saves`, `community_reports`. Unique `(post_id, user_id)` on `post_shares`.

Community tables are on the `/api/db/query` **never-allow** list.

## Empty states

If the database has no rows, the UI shows truthful copy such as **No posts yet.** / **No followers yet.** / **No saved posts yet.** Counts come from the database only.

## Tests

```
npm run test:batch6
npm run test:batch6-db
```
