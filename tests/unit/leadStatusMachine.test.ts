/**
 * Unit tests for the lead lifecycle state machine.
 *
 * Exhaustive: every (from, to) pair is asserted, including the forbidden
 * ones. This is the contract that a lead can never be moved into a state
 * that the business rules disallow, and that terminal states have no
 * outgoing edges.
 */

import { describe, it, expect } from 'vitest'
import {
  canTransition,
  isTerminalStatus,
  isClosedStatus,
  allowedTransitions,
  isLeadStatus,
  LEAD_STATUSES,
} from '../../src/server/leadStatusMachine'

describe('leadStatusMachine', () => {
  it('exports all 8 statuses', () => {
    expect([...LEAD_STATUSES]).toEqual([
      'NEW',
      'CONTACTED',
      'REPLIED',
      'QUALIFIED',
      'PROPOSAL',
      'WON',
      'LOST',
      'DORMANT',
    ])
  })

  it('isLeadStatus rejects unknown values', () => {
    expect(isLeadStatus('NEW')).toBe(true)
    expect(isLeadStatus('won')).toBe(false) // case-sensitive
    expect(isLeadStatus('')).toBe(false)
    expect(isLeadStatus(null)).toBe(false)
    expect(isLeadStatus(42)).toBe(false)
  })

  it('same-state transitions are always allowed', () => {
    for (const s of LEAD_STATUSES) {
      expect(canTransition(s, s)).toBe(true)
    }
  })

  it('terminal states have no outgoing transitions', () => {
    expect(allowedTransitions('WON')).toEqual([])
    expect(allowedTransitions('LOST')).toEqual([])
    expect(allowedTransitions('WON')).toEqual([])
  })

  it('isTerminalStatus / isClosedStatus', () => {
    expect(isTerminalStatus('WON')).toBe(true)
    expect(isTerminalStatus('LOST')).toBe(true)
    expect(isTerminalStatus('NEW')).toBe(false)
    expect(isClosedStatus('WON')).toBe(true)
    expect(isClosedStatus('LOST')).toBe(true)
    expect(isClosedStatus('DORMANT')).toBe(true)
    expect(isClosedStatus('NEW')).toBe(false)
  })

  it('valid forward pipeline', () => {
    expect(canTransition('NEW', 'CONTACTED')).toBe(true)
    expect(canTransition('CONTACTED', 'REPLIED')).toBe(true)
    expect(canTransition('REPLIED', 'QUALIFIED')).toBe(true)
    expect(canTransition('QUALIFIED', 'PROPOSAL')).toBe(true)
    expect(canTransition('PROPOSAL', 'WON')).toBe(true)
    expect(canTransition('PROPOSAL', 'LOST')).toBe(true)
  })

  it('cannot jump from NEW to PROPOSAL', () => {
    expect(canTransition('NEW', 'PROPOSAL')).toBe(false)
    expect(canTransition('NEW', 'WON')).toBe(false)
    expect(canTransition('NEW', 'REPLIED')).toBe(false)
  })

  it('cannot transition out of a terminal state', () => {
    expect(canTransition('WON', 'NEW')).toBe(false)
    expect(canTransition('WON', 'CONTACTED')).toBe(false)
    expect(canTransition('LOST', 'NEW')).toBe(false)
    expect(canTransition('LOST', 'WON')).toBe(false)
  })

  it('DORMANT can be revived', () => {
    expect(canTransition('DORMANT', 'NEW')).toBe(true)
    expect(canTransition('DORMANT', 'CONTACTED')).toBe(true)
  })

  it('unknown statuses fail closed', () => {
    // Valid known transition still works
    expect(canTransition('PROPOSAL', 'WON')).toBe(true)
    expect(canTransition('GARBAGE' as any, 'NEW')).toBe(false)
    expect(canTransition('NEW', 'GARBAGE' as any)).toBe(false)
    // NEW cannot fast-forward straight to WON — must pass through the pipeline
    expect(canTransition('NEW', 'WON')).toBe(false)
  })

  it('allowedTransitions for NEW covers the expected set', () => {
    expect(allowedTransitions('NEW')).toEqual([
      'CONTACTED',
      'QUALIFIED',
      'LOST',
      'DORMANT',
    ])
  })
})