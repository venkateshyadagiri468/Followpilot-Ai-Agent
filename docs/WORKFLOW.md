# FollowPilot — End-to-End Build Workflow

Senior-engineer execution plan built on the REA + Hermes Agent workflow.
This document is the master plan. It states the operating rules, the current
repository audit (with evidence), the phase gates, and the per-milestone
step breakdown with entry/exit criteria.

Status as of 2026-10-28: repo has 5 commits (auth, schema, dashboard shell,
API routes, seed). Phases 0–2 below are the immediate path.

---

## 0. Operating model

**Roles**
- Human (product owner): approves scope, specs, and every irreversible action.
- Hermes Agent: plans, implements one slice at a time, runs tests, reports.
- REA (plugin, 172 tools): investigates *authorized reference software* only,
  when behavior of a shipped artifact must be understood. Never for our own
  source — normal repo tools cover that.

**Source of truth (in priority order)**
1. `docs/PRD.md` + `docs/ARCHITECTURE.md` (product contract)
2. `AGENTS.md` (engineering rules for the agent)
3. The code + its tests
4. Chat history (weakest — never the basis for a decision)

**Hard rules**
- One coherent feature slice per task. No drive-by refactors.
- Acceptance criteria written *before* implementation.
- No "tests passed" claims without actually running them and reading output.
- Tenant isolation is enforced server-side in queries, never only in UI.
- AI drafts; a human approves every outbound message.
- REA evidence is input to understanding, not proof of correctness. Cite file
  paths/symbols for every REA-derived claim.
- Commit small, inspect `git diff` before each commit.

**Definition of done (every slice)**
- [ ] Acceptance criteria met, verified by test run
- [ ] Unit + integration tests added and green
- [ ] Lint + typecheck + build green
- [ ] Tenant-isolation check for every new query/mutation
- [ ] Diff inspected; no unrelated changes; no secrets
- [ ] Docs updated if behavior changed
- [ ] Committed with a message describing the slice

**Per-feature loop (daily operating rhythm)**
1. **Read** — AGENTS.md, relevant docs, current repo state.
2. **Investigate** — REA only if a reference implementation's behavior must be
   understood (see §4).
3. **Plan** — acceptance criteria, affected files, test list. Present, get approval.
4. **Implement** — smallest complete change.
5. **Verify** — run tests, exercise the browser, review the diff.
6. **Record** — docs, commit, report: files changed, decisions, tests run,
   failures, next recommended slice.

---

## 1. Current-state audit (evidence-based, 2026-10-28)

**Repo:** `~/Documents/PROJECTS/Followpilot-saas-Agent` — clean tree, 5 commits.
**Toolchain:** Node v22.22.1 (supported by REA), npm 9.2.0, Hermes v0.22.2,
REA plugin installed + enabled (172 MCP tools available via tool bridge).

**What matches the plan**
- Stack: Next.js 15 + TS, Tailwind 4, Clerk, Drizzle + Neon (Postgres), Zod,
  react-hook-form, Vitest, Playwright (installed).
- Schema is ahead of plan: 10 tables incl. `audit_events`, `email_deliveries`,
  `message_drafts` (with `idempotencyKey`), explicit `lead_status` enum
  (NEW…WON/LOST/DORMANT). Migration `0000_last_gamma_corps` generated.
- Clerk middleware in place (`src/middleware.ts`).
- Human-approval stance present: `recommendation-service.ts` returns
  `requiresApproval` and does not execute.

**P0 defects found (block M2/M3 sign-off)**
| # | Location | Defect |
|---|----------|--------|
| 1 | `src/app/api/leads/route.ts` POST | Trusts client-supplied `organizationId`. The "org check" only verifies *some* membership exists for that org — any authenticated user can create leads in any other org. Must derive org from `getAuth()` session. |
| 2 | `src/app/api/leads/route.ts` GET | Same: `organizationId` from query string, no user↔org binding. |
| 3 | `src/app/api/drafts/route.ts` GET | No authentication or tenant scoping at all — bare ID fetch. |
| 4 | `src/app/api/drafts/route.ts` POST approve | Trusts `approvedBy` from request body; no membership verification. A client can approve as anyone. |
| 5 | `src/app/api/recommendations/route.ts` POST | `requestedBy` taken from body, not the session. |

**P1 product gaps**
- `src/server/db/seed.ts` creates a membership for `user_test_123` — a
  non-Clerk user. A real signed-in user gets "No organization found" from
  `/api/organizations/me`. Org must be bootstrapped from the real Clerk user
  (on first sign-in, or via Clerk orgs webhook) before the dashboard works.
