# AGENTS.md — Engineering Rules for FollowPilot

**Version:** 1.0  
**Status:** BINDING — all agents and humans must follow

---

## 1. Source of Truth (Priority Order)

1. `docs/PRD.md` + `docs/ARCHITECTURE.md` — Product contract
2. `AGENTS.md` (this file) — Engineering rules
3. The code + its tests — Implementation reality
4. Chat history — Weakest; never the basis for a decision

---

## 2. Hard Rules

### 2.1 One Coherent Feature Slice Per Task
- No drive-by refactors
- No "while I'm here" cleanups unless they unblock the slice
- If you see unrelated debt, file a follow-up task

### 2.2 Acceptance Criteria Before Implementation
- Every slice starts with: "Given/When/Then" criteria
- Criteria reviewed by human before code starts
- Tests written to match criteria

### 2.3 No "Tests Passed" Claims Without Evidence
- Run the tests, read the output, report exact numbers
- "19/19 pass" — show the output
- CI is the final word; local runs are preliminary

### 2.4 Tenant Isolation Enforced in Queries
- **Every query scoped by `orgId` from `requireOrg()`**
- Never `WHERE id = ?` alone — always `WHERE id = ? AND organization_id = ?`
- 404 for cross-tenant, never 403 (no existence leak)

### 2.5 AI Drafts; Human Approves Every Outbound Message
- Approval is a **DB invariant**, not a UI button
- `DRAFT_APPROVE` + `EMAIL_SEND` audit rows with same actor in same TX
- No code path from model output to sent email without approval row

### 2.6 REA Evidence Is Input, Not Proof
- REA used only for authorized reference software behavior
- Never for our own source code
- Every finding cites file paths/symbols
- Decompiled output = candidate, not truth

### 2.7 Commit Small, Inspect `git diff` Before Each Commit
- One logical change per commit
- Message describes the slice: `type: subject`
- No secrets in diffs (`.env.local` ignored)

### 2.8 Definition of Done (Every Slice)
- [ ] Acceptance criteria met, verified by test run
- [ ] Unit + integration tests added and green
- [ ] Lint + typecheck + build green
- [ ] Tenant-isolation check for every new query/mutation
- [ ] Diff inspected; no unrelated changes; no secrets
- [ ] Docs updated if behavior changed
- [ ] Committed with message describing the slice

---

## 3. Per-Feature Loop (Daily Rhythm)

1. **Read** — `AGENTS.md`, relevant docs, current repo state
2. **Investigate** — REA only if reference behavior must be understood
3. **Plan** — Acceptance criteria, affected files, test list. **Present, get approval.**
4. **Implement** — Smallest complete change
5. **Verify** — Run tests, exercise browser, review diff
6. **Record** — Docs, commit, report: files changed, decisions, tests run, failures, next slice

---

## 4. Security Rules (Binding)

| Rule | Description |
|------|-------------|
| **Org from session** | Organization derived from `getAuth()` session via `requireOrg()` — never from request body/query |
| **Approval invariant** | `DRAFT_APPROVE` + `EMAIL_SEND` paired audit rows in single TX before email sends |
| **Cross-tenant = 404** | Never 403; no existence leak |
| **AI output validated** | Strict Zod schema; invalid → `FAILED`; never auto-execute |
| **Prompt injection defense** | User fields wrapped as untrusted data in prompt |
| **Secrets in env only** | `.env.local` never committed; prod creds in separate system |
| **Audit everything** | Every security action logged with actor, entity, timestamp, client meta |

---

## 5. Code Style & Patterns

### 5.1 Route Handler Template
```typescript
// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../server/db';
import { leads } from '../../../server/db/schema';
import { eq } from 'drizzle-orm';
import { requireOrg } from '../../../server/auth';
import { auditFromContext } from '../../../server/audit';

export async function GET(request: NextRequest) {
  const ctx = await requireOrg(request);
  if ('response' in ctx) return ctx.response;

  const leads = await db.query.leads.findMany({
    where: eq(leads.organizationId, ctx.orgId),
    orderBy: (leads, { desc }) => [desc(leads.createdAt)],
  });

  await auditFromContext(ctx, { action: 'LEAD_LIST', entity: 'LEAD' });
  return NextResponse.json({ data: leads });
}
```

### 5.2 Transaction Pattern
```typescript
import type { Tx } from '../../../server/db';

await db.transaction(async (tx: Tx) => {
  // All writes here — atomic
  await tx.update(...);
  await auditFromContext(ctx, {...}, tx);
});
```

### 5.3 Zod Validation Pattern
```typescript
const parsed = LeadCreateSchema.safeParse(await request.json());
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Validation failed', issues: parsed.error.issues },
    { status: 400 }
  );
}
// parsed.data is typed
```

### 5.4 Import Style
```typescript
// Named imports for types
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Server modules: relative from src/
import { requireOrg } from '../../../server/auth';
```

---

## 6. Testing Requirements

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Vitest | 100% of pure functions (state machine, validation, utils) |
| Integration | Vitest + Neon branch | All routes: auth, tenant isolation, CRUD, invariants |
| E2E | Playwright | Critical paths: sign-in → create lead → approve → send |

### Test Naming
- Unit: `*.test.ts` in `tests/unit/`
- Integration: `*.test.ts` in `tests/integration/`
- E2E: `*.spec.ts` in `tests/e2e/`

### Test Data
- Integration tests use real DB (Neon branch) with transaction rollback
- `tests/integration/helpers.ts` — `makeTestOrg()`, `makeTestLead()`, `beginTestTransaction()`, `endTestTransaction()`
- Unit tests pure — no DB, no Clerk

---

## 7. Database Discipline

- `drizzle-kit generate` on every schema change
- Migration file reviewed in PR
- `drizzle-kit migrate` in CI deploy step
- Rollback = forward-fix migration (documented)
- Unique constraints for invariants (duplicate email, idempotency keys)

---

## 8. AI Service Rules

- Provider behind interface (`AIClient`) — swappable, mockable
- Timeout 15s + 1 retry
- Never expose raw model errors to client
- Output validated by Zod schema → `FAILED` on invalid
- Prompt injection defense: untrusted data wrapper
- All email tests use mock transport — no real sends in CI/dev

---

## 9. Deliberately Excluded (Scope Guard)

- Microservices / message queues / event-driven architecture
- Multi-channel outreach (SMS, LinkedIn, phone)
- CRM integrations (Salesforce, HubSpot sync)
- Team workspaces / complex RBAC
- Mobile app
- Real-time collaboration

**If it's not in PRD, it's out of scope.** File a PRD amendment if needed.

---

## 10. Risk Register (Top Items)

| Risk | Mitigation |
|------|------------|
| Cross-tenant leak via client IDs | `requireOrg()` guard + cross-tenant test matrix |
| AI output treated as truth | Schema validation + `FAILED` state + never-auto-send test |
| Scope creep | PRD "excluded" section + AGENTS.md rule 9 |
| Untrusted REA findings | Evidence citation, static-first, human review before spec |
| Test theater | Rule 2.3: actual run output only; CI is final word |
| Secrets in agent access | No prod creds in agent env; test DB only |

---

## 11. Quick Reference Commands

```bash
# Development
npm run dev                    # Next.js dev server
npm run typecheck              # tsc --noEmit
npm run lint                   # eslint . --max-warnings 0

# Testing
npm run test:unit              # Vitest unit tests
npm run test:integration       # Vitest integration (needs real DATABASE_URL)
npm test                       # All tests
npm run test:e2e               # Playwright

# Database
npx drizzle-kit generate       # Create migration
npx drizzle-kit push           # Push schema (dev)
npx drizzle-kit migrate        # Run migrations (prod)

# Neon
neon env pull                  # Pull .env.local from branch
neon deploy                    # Deploy schema changes
neon checkout dev --create     # Create dev branch
```

---

## 12. Escalation

- **Security issue** → Immediate: revert, rotate keys, audit log review
- **Data loss** → Neon point-in-time recovery + forward-fix migration
- **AI runaway** → Disable AI route via feature flag; investigate
- **Scope dispute** → PRD amendment required; human decides

---

*These rules are binding. Violations revert to last compliant state.*