# 5A Rentals

Website and owner dashboard for the Bañas family's 6 rental houses in Dasmariñas City.
Built by USAD Labs. Live: https://5a-rentals.vercel.app · Code: [usad-labs/house-rental-system](https://github.com/usad-labs/house-rental-system) (Vercel deploys from here; also mirrored to 2AsB2). Design: [docs/design](docs/design) · Spec: [docs/specs/2026-11-06-rental-system-design.md](docs/specs/2026-11-06-rental-system-design.md)

- **Website** (`/`): houses, availability, "Book a viewing" form.
- **Dashboard** (`/dashboard`): rent, utility bills, repairs, inquiries, tenants, photos, GCash QR.
- **Messenger**: rent reminders with the GCash QR; tenants answer "Paid via GCash" or "Will pay cash", the family confirms.

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:3000. The first run creates `.env.local`, the database (`data/rental.db`) and sample data.

**Log in:** http://localhost:3000/login with the email and password in `.env.local` (`SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`).

## Everyday commands

| Command | What it does |
|---|---|
| `npm run owner:add -- name@email.com "Name"` | Add a family login (prints a new password once) |
| `npm run db:reset` | **Deletes everything** and reloads the sample data. Don't use once real data is in. |
| `npm test` | Run the tests |
| `npm run typecheck` | Check the code for type errors |

## Settings (`.env.local`)

| Setting | Needed for |
|---|---|
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | Online database (Turso). Local file by default. |
| `SEED_SAMPLE_DATA` | `false` when going live, so sample houses aren't loaded |
| `SITE_URL` | Public address, e.g. `https://5a-rentals.vercel.app` (Messenger needs it to fetch the QR) |
| `MESSENGER_PAGE_TOKEN`, `MESSENGER_APP_SECRET`, `MESSENGER_VERIFY_TOKEN` | Messenger reminders (from the Meta app) |
| `CRON_SECRET` | Protects the daily reminder job |

Business details (name, contacts, location, FAQ) are in [src/config/site.ts](src/config/site.ts). Houses are edited in the dashboard.

## Going online (checklist)

1. **Database:** create a Turso database; put its URL and token in Vercel's environment settings.
2. **Hosting:** import this repo in Vercel; add every setting above; set `SEED_SAMPLE_DATA=false`.
3. **Photos:** uploads are saved on disk locally. On Vercel, switch [src/lib/storage.ts](src/lib/storage.ts) to Vercel Blob first.
4. **Messenger:** create a Meta app on the family's Facebook page → add Messenger → webhook URL `https://<site>/api/messenger` with your verify token → subscribe to `messages`, `messaging_postbacks`, `messaging_referrals` → request `pages_messaging` approval.
5. **Daily reminders:** `vercel.json` runs `/api/cron/reminders` every day at 8 AM Manila.
6. **First login:** run `npm run owner:add` against the online database for each family member.

Known limit: Messenger only allows normal messages within 24 hours of the tenant's last message. Later reminders need a Meta-approved template (not built yet). Until then, those show as "not sent" and the family uses **Copy message**.

## Real info still needed

See [docs/real-info-needed.md](docs/real-info-needed.md).
