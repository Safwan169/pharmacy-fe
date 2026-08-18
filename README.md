# Pharmacy Admin

Admin web panel for pharmacy inventory, sales and suppliers.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Zod v4 · react-hook-form

## Getting started

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint    # eslint
```

## Structure

```
src/
├─ app/
│  ├─ (admin)/            # routes inside the sidebar shell
│  │  ├─ layout.tsx       # sidebar + topbar
│  │  ├─ dashboard/       # KPI tiles, restock + recent sales
│  │  ├─ medicines/       # inventory table, /new form
│  │  ├─ categories/      # therapeutic classes
│  │  ├─ suppliers/       # supplier table, /new form
│  │  ├─ sales/           # invoice history
│  │  ├─ alerts/          # restock + expiry watch
│  │  ├─ reports/         # summaries
│  │  └─ settings/        # pharmacy profile
│  ├─ login/              # sits outside the admin shell
│  └─ page.tsx            # redirects to /dashboard
├─ components/
│  ├─ ui/                 # button, input, card, badge, table primitives
│  ├─ layout/             # sidebar, topbar, page header
│  ├─ auth/ medicines/ suppliers/   # feature forms
│  └─ dashboard/          # stat card
├─ lib/
│  ├─ validations/        # Zod schemas — one file per domain
│  ├─ inventory.ts        # stock/expiry status helpers
│  ├─ mock-data.ts        # placeholder data, replace with API calls
│  └─ utils.ts            # cn(), currency/date formatting
└─ types/                 # domain types derived from the schemas
```

## Validation pattern

Zod v4 distinguishes a schema's **input** (what the form fields hold — strings,
possibly-absent defaults) from its **output** (coerced, validated payload). Each
schema exports both, and forms wire them up with three generics:

```ts
useForm<MedicineFormValues, unknown, MedicineInput>({
  resolver: zodResolver(medicineSchema),
});
```

Using a single generic will not typecheck on any schema that uses `.coerce` or
`.default()`.

Cross-field rules live in the schema via `.refine()` — for example selling price
must be ≥ cost price, and expiry must fall after the manufacture date.

## Wiring up a backend

The screens currently read from `src/lib/mock-data.ts` and forms `console.log`
their payload (each marked with a `TODO`). To connect a real API:

1. Replace the mock imports in each page with your data fetch.
2. Swap the `console.log` in the three form `onSubmit` handlers for the API call.
3. Validate on the server with the same schemas from `@/lib/validations`.

## Not included

Auth is UI-only — the login form redirects without checking credentials, and no
route is protected. Add a session check plus middleware before this handles real
patient or prescription data.
