# House Rental System: Design (v1)

Date: 2026-11-06 · Owner: Ange (USAD Labs) · Due: 2026-11-20

## 1. Goal

A website and owner dashboard for a family rental business with 6 houses.

- **Visitors** (mostly from Facebook, on phones) see which houses are available and ask for a viewing.
- **The family** logs in to track houses, tenants, rent, repairs and inquiries.
- It is real software the family will use, and a USAD Labs portfolio piece. A "lite demo" for other landlords may come later, so business details and house data are configurable, not hardcoded.

## 2. Decisions

| Topic | Decision |
|---|---|
| Stack | Next.js 16 (App Router, TypeScript) + Tailwind CSS 4 |
| Database | SQLite file via Drizzle ORM + libSQL client. Same code runs on Turso (hosted SQLite) at deploy time by setting 2 env vars |
| Login | Built-in email + password login (scrypt hashes, database sessions, httpOnly cookie). No public sign-up; owner accounts are added by script |
| Photos | Uploaded from the dashboard, resized in the browser, saved to `data/uploads/` locally. Storage sits behind one small module so Vercel Blob can be added at deploy time |
| Currency | ₱ PHP, `en-PH` formatting, whole pesos |
| Time zone | Asia/Manila for "today", due dates and reminders |
| Messenger | Placeholder `m.me` link in `src/config/site.ts` until the real Facebook page link arrives |
| UI parts | Native inputs, selects and date pickers (best on phones) styled with Tailwind; lucide icons. No component library |

## 3. Scope

### Public website (no login)

1. **Home**: business intro, all published houses as cards (photo, name, area, rent/month, beds/baths/size, status label), "how renting works" steps, contact section with a general inquiry form.
2. **House page** `/houses/[slug]`: swipeable photos, rent, area, size, features, rental terms, description, optional map link, inquiry / book-a-viewing form, sticky bottom bar on phones (Messenger + Book a viewing).
3. **Status label** comes from the dashboard status:
   - Vacant → **Available**
   - Occupied → **Occupied** (form copy changes to "ask to be told when it frees up")
   - Under repair → **Available soon**
4. **Inquiry form**: name, mobile number, email (optional), house, preferred viewing date + time of day, message. Spam guard: hidden honeypot field + per-IP rate limit.
5. Buttons: Messenger (`m.me/<page>`), Call, Text.

### Owner dashboard (login required)

1. **Overview**: "Needs attention" reminders, house status tiles (6), counts, new-inquiry count.
2. **Houses**: list + detail page per house. Status selector (Vacant / Occupied / Under repair). Add a house, edit listing fields, manage photos, hide a house from the website.
3. **Tenants** (on each house page): name, mobile, email, move-in date, lease end, monthly rent, rent due day, notes. Move-out keeps the record as a past tenant. Adding a tenant sets the house to Occupied; moving out sets it to Vacant.
4. **Rent tracker**: one charge per month per active tenant, with due date and status (Paid, Partial, Due soon, Overdue). Record payments (amount, date, method: cash / GCash / bank / other, reference no.). Payment history per house and across all houses.
5. **Reminders** (shown in the dashboard): rent overdue, rent due within 5 days, lease ending within 60 days, lease already ended but tenant still in.
6. **Repairs log** per house: title, details, reported date, status (Open / In progress / Done), done date, optional cost and who fixed it.
7. **Inquiries inbox**: everything sent from the website, newest first; mark New / Contacted / Closed; tap-to-call and tap-to-text; owner notes.

### Out of scope (v1)

Expenses, monthly income summary, online payment gateway (card/auto-debit), full tenant portal, multi-landlord accounts. (Reminder messages and QR payment were added on 2026-11-08: see §10.)

## 4. Data model (SQLite)

