# FollowPilot — Architecture

**Version:** 1.0  
**Status:** DRAFT — pending human review gate

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  Next.js 15 App Router • React 18 • Tailwind 4 • Clerk SDK     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER (Vercel)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Middleware │  │  API Routes │  │  Server     │             │
│  │  (Clerk)    │  │  (App Router)│  │  Components │             │
│  └─────────────┘  └──────┬──────┘  └─────────────┘             │
└─────────────────────────┼───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  NEON POSTGRES │ │   CLERK       │ │   RESEND      │
│  (Drizzle ORM) │ │   (Auth)      │ │   (Email)     │
└───────────────┘ └───────────────┘ └───────────────┘
        ▲
        │
┌───────┴──────────────────────────────────────────────┐
│              AI SERVICE (Interface)                  │
│  generateDraft(context) → Promise<Draft>             │
│  • OpenAI implementation (gpt-4o-mini)               │
│  • Mock implementation (tests)                       │
│  • Timeout 15s + 1 retry                             │
└──────────────────────────────────────────────────────┘
```

---

## 2. Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER                             │
│  Components: ui/* (primitives), leads/*, dashboard/*,       │
│              recommendations/*, tasks/*                     │
│  State: React Query / Server Components                     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                      SERVER LAYER                           │
│  src/app/api/*/route.ts  (Route Handlers)                   │
│  ├── auth: requireUser(), requireOrg()                      │
│  ├── validation: Zod schemas (src/server/schemas/*)         │
│  ├── audit: auditFromContext()                              │
│  └── business logic: services/*                             │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                      SERVICE LAYER                          │
│  src/server/agents/                                         │
│  ├── recommendation-service.ts  (deterministic + AI)        │
│  ├── ai-client.ts             (interface + OpenAI impl)     │
│  ├── email-service.ts         (interface + Resend impl)     │
│  └── lead-status-machine.ts   (pure state transitions)      │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                      DATA LAYER                             │
│  src/server/db/                                             │
│  ├── index.ts              (Drizzle client + Tx type)       │
│  └── schema/               (10 tables, enums, indexes)      │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                    EXTERNAL SERVICES                        │
│  Neon Postgres • Clerk Auth • Resend Email • OpenAI API     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Tenancy Model

### Core Principle
> **Organization is ALWAYS derived server-side from the authenticated user's membership — never from client input.**

### Implementation
```typescript
// src/server/auth.ts
export async function requireOrg(request: NextRequest): Promise<AuthContext | AuthError> {
  const { userId } = getAuth(request);  // Clerk session
  if (!userId) return { response: unauthorized() };

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.role, 'owner')),
    with: { organization: true },
  });

  if (!membership) return { response: notFound() }; // 404, not 403

  return { orgId: membership.organization.id, userId, role: membership.role };
}
```

### Usage in Every Route
```typescript
// src/app/api/leads/route.ts
export async function GET(request: NextRequest) {
  const ctx = await requireOrg(request);
  if ('response' in ctx) return ctx.response;

  // ctx.orgId is THE source of truth — client query param ignored
  const leads = await db.query.leads.findMany({
    where: eq(leads.organizationId, ctx.orgId),
  });
  return NextResponse.json({ data: leads });
}
```

### Security Guarantees
| Threat | Mitigation |
|--------|------------|
| Client sends `organizationId` | Ignored; derived from session |
| User accesses another org's data | `requireOrg()` returns only user's org |
| Existence leak via 403 | Returns 404 (not found) |
| Privilege escalation | Role checked in `requireOrg()`; owner-only actions gated |

---

## 4. Data Flow: AI Recommendation → Approval → Email

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│  POST /leads/:id │────▶│  AI Client  │
│             │     │  /recommendations│     │  (OpenAI)   │
└─────────────┘     └────────┬─────────┘     └──────┬──────┘
                             │                      │
                             ▼                      ▼
                    ┌──────────────────┐     ┌─────────────┐
                    │  Validation      │     │  Structured │
                    │  (Zod Schema)    │◀────│  Output     │
                    └────────┬─────────┘     └─────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       ┌───────────────┐             ┌───────────────┐
       │  VALID        │             │  INVALID      │
       │  → Store      │             │  → FAILED     │
       │  ai_rec +     │             │  → Log +      │
       │  draft        │             │  "AI unavail" │
       └───────┬───────┘             └───────────────┘
               │
               ▼
       ┌───────────────┐
       │  Human sees   │
       │  draft in UI  │
       └───────┬───────┘
               │
               ▼ (Approve)
       ┌───────────────┐
       │  POST         │
       │  /drafts/:id  │
       │  /approve     │
       └───────┬───────┘
               │
               ▼
       ┌─────────────────────┐
       │  Single Transaction │
       │  1. draft: DRAFT→   │
       │     APPROVED→SENT   │
       │  2. audit:          │
       │     DRAFT_APPROVE   │
       │  3. audit:          │
       │     EMAIL_SEND      │
       │     (same actor)    │
       │  4. email:          │
       │     Resend.send()   │
       │  5. delivery row    │
       └─────────────────────┘
```

---

## 5. Database Schema (Key Tables)

| Table | Purpose | Key Constraints |
|-------|---------|-----------------|
| `organizations` | Tenant root | `id` (PK), `name`, `createdAt` |
| `memberships` | User↔Org + Role | `userId`, `orgId`, `role` (owner/member), unique(userId, orgId) |
| `leads` | Lead records | `orgId` (FK), `email` unique per org, `status` (enum) |
| `activities` | Timeline events | `leadId` (FK), `type` (enum), `createdAt` |
| `ai_recommendations` | AI output + context | `leadId`, `action`, `rationale`, `confidence`, `status` |
| `message_drafts` | Human-editable drafts | `recommendationId`, `status` (DRAFT/APPROVED/REJECTED/SENT), `approvedBy`, `approvedAt`, `idempotencyKey` |
| `email_deliveries` | Send tracking | `draftId`, `resendId`, `status`, `webhookPayload` |
| `audit_events` | Security log | `actorId`, `action`, `entity`, `entityId`, `meta`, `createdAt` |
| `follow_up_tasks` | Scheduled actions | `leadId`, `type`, `dueDate`, `status`, `idempotencyKey` |

---

## 6. API Contract (Route Map)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/organizations/me` | requireOrg | Bootstrap/return current org |
| GET | `/api/leads` | requireOrg | List leads (search, filter, paginate) |
| POST | `/api/leads` | requireOrg | Create lead |
| GET | `/api/leads/:id` | requireOrg | Lead detail + timeline |
| PATCH | `/api/leads/:id` | requireOrg | Update lead (status via machine) |
| POST | `/api/leads/:id/recommendations` | requireOrg | Generate AI recommendation |
| GET | `/api/drafts/:id` | requireOrg | Get draft |
| POST | `/api/drafts/:id/approve` | requireOrg | Approve → send email |
| PATCH | `/api/drafts/:id` | requireOrg | Reject or resend |
| POST | `/api/tasks` | requireOrg | Create task (idempotent) |
| PATCH | `/api/tasks/:id` | requireOrg | Complete/reschedule/cancel |
| GET | `/api/tasks/next-actions` | requireOrg | Dashboard Next Actions |

---

## 7. Error Taxonomy

| Code | When | Response Shape |
|------|------|----------------|
| 400 | Zod validation failure | `{ error: 'Validation failed', issues: ZodIssue[] }` |
| 401 | No Clerk session | `{ error: 'Unauthorized' }` |
| 403 | Authenticated but no org membership | `{ error: 'Forbidden' }` (rare — prefer 404) |
| 404 | Resource not found OR cross-tenant access | `{ error: 'Not found' }` |
| 409 | Conflict (duplicate email, double-approve) | `{ error: 'Conflict', existingId?: string }` |
| 422 | Invalid state transition | `{ error: 'Invalid transition', allowed: string[] }` |
| 500 | Unexpected error | `{ error: 'Internal server error' }` (logged, opaque) |

---

## 8. AI Service Interface

```typescript
// src/server/agents/ai-client.ts
export interface AIClient {
  generateDraft(context: RecommendationContext): Promise<AIResult>;
}

export interface RecommendationContext {
  lead: Lead;
  recentActivities: Activity[];
  recentMessages: Message[];
}

export interface AIResult {
  action: 'SEND_EMAIL' | 'SCHEDULE_TASK' | 'WAIT';
  rationale: string;           // ≤ 500 chars
  confidence: number;          // 0.0–1.0
  draft?: {                    // only if SEND_EMAIL
    subject: string;           // ≤ 200 chars
    body: string;              // ≤ 2000 chars
  };
}

// OpenAI implementation: timeout 15s, 1 retry, never exposes raw errors
// Mock implementation: returns deterministic fixture for tests
```

---

## 9. Email Service Interface

```typescript
// src/server/agents/email-service.ts
export interface EmailService {
  send(params: SendParams): Promise<SendResult>;
}

export interface SendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  metadata: { draftId: string; orgId: string; leadId: string };
}

export interface SendResult {
  id: string;  // Resend message ID
}
```

---

## 10. Deployment & Runtime

| Aspect | Choice |
|--------|--------|
| **Hosting** | Vercel (Next.js native) |
| **Database** | Neon serverless Postgres (branch per env) |
| **Auth** | Clerk (hosted) |
| **Email** | Resend (API) |
| **AI** | OpenAI API (gpt-4o-mini) |
| **CI/CD** | GitHub Actions → lint → typecheck → test → build → Playwright (Neon branch DB) |
| **Environments** | `development` (local), `preview` (PR), `production` |
| **Secrets** | Vercel env vars only; no agent access to prod |

---

## 11. Observability

| Signal | Tool |
|--------|------|
| Request logs (structured, no PII) | `console.log` → Vercel Logs / Logtail |
| Errors + traces | Sentry (release tags) |
| AI metrics | Custom: failure rate, latency, token usage |
| Email delivery | Resend webhooks → `email_deliveries` table |
| DB performance | Neon dashboard + `pg_stat_statements` |

---

## 12. Migration Strategy

- `drizzle-kit generate` on schema changes
- `drizzle-kit migrate` in CI deploy step
- Migration journal reviewed in PR
- Rollback = forward-fix migration (documented in `docs/OPERATIONS.md`)

---

*End of Architecture. Human review required.*