- Recommendation service is an intentional stub — no OpenAI call yet.
- No lead status-transition validation (any status can be set via POST).
- No endpoints for activities, follow-up tasks, conversations, messages.
- Lead name search uses exact `eq()` — should be `ILIKE %name%`.
- No tests exist at all (no `tests/`, no `*.test.*`).
- `package.json` has no `typecheck` or `drizzle:migrate` scripts; no
  Playwright config; no ESLint config file; no CI.
- No `docs/` (PRD/ARCHITECTURE/DATA_MODEL/SECURITY) and no root `AGENTS.md`
  in this repo yet.

**Verdict:** foundation ~30% built, but the tenancy model is the wrong shape
(client-asserted org). Phase 0 below fixes the shape before building features
on it.

---

## 2. Phase 0 — Toolchain & environment verification (½ day)

Gate before anything else. Exit when all checks pass and are committed as
`chore: verification`.

1. Confirm `node --version`, `npm --version`, `hermes --version`. ✅ (done: v22.22.1 / 9.2.0 / v0.22.2)
2. Confirm REA plugin active in a fresh Hermes session: discover REA tools via
   `tool_search`, `tool_describe` one, invoke a harmless one (e.g.
   `binary_session` with `{}`). A skill file is not proof — the call must work.
3. Add missing scripts to `package.json`:
   - `typecheck`: `tsc --noEmit`
   - `db:generate`: `drizzle-kit generate`
   - `db:migrate`: `drizzle-kit migrate`
   - `test:watch`, `test:e2e`: `playwright test`
4. Add `playwright.config.ts`, `eslint.config.js` (or `.eslintrc.json`),
   `vitest.config.ts` with jsdom env for React component tests.
5. Verify local dev loop end-to-end: `npm run dev`, sign in with real Clerk
   test user, observe the "No organization found" bug (evidence for M2).
6. Create `.env.example` review: confirm no secret in git (`git ls-files |
   grep env`). `.env.local` must stay untracked.

---

## 3. Phase 1 — Product contract (1 day, no application code)

Deliverables (committed as `docs: product contract`):
- `docs/PRD.md` — per feature: user problem, journey, functional requirements,
  edge cases, acceptance criteria, security rules, required tests. Separate
  *confirmed / assumptions / open questions*.
- `docs/ARCHITECTURE.md` — modular monolith, layer diagram (UI → server
  services → Drizzle → Neon; AI service; email service behind an interface),
  tenancy model: **org derived server-side from the authenticated user's
  membership — never from client input**.
- `docs/DATA_MODEL.md` — entities, invariants, the lead state machine with
  valid transitions and side effects (e.g. WON ⇒ no auto follow-up recs).
- `docs/SECURITY.md` — authN (Clerk), authZ (membership + role), tenant
  isolation strategy (single `requireOrg()` guard used by every route),
  AI output validation, email approval invariant, secrets policy.
- `docs/IMPLEMENTATION_PLAN.md` — the milestones below, with dates/owners.
- `AGENTS.md` (repo root) — the 12 development rules from the plan +
  "org is always derived from getAuth(), never from request data".

Review gate (human): answer the 5 questions from the plan (first user,
smallest useful product, which actions need approval, tenant isolation, how
we know each feature works). Approve → commit. This is the baseline.

---

## 4. REA investigation protocol (used selectively, not per task)

