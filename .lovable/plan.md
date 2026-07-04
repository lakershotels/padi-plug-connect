# PadiPlug — Phased Build Plan

Web-only (React/TanStack Start). Flutter mobile apps are out of scope in this workspace.

## Phase 1 — Foundation (this turn)

**Design system**
- African-inspired palette in `src/styles.css` as oklch tokens: forest green primary, sunset orange accent, warm gold highlight, charcoal ink, warm off-white background. Dark mode variants.
- Typography: Sora (display) + Inter (body) via @fontsource.
- Gradient, shadow, radius tokens. Custom Button/Card variants (hero, trust, premium).

**Backend (Lovable Cloud)**
- Enable Cloud.
- `app_role` enum: customer, vendor, artisan, logistics, admin, super_admin.
- Tables: `profiles`, `user_roles`, `vendors`, `artisans`, `products`, `services`, `categories`, `orders`, `order_items`, `bookings`, `wallets`, `wallet_transactions`, `escrow_holds`, `disputes`, `reviews`, `favorites`, `notifications`.
- RLS on every table + `GRANT`s. `has_role()` security-definer function.
- Storage buckets: `avatars` (public), `products` (public), `portfolios` (public), `verification` (private), `dispute-evidence` (private).

**Auth**
- Email/password + Google sign-in via Lovable broker.
- `/auth` public route, `_authenticated` layout gate (integration-managed).
- Profile auto-create trigger. Role selection on signup (customer default; vendor/artisan onboarding flow).

**Public surface**
- Home `/` — hero, category grid, featured vendors, featured artisans, deals strip, Made-in-Africa section, trust badges.
- `/marketplace` — product grid + filters (category, price, rating, location, verified).
- `/artisans` — artisan grid + filters.
- `/vendors/$slug`, `/artisans/$slug`, `/products/$id`, `/services/$id` — detail pages with reviews.
- Header/footer with role-aware sign-in affordance.

**Authenticated surface**
- `/dashboard` — role-routed dashboard shell.
- `/wallet` — balance, pending, escrow, transaction history, simulated "fund wallet" (Paystack wired in Phase 2).
- `/orders` — customer order list with escrow status.
- `/orders/$id` — order detail with **Done / Order Received / Report Issue / Raise Dispute** buttons.
- `/vendor/products` — vendor CRUD for products (create/edit/delete, image upload).
- `/artisan/profile` — artisan portfolio + services management.
- `/favorites`, `/notifications`.

**Escrow state machine (real, simulated money)**
- Order lifecycle: `pending_payment → paid_escrow → fulfilled → completed → released` or `→ disputed → resolved`.
- Server functions enforce transitions. Customer "Done" releases escrow, credits vendor wallet minus commission, creates notification, opens review prompt.
- Dispute freezes funds, notifies admin, allows evidence upload.

**SEO**
- Per-route `head()` metadata, sitemap.xml, robots.txt.

## Phase 2 (next turn)
- Paystack integration: secret key + webhook (`/api/public/webhooks/paystack`) to credit wallet on `charge.success`. Withdrawal request flow.
- Artisan booking calendar + availability.
- In-app chat (Supabase Realtime).
- Reviews & ratings write-side + aggregate updates.
- Referral codes + rewards ledger.

## Phase 3
- Logistics partner role + delivery tracking.
- Admin dashboard (dispute resolution, user/vendor management, analytics).
- Subscription tiers (Basic/Premium/Featured), featured placements.
- Push notifications (web push).
- ID/selfie/business verification workflow.
- Fraud reporting.

## Technical notes
- All Supabase reads via `createServerFn` + `requireSupabaseAuth`; public reads via server publishable client with narrow `TO anon` policies.
- Escrow transitions in server functions only, guarded by role + ownership checks.
- `commission_rate` stored per-transaction on release (default 5%, configurable).
- Money stored as integer minor units (kobo) with currency column, default NGN.
- All new tables get GRANTs + RLS in the same migration.

## Confirming before I start
- OK to proceed with Phase 1 as scoped?
- Confirm Paystack (not Flutterwave) for Phase 2 — or say if you want both.
- Default currency NGN, or something else?
