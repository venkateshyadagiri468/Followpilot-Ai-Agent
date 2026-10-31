'use client';

import { useState } from 'react';
import type { Lead } from '@/types/index';
import { statusColor, statusLabel } from '@/server/leadStatusMachine';

interface KanbanCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onRecommend: (lead: Lead) => void;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function formatCurrency(value: string | null): string {
  if (!value) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: num >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 0,
  }).format(num);
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function KanbanCard({
  lead,
  onEdit,
  onRecommend,
  onDragStart,
  onDragEnd,
  isDragging,
}: KanbanCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', lead.id);
        onDragStart(lead.id);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        group relative rounded-lg border bg-white p-3 shadow-sm
        transition-all duration-150 cursor-grab active:cursor-grabbing
        hover:shadow-md hover:border-neutral-300
        ${isDragging ? 'opacity-40 rotate-2 scale-95' : ''}
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {lead.name}
          </p>
          {lead.company && (
            <p className="text-xs text-neutral-500 truncate">{lead.company}</p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-2xs font-medium ${statusColor(
            lead.status as any
          )}`}
        >
          {statusLabel(lead.status as any)}
        </span>
      </div>

      {/* Deal value + last contact */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-600">
          {formatCurrency(lead.dealValue)}
        </span>
        <span className="text-2xs text-neutral-400">
          {timeAgo(lead.updatedAt)}
        </span>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-white/95 backdrop-blur-sm border border-neutral-200">
          <button
            type="button"
            onClick={() => onRecommend(lead)}
            disabled={lead.status === 'WON' || lead.status === 'LOST'}
            className="text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✦ AI Draft
          </button>
          <span className="text-neutral-200">|</span>
          <button
            type="button"
            onClick={() => onEdit(lead)}
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}