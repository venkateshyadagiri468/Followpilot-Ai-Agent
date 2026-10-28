# FollowPilot — Data Model

**Version:** 1.0  
**Status:** DRAFT — pending human review gate

---

## 1. Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  ORGANIZATIONS  │       │  MEMBERSHIPS    │       │     USERS       │
│                 │       │                 │       │  (Clerk-managed)│
│ id (PK)         │◀──────│ orgId (FK)      │       │                 │
│ name            │       │ userId          │       │ userId (PK)     │
│ createdAt       │       │ role (enum)     │       │ email           │
│                 │       │ createdAt       │       │ name            │
└─────────────────┘       └────────┬────────┘       └─────────────────┘
                                   │
                                   │ 1:N
                                   ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     LEADS       │       │  ACTIVITIES     │       │AI_RECOMMENDATIONS│
│                 │       │                 │       │                 │
│ id (PK)         │◀──────│ leadId (FK)     │       │ id (PK)         │
│ orgId (FK)      │       │ type (enum)     │       │ leadId (FK)     │
│ name            │       │ meta (JSON)     │       │ action (enum)   │
│ email (unique   │       │ createdAt       │       │ rationale       │
│  per org)       │       │                 │       │ confidence      │
│ company         │       └─────────────────┘       │ status (enum)   │
│ status (enum)   │                                 │ draft (JSON)    │
│ createdAt       │                                 └────────┬────────┘
│ updatedAt       │                                          │
└────────┬────────┘                                   1:1   │
         │                                                  ▼
         │ 1:N                                    ┌─────────────────┐
         │                                        │ MESSAGE_DRAFTS  │
         ▼                                        │                 │
┌─────────────────┐                               │ id (PK)         │
│ FOLLOW_UP_TASKS │                               │ recId (FK)      │
│                 │                               │ leadId (FK)     │
│ id (PK)         │                               │ subject         │
│ leadId (FK)     │                               │ body            │
│ type (enum)     │                               │ status (enum)   │
│ dueDate         │                               │ approvedBy      │
│ status (enum)   │                               │ approvedAt      │
│ idempotencyKey  │                               │ idempotencyKey  │
│ createdAt       │                               │ createdAt       │
└─────────────────┘                               │ updatedAt       │
         │                                        └────────┬────────┘
         │ 1:N                                                 │
         ▼                                                     ▼
┌─────────────────┐                               ┌─────────────────┐
│EMAIL_DELIVERIES │                               │  AUDIT_EVENTS   │
│                 │                               │                 │
│ id (PK)         │                               │ id (PK)         │
│ draftId (FK)    │                               │ actorId         │
│ resendId        │                               │ action (enum)   │
│ status (enum)   │                               │ entity (enum)   │
│ webhookPayload  │                               │ entityId        │
│ sentAt          │                               │ meta (JSON)     │
└─────────────────┘                               │ createdAt       │
                                                  └─────────────────┘
```

---

## 2. Core Entities

### 2.1 Organization
```typescript
{
  id: string (uuid, PK)
  name: string
  createdAt: DateTime
}
```

### 2.2 Membership
```typescript
{
  id: string (uuid, PK)
  organizationId: string (FK → organizations.id)
  userId: string (Clerk userId)
  role: 'owner' | 'member'
  createdAt: DateTime
  
  // Unique constraint: (userId, organizationId)
}
```

### 2.3 Lead
```typescript
{
  id: string (uuid, PK)
  organizationId: string (FK → organizations.id)
  name: string
  email: string           // unique per organization
  company?: string
  notes?: string
  status: LeadStatus      // enum, see §3
  createdAt: DateTime
  updatedAt: DateTime
  
  // Unique constraint: (organizationId, email)
  // Index: (organizationId, status)
  // Index: (organizationId, createdAt DESC)
}
```

### 2.4 Activity
```typescript
{
  id: string (uuid, PK)
  leadId: string (FK → leads.id)
  type: ActivityType      // enum
  meta: Json              // flexible payload
  createdAt: DateTime
  
  // Index: (leadId, createdAt DESC)
}

