/**
 * Audit logging helper.
 *
 * Every security-relevant action (create/update lead, change status,
 * approve/reject draft, send email, create/complete task, sign-in) is
 * recorded here. The audit trail is the evidence layer for the approval
 * invariant: a sent email must have a matching DRAFT_APPROVE + EMAIL_SEND
 * pair with the same actor.
 *
 * `actor` is ALWAYS the Clerk user id from the session — never from the
 * request body.
 */

import { db } from './db'
import { auditEvents } from './db/schema'
import type { AuthContext } from './auth'

export type AuditAction =
  | 'LEAD_CREATE'
  | 'LEAD_UPDATE'
  | 'LEAD_STATUS_CHANGE'
  | 'RECOMMENDATION_GENERATE'
  | 'DRAFT_APPROVE'
  | 'DRAFT_REJECT'
  | 'EMAIL_SEND'
  | 'EMAIL_DELIVERED'
  | 'EMAIL_BOUNCED'
  | 'EMAIL_FAILED'
  | 'TASK_CREATE'
  | 'TASK_COMPLETE'
  | 'TASK_CANCEL'
  | 'USER_SIGN_IN'
  | 'USER_SIGN_OUT'

export type AuditEntity = 'LEAD' | 'RECOMMENDATION' | 'DRAFT' | 'EMAIL' | 'TASK' | 'USER'

interface WriteAuditInput {
  orgId: string
  actor: string
  action: AuditAction
  entity?: AuditEntity
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      organizationId: input.orgId,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId ?? null,
      actor: input.actor,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })
  } catch (err) {
    // Audit failure must not break the business operation, but it MUST be
    // surfaced loudly. Never silently swallow.
    console.error('[audit] write failed', err)
  }
}

/** Convenience wrapper that pulls orgId/actor from the auth context. */
export async function auditFromContext(
  ctx: AuthContext,
  input: Omit<WriteAuditInput, 'orgId' | 'actor'>
): Promise<void> {
  await writeAudit({
    orgId: ctx.orgId,
    actor: ctx.userId,
    ...input,
  })
}

export function extractClientMeta(req: Request): {
  ipAddress?: string
  userAgent?: string
} {
  return {
    ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  }
}