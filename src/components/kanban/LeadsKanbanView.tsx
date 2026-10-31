'use client';

import { KanbanBoard } from './KanbanBoard';
import type { Lead } from '@/types/index';

interface LeadsKanbanViewProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onRecommend: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => Promise<void>;
}

export function LeadsKanbanView({
  leads,
  onEdit,
  onRecommend,
  onStatusChange,
}: LeadsKanbanViewProps) {
  return (
    <KanbanBoard
      leads={leads}
      onEdit={onEdit}
      onRecommend={onRecommend}
      onStatusChange={onStatusChange}
    />
  );
}