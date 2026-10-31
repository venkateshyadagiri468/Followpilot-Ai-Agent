/**
 * PATCH /api/v1/leads/:id  { status?, name?, company?, dealValue? }
 *
 * Status changes MUST go through canTransition(). Invalid → 422 with
 * allowed transitions listed. Terminal states (WON / LOST) are locked.
 *
 * SECURITY: organizationId is NEVER accepted from the client. The lead's
 * org is verified server-side via requireOrg() + ownership check.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { leads, auditEvents } from '../../../../server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { requireOrg } from '../../../../server/auth';
import {
  canTransition,
  allowedTransitions,
} from '../../../../server/leadStatusMachine';

const UpdateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().max(320).optional(),
  company: z.string().max(200).optional().nullable(),
  status: z.string().optional(),
  dealValue: z.number().nonnegative().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requireOrg(request);
  if ('response' in ctx) return ctx.response;

  const leadId = params.id;

  // Verify the lead belongs to this org
  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.organizationId, ctx.orgId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = UpdateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // If status is being changed, validate the transition
  if (data.status && data.status !== existing.status) {
    if (!canTransition(existing.status as any, data.status as any)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${existing.status} to ${data.status}`,
          allowed: allowedTransitions(existing.status as any),
        },
        { status: 422 }
      );
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email;
  if (data.company !== undefined) updates.company = data.company ?? null;
  if (data.status !== undefined) updates.status = data.status;
  if (data.dealValue !== undefined)
    updates.dealValue = data.dealValue ? String(data.dealValue) : null;

  try {
    const [updated] = await db
      .update(leads)
      .set(updates)
      .where(eq(leads.id, leadId))
      .returning();

    // If status changed, write an audit row
    if (data.status && data.status !== existing.status) {
      await db.insert(auditEvents).values({
        organizationId: ctx.orgId,
        action: 'LEAD_STATUS_CHANGE',
        entity: 'LEAD',
        entityId: leadId,
        actor: ctx.userId,
        metadata: JSON.stringify({
          from: existing.status,
          to: data.status,
        }),
        createdAt: new Date(),
      });
    }

    return NextResponse.json({ data: updated, success: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}