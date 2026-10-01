# Sleekandchic admin console

Where staff manage orders, products, categories, promo codes, homepage
slides, delivery rates and the team. It has no database of its own: it signs
in and calls the shop's API (`../sleekandchic_webapp`, `/api/v1/admin/*`).

## Run it locally

Start the shop first (it serves the API on http://localhost:3000), then:

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
npm run dev                  # http://localhost:3001
```

Sign in with an owner account. To make one, sign up on the shop and run, in
the shop's folder: `npm run db:make-owner -- you@example.com`.

## Settings

| Setting | |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | The shop's API, e.g. `https://sleekandchic.com/api/v1`. Required for a production build. |

On the shop's side, `ADMIN_APP_URL` must list this console's address, or the
browser blocks its requests and staff invitations can't link back here.

## Roles

- **Owner** (`super_admin`): everything, including the team, deleting or
  archiving, and refunds.
- **Staff** (`admin`): day-to-day work (orders, products, stock, promo codes,
  slides, delivery rates).

Admin sessions last 12 hours. Staff are invited from **Team**: they get an
email with a link to choose their own password (or, if email isn't set up on
the shop, the owner gets the link to send them).

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

GitHub Actions runs these on every push (`.github/workflows/ci.yml`).
