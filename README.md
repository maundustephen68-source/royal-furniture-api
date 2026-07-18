# Royal Furniture — Backend API

A secure Node.js/Express API that sits between your website and your data.
Prices, stock, and order totals live in the database — the browser never
sends a price, so nothing can be tampered with client-side.

## What it does

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/products` | GET | Public product catalog (filter by `?category=` or `?search=`) |
| `/api/products/:id` | GET | Single product |
| `/api/products` | POST (admin) | Add a product |
| `/api/products/:id` | PUT (admin) | Edit a product |
| `/api/products/:id` | DELETE (admin) | Deactivate a product |
| `/api/orders` | POST | Validate a cart server-side, create an order, return a WhatsApp checkout link |
| `/api/orders/:ref` | GET (admin) | Look up an order to confirm it's genuine |
| `/api/contact` | POST | Store a contact form submission |
| `/api/contact` | GET (admin) | View submitted messages |
| `/api/health` | GET | Uptime check |

Admin routes require a header `x-admin-key: <your ADMIN_API_KEY>`. Never put
that key in the website's JavaScript — only use it from Postman, curl, or a
private tool you control.

## 1. Create a free Postgres database (Neon)

1. Go to https://neon.tech and sign up (free tier, no credit card).
2. Create a new project. Copy the **connection string** it gives you
   (looks like `postgresql://user:pass@host/dbname?sslmode=require`).
3. Open the Neon SQL editor and paste in the contents of `db/schema.sql`
   from this folder, then run it. This creates the `products`, `orders`,
   and `contact_messages` tables.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — the Neon connection string from step 1
- `ALLOWED_ORIGINS` — your site's URL(s), comma-separated (e.g. your GitHub
  Pages URL, plus `http://localhost:5500` for local testing)
- `ORDER_SIGNING_SECRET` — any long random string
- `ADMIN_API_KEY` — any long random string (keep this private)
- `WHATSAPP_NUMBER` — `254716817495` (no `+`, no spaces)

## 3. Seed the product catalog

```bash
npm install
npm run seed
```

This loads your original 12 products plus 12 new placeholder products
(4 per category) into the database. Re-run `npm run seed` any time you edit
`db/seed.js` to reset the catalog, or use the admin API to add/edit products
one at a time without wiping everything.

## 4. Run it locally to test

```bash
npm start
```

Visit `http://localhost:4000/api/health` — you should see `{"ok":true,...}`.
Visit `http://localhost:4000/api/products` — you should see your seeded products.

## 5. Deploy to Render (free)

1. Push this `royal-backend` folder to its own GitHub repository.
2. Go to https://render.com, sign up, click **New → Web Service**, and
   connect that repository.
3. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. Under **Environment**, add every variable from your `.env` file
   (`DATABASE_URL`, `ALLOWED_ORIGINS`, `ORDER_SIGNING_SECRET`,
   `ADMIN_API_KEY`, `WHATSAPP_NUMBER`). Do **not** upload the `.env` file
   itself — `.gitignore` already keeps it out of the repo.
5. Deploy. Render gives you a URL like
   `https://royal-furniture-api.onrender.com`.
6. In `royal.js` on the frontend, set:
   ```js
   const API_BASE = 'https://royal-furniture-api.onrender.com';
   ```
7. Update `ALLOWED_ORIGINS` in Render to match your real site URL exactly
   (e.g. `https://yourusername.github.io`), then redeploy.

Note: Render's free tier sleeps after inactivity, so the first request
after a quiet period can take ~30–60 seconds to wake up. That's normal on
the free plan.

## 6. Managing products going forward

Use the admin endpoints with your `ADMIN_API_KEY`, for example with curl:

```bash
curl -X POST https://royal-furniture-api.onrender.com/api/products \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "category": "Living Room",
    "name": "Velvet Recliner Chair",
    "description": "Plush velvet recliner with footrest.",
    "price_cents": 55000,
    "image_url": "https://example.com/recliner.jpg",
    "stock": 20
  }'
```

Prices are in **cents** (e.g. `55000` = $550.00) to avoid floating-point
rounding bugs — the frontend divides by 100 automatically for display.

## Security measures included

- Prices/stock never trusted from the browser — always re-verified against the database on every order
- `helmet` for standard security headers
- CORS restricted to explicitly listed origins
- Rate limiting on checkout, contact form, and globally, to blunt scripted abuse
- Input validation with `zod` on every write endpoint
- Admin routes protected by a secret key with timing-safe comparison
- Order references are stamped with an HMAC signature so a submitted order
  can be verified as genuine, not hand-crafted
- No secrets committed to the repo — all via environment variables
