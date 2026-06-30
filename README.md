# ⚡ Telivio — Multi-Tenant AI Recruiting Platform

> **Telivio is a SaaS product.** You (the platform owner) sell access to companies — Company A, Company B, etc. Each one signs up, gets its own isolated workspace, and uses Telivio's AI agent to run its own hiring pipeline.

---

## 🏢 Multi-Tenancy — How Data Isolation Works

Every company that signs up becomes an **organization**. All data — jobs, candidates, interviews, notes, Cal.com connections — is scoped to `organization_id`, and Postgres Row Level Security enforces that a user can only ever read or write rows belonging to their own organization. Company A's HR can never see Company B's candidates, and vice versa, even if they guess IDs or call the API directly.

```
organizations
  └── users            (each HR user belongs to exactly one org)
  └── jobs             (org_id on every row)
  └── candidates       (org_id on every row)
  └── interviews       (org_id on every row)
  └── notes            (org_id on every row)
  └── cal_connections  (org_id on every row, UNIQUE — one calendar per org)
```

New signups go through `/onboarding` to create their company's workspace before reaching the dashboard. The first user of a new organization becomes its `owner`.

---

## 📅 Cal.com — OAuth, not a personal API key

This is the part that matters most for a multi-tenant product. Telivio does **not** use one shared Cal.com API key. Instead:

1. Telivio itself has **one OAuth app** registered with Cal.com (`CAL_CLIENT_ID` / `CAL_CLIENT_SECRET` below)
2. Each customer organization clicks **"Connect Cal.com"** in Settings → Integrations
3. They're redirected to Cal.com's consent screen, log into **their own** Cal.com account, and approve
4. Telivio stores **their** access + refresh tokens in `cal_connections`, scoped to their `organization_id`
5. From then on, every interview Telivio schedules for that company books onto **their** calendar — never Telivio's, never another customer's

```
src/lib/cal.ts
  getCalAuthorizeUrl()       → builds the Cal.com consent URL
  exchangeCodeForTokens()    → trades the OAuth code for tokens, stores them
  getValidAccessToken()      → looks up + auto-refreshes an org's token
  createSchedulingLink()     → books using THAT org's own Cal.com account
  listEventTypes()           → lets an org pick which event type to use
  disconnectCal()            → removes a connection
```

### Setting up your Cal.com OAuth app (one-time, by you — the platform owner)

