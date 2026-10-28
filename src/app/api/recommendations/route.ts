/**
 * POST /api/v1/recommendations
 *
 * Request an AI follow-up recommendation for a lead.
 *
 * SECURITY: organizationId and requestedBy are NEVER taken from the request
 * body. Both come from the authenticated session via requireOrg(). The
 * recommendation service re-verifies membership as defense-in-depth, but
 * the route is the gate: a client-supplied orgId/userId is ignored.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { requireOrg } from '../../../server/auth'
import { recommendNextAction } from '../../../server/agents/recommendation-service'
import { auditFromContext, extractClientMeta } from '../../../server/audit'

export async function POST(request: NextRequest) {
  const ctx = await requireOrg(request)
  if ('response' in ctx) return ctx.response

  let body: { leadId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.leadId) {
    return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
  }

  try {
    const result = await recommendNextAction({
      organizationId: ctx.orgId,
      leadId: body.leadId,
      requestedBy: ctx.userId,
    })

    await auditFromContext(ctx, {
      action: 'RECOMMENDATION_GENERATE',
      entity: 'RECOMMENDATION',
      entityId: result.recommendationId,
      metadata: { leadId: body.leadId, action: result.action },
      ...extractClientMeta(request),
    })

    return NextResponse.json({ data: result, success: true })
  } catch (error: any) {
    console.error('Error generating recommendation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}