/**
 * GET /api/v1/organizations/me
 *
 * Returns the current user's organization and membership.
 *
 * NEW BEHAVIOR: if the user has no membership yet, one is created on the fly
 * (organization + owner membership) in a single transaction. This replaces
 * the old seed-based flow that hardcoded `user_test_123` and left real
 * Clerk users stranded on "No organization found".
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { ensureOrgForUser } from '../../../../server/auth'
import { auditFromContext, extractClientMeta } from '../../../../server/audit'

export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Bootstrap on first sign-in — idempotent, safe to call every time.
    const ctx = await ensureOrgForUser(userId)

    await auditFromContext(
      { userId, orgId: ctx.orgId, membershipId: ctx.membershipId, role: ctx.role },
      { action: 'USER_SIGN_IN', entity: 'USER', entityId: userId, ...extractClientMeta(request) }
    )

    return NextResponse.json({
      data: {
        organization: { id: ctx.orgId },
        membership: {
          id: ctx.membershipId,
          organizationId: ctx.orgId,
          userId,
          role: ctx.role,
        },
      },
    })
  } catch (error: any) {
    console.error('Error fetching organization:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}