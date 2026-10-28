# FollowPilot — Implementation Plan

**Version:** 1.0  
**Status:** DRAFT — pending human review gate  
**Baseline:** Phases 0–2 complete (toolchain + tenancy/security)

---

## 1. Milestone Summary

| Milestone | Name | Effort | Depends On | Status |
|-----------|------|--------|------------|--------|
| Phase 0 | Toolchain Verification | ½ day | — | ✅ Done |
| Phase 1 | Product Contract | 1 day | Phase 0 | 🔄 In Progress |
| Phase 2 | Tenancy & Security (M2) | 2–3 days | Phase 0 | ✅ Done |
| M1 | Design System & App Shell | 2–3 days | Phase 1 | ⏳ Planned |
| M3 | Lead Management | 3–4 days | M1, M2 | ⏳ Planned |
| M4 | Follow-Up Workflow | 2–3 days | M3 | ⏳ Planned |
| M5 | AI Recommendations + Approval + Email | 4–5 days | M4 | ⏳ Planned |
| M6 | Release & Operations | 2–3 days | M5 | ⏳ Planned |

---

## 2. Phase 1 — Product Contract (Current)

**Timeline:** 1 day  
**Owner:** Hermes Agent + Human Review  
**Deliverables:**
- [x] `docs/PRD.md` — Product requirements with acceptance criteria
- [x] `docs/ARCHITECTURE.md` — Layer diagram, tenancy model, API contracts
- [x] `docs/DATA_MODEL.md` — Entities, lead state machine, invariants
- [x] `docs/SECURITY.md` — AuthN/Z, approval invariant, audit, secrets
- [x] `AGENTS.md` — Engineering rules (repo root)

**Human Review Gate:** Answer 5 questions:
1. Who is the first user?
2. What is the smallest useful product?
3. Which actions require approval?
4. How is tenant isolation enforced?
5. How do we know each feature works?

**Exit:** Human approves → commit `docs: product contract`

---

## 3. M1 — Design System & App Shell (Parallel with M2)

**Timeline:** 2–3 days  
**Owner:** Hermes Agent  
**Depends On:** Phase 1 (contract approved)

### Steps
1. **Component Primitives** (`src/components/ui/`)
   - Button, Input, Select, Dialog, Badge, Table, Card, Tabs, EmptyState, Toast
   - One file per primitive, documented props, no feature logic
   - Component tests: render + a11y basics

2. **Design Tokens** (`tailwind.config.js` + `docs/decisions/design-language.md`)
   - Palette: one accent, neutral scale (Linear-grade: dense, neutral)
   - Typography scale, spacing scale, radius/shadow tokens
   - Record decision in `docs/decisions/design-language.md`

3. **App Shell**
   - Left nav: Dashboard, Leads, Tasks, Settings
   - Top bar: org switcher placeholder + user menu
   - Responsive: 375px → desktop

4. **Routes & Empty States**
   - `/dashboard` — Next Actions list (honest empty state)
   - `/leads` — Leads table (empty state with "Create Lead" CTA)
   - `/leads/[id]` — Lead detail (timeline, tasks, recommendations)
   - `/settings` — Org + members (owner only)
   - `?demo` flag loads seed data explicitly

5. **Tests**
   - Component tests for UI primitives
   - Playwright: shell renders on desktop + mobile viewports

**Exit:** Key screens consistent, keyboard-navigable, no hardcoded colors outside tokens. Screenshot review by human.

---

## 4. M3 — Lead Management

**Timeline:** 3–4 days  
**Owner:** Hermes Agent  
**Depends On:** M1, M2

### Steps (One Commit Per Step)
1. **Lead State Machine** (`src/server/leadStatusMachine.ts`)
   - `canTransition(from, to)` — pure, unit-tested exhaustively (8×8)
   - Side effects per transition

2. **GET /api/leads**
   - Search: `ILIKE` on name/company
   - Filter: status
   - Pagination: cursor-based
   - Sorting: createdAt, name, status
   - All scoped by `requireOrg()`

3. **POST /api/leads**
   - Zod validated
   - Duplicate email → 409 with existing lead ID
   - Writes `activity(LEAD_CREATED)` + `audit(LEAD_CREATE)` in same TX

4. **GET /api/leads/[id]**
   - Lead + activity timeline + open tasks + latest recommendation
   - Tenant-scoped load

5. **PATCH /api/leads/[id]**
   - Field updates (name, company, notes)
   - Status via state machine (invalid → 422 with allowed transitions)
   - Writes `activity(STATUS_CHANGED)` + `audit(LEAD_STATUS_CHANGE)`

6. **UI: Leads Table + Detail**
   - Sortable, filterable, paginated table
   - Create/edit dialog
   - Lead detail page with timeline

7. **Tests**
   - Unit: state machine, validation
   - Integration: CRUD + duplicate + invalid transition + cross-tenant
   - E2E: create → appears in table → status change → timeline entry

**Exit:** Lead workflow persists; every invalid transition rejected; cross-tenant matrix green.

---

## 5. M4 — Follow-Up Workflow

**Timeline:** 2–3 days  
**Owner:** Hermes Agent  
**Depends On:** M3

### Steps
1. **Task API**
   - `POST /api/tasks` — create (idempotent via `Idempotency-Key` header)
   - `PATCH /api/tasks/:id` — complete/reschedule/cancel
   - Unique constraint: `(organizationId, idempotencyKey)`

2. **Business Rules**
   - Completing task → writes `activity(FOLLOW_UP_COMPLETED)`
   - Lead with due task → appears in "Next Actions" (server-computed)
   - Overdue: `dueDate < now()` surfaced, never auto-sent

3. **UI**
   - Task panel on lead detail
   - "Next Actions" list on dashboard

4. **Tests**
   - Duplicate create via idempotency key
   - Reschedule doesn't orphan activities
   - Cross-tenant task access rejected
   - E2E: schedule → complete

**Exit:** Schedule/complete/reschedule without duplicates; audit trail complete.

---

## 6. M5 — AI Recommendations + Approval + Email (Riskiest)

**Timeline:** 4–5 days  
**Owner:** Hermes Agent  
**Depends On:** M4

### Steps
1. **AI Client Interface** (`src/server/agents/ai-client.ts`)
   - `generateDraft(context): Promise<Draft>`
   - OpenAI implementation (gpt-4o-mini)
   - Mock implementation (tests)
   - Timeout 15s + 1 retry

2. **Context Builder**
   - Lead fields + last 10 activities + last 5 messages
   - Capped token budget
   - No cross-lead data

3. **Output Validation**
   - Strict Zod schema on model output
   - Invalid → `FAILED` status, logged, "AI unavailable"
   - Never stored as actionable

4. **Prompt Injection Defense**
   - User fields wrapped as untrusted data
   - Schema validation = second wall
   - Adversarial tests with hostile lead names

5. **Recommendation API**
   - `POST /api/leads/:id/recommendations` — session-scoped
   - Writes `ai_recommendations` + `message_drafts` + audit

6. **Approval API**
   - `POST /api/drafts/:id/approve|reject`
   - Identity from session only (Phase 2 guard)
   - Version-pinned, idempotency key
   - State machine: DRAFT→APPROVED→SENT / DRAFT→REJECTED

7. **Email Service**
   - Resend behind `EmailService` interface
   - Send only from APPROVED draft
   - Write `email_deliveries` + webhook endpoint
   - **No email path without approval** (tested, not hoped)

8. **UI**
   - Recommendation card: rationale + confidence
   - Draft editor
   - Approve/Reject with explicit confirmation
   - Delivery status on timeline

9. **Tests (Definition of Done for M5)**
   - Unit: schema validation, state machine
   - Integration: approval required (send without approve = impossible), idempotency, cross-tenant
   - Adversarial: prompt injection, timeout, missing context, model outage
   - E2E: generate → review → approve → mock-deliver → timeline shows sent
   - All email tests use mock transport

**Exit:** Drafts genuinely useful, invalid output handled safely, no code path from model output to sent email without approval row in DB.

---

## 7. M6 — Release & Operations

**Timeline:** 2–3 days  
**Owner:** Hermes Agent  
**Depends On:** M5

### Steps
1. **CI/CD** (GitHub Actions)
   - `lint → typecheck → unit+integration → build → Playwright e2e`
   - E2E against throwaway Neon branch database

2. **Migrations Discipline**
   - `drizzle-kit migrate` in deploy step
   - Migration journal reviewed
   - Rollback = forward-fix (documented in `docs/OPERATIONS.md`)

3. **Observability**
   - Structured request logs (no PII)
   - Error monitoring (Sentry) with release tags
   - AI failure rate dashboard

4. **Deploy**
   - Vercel (one environment first)
   - Env-var secrets only
   - No agent-accessible production credentials
   - Separate read-only ops identity for humans

5. **Runbook** (`docs/OPERATIONS.md`)
   - Rollback plan + smoke test script
   - On-call note
   - Feedback channel (in-app "report an issue")

**Exit:** Verified deploy, verified rollback, dashboards + alerts for: error rate, AI failure rate, email delivery failures.

---

## 8. REA Investigations (Slot In)

| When | Target | Question |
|------|--------|----------|
| Before M1 | Reference CRM (web/Electron) | Lead creation flow, empty states |
| Before M3 | Same CRM | Lead-detail timeline rendering, status-change UX |
| Before M5 | Same CRM | Approval UI patterns, draft editor UX |

Each: 1 narrow question → static trace → report in `docs/decisions/rea-<topic>.md` → translate to spec.

---

## 9. Total Timeline Estimate

```
Week 1: Phase 1 (contract) + M1 (design system)          [Parallel: M2 already done]
Week 2: M3 (lead management)                              [Depends on M1]
Week 3: M4 (follow-ups) → M5 (AI + approval) start
Week 4: M5 complete → M6 (release/ops)
```
**Total: ~3–4 weeks to trusted, releasable MVP**

---

## 10. Current Blockers for Next Slice

| Blocker | Resolution |
|---------|------------|
| Phase 1 human review | Answer 5 questions, approve |
| Real DATABASE_URL for integration tests | Add password to `.env.local` from Neon dashboard |
| Design direction decision | Human picks reference (Linear-grade recommended) |

---

*End of Implementation Plan. Human review required.*