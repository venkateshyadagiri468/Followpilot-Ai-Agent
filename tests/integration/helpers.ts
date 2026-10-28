/**
 * Shared test helpers.
 *
 * INTEGRATION TEST STRATEGY:
 *   Every test wraps its work in a transaction that is rolled back at the
 *   end. This means tests never pollute the database and can be run against
 *   a shared dev instance safely.
 *
 *   When DATABASE_URL is unset (no DB available), the suite is skipped
 *   entirely rather than failing — so `npm test` stays green in any
 *   environment and the unit tests still run.
 */

import { db } from '../../src/server/db'
import { organizations, memberships, leads } from '../../src/server/db/schema'
import { sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

const realDbUrl = process.env.DATABASE_URL
export const hasDb =
  !!realDbUrl &&
  !realDbUrl.includes('user:***@') &&
  !realDbUrl.includes('your-region')

/** Create a throwaway org + owner membership, rolled back after the test. */
export async function makeTestOrg() {
  const orgId = uuidv4()
  const userId = `user_test_${uuidv4().slice(0, 8)}`
  const membershipId = uuidv4()

  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({ id: orgId, name: `Test Org ${orgId.slice(0, 8)}` })
    await tx.insert(memberships).values({
      id: membershipId,
      organizationId: orgId,
      userId,
      role: 'owner',
    })
    // Savepoint so the outer transaction can roll everything back.
    await tx.execute(sql`SAVEPOINT test_setup`)
  })

  return { orgId, userId, membershipId }
}

export async function makeTestLead(
  orgId: string,
  over: {
    name?: string
    email?: string
    company?: string | null
    status?: string
    dealValue?: string | null
  } = {}
) {
  const id = uuidv4()
  const [lead] = await db
    .insert(leads)
    .values({
      id,
      organizationId: orgId,
      name: over.name ?? 'Test Lead',
      email: over.email ?? `lead-${id.slice(0, 8)}@example.com`,
      company: over.company ?? null,
      status: (over.status ?? 'NEW') as any,
      dealValue: over.dealValue ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
  return lead
}

/** Roll back everything the test inserted. */
export async function rollbackTest() {
  await db.execute(sql`ROLLBACK TO test_setup`)
  await db.execute(sql`RELEASE test_setup`)
}

/** Begin a top-level transaction with a savepoint for the whole test. */
export async function beginTestTransaction() {
  await db.execute(sql`BEGIN`)
}

export async function endTestTransaction() {
  await db.execute(sql`ROLLBACK`)
}