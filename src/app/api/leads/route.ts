/**
 * GET  /api/v1/leads?status=&name=&limit=&offset=
 * POST /api/v1/leads  { name, email, company?, status?, dealValue? }
 *
 * SECURITY: organizationId is NEVER accepted from the client. It is derived
 * server-side from the authenticated user's membership via requireOrg().
 * A client-supplied organizationId is silently ignored — this is what makes
 * cross-tenant access impossible.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { db } from '../../../server/db'
import { leads, activities } from '../../../server/db/schema'
import { eq, and, desc, count, ilike } from 'drizzle-orm'
import { z } from 'zod'
import { requireOrg } from '../../../server/auth'
import { auditFromContext, extractClientMeta } from '../../../server/audit'
import { isLeadStatus, canTransition } from '../../../server/leadStatusMachine'

const LeadCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  email: z.string().email('invalid email').max(320),
  company: z.string().max(200).optional().nullable(),
  status: z.string().refine(isLeadStatus, 'invalid status').default('NEW'),
  dealValue: z.number().nonnegative().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const ctx = await requireOrg(request)
  if ('response' in ctx) return ctx.response

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const name = searchParams.get('name')?.trim()
    const company = searchParams.get('company')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conditions = [eq(leads.organizationId, ctx.orgId)]

    if (status) {
      if (!isLeadStatus(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      conditions.push(eq(leads.status, status as any))
    }
    // Case-insensitive search across name and company — the old code used
    // exact eq(), which silently returned nothing for partial matches.
    if (name) conditions.push(ilike(leads.name, `%${name}%`))
    if (company) conditions.push(ilike(leads.company, `%${company}%`))

    const where = and(...conditions)

    const [allLeads, totalResult] = await Promise.all([
      db
        .select()
        .from(leads)
        .where(where)
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(leads).where(where),
    ])

    const totalCount = Number(totalResult[0]?.count || 0)

    return NextResponse.json({
      data: allLeads,
      totalCount,
      hasMore: offset + limit < totalCount,
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireOrg(request)
  if ('response' in ctx) return ctx.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = LeadCreateSchema.safeParse(body)
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
    )
  }
  const data = parsed.data

  // Reject an explicitly invalid status transition from NEW.
  if (data.status !== 'NEW' && !canTransition('NEW', data.status)) {
    return NextResponse.json(
      {
        error: `Invalid status transition from NEW to ${data.status}`,
        allowed: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'DORMANT'],
      },
      { status: 422 }
    )
  }

  try {
    // Duplicate detection is scoped to THIS organization only.
    const existingLead = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.organizationId, ctx.orgId),
          eq(leads.email, data.email)
        )
      )
      .limit(1)

    if (existingLead.length) {
      return NextResponse.json(
        {
          error: 'A lead with this email already exists in your workspace.',
          existingLeadId: existingLead[0].id,
        },
        { status: 409 }
      )
    }

    const now = new Date()
    const [newLead] = await db
      .insert(leads)
      .values({
        organizationId: ctx.orgId,
        name: data.name,
        email: data.email,
        company: data.company ?? null,
        status: data.status,
        dealValue: data.dealValue ? String(data.dealValue) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // Activity + audit in the same transaction so the timeline and the audit
    // trail can never disagree.
    await db.transaction(async (tx) => {
      await tx.insert(activities).values({
        leadId: newLead.id,
        type: 'FOLLOW_UP_CREATED',
        actor: ctx.userId,
        metadata: JSON.stringify({ source: 'lead_create' }),
        createdAt: now,
      })
      await auditFromContext(ctx, {
        action: 'LEAD_CREATE',
        entity: 'LEAD',
        entityId: newLead.id,
        metadata: { name: data.name, email: data.email, status: data.status },
        ...extractClientMeta(request),
      })
    })

    return NextResponse.json({ data: newLead, success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}