- `houses`: id, slug, name, type, public_location (shown), full_address (dashboard only), map_url, monthly_rent, bedrooms, bathrooms, floor_area_sqm, lot_area_sqm, description, features (JSON list), terms, status, is_published, sort_order, timestamps
- `house_photos`: id, house_id, url, alt, sort_order
- `tenants`: id, house_id, full_name, phone, email, move_in_date, lease_end_date, monthly_rent, due_day (1–31, clamped to month length), notes, moved_out_date (null = current tenant)
- `rent_charges`: id, tenant_id, house_id, period (YYYY-MM), due_date, amount, note. Unique (tenant_id, period)
- `payments`: id, charge_id, tenant_id, house_id, amount, paid_on, method, reference, note
- `repairs`: id, house_id, title, details, reported_on, status, completed_on, cost, handled_by
- `inquiries`: id, house_id (nullable), name, phone, email, preferred_date, preferred_time, message, status, owner_note, created_at
- `users`, `sessions`: owner logins

Dates are stored as `YYYY-MM-DD` text to avoid time-zone bugs. Money is stored as whole pesos (integers).

## 5. Key rules

1. **Privacy**: tenant names, contacts, payments and the full address never reach public pages. Public pages read only from a separate public query module that returns listing fields. A test checks that public data contains no tenant fields.
2. **Auth on every private read and write**: each dashboard page, server action and upload route calls `requireUser()`. The Next.js proxy redirect is only a convenience, not the security check.
3. **Rent charges are generated on demand**: when the dashboard loads, each current tenant gets any missing monthly charges, from the first due date on/after move-in up to today + 5 days, stopping at move-out. Idempotent (unique tenant + month). Charge amount = the tenant's rent at the time; editable afterwards.
4. **Charge status** = paid total vs amount, and due date vs today.
5. **Configurable**: business name, tagline, contacts, Facebook/Messenger link, currency, time zone and reminder windows live in `src/config/site.ts`. Houses live in the database and can be edited in the dashboard; starting data comes from `seed/` files.

## 6. Code layout

```
src/app/(site)/            public pages
src/app/login/             login page
src/app/dashboard/         owner pages (overview, houses, rent, repairs, inquiries)
src/app/uploads/[name]/    serves uploaded photos
src/config/site.ts         business settings (edit for real data / other landlords)
src/db/                    Drizzle schema + client; migrations in drizzle/
src/lib/                   pure logic (dates, money, rent schedule, reminders), auth, storage, rate limit
src/server/                data access: public-queries.ts, private queries + actions
seed/                      sample houses, tenants, payments, repairs, inquiries
scripts/                   prepare (runs before dev), seed/reset, add-owner
```

## 7. Running it

- First time: `npm install`. Then `npm run dev` does the rest: creates `.env.local` with a random owner password if missing, runs migrations, loads sample data if the database is empty, starts the server.
- `npm run db:reset` reloads sample data (wipes the database; README warns about this once real data is in).
- `npm run owner:add` creates another owner login.

## 8. Testing

- Unit tests (Vitest) for the pure logic: due-date math (month-end clamping), charge generation, charge status, reminders, money formatting, status labels, password hashing.
- One database test with an in-memory SQLite: migrations run, sample seed loads, public queries leak no tenant fields.
- Browser check at phone width (375 px) and desktop for every public and dashboard page, with screenshots.

## 9. Build order

1. Scaffold: Next.js, Tailwind, Drizzle + libSQL, scripts, `.env` handling
2. Schema, migrations, sample data, pure logic + unit tests
3. Public site: home, house page, inquiry form, Messenger/Call/Text
4. Login: sessions, login/logout, proxy redirect, `requireUser()`
5. Dashboard: overview + reminders, houses + tenants, rent tracker, **utility bills**, repairs, inbox, listing editor + photos
6. **Messenger payments + automatic reminders** (§10): QR upload, Messenger webhook (link tenant, buttons, receipts), payment claims to confirm, daily reminder job
7. Phone-size QA and fixes
8. README + list of real info needed from the family

## 10. Added 2026-11-08 (Bluu's requests)

What Bluu asked for, and where it lands:

