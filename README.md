# Get Set Connect — proof of concept

**Ready. Set. Connected.** A working proof of concept for a UK utility connections concierge. It coordinates electricity and gas connections for homeowners, builders and property developers.

It includes:

- **Public homepage**: how it works, services, who it's for, why it's free, FAQs and disclaimers.
- **Application form**: seven friendly steps, with saved progress, plot creation and document uploads.
- **Customer portal (My Connections)**: dashboard, per-project tracking with separate electricity and gas timelines, an activity feed, documents and a notification centre.
- **Developer view**: a plot-by-plot table with filters, adding plots, uploads per plot and a CSV export.
- **Operations dashboard (staff only)**: request queue with filters, case management, milestones, references, quotations, MPAN/MPRN, appointments, supplier recommendation, notes, tasks, reminders and a change history.

> Everything is demonstration data. Nothing is sent to network operators, gas networks or energy suppliers. All integrations are clearly labelled as **manual** or **mock**.

---

## Demo accounts

| Who | Email | Password |
| --- | --- | --- |
| Homeowner: Sam Taylor (Willow Cottage, one new home) | `sam@demo.getsetconnect.co.uk` | `demo1234` |
| Developer: Priya Shah, Harrow & Vale Homes (The Orchard, 6 plots) | `priya@demo.getsetconnect.co.uk` | `demo1234` |
| Staff: Alex Morgan (operations) | `ops@demo.getsetconnect.co.uk` | `admin1234` |

The sign-in page has buttons that fill these in for you. Staff can put everything back to the original sample data with **Reset demo data** at the bottom of the Requests page.

### A 5-minute demo script

1. Sign in as **Priya**. Open **The Orchard** to see the development table, filters and CSV export. Upload a photo against the "meter cabinet photos" action; once plots 2 and 4 both have one, the action clears itself.
2. Sign out and sign in as **Alex** (staff). Open **GSC-1031 Willow Cottage**. Under *Gas → Quotation*, set it to *Received* with an amount. Under *Electricity → Update milestone*, add a confirmed date.
3. Sign in as **Sam**. The bell shows new notifications, and the timeline shows the confirmed date.
4. Sign out and click **Get started**. Complete the form as a new customer. You'll land in your new dashboard, and the request appears at the top of Alex's queue.

---

## Running it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. Data is saved in a `.data` folder. Delete that folder to start fresh.

## Putting it online (Vercel)

1. Go to [vercel.com/new](https://vercel.com/new) and import the `get-set-connect` GitHub repository. Leave the settings as they are and click **Deploy**.
2. **Make the data stick (recommended).** In your Vercel project, open **Storage → Create Database → Upstash (Redis)**, choose the free plan, and connect it to this project. Vercel adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` settings automatically. Then go to **Deployments** and **Redeploy**.
   - Without this step the site still works, but changes are stored temporarily and can disappear. A coral banner at the top of the site warns about this.
3. **Add a session secret.** In **Settings → Environment Variables**, add `SESSION_SECRET` with a long random value, then redeploy.
4. **Custom domain (optional).** In **Settings → Domains**, add `getsetconnect.co.uk`.

Uploads are limited to 4 MB per file, which is the most a Vercel function accepts per request.

---

## How it's built

- **Next.js 15 (App Router) + React + TypeScript**
- **Tailwind CSS 4**. Brand colours are tokens in `src/app/globals.css`.
- **Server Actions** for every form, with access checks on the server.
- **Demo data store** in `src/lib/db`: Upstash Redis when configured, otherwise a JSON file.
- **Supabase-ready schema** with row-level security in `supabase/migrations/0001_init.sql`.

```
src/
  app/
    page.tsx                 Homepage
    apply/                   Application form (7 steps)
    (auth)/sign-in, register
    portal/                  Customer portal: dashboard, project tracking, notifications
    admin/                   Operations: requests, case page, tasks, suppliers
    actions/                 Server actions (auth, application, customer, admin)
    api/documents            Secure upload / download
    api/projects/[id]/export CSV export
  components/                UI building blocks, timeline, plot table, documents
  lib/
    brand.ts                 Name, domain, tagline: change the brand here
    domain.ts                Milestones, plain-English labels and explanations
    application.ts           Form data shape and validation
    suppliers.ts             Supplier recommendation (suitability only)
    db/                      Types, seed data, storage adapters
    repo/                    Read models, activity, notifications, access checks
    integrations/            Adapters (manual/mock) and MPAN/MPRN/postcode validation
supabase/migrations/         PostgreSQL schema + row-level security
```

### Core workflows

- **Application → case.** Submitting the form creates the customer account (if needed), an organisation, the project, one plot per property, and one connection per utility per plot. It also creates the six milestones (pre-filled from "How far along are you?") and internal tasks raised through the manual network adapter. The customer gets an "Application received" notification.
- **Staff update → customer portal.** Every staff change (milestones, quotations, MPAN/MPRN, appointments, supplier, customer-visible notes, information requests) writes to the shared data. Most also add an activity entry and an in-app notification, so the customer sees it on their next page load. Internal notes and tasks are never shown to customers.
- **"Over to you" actions.** Staff create a customer action, optionally tied to a document type and specific plots. The customer uploads straight from the action card, and it closes automatically once every plot is covered. Staff then get a "review upload" task.
- **Confirmed dates only.** Milestones store a date only when it's been confirmed. Otherwise customers see "awaiting confirmation".
- **Supplier recommendation.** Suppliers are scored on fuel coverage, multi-plot capability, three-phase and EV/heat pump suitability, verified lead times and availability. **Referral arrangements are stored but never used in the score.**

### Security

- Passwords are hashed with scrypt. Sessions are HMAC-signed, HTTP-only cookies.
- Every page, action, download and export checks the signed-in user. Customers only see projects belonging to their own organisation, and anything else returns "not found". Staff pages require the admin role.
- File downloads are served through an access-checked route with `no-store` caching. CSV cells are protected against spreadsheet formula injection.
- The Supabase schema repeats these rules as row-level security policies and storage policies.

### Swapping in Supabase later

1. Create a Supabase project and run `supabase/migrations/0001_init.sql`.
2. Replace `src/lib/db/store.ts` and the query helpers in `src/lib/repo` with Supabase queries. Replace `src/lib/auth` with Supabase Auth, and the document routes with Supabase Storage.
3. The pages and components only use the repo and action functions, so the customer experience doesn't change.

### Adding real integrations later

`src/lib/integrations/adapters.ts` defines small interfaces for network applications, supplier referrals, address lookup and email. Today each one is `manual` or `mock`. To go live, write a new adapter with the same interface and switch it in the `integrations` object. The current list shows on the staff Requests page.

### Changing the brand

- Name, domain, tagline: `src/lib/brand.ts` (the alternative "Connect My Build" is noted there).
- Colours: the `@theme` block in `src/app/globals.css`.
- Logo and character: `src/components/brand.tsx`.

## Not included (by design)

Live DNO/GDN or supplier integrations, real energy accounts, payments, automated quotations, commission billing, and water or broadband applications (shown as "coming soon"). Email notifications are mocked; notifications appear in the app.