**When to use:** a shipped reference app's behavior must be understood to
match polish (e.g. "how does a reference CRM's lead-detail timeline render
empty states?"). **Never** for our own repo, and only on targets you are
authorized to examine.

**Cycle (one narrow question per investigation):**
A. Narrow question — "What happens when the user creates a lead in target X?"
B. Evidence — trace entry point, validation, API boundaries; static first.
C. Record — write a report into `docs/decisions/rea-<topic>.md` separating
   *observed facts / inferences / unknowns*, with file paths and symbols.
D. Translate — use the report as input to a feature spec; acceptance tests
   come from our PRD, not from the reference app.

**Suggested REA targets for this product**
- One web/Electron CRM you are allowed to inspect, for: lead creation flow,
  activity-timeline rendering, and status-change UX (3 narrow investigations,
  not a clone).
- Later: the Expo bundle in `Followpilot-saas-app` (a built artifact) for
  mobile-parity checks — REA's JS/Electron analysis route, or browser-capture
  tools for runtime evidence.

**Safeguards:** static inspection first; sandbox anything executed; no
proprietary code or assets copied into our product; every finding cites
evidence; treat decompiled output as candidate, not truth.

---

## 5. Phase 2 — Tenancy & security foundation (2–3 days) → M2

This is the unblocking work. Exit = security gate passes.

Steps:
1. `src/server/auth.ts`:
   - `requireUser()` → Clerk `getAuth()`, 401 on failure.
   - `requireOrg()` → user's membership (owner/admin) → returns
     `{ orgId, userId, role }`; 404 if no membership. Every route calls this.
   - Role model: `owner` / `member` (owner-only actions: delete org, manage
     members).
2. Org bootstrap: on first sign-in with no membership, create
   `organization` + `membership(owner)` in one transaction (server-side,
   named from profile). Replace seed's fake user with a dev-only seed keyed
   to a real test Clerk user. Add audit event `USER_SIGN_IN`.
3. Rewrite the four defective routes (audit items 1–5) to use `requireOrg()`;
   client never sends `organizationId` or `userId` — both are derived.
4. Central error handler + error taxonomy: 400 (zod validation errors with
   field messages), 401, 403, 404, 409, 500 (logged, opaque to client).
5. Zod schemas in `src/server/schemas/` for every input (lead in/out, task,
   draft approve, etc.).
6. **Security tests (Vitest + supertest-style route tests):**
   - Unauthenticated → 401 on every route.
   - User A cannot read/create/modify org B's leads (cross-tenant matrix).
   - Approve-draft with foreign identity is rejected (identity from session).
   - Non-member role cannot perform owner actions.
7. Playwright smoke: real sign-in → dashboard shows own org.

Exit gate: full cross-tenant matrix green; `git diff` reviewed; docs/SECURITY.md
updated with the actual guard implementation.

---

## 6. Milestone 1 — Product foundation & design system (2–3 days)

The "not vibecoded" bar: design system before features.

Steps:
1. Component system in `src/components/ui/`: button, input, select, dialog,
   badge (status colors), table, card, tabs, empty-state, toast. One file
   per primitive, documented props, no feature logic inside.
2. Design tokens: exact palette (one accent, neutral scale), typography
   scale, spacing scale, radius/shadow tokens in Tailwind theme. Pick a
   reference direction deliberately (e.g. Linear-grade: dense, neutral, one
   accent) and record it in `docs/decisions/design-language.md`.
3. App shell: left nav (Dashboard, Leads, Tasks, Settings), top bar with org
   switcher placeholder + user menu, responsive down to 375px.
4. Real screens with honest empty states (no fake data in prod paths; a
   `?demo` flag loads the seed set explicitly).
5. Routes: `/dashboard`, `/leads`, `/leads/[id]`, `/settings`.
6. Tests: component tests for ui primitives (render + a11y basics);
   Playwright: shell renders on desktop + mobile viewports.

Exit: key screens consistent, keyboard-navigable, no hardcoded colors outside
tokens. Screenshot review by human (this is where you stop "vibecoded" look).

---

## 7. Milestone 3 — Lead management (3–4 days)

Steps (one commit per step, tests alongside):
1. `leadStatusMachine.ts` — pure function: `canTransition(from, to)`,
   valid transitions + side effects. Unit-tested exhaustively (all 8×8 pairs).
2. `GET /api/leads` — proper search: `ILIKE` on name/company, status filter,
   pagination, sorting; all scoped by `requireOrg()`.
3. `POST /api/leads` — zod-validated, duplicate-email-per-org returns 409
   with the existing lead id, writes `activities(FOLLOW_UP_CREATED → none)`
   and `audit_events` in the same transaction.
4. `GET /api/leads/[id]` — lead + activity timeline + open tasks + latest
   recommendation.
5. `PATCH /api/leads/[id]` — field updates + `status` via the machine (invalid
   transition → 422 listing allowed transitions).
6. UI: leads table (sortable, filterable, paginated), create/edit dialog,
   lead detail page with timeline.
7. Tests: unit (state machine, validation), integration (CRUD + duplicate +
   invalid transition + cross-tenant), e2e (create → appears in table →
   status change → timeline entry).

Exit: lead workflow persists correctly; every invalid transition rejected;
cross-tenant matrix still green.

---

## 8. Milestone 4 — Follow-up workflow (2–3 days)

1. Task API: create / complete / reschedule / cancel. Idempotent create
   (`Idempotency-Key` header, unique constraint on the key per org) so retries
   never duplicate.
2. Rules: completing a task writes an activity; a lead with a due task shows
   in the "Next actions" view (server-computed, no client filtering for
   authorization).
3. Overdue logic: `dueDate < now()` surfaced, never auto-sent anything.
4. UI: task panel on lead detail, "Next actions" list on dashboard.
5. Tests: duplicate-create via idempotency key; reschedule doesn't orphan
   activities; cross-tenant task access rejected; e2e schedule → complete.

Exit: schedule/complete/reschedule without duplicates; audit trail complete.

---

## 9. Milestone 5 — AI recommendations + approval + email (4–5 days)

The riskiest milestone — the approval invariant lives here.

Steps:
1. `ai-client` service behind an interface (`generateDraft(context): Promise<
   Draft>`) so the provider is swappable and mockable. Synchronous for MVP;
   timeouts + one retry; never expose raw model errors to the client.
2. Bounded context builder: lead fields + last N activities + last N messages
   of the lead's conversations (capped token budget). No cross-lead data.
3. Output validation: strict zod schema on model output (action enum,
   rationale ≤ N chars, draft subject/body, confidence 0..1). Invalid output
   → `FAILED` status, logged, surfaced as "AI unavailable" — never stored as
   actionable.
4. Prompt-injection defense: user-provided lead fields are wrapped as
   untrusted data in the prompt; schema validation is the second wall; test
   with hostile lead names/notes ("ignore previous instructions…").
5. `POST /api/leads/[id]/recommendations` — session-scoped, writes
   `ai_recommendations` + `message_drafts`, audit event.
6. Approval API: `POST /api/drafts/[id]/approve|reject` — identity from
   session only (Phase 2 guard), version-pinned, idempotency key, state
   machine DRAFT→APPROVED→SENT / DRAFT→REJECTED.
7. Email: Resend behind `email-service` interface. Send only from an
   APPROVED draft; write `email_deliveries`; webhook endpoint updates
   delivery status; no email path exists that does not pass through approval
   (make this a test, not a hope).
8. UI: recommendation card with rationale + confidence, draft editor,
   Approve/Reject with explicit confirmation, delivery status on the timeline.
9. Tests (the milestone's definition of done):
   - Unit: schema validation (malformed outputs), state machine.
   - Integration: approval required (send without approval = impossible via
     API), idempotency, cross-tenant.
   - Adversarial: prompt injection in lead fields, timeout simulation,
     missing context (fresh lead), model outage → graceful failure.
   - E2E: generate → review → approve → mock-deliver → timeline shows sent.
   - All email tests use a mock transport. No real sends in CI/dev.

Exit: drafts are genuinely useful, invalid output handled safely, and there
is no code path from model output to a sent email without a human approval
record in the DB.

---

## 10. Milestone 6 — Release & operations (2–3 days)

1. CI (GitHub Actions): lint → typecheck → unit+integration → build →
   Playwright e2e against a throwaway Neon branch database.
2. Migrations discipline: `drizzle-kit migrate` in deploy step; migration
   journal reviewed; rollback = forward-fix (documented in
   docs/OPERATIONS.md).
3. Logging: structured request logs (no PII), error monitoring
   (Sentry or equivalent) with release tags.
4. Deploy: one environment first (Vercel or equivalent), env-var secrets
   only, no agent-accessible production credentials — a separate read-only
   ops identity for humans.
5. Rollback plan + smoke test script; on-call note; feedback channel
   (in-app "report an issue").
6. Runbook: `docs/OPERATIONS.md`.

Exit: verified deploy, verified rollback, dashboards + alerts for: error
rate, AI failure rate, email delivery failures.

---

## 11. Sequencing & dependencies

```
Phase 0 (toolchain verify) ──► Phase 1 (contract) ──► Phase 2 (tenancy fix)
                                                              │
            ┌─────────────────────────────────────────────────┤
            ▼                                                 ▼
        M1 design system ──────────────────────► M3 leads ──► M4 follow-ups
                                                              │
                                                              ▼
                                                     M5 AI + approval
                                                              │
                                                              ▼
                                                     M6 release/ops
```

- M1 and M2 are parallel-safe (design system doesn't touch tenancy).
- M3 blocks M4 blocks M5. M5 blocks M6.
- REA investigations slot in *before* M1 (design-language research) and
  *before* M3 (lead-flow research) — 1–2 days total, reports in
  `docs/decisions/`.
- Total: ~3–4 weeks of focused work to a trusted, releasable MVP.

## 12. Risk register (top items)

| Risk | Mitigation |
|------|-----------|
| Cross-tenant leak via client-asserted IDs (exists today) | Phase 2 guard + cross-tenant test matrix as a regression suite |
| AI output treated as truth | Schema validation + FAILED state + never-auto-send invariant test |
| Scope creep (microservices, queues, CRM integrations) | PRD "deliberately excluded" section; AGENTS.md rule 9 |
| Untrusted REA findings | Evidence citation, static-first, findings reviewed by human before spec |
| Test theater (agent claims pass) | Rule 7: actual run output only; CI is the final word |
| Secrets in agent access | No production creds in agent env; test DB only |
