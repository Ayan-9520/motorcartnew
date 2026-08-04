# MotorCart — UI Guidelines

---

## Golden rule

**Do not change existing UI, design, colors, typography, spacing, responsiveness, or navigation unless the user explicitly requests it.**

When the user asks for a fix in a specific area, change **only that area**.

---

## Design system

| Element | Source |
|---------|--------|
| Components | `frontend/src/components/ui/` |
| Theme / CSS utilities | `frontend/src/theme/global.css` |
| Brand | `MotorcartLogo`, assets in `frontend/public/brand/` |
| Icons | Lucide React (consistent with existing pages) |

Use `cn()` from `@/lib/utils` for conditional classes.

---

## Layout patterns

- **Public pages:** `PublicLayout` — Navbar + main + Footer (Footer hidden on `/community/*`)
- **Dashboards:** Role sidebars + mobile nav drawers (`*MobileNav.tsx`, `*Sidebar.tsx`)
- **Community:** `CommunityLayout` — desktop rail + mobile bottom bar

Match padding, card styles, and typography of sibling pages in the same feature.

---

## Responsive behavior

- Mobile-first Tailwind breakpoints (`sm:`, `md:`, `lg:`)
- Dashboard mobile nav uses drawer pattern — single close button, logout in footer
- Test at ~400px width for community and customer flows

---

## Adding new UI

1. Copy patterns from the nearest existing page in the same feature.
2. Reuse `StatCard`, tables, dialogs, and form components from `components/ui/`.
3. Add routes via `router/index.tsx` (lazy-load heavy admin pages).
4. **Do not** introduce a new CSS framework or global style override.

---

## Accessibility

- Semantic HTML, `aria-label` on icon-only buttons
- Focus states on interactive elements (shadcn defaults)

---

## Prohibited without explicit approval

- Global color token changes
- Navbar structure changes
- Removing or renaming nav items
- Replacing Footer / FloatingButtons behavior site-wide
