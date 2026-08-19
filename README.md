# Pharmacy Management System — Frontend

Next.js 16 (App Router) admin panel for the NestJS pharmacy API.

It implements the backend's four-stage workflow and nothing beyond it: load the
catalogue, price it, sell at the counter, then monitor and restock.

## Setup

The API must be running first (see `../pharmacy-nest-backend`).

```bash
npm install
cp .env.example .env.local     # point API_BASE_URL at the API
npm run dev                    # http://localhost:3001
```

| Variable | Purpose |
| --- | --- |
| `API_BASE_URL` | Base URL of the NestJS API, no trailing slash. Server-side only — it is never sent to the browser. |

The dev server runs on **3001** so it doesn't collide with the API on 3000.

## Screens

| Route | Stage | What it does |
| --- | --- | --- |
| `/login` | — | Admin sign-in. The seeded account only; there is no registration. |
| `/dashboard` | 4 | Earnings, units and transactions for today/week/month, plus the live low-stock list. |
| `/pos` | 3 | The counter. Search, build a basket, apply a discount, take payment, print the invoice. |
| `/catalogue` | 2 | Search all SKUs with filters. Open one to edit it. |
| `/catalogue/[id]` | 2 | Set price and stock, withdraw or restore, and see alternative brands. |
| `/pricing` | 2 | The pricing worklist — everything still without a price. |
| `/sales` | 4 | Past sales, searchable by invoice number and date range. |
| `/sales/[id]` | 4 | One sale with its line items and discount breakdown. |
| `/import` | 1 | Upload a catalogue CSV. |

## How it's put together

**The token never reaches the browser.** Login runs in a Server Action that
stores the JWT in an httpOnly cookie, and every API call goes through the
Next.js server, which attaches the `Authorization` header. No script on the page
can read the token, so an XSS bug can't steal a session. `src/proxy.ts` is an
optimistic gate that redirects logged-out visitors; the API remains the real
authority, and a 401 anywhere sends the user back to `/login`.

Because the browser can't call the API directly, the invoice PDF is proxied
through `/api/invoices/[id]`.

**Pages are Server Components** that fetch on the server and stream in with
`<Suspense>`, so there's no spinner-on-every-navigation. Only genuinely
interactive parts — the basket, the filter bar, the forms — are Client
Components.

**Filters live in the URL**, so a filtered view survives a refresh and can be
bookmarked or shared. Typing is debounced (350 ms) rather than firing a request
per keystroke.

### Messages are written for shop staff, not developers

`src/lib/messages.ts` translates every API error into a sentence that says what
went wrong *and* what to do. Raw validator output is never shown:

| The API says | The user reads |
| --- | --- |
| `price must not be greater than 99999999.99` | That price is too high. Enter an amount below 99,999,999.99. |
| `stock_quantity must be an integer number` | Stock must be a whole number of units — no decimals. |
| `property foo should not exist` | That filter isn't recognised. Try clearing it and searching again. |
| `422 insufficient_stock` | Only 3 of Napa 500 mg left in stock — you asked for 5. Lower the quantity. |

Anything unrecognised falls back to a calm, generic line rather than leaking
internals.

### `null` and `0` are never blurred

The API distinguishes "no admin has set this yet" (`null`) from "confirmed zero"
(`0`), and the UI keeps that visible throughout:

| Value | Shown as |
| --- | --- |
| `price = null` | **Not priced yet** — and it can't be sold |
| `stock = null` | **Not counted yet** |
| `stock = 0` | **Out of stock** |
| `stock < 5` | **3 left — running low** |

The same rule drives the pricing form, where a blank field means "leave this
alone" rather than "set it to zero" — which is what lets a restock avoid
re-sending an unchanged price.

## Structure

```text
src/
  app/
    (admin)/          # authenticated screens, sharing the sidebar layout
    api/invoices/     # PDF proxy — attaches the token the browser can't hold
    login/
  components/
    catalogue/  pos/  sales/  dashboard/  import/  layout/  ui/
  lib/
    api/              # server-only typed API client, one module per resource
    actions/          # Server Actions: login, pricing, checkout, import
    messages.ts       # API errors → plain English
    validations/      # zod schemas, with human-readable messages
    session.ts        # the httpOnly cookie
  proxy.ts            # route guard
  types/              # mirrors the API's response shapes
```

## Commands

```bash
npm run dev     # http://localhost:3001
npm run build
npm start
npm run lint
```
