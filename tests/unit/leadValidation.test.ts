/**
 * Unit tests for input validation schemas used by the API routes.
 * These run without a database — they are pure Zod assertions.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { isLeadStatus } from '../../src/server/leadStatusMachine'

const LeadCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  email: z.string().email('invalid email').max(320),
  company: z.string().max(200).optional().nullable(),
  status: z.string().refine(isLeadStatus, 'invalid status').default('NEW'),
  dealValue: z.number().nonnegative().optional().nullable(),
})

describe('LeadCreateSchema', () => {
  const valid = (over: Record<string, unknown> = {}) => ({
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    ...over,
  })

  it('accepts a minimal valid lead', () => {
    const r = LeadCreateSchema.safeParse(valid())
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.status).toBe('NEW')
  })

  it('rejects empty name', () => {
    const r = LeadCreateSchema.safeParse(valid({ name: '' }))
    expect(r.success).toBe(false)
    expect(r.error!.issues.some((i) => i.message.includes('name'))).toBe(true)
  })

  it('rejects invalid email', () => {
    const r = LeadCreateSchema.safeParse(valid({ email: 'not-an-email' }))
    expect(r.success).toBe(false)
  })

  it('rejects an unknown status', () => {
    const r = LeadCreateSchema.safeParse(valid({ status: 'BOGUS' }))
    expect(r.success).toBe(false)
  })

  it('accepts all real statuses', () => {
    for (const s of ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'DORMANT']) {
      expect(LeadCreateSchema.safeParse(valid({ status: s })).success).toBe(true)
    }
  })

  it('accepts optional company and dealValue', () => {
    const r = LeadCreateSchema.safeParse(valid({ company: 'Acme', dealValue: 5000 }))
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.company).toBe('Acme')
      expect(r.data.dealValue).toBe(5000)
    }
  })

  it('rejects negative dealValue', () => {
    const r = LeadCreateSchema.safeParse(valid({ dealValue: -100 }))
    expect(r.success).toBe(false)
  })

  it('trims nothing — caller is responsible', () => {
    // No .trim() in the schema; the route may trim, but the schema itself
    // enforces only the documented constraints.
    const r = LeadCreateSchema.safeParse(valid({ name: '  spaced  ' }))
    expect(r.success).toBe(true)
  })
})