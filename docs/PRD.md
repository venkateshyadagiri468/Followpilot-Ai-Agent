# FollowPilot — Product Requirements Document

**Version:** 1.0  
**Status:** DRAFT — pending human review gate  
**Last Updated:** 2026-10-28

---

## 1. Product Overview

### 1.1 Problem Statement
Sales teams waste 60%+ of their time on manual follow-up scheduling, context switching between tools, and drafting repetitive outreach. Existing CRMs are either too heavy (Salesforce) or too light (spreadsheets), and none provide AI-assisted follow-up that respects human approval as an invariant.

### 1.2 Solution
FollowPilot is a **lead follow-up co-pilot** that:
- Tracks leads through a defined pipeline (NEW → CONTACTED → REPLIED → QUALIFIED → PROPOSAL → WON/LOST/DORMANT)
- Generates AI draft follow-ups based on lead context and activity history
- **Requires human approval before any email is sent** — approval is a DB invariant, not a UI button
- Surfaces "Next Actions" so reps never miss a follow-up

### 1.3 Target User
- **Primary:** B2B sales reps (AE/SDR) managing 50–200 active leads
- **Secondary:** Sales managers needing pipeline visibility without micromanaging
- **Tertiary:** Founders/operators doing founder-led sales

### 1.4 First User Scenario
> "I sign in with Clerk, land on my dashboard, see 3 leads that need follow-up today. I click one, review the AI draft, tweak the subject line, hit Approve. The email sends. The lead replies — status auto-updates to REPLIED. I move to the next."

---

## 2. User Journeys

### 2.1 Happy Path: Lead Follow-Up Cycle
1. **Sign in** → Clerk auth → org bootstrapped if first visit
2. **Dashboard** → "Next Actions" list (overdue tasks + stale leads)
3. **Lead Detail** → timeline (activities, emails, recommendations)
4. **Generate Recommendation** → AI draft appears (action: SEND_EMAIL / SCHEDULE_TASK / WAIT)
5. **Review & Approve** → human edits draft → clicks Approve
6. **Email Sends** → delivery tracked → timeline updated
7. **Lead Replies** → webhook/status change → REPLIED status

### 2.2 Edge Cases
| Scenario | Handling |
|----------|----------|
| AI generates garbage | Output validation fails → `FAILED` status, human sees "AI unavailable" |
| User doesn't approve | Draft stays `DRAFT`; no email sent; reminder in Next Actions |
| Lead replies before follow-up | Status → REPLIED; recommendation invalidated; new one generated |
| Duplicate lead (same email, same org) | 409 Conflict with existing lead ID |
| Cross-org access attempt | 404 (not 403 — no existence leak) |
| Idempotent retry (network glitch) | `Idempotency-Key` header deduplicates task/create |

---

## 3. Functional Requirements

### 3.1 Lead Management
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Create lead (name, email, company?, notes?) | P0 |
| FR-2 | List leads with search (ILIKE name/company), status filter, pagination | P0 |
| FR-3 | Get lead detail + activity timeline + open tasks + latest recommendation | P0 |
| FR-4 | Update lead fields (name, company, notes) | P1 |
| FR-5 | Change lead status **only via state machine** (invalid transition → 422) | P0 |
| FR-6 | Duplicate email within org → 409 with existing lead ID | P0 |

### 3.2 Follow-Up Tasks
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7 | Create task (lead, type, dueDate, idempotencyKey) | P0 |
| FR-8 | Complete task → writes activity | P0 |
| FR-9 | Reschedule/cancel task | P1 |
| FR-10 | "Next Actions" view: overdue + due today + stale leads (no activity 7d) | P0 |
| FR-11 | Idempotent create via `Idempotency-Key` header (unique per org) | P0 |

### 3.3 AI Recommendations
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-12 | Generate recommendation for lead (context: lead + last 10 activities + last 5 messages) | P0 |
| FR-13 | Output validated against strict Zod schema (action enum, rationale, draft, confidence) | P0 |
| FR-14 | Invalid output → `FAILED` status, logged, never stored as actionable | P0 |
| FR-15 | Prompt-injection defense: user fields wrapped as untrusted data | P0 |
| FR-16 | Provider behind interface (swappable, mockable, timeout + 1 retry) | P1 |