| Request | Status |
|---|---|
| Landing page: shows vacant / not vacant, interested visitors book a viewing | **Built** (step 3). Occupied houses get a "Tell me when it's free" form |
| Dashboard: monitor rent payments | Already planned (rent tracker) |
| Dashboard: **utility payments** (paid or not, so the house doesn't get disconnected) | **New** (§10.1) |
| Dashboard: repairs the tenant wants done | Planned (repairs log). Tenants can message the Facebook page; the family logs it |
| Dashboard: change a house's status (vacant, etc.) | Already planned |
| Dashboard: see who wants a viewing | Already planned (inbox) |
| **Automatic reminder message with QR payment, or a cash option, visible to the admin** | **New** (§10.2, §10.3) |

### 10.1 Utility bills

- Per house: electricity and water bills (billing month, amount, due date, disconnection date if shown, paid on, paid by tenant or owner, optional receipt photo).
- "Shared utilities" houses track the owner's main bill; "own meter" houses track the tenant's bill so the family can see it was paid.
- Reminders in "Needs attention": unpaid utility due within 5 days, and unpaid past due ("risk of disconnection").
- New table `utility_bills`: id, house_id, kind (electric / water), period, amount, due_date, cutoff_date, paid_on, paid_by, note.

### 10.2 Paying through Messenger (decided 2026-11-09: no separate pay page)

- The rent reminder in Messenger carries the owner's **GCash QR image** (uploaded once in Dashboard → Settings) and two buttons:
  1. **"Paid via GCash"**: the tenant then sends the receipt screenshot in the same chat.
  2. **"Will pay cash"**: the owner collects in person.
- Either button creates a **payment claim**. It shows first in "Do this first" with **Confirm** (records the payment) and **Not received** buttons. A receipt photo the tenant sends is saved on the claim.
- No payment gateway: money goes straight to the family's GCash, nothing is charged automatically.
- Tables: `payment_claims` (id, charge_id, method gcash/cash, proof_url, status pending/confirmed/rejected, created_at), `settings` (key/value: GCash QR, account name), `reminder_log`, plus `tenants.messenger_psid` and `tenants.messenger_link_token`.

### 10.3 Automatic reminders

- A daily job (Vercel Cron, 8 AM Manila) sends each current tenant a short message with their pay link:
  - 3 days before rent is due, on the due date, and every 3 days while overdue (stops once paid).
  - Utility bills the same way, when the tenant is the one paying.
- Every message is logged (`reminder_log`: tenant, charge, channel, sent_at, status) and shown on the tenant's page in the dashboard, with a "Send now" button.
- **Channel: Facebook Messenger** (Bluu's decision, 2026-11-08). How it works under Meta's rules:
  1. **Linking (once per tenant):** the tenant's dashboard page shows a "Connect Messenger" link/QR (`m.me/<page>?ref=<tenant token>`). The tenant taps it and sends any message. Meta's webhook gives us their Page-scoped ID (PSID), saved on the tenant. A tenant who never connects can't get automatic messages.
  2. **Sending:** inside 24 hours of the tenant's last message, a normal message. Outside 24 hours (the usual case), a **Meta-approved Utility template** ("Your rent of {amount} for {house} is due on {date}. Pay here: {link}"). Message tags are not used (Meta retired several in April 2026).
  3. **Fallback:** if a tenant isn't connected or a send fails, the reminder shows in "Needs attention" with a **Copy message** button, so the family can paste it into Messenger by hand.
- **Setup needed (Bluu / family):** the real Facebook page, a Meta developer app connected to it, Meta app review for `pages_messaging`, and approval of the Utility template. **Risk:** Meta's review can take days to weeks, so automatic sending may go live after the 2026-11-20 deadline; payment claims, the QR upload and the Copy-message fallback do not depend on it. The QR image is only reachable by Messenger once the site is online (HTTPS).
- Not chosen: SMS (works on any phone, about ₱0.50/message), email (tenants rarely check).
- Example message: "Hi Liza, your Acacia House rent of ₱2,500 is due on Nov 9. Pay by GCash QR or cash here: <link> - 5A Rentals"