1. Go to [cal.com/integrate](https://cal.com/integrate)
2. Choose **"Create an OAuth app and allow user to schedule"**
3. App name: `Telivio`
4. Redirect URI: `http://localhost:3000/api/cal/callback` (add your production URL too)
5. Select booking + event-type scopes
6. Copy the **Client ID** and **Client Secret** into `.env.local`:
   ```env
   CAL_CLIENT_ID=...
   CAL_CLIENT_SECRET=...
   CAL_REDIRECT_URI=http://localhost:3000/api/cal/callback
   ```

You only do this once. Every customer organization connects through this same app, but each gets their own isolated token.

---

## 💳 Billing & Plans

Three plans, all with a 14-day free trial and no credit card required up front: **Starter** ($49/mo, 3 active jobs, 100 screenings/mo), **Growth** ($99/mo, 10 jobs, 500 screenings/mo, plus notes/analytics/custom emails/priority processing), and **Agency** ($199/mo, unlimited jobs/screenings, plus multiple client workspaces and white-label). There is no permanently-free tier — every organization is either trialing or paying.

**Single source of truth:** `src/lib/plans.ts` defines every plan's price, limits, and feature flags in one place. Nothing else in the codebase hardcodes a limit or a price — when you need to change what a plan includes, this is the only file to touch.

**Trial, not Polar-side:** the 14-day trial is tracked entirely in our own database (`organizations.trial_ends_at`), not through Polar. Polar checkout only happens when an org chooses to subscribe — either early, or once their trial runs out. This keeps the "no credit card required" promise simple: nobody talks to Polar until they're ready to pay.

**Polar is user-centric; we're organization-centric.** Polar has no native concept of a company/organization customer — only individual people. Telivio's billing unit is the *organization*, so every checkout carries `metadata.organizationId`, and `/api/billing/webhook` reads that metadata to know which of our organizations a subscription event belongs to. `organizations.polar_customer_id` and `polar_subscription_id` are the only link between "a person paid Polar" and "this company has access."

**Enforcement happens at the point of action, not just in the UI.** Active-job and screening limits are checked server-side, right before the action that would exceed them — `canCreateActiveJob()` / `canScreenResume()` in `src/lib/usage.ts`. A screening limit check happens *before* the Groq API call in `lib/agent.ts`, so a blocked screening never costs an AI API call. Feature flags (notes, analytics, custom templates, workspaces, white-label) are checked the same way in their respective API routes — never assume the UI hiding a button is the only thing stopping someone.

**Manual rejection still applies regardless of plan.** The agent never auto-rejects; a human always clicks "Reject" (see the earlier section on this). Email template overrides (Growth+) only change the subject/intro text — the underlying behavior (AI writes the rejection body, a human triggers the send) is identical on every plan.

**Agency workspaces are real, isolated organizations.** A child workspace created under an agency (`organizations.parent_organization_id`) has its own jobs, candidates, and RLS boundary — it's not a filtered view into the parent's data. It rides the agency's existing Polar subscription (`plan_status: 'active'` from creation, no separate trial) since the agency is already paying. `organization_memberships` grants a user access to switch into workspaces beyond their own primary one.

### Setting up Polar (one-time, by you — the platform owner)

1. Create an account at [polar.sh](https://polar.sh) (use their sandbox environment while testing — it's fully separate from production, with its own tokens and products)
2. Create three Products: Starter ($49/mo), Growth ($99/mo), Agency ($199/mo)
3. Copy each Product's ID into `.env.local` as `POLAR_PRODUCT_STARTER` / `_GROWTH` / `_AGENCY`
4. Generate an Access Token and set `POLAR_ACCESS_TOKEN`
5. Create a webhook pointing at `https://yourdomain.com/api/billing/webhook`, subscribed to subscription events (`created`, `active`, `updated`, `canceled`, `revoked`), and set `POLAR_WEBHOOK_SECRET` to its signing secret
6. Set `POLAR_ENVIRONMENT=sandbox` while testing, `production` when you go live

---

## 🎨 Landing Page

The marketing site lives at the root route (`/`) and is composed from focused, single-purpose components under `src/components/landing/`:

```
LandingContent.tsx   Composes every section in order
landing.css          Design tokens (colors, type scale, glass/shadow system), scoped
                      under .telivio-landing so it never affects the dark dashboard
VerdictCard.tsx       Signature element — an animated 3D card that cycles through
                      candidate scoring scenarios (apply -> think -> verdict)
Hero.tsx, HowItFeels.tsx, Features.tsx, Testimonials.tsx, FAQ.tsx, FinalCTA.tsx
Reveal.tsx / useReveal.ts   Scroll-triggered fade-up animation, shared across sections
```

`src/app/page.tsx` is a server component: it checks for a logged-in session and redirects to `/dashboard` (or `/onboarding`) when one exists, and renders `<LandingContent />` for everyone else. `/landing` is kept as a redirect to `/` for any old links.

The page is intentionally **light-themed**, independent of the dashboard's dark theme — every landing component scopes its styles under the `.telivio-landing` class in `landing.css` rather than touching global CSS, so the two halves of the app never fight each other visually.

---

## 📣 Publishing a Job & How Candidates Apply

Telivio doesn't run a public job board — there's no `telivio.com/jobs` listing every customer's openings. Instead, each job gets its own unique public link, and **HR is responsible for distributing it** wherever makes sense for them (their careers page, LinkedIn, a job board, direct email, etc).

```
Create job (Dashboard → Jobs → New Job)
      ↓
"Share / Apply Link" button (Jobs list, or Job Detail page)
      ↓
Copies: https://yourapp.com/apply/{job-id}
      ↓
HR pastes that link anywhere candidates can find it
      ↓
Candidate opens the link → /apply/[jobId]/page.tsx (public, no login)
      ↓
Candidate fills out:
  - Name, email, phone, location
  - Salary expectation, years of experience, start date, work authorization
  - LinkedIn / portfolio links
  - Resume upload (PDF / DOCX / TXT, drag-and-drop or browse)
  - Optional note to the hiring team
      ↓
Resume uploads to Supabase Storage (private "resumes" bucket,
scoped to the job's organization_id) → text is extracted server-side
      ↓
Candidate submits → POST /api/candidates → AI agent runs automatically
```

A job only accepts applications while its `status` is `'active'`. Pausing or closing it (Jobs list → ⋮ menu) immediately stops new submissions — anyone who still has the link sees a "Job Not Found" message.

### Resume storage

- Bucket: `resumes` (private, created by `schema.sql`)
- Path: `{organization_id}/{job_id}/{uuid}-{filename}`
- RLS lets anyone *upload* (the public apply page needs that), but only members of the owning organization can *read* — enforced by checking the first path segment against the caller's `organization_id`
- HR views/downloads a resume via a short-lived signed URL (`/api/candidates/resume-url`), since the bucket itself is private
- Text is extracted server-side (`pdf-parse` for PDFs, `mammoth` for DOCX) so the AI agent has something to score even though the original file is what HR actually opens

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database & Auth | Supabase (Postgres + RLS) |
| File Storage | Supabase Storage (resumes) |
| AI Scoring | Groq API (GPT-OSS 120B) — platform-level |
| Email Delivery | Resend — platform-level |
| Interview Scheduling | Cal.com OAuth — **per-organization** |
| Drag & Drop | @dnd-kit |

**Platform-level vs. per-organization:** Groq and Resend are configured once, by you, and used to serve every customer (they're how *you* deliver the AI scoring and email-sending service). Cal.com is different — it's the one integration that's inherently tied to *whose calendar* the booking lands on, so it must be per-organization via OAuth.

### Next.js 16 migration notes

This project runs on Next.js 16. Two changes carried over from 14/15 that are easy to miss if you're extending this code:

- **`middleware.ts` → `proxy.ts`.** The root-level interceptor file is renamed and now runs on the **Node.js runtime** instead of Edge — which is actually a meaningful upgrade here, since `proxy.ts` calls Supabase (`getUser()`, an org lookup) and Node has fuller compatibility with `@supabase/ssr` than Edge ever did.
- **`params` and `searchParams` are async everywhere.** Every dynamic route handler and server-component page takes `params: Promise<{ id: string }>` and must `await params` before reading values off it. Client components using the `useParams()` / `useSearchParams()` hooks (most of this app's dynamic pages) are unaffected — this only applies to the `params` *prop* passed into server code.
- **`cookies()` is fully async too, with no sync fallback.** `src/lib/supabase/server.ts`'s `createClient()` calls `cookies()` to read the session, so it had to become `export async function createClient()` with `const cookieStore = await cookies()` inside — and every one of its ~20 callers across API routes and server components had to change from `const supabase = createClient()` to `const supabase = await createClient()`. If you add a new server-side Supabase call site, remember the `await` — forgetting it throws `cookieStore.getAll is not a function` at request time, not at build time. `createAdminClient()` (service-role client, used for actions that must bypass RLS) never touches request cookies and stays synchronous — don't add `await` there.
- `next.config.js` → `next.config.ts`, and `serverActions.allowedOrigins` moved out of `experimental` (it's stable now).
- `next lint` was removed — linting runs via plain `eslint .` against the new flat `eslint.config.mjs`.

---

## 🚀 Quick Start

### 1. Install

```bash
npm install
cp .env.local.example .env.local
```

### 2. Fill in `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

GROQ_API_KEY=gsk_...

RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=recruiting@yourdomain.com

CAL_CLIENT_ID=...
CAL_CLIENT_SECRET=...
CAL_REDIRECT_URI=http://localhost:3000/api/cal/callback

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up the database

In your Supabase project's SQL Editor, run `supabase/schema.sql`. This creates:
- `organizations`, `users`, `jobs`, `candidates`, `interviews`, `notes`, `email_logs`, `cal_connections`, `usage_counters`, `organization_memberships`
- RLS policies enforcing tenant isolation on every table
- A `current_user_org_id()` helper function the policies rely on
- A private `resumes` Storage bucket with its own access policies

If you're upgrading an existing install instead of a fresh one, run the files in `supabase/migrations/` in order (002 through 004) rather than re-running `schema.sql`.

### 4. Run locally

```bash
npm run dev
```

### 5. Try the full flow

1. Visit `http://localhost:3000` → sign up
2. You'll land on `/onboarding` → name your company → this creates your organization
3. You're now in `/dashboard` as the `owner` of that org
4. Go to **Settings → Integrations → Connect Cal.com** to link your own calendar
5. Create a job in **Dashboard → Jobs → New Job** — the share modal opens automatically with your apply link
6. Click **"Copy Apply Link"** and open it in a new tab (or another browser/incognito window, since it's a public, unauthenticated page)
7. Fill out the application — upload a real PDF/DOCX resume, fill in salary expectation, experience, etc. — and submit
8. Back in the dashboard, watch the AI agent score it and (if it qualifies) generate a scheduling link on **your** calendar

To simulate a second customer (Company B), sign up with a different email and create a second organization — you'll see their data is completely separate from the first.

---

## 📁 Key Multi-Tenant Files

```
src/
├── lib/
│   ├── org-context.ts        # getOrgContext() — resolves user + org for every API route
│   ├── cal.ts                # OAuth-based, per-organization Cal.com integration
│   └── agent.ts              # Agent flow, organization-scoped throughout
├── app/
│   ├── onboarding/page.tsx   # New signups create their company workspace here
│   ├── api/
│   │   ├── onboarding/       # Creates organization + owner user row
│   │   └── cal/
│   │       ├── connect/      # Starts OAuth flow (redirects to Cal.com)
│   │       ├── callback/     # Exchanges code for tokens, stores per-org
│   │       ├── status/       # Is this org connected?
│   │       ├── event-types/  # List/set this org's interview event type
│   │       └── disconnect/   # Remove this org's connection
└── supabase/
    └── schema.sql             # organizations + RLS policies for every table
```

---

## 🤖 Agentic Workflow

```
Candidate Applies (public /apply/[jobId] page, no auth)
      ↓
Server resolves organization_id from the JOB — never trusts the client
      ↓
runRecruitingAgent(candidateId)
      ↓
  Groq API → scoreResume()  (platform-level — same Groq key for every org)
      ↓
  score >= 75?
  ┌─── YES ────────────────────────────────────────────┐
  │  createSchedulingLink(organizationId, ...)          │
  │    → looks up THIS org's Cal.com OAuth token         │
  │    → refreshes it if expired                         │
  │    → books using THEIR account, not Telivio's        │
  │  sendInterviewInvite()  (Resend, platform-level)      │
  │  status → "interview"                                 │
  └────────────────────────────────────────────────────┘
  ┌─── NO ─────────────────────────────────────────────┐
  │  generateRejectionEmail() via Groq                   │
  │  sendRejectionEmail() via Resend                      │
  │  status → "rejected"                                  │
  └────────────────────────────────────────────────────┘
```

---

## 🔐 Security Notes

- Every table except `organizations` carries `organization_id`, enforced `NOT NULL`
- RLS policies use a `SECURITY DEFINER` helper (`current_user_org_id()`) so they're fast and can't be bypassed by forging a different org's ID in a request body
- API routes additionally filter explicitly by `organization_id` (defense in depth — never rely on RLS alone for a SaaS product)
- The public `/apply/[jobId]` flow resolves `organization_id` **server-side from the job**, never from client input
- `jobs` has one deliberate public-read carve-out (`status = 'active'`) for the public application page — every other table has zero public access
- Cal.com tokens are stored server-side only, scoped one-to-one with `organization_id` (`UNIQUE` constraint), and refreshed automatically before expiry

---

## 🚀 Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add all environment variables in the Vercel dashboard, and update `CAL_REDIRECT_URI` (and the redirect URI registered in your Cal.com OAuth app) to your production domain.

---

## 📄 License

MIT — build freely.
