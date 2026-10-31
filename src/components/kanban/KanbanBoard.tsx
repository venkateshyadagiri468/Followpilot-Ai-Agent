'use client';

import { useState, useCallback } from 'react';
import { KanbanColumn } from './KanbanColumn';
import type { Lead } from '@/types/index';
import { canTransition } from '@/server/leadStatusMachine';

const COLUMNS = [
  'NEW',
  'CONTACTED',
  'REPLIED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
  'DORMANT',
];

// WIP limits — configurable per org in the future
const WIP_LIMITS: Partial<Record<string, number>> = {
  PROPOSAL: 15,
};

interface KanbanBoardProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onRecommend: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
}

export function KanbanBoard({
  leads,
  onEdit,
  onRecommend,
  onStatusChange,
}: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{
    leadId: string;
    newStatus: string;
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleDragStart = useCallback((leadId: string) => {
    setDraggingId(leadId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleDrop = useCallback(
    (leadId: string, newStatus: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      // No-op if same status
      if (lead.status === newStatus) {
        setDraggingId(null);
        return;
      }

      // Validate transition
      if (!canTransition(lead.status as any, newStatus as any)) {
        setDraggingId(null);
        return;
      }

      setPendingTransition({ leadId, newStatus });
    },
    [leads]
  );

  const confirmTransition = async () => {
    if (!pendingTransition) return;
    setIsTransitioning(true);
    try {
      await onStatusChange(pendingTransition.leadId, pendingTransition.newStatus);
    } finally {
      setPendingTransition(null);
      setIsTransitioning(false);
      setDraggingId(null);
    }
  };

  const cancelTransition = () => {
    setPendingTransition(null);
    setDraggingId(null);
  };

  const pendingLead = pendingTransition
    ? leads.find((l) => l.id === pendingTransition.leadId)
    : null;

  // Group leads by status
  const byStatus = COLUMNS.reduce(
    (acc, status) => {
      acc[status] = leads.filter((l) => l.status === status);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  return (
    <div className="space-y-4">
      {/* Board grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={byStatus[status]}
            onEdit={onEdit}
            onRecommend={onRecommend}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            draggingId={draggingId}
            wipLimit={WIP_LIMITS[status]}
          />
        ))}
      </div>

      {/* Transition confirmation dialog */}
      {pendingTransition && pendingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            onClick={cancelTransition}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl border border-neutral-200 p-5">
            <h3 className="text-lg font-semibold text-neutral-900">
              Move lead?
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Move <span className="font-medium text-neutral-900">{pendingLead.name}</span> from{' '}
              <span className="font-medium">{pendingLead.status}</span> to{' '}
              <span className="font-medium">{pendingTransition.newStatus}</span>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelTransition}
                className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTransition}
                disabled={isTransitioning}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-700 rounded-lg hover:bg-brand-800 disabled:opacity-50"
              >
                {isTransitioning ? 'Moving…' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}