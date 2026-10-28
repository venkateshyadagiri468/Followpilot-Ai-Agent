/**
 * Server-side authentication & authorization guard.
 *
 * THE RULE THIS FILE ENFORCES:
 *   The organization and the acting user are ALWAYS derived from the
 *   authenticated Clerk session. They are NEVER taken from request bodies
 *   or query strings. A client that sends `organizationId` or `userId` is
 *   ignored; the server decides both.
 *
 * Every route that touches tenant data must call requireOrg() and use the
 * returned { orgId, userId, role } for every query.
 */

import { getAuth } from '@clerk/nextjs/server'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { db } from './db'
import { organizations, memberships } from './db/schema'
import { eq, and } from 'drizzle-orm'

export type AuthContext = {
  userId: string
  orgId: string
  membershipId: string
  role: string
}

export type AuthError = { response: NextResponse }

/** Reject if there is no signed-in Clerk user. */
export async function requireUser(
  req: NextRequest
): Promise<AuthContext | AuthError> {
  const { userId } = getAuth(req)
  if (!userId) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { userId } as AuthContext
}

/**
 * Require the user to belong to an organization.
 *
 * `orgId` may be passed explicitly (e.g. from a URL param) but it is always
 * verified against the current user's membership — never trusted.
 * If omitted, the user's own org is used.
 */
export async function requireOrg(
  req: NextRequest,
  explicitOrgId?: string | null
): Promise<AuthContext | AuthError> {
  const user = await requireUser(req)
  if ('response' in user) return user

  let orgId = explicitOrgId ?? undefined

  if (orgId) {
    // Verify the user is a member of the requested org.
    const m = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, orgId),
          eq(memberships.userId, user.userId)
        )
      )
      .limit(1)

    if (!m.length) {
      return {
        response: NextResponse.json(
          { error: 'Organization not found or access denied' },
          { status: 404 }
        ),
      }
    }
    return {
      userId: user.userId,
      orgId,
      membershipId: m[0].id,
      role: m[0].role,
    }
  }

  // Fall back to the user's own organization.
  const m = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.userId))
    .limit(1)

  if (!m.length) {
    return {
      response: NextResponse.json(
        { error: 'No organization found for user' },
        { status: 404 }
      ),
    }
  }
  return {
    userId: user.userId,
    orgId: m[0].organizationId,
    membershipId: m[0].id,
    role: m[0].role,
  }
}

/** Owner-only actions. */
export function requireOwner(ctx: AuthContext): AuthError | null {
  if (ctx.role !== 'owner') {
    return {
      response: NextResponse.json(
        { error: 'Forbidden: owner role required' },
        { status: 403 }
      ),
    }
  }
  return null
}

/**
 * Bootstrap an organization for a brand-new user.
 * Idempotent: safe to call on every sign-in. Returns the existing membership
 * if one already exists, otherwise creates org + membership(owner).
 */
export async function ensureOrgForUser(
  userId: string,
  name?: string | null
): Promise<AuthContext> {
  const existing = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1)

  if (existing.length) {
    return {
      userId,
      orgId: existing[0].organizationId,
      membershipId: existing[0].id,
      role: existing[0].role,
    }
  }

  const orgId = crypto.randomUUID()
  const membershipId = crypto.randomUUID()
  const orgName =
    name?.trim() || `${(userId.split('_')[0] || 'User').replace(/[^a-zA-Z0-9]/g, '')}'s Workspace`

  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({ id: orgId, name: orgName })
    await tx.insert(memberships).values({
      id: membershipId,
      organizationId: orgId,
      userId,
      role: 'owner',
    })
  })

  return { userId, orgId, membershipId, role: 'owner' }
}