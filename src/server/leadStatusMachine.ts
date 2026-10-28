/**
 * Lead lifecycle state machine.
 *
 * Pure, side-effect-free function. Every status transition is validated
 * here and only here; routes call canTransition() before writing. Terminal
 * states (WON / LOST / DORMANT) reject further transitions so a closed deal
 * can never be accidentally reopened.
 *
 * Side effects (writing an activity, updating lastContactAt) are the route's
 * responsibility — this module only decides what is ALLOWED.
 */

export const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'REPLIED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
  'DORMANT',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

/**
 * Allowed transitions. A missing key means the transition is forbidden.
 * Terminal states intentionally have no outgoing edges.
 */
const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'QUALIFIED', 'LOST', 'DORMANT'],
  CONTACTED: ['REPLIED', 'QUALIFIED', 'PROPOSAL', 'LOST', 'DORMANT'],
  REPLIED: ['QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'DORMANT'],
  QUALIFIED: ['PROPOSAL', 'WON', 'LOST', 'DORMANT'],
  PROPOSAL: ['WON', 'LOST', 'DORMANT'],
  WON: [],
  LOST: [],
  DORMANT: ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'PROPOSAL'],
}

export function isTerminalStatus(status: LeadStatus): boolean {
  return status === 'WON' || status === 'LOST'
}

export function isClosedStatus(status: LeadStatus): boolean {
  return status === 'WON' || status === 'LOST' || status === 'DORMANT'
}

/**
 * Whether a transition is permitted. Unknown statuses are rejected rather
 * than assumed valid — fail closed on bad data.
 */
export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (!isLeadStatus(from) || !isLeadStatus(to)) return false
  if (from === to) return true
  return TRANSITIONS[from].includes(to)
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value)
}

export function allowedTransitions(from: LeadStatus): LeadStatus[] {
  if (!isLeadStatus(from)) return []
  return TRANSITIONS[from]
}

/** Human-readable label for a status. */
export function statusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    REPLIED: 'Replied',
    QUALIFIED: 'Qualified',
    PROPOSAL: 'Proposal',
    WON: 'Won',
    LOST: 'Lost',
    DORMANT: 'Dormant',
  }
  return labels[status] ?? status
}

export function statusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    NEW: 'bg-slate-100 text-slate-700',
    CONTACTED: 'bg-blue-100 text-blue-700',
    REPLIED: 'bg-emerald-100 text-emerald-700',
    QUALIFIED: 'bg-violet-100 text-violet-700',
    PROPOSAL: 'bg-amber-100 text-amber-700',
    WON: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-700',
    DORMANT: 'bg-gray-100 text-gray-600',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-600'
}