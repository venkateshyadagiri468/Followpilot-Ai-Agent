'use client';

import { useState } from 'react';
import { KanbanCard } from './KanbanCard';
import type { Lead } from '@/types/index';
import { statusColor, statusLabel } from '@/server/leadStatusMachine';

interface KanbanColumnProps {
  status: string;
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onRecommend: (lead: Lead) => void;
  onDrop: (leadId: string, newStatus: string) => void;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  draggingId: string | null;
  wipLimit?: number;
}

export function KanbanColumn({
  status,
  leads,
  onEdit,
  onRecommend,
  onDrop,
  onDragStart,
  onDragEnd,
  draggingId,
  wipLimit,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear when leaving the column entirely (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) onDrop(leadId, status);
  }

  const isWipExceeded = wipLimit !== undefined && leads.length > wipLimit;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col rounded-xl border bg-neutral-50/60
        transition-colors duration-150 min-h-[200px]
        ${isOver ? 'border-brand-400 bg-brand-50/40' : 'border-neutral-200'}
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${statusColor(status as any)}`}
          >
            {statusLabel(status as any)}
          </span>
          <span className="text-2xs font-medium text-neutral-400">
            {leads.length}
          </span>
        </div>
        {wipLimit !== undefined && (
          <span
            className={`text-2xs font-medium ${
              isWipExceeded ? 'text-danger-500' : 'text-neutral-400'
            }`}
            title="Work-in-progress limit"
          >
            {leads.length}/{wipLimit}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 p-2.5">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onEdit={onEdit}
            onRecommend={onRecommend}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingId === lead.id}
          />
        ))}

        {leads.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-neutral-400">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}