### 3.4 Approval & Email
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-17 | Draft created with `status=DRAFT`, `approvedBy=null`, `approvedAt=null` | P0 |
| FR-18 | Approve: identity from session only; `DRAFT_APPROVE` audit row + `EMAIL_SEND` in same TX | P0 |
| FR-19 | Reject: `status=REJECTED`, audit row, no email | P0 |
| FR-20 | Email sent via Resend; `email_deliveries` row; webhook updates status | P0 |
| FR-21 | **No code path from model output to sent email without approval row** | P0 |

### 3.5 Auth & Tenancy
| ID | Requirement | Priority |
|----|-------------|----------|
| FR-22 | Clerk authentication on all routes | P0 |
| FR-23 | Org derived from session via `requireOrg()` — never from client | P0 |
| FR-24 | First sign-in → org + owner membership created (idempotent) | P0 |
| FR-25 | Role: `owner` (delete org, manage members) / `member` | P1 |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | API p95 < 300ms (excluding AI call); AI call timeout 15s |
| **Reliability** | 99.9% uptime; AI failure → graceful degradation (show "AI unavailable") |
| **Security** | No PII in logs; structured logging; secrets in env only; no prod creds in agent |
| **Observability** | Request logs (no PII), error monitoring (Sentry), AI failure rate dashboard |
| **Scalability** | Modular monolith; Neon serverless Postgres; stateless API routes |

---

## 5. Security Rules (Binding)

1. **Org is always derived from `getAuth()` session — never from request data**
2. **Approval is a DB invariant**: `DRAFT_APPROVE` + `EMAIL_SEND` audit rows with same actor must exist before email sends
3. **Cross-tenant isolation**: every query scoped by `orgId` from `requireOrg()`; 404 not 403
4. **AI output validation**: strict Zod schema; invalid → `FAILED`; never auto-execute
5. **Prompt injection defense**: user-supplied fields wrapped as untrusted data in prompt
6. **Secrets policy**: `.env.local` never committed; prod creds in separate maintenance system
7. **Audit trail**: every security-relevant action logged with actor, entity, timestamp, client meta

---

## 6. Acceptance Criteria (Per Feature)

### Lead Management
- [ ] Create lead → 201, appears in list, audit `LEAD_CREATE`
- [ ] List leads → paginated, filtered, search works, scoped to org
- [ ] Invalid status transition → 422 with allowed transitions listed
- [ ] Duplicate email → 409 with existing lead ID

### Follow-Up Tasks
- [ ] Create task with idempotency key → duplicate retry returns same task
- [ ] Complete task → activity written, Next Actions updates
- [ ] Overdue tasks surfaced in dashboard

### AI Recommendations
- [ ] Generate → recommendation + draft stored, `requiresApproval=true`
- [ ] Malformed model output → `FAILED`, logged, no draft created
- [ ] Hostile lead name ("ignore previous instructions") → sanitized, no injection

### Approval & Email
- [ ] Approve draft → `APPROVED` + `SENT` in same TX, audit rows paired, email sent
- [ ] Send without approve → impossible (404 or 409)
- [ ] Reject draft → `REJECTED`, no email, audit row

### Tenancy
- [ ] Unauthenticated → 401
- [ ] User A cannot read/write User B's org data → 404
- [ ] Client-supplied `organizationId` ignored

---

## 7. Deliberately Excluded (Out of Scope)

- Microservices / message queues / event-driven architecture
- Multi-channel outreach (SMS, LinkedIn, phone) — email only for MVP
- CRM integrations (Salesforce, HubSpot sync) — explicit opt-in later
- Team workspaces / complex RBAC — owner/member only
- Mobile app — responsive web only
- Real-time collaboration — async by default

---

## 8. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | Should lead status auto-advance on email reply (webhook) or manual? | Open |
| 2 | What constitutes "stale" for Next Actions? (7d default, configurable?) | Open |
| 3 | AI provider: OpenAI only or multi-provider interface from day 1? | Assumption: OpenAI first, interface for swap |
| 4 | Email tracking: open/click tracking via Resend webhooks? | Assumption: yes |
| 5 | Lead assignment / round-robin for teams? | Excluded from MVP |

---

## 9. Confirmed Assumptions

- Next.js 15 + App Router + Server Components
- Clerk for auth (session-based, `getAuth()` in routes)
- Neon serverless Postgres + Drizzle ORM
- Resend for email
- OpenAI for AI (gpt-4o-mini for drafts)
- Vitest (unit/integration) + Playwright (e2e)
- ESLint 9 flat config + TypeScript strict
- Tailwind 4 for styling

---

*End of PRD. Human review required before implementation proceeds.*