ActivityType enum:
- 'LEAD_CREATED'
- 'STATUS_CHANGED'        // meta: { from, to }
- 'NOTE_ADDED'
- 'EMAIL_SENT'            // meta: { draftId, subject }
- 'EMAIL_DELIVERED'       // meta: { deliveryId }
- 'EMAIL_OPENED'
- 'EMAIL_CLICKED'
- 'EMAIL_REPLIED'
- 'FOLLOW_UP_CREATED'     // meta: { taskId, dueDate }
- 'FOLLOW_UP_COMPLETED'   // meta: { taskId }
- 'FOLLOW_UP_RESCHEDULED' // meta: { taskId, oldDue, newDue }
- 'RECOMMENDATION_GENERATED' // meta: { recommendationId }
- 'RECOMMENDATION_APPROVED'
- 'RECOMMENDATION_REJECTED'
```

### 2.5 AI Recommendation
```typescript
{
  id: string (uuid, PK)
  leadId: string (FK → leads.id)
  action: RecommendationAction  // enum
  rationale: string             // ≤ 500 chars
  confidence: number            // 0.0–1.0
  status: RecommendationStatus  // enum
  draft?: Json                  // { subject, body } if SEND_EMAIL
  contextSnapshot: Json         // lead + activities at generation time
  createdAt: DateTime
  updatedAt: DateTime
  
  // Index: (leadId, createdAt DESC)
}

RecommendationAction enum:
- 'SEND_EMAIL'
- 'SCHEDULE_TASK'
- 'WAIT'

RecommendationStatus enum:
- 'PENDING'      // generated, awaiting review
- 'APPROVED'     // human approved, draft created
- 'REJECTED'     // human rejected
- 'FAILED'       // validation failed, not actionable
- 'SUPERSEDED'   // newer recommendation exists
```

### 2.6 Message Draft
```typescript
{
  id: string (uuid, PK)
  recommendationId: string (FK → ai_recommendations.id)
  leadId: string (FK → leads.id)  // denormalized for queries
  subject: string
  body: string
  status: DraftStatus             // enum
  approvedBy?: string             // Clerk userId
  approvedAt?: DateTime
  idempotencyKey: string          // unique per org
  createdAt: DateTime
  updatedAt: DateTime
  
  // Index: (recommendationId) unique
  // Index: (leadId, createdAt DESC)
}

DraftStatus enum:
- 'DRAFT'         // created, awaiting approval
- 'APPROVED'      // human approved, not yet sent
- 'REJECTED'      // human rejected
- 'SENT'          // email sent (terminal)
```

### 2.7 Email Delivery
```typescript
{
  id: string (uuid, PK)
  draftId: string (FK → message_drafts.id)
  resendId: string              // Resend message ID
  status: DeliveryStatus        // enum
  webhookPayload?: Json         // Resend webhook data
  sentAt: DateTime
  deliveredAt?: DateTime
  openedAt?: DateTime
  clickedAt?: DateTime
  
  // Index: (draftId) unique
}

DeliveryStatus enum:
- 'QUEUED'
- 'SENT'
- 'DELIVERED'
- 'BOUNCED'
- 'COMPLAINED'
- 'OPENED'
- 'CLICKED'
```

### 2.8 Follow-Up Task
```typescript
{
  id: string (uuid, PK)
  leadId: string (FK → leads.id)
  type: TaskType                // enum
  dueDate: DateTime
  status: TaskStatus            // enum
  idempotencyKey: string        // unique per organization
  completedAt?: DateTime
  createdAt: DateTime
  updatedAt: DateTime
  
  // Unique constraint: (organizationId, idempotencyKey) via lead→org
  // Index: (leadId, dueDate)
  // Index: (organizationId, status, dueDate)  // for Next Actions query
}

TaskType enum:
- 'FOLLOW_UP_EMAIL'
- 'FOLLOW_UP_CALL'
- 'FOLLOW_UP_LINKEDIN'
- 'MEETING'
- 'CUSTOM'

TaskStatus enum:
- 'PENDING'
- 'COMPLETED'
- 'CANCELLED'
- 'OVERDUE'  // computed, not stored
```

### 2.9 Audit Event
```typescript
{
  id: string (uuid, PK)
  actorId: string               // Clerk userId
  action: AuditAction           // enum
  entity: AuditEntity           // enum
  entityId: string
  meta: Json                    // request context, IP, UA, etc.
  createdAt: DateTime
  
  // Index: (actorId, createdAt DESC)
  // Index: (entity, entityId, createdAt DESC)
}

AuditAction enum:
- 'USER_SIGN_IN'
- 'ORG_CREATE'
- 'LEAD_CREATE'
- 'LEAD_UPDATE'
- 'LEAD_STATUS_CHANGE'
- 'TASK_CREATE'
- 'TASK_COMPLETE'
- 'TASK_RESCHEDULE'
- 'TASK_CANCEL'
- 'RECOMMENDATION_GENERATE'
- 'DRAFT_APPROVE'        // paired with EMAIL_SEND
- 'DRAFT_REJECT'
- 'EMAIL_SEND'           // paired with DRAFT_APPROVE (same actor)
- 'EMAIL_DELIVERED'
- 'MEMBER_INVITE'
- 'MEMBER_REMOVE'

AuditEntity enum:
- 'ORGANIZATION'
- 'LEAD'
- 'ACTIVITY'
- 'RECOMMENDATION'
- 'DRAFT'
- 'EMAIL_DELIVERY'
- 'TASK'
- 'MEMBERSHIP'
```

---

## 3. Lead Status State Machine

### 3.1 States (8 Total)

| Status | Category | Description |
|--------|----------|-------------|
| `NEW` | Active | Lead created, no contact yet |
| `CONTACTED` | Active | First outreach sent |
| `REPLIED` | Active | Lead responded |
| `QUALIFIED` | Active | Lead meets criteria |
| `PROPOSAL` | Active | Proposal sent |
| `WON` | **Terminal** | Deal closed won |
| `LOST` | **Terminal** | Deal closed lost |
| `DORMANT` | **Terminal** | No response after N follow-ups |

### 3.2 Valid Transitions

```
NEW ──────────────▶ CONTACTED ──────────────▶ REPLIED ──────────────▶ QUALIFIED ──────────────▶ PROPOSAL
  │                   │                        │                        │                        │
  │                   │                        │                        │                        │
  ▼                   ▼                        ▼                        ▼                        ▼
DORMANT           DORMANT                  DORMANT                 DORMANT                   DORMANT
  │                   │                        │                        │                        │
  │                   │                        │                        │                        │
  └───────────────────┴────────────────────────┴────────────────────────┴────────────────────────┘
                              │
                              ▼
                        ┌─────────┐
                        │  WON    │
                        │  LOST   │
                        └─────────┘
```

### 3.3 Transition Rules

| From → To | Allowed? | Side Effects |
|-----------|----------|--------------|
| NEW → CONTACTED | ✅ | Creates `FOLLOW_UP_CREATED` activity |
| NEW → DORMANT | ✅ | Lead abandoned |
| NEW → WON/LOST | ❌ | Must progress through pipeline |
| CONTACTED → REPLIED | ✅ | Auto on email reply webhook |
| CONTACTED → DORMANT | ✅ | No reply after follow-ups |
| CONTACTED → QUALIFIED | ❌ | Must reply first |
| REPLIED → QUALIFIED | ✅ | Discovery complete |
| REPLIED → DORMANT | ✅ | Ghosted after reply |
| QUALIFIED → PROPOSAL | ✅ | Proposal sent |
| QUALIFIED → DORMANT | ✅ | Stalled |
| PROPOSAL → WON | ✅ | Deal closed |
| PROPOSAL → LOST | ✅ | Deal lost |
| PROPOSAL → DORMANT | ✅ | Proposal expired |
| WON → *any* | ❌ | **Terminal** — locked |
| LOST → *any* | ❌ | **Terminal** — locked |
| DORMANT → NEW | ✅ | Re-engagement (new cycle) |
| DORMANT → CONTACTED | ✅ | Direct re-contact |
| *any* → same | ✅ | No-op (idempotent) |

### 3.4 Terminal State Invariants

```typescript
// src/server/leadStatusMachine.ts
const TERMINAL_STATES = new Set(['WON', 'LOST', 'DORMANT']);

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;                    // Idempotent
  if (TERMINAL_STATES.has(from)) return false;     // Terminal locked
  // ... valid transitions matrix
}
```

### 3.5 Status Change Side Effects

| Transition | Activity Written | Audit Event | Other |
|------------|------------------|-------------|-------|
| * → CONTACTED | `FOLLOW_UP_CREATED` (first follow-up) | `LEAD_STATUS_CHANGE` | — |
| * → REPLIED | `EMAIL_REPLIED` | `LEAD_STATUS_CHANGE` | Invalidates pending recommendations |
| * → QUALIFIED | — | `LEAD_STATUS_CHANGE` | — |
| * → PROPOSAL | — | `LEAD_STATUS_CHANGE` | — |
| * → WON | — | `LEAD_STATUS_CHANGE` | Cancels pending tasks |
| * → LOST | — | `LEAD_STATUS_CHANGE` | Cancels pending tasks |
| * → DORMANT | — | `LEAD_STATUS_CHANGE` | Cancels pending tasks |
| DORMANT → NEW | `LEAD_CREATED` (re-engagement) | `LEAD_STATUS_CHANGE` | Fresh pipeline |

---

## 4. Invariants (DB-Enforced)

1. **Unique email per organization**: `UNIQUE (organizationId, email)` on `leads`
2. **One membership per user per org**: `UNIQUE (userId, organizationId)` on `memberships`
3. **Draft approval invariant**: `DRAFT_APPROVE` + `EMAIL_SEND` audit rows with same `actorId` must exist before `draft.status = 'SENT'`
4. **Idempotent task create**: `UNIQUE (organizationId, idempotencyKey)` via `follow_up_tasks` → `leads` → `organizations`
5. **Terminal state lock**: Application-level (state machine) + DB check constraint on `leads.status` transitions
6. **Draft status progression**: `DRAFT → APPROVED → SENT` or `DRAFT → REJECTED` (no backwards)

---

## 5. Indexes for Query Patterns

```sql
-- Lead list (paginated, filtered, searched)
CREATE INDEX idx_leads_org_status_created ON leads (organization_id, status, created_at DESC);
CREATE INDEX idx_leads_org_email ON leads (organization_id, email);  -- for duplicate check

-- Lead detail + timeline
CREATE INDEX idx_activities_lead_created ON activities (lead_id, created_at DESC);

-- Next Actions dashboard
CREATE INDEX idx_tasks_org_status_due ON follow_up_tasks (organization_id, status, due_date)
  WHERE status = 'PENDING';

-- Recommendations for lead
CREATE INDEX idx_recommendations_lead_created ON ai_recommendations (lead_id, created_at DESC);

-- Drafts for approval UI
CREATE INDEX idx_drafts_lead_status ON message_drafts (lead_id, status, created_at DESC);

-- Audit queries
CREATE INDEX idx_audit_actor_created ON audit_events (actor_id, created_at DESC);
CREATE INDEX idx_audit_entity_entityid_created ON audit_events (entity, entity_id, created_at DESC);
```

---

## 6. Enum Reference (Complete)

```typescript
// src/server/db/schema/index.ts exports
export const leadStatusEnum = pgEnum('lead_status', [
  'NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'DORMANT'
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'LEAD_CREATED', 'STATUS_CHANGED', 'NOTE_ADDED',
  'EMAIL_SENT', 'EMAIL_DELIVERED', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_REPLIED',
  'FOLLOW_UP_CREATED', 'FOLLOW_UP_COMPLETED', 'FOLLOW_UP_RESCHEDULED',
  'RECOMMENDATION_GENERATED', 'RECOMMENDATION_APPROVED', 'RECOMMENDATION_REJECTED'
]);

export const recommendationActionEnum = pgEnum('recommendation_action', [
  'SEND_EMAIL', 'SCHEDULE_TASK', 'WAIT'
]);

export const recommendationStatusEnum = pgEnum('recommendation_status', [
  'PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'SUPERSEDED'
]);

export const draftStatusEnum = pgEnum('draft_status', [
  'DRAFT', 'APPROVED', 'REJECTED', 'SENT'
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'COMPLAINED', 'OPENED', 'CLICKED'
]);

export const taskTypeEnum = pgEnum('task_type', [
  'FOLLOW_UP_EMAIL', 'FOLLOW_UP_CALL', 'FOLLOW_UP_LINKEDIN', 'MEETING', 'CUSTOM'
]);

export const taskStatusEnum = pgEnum('task_status', [
  'PENDING', 'COMPLETED', 'CANCELLED'
]);

export const auditActionEnum = pgEnum('audit_action', [
  'USER_SIGN_IN', 'ORG_CREATE',
  'LEAD_CREATE', 'LEAD_UPDATE', 'LEAD_STATUS_CHANGE',
  'TASK_CREATE', 'TASK_COMPLETE', 'TASK_RESCHEDULE', 'TASK_CANCEL',
  'RECOMMENDATION_GENERATE',
  'DRAFT_APPROVE', 'DRAFT_REJECT',
  'EMAIL_SEND', 'EMAIL_DELIVERED',
  'MEMBER_INVITE', 'MEMBER_REMOVE'
]);

export const auditEntityEnum = pgEnum('audit_entity', [
  'ORGANIZATION', 'LEAD', 'ACTIVITY', 'RECOMMENDATION',
  'DRAFT', 'EMAIL_DELIVERY', 'TASK', 'MEMBERSHIP'
]);

export const membershipRoleEnum = pgEnum('membership_role', [
  'owner', 'member'
]);
```

---

*End of Data Model. Human review required.*