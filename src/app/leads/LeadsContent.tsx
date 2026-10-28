'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { useRouter } from 'next/navigation';

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: string;
  createdAt: string;
}

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'REPLIED', label: 'Replied' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
  { value: 'DORMANT', label: 'Dormant' },
];

export function LeadsContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', status: 'NEW' });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }
    void fetchLeads();
  }, [isLoaded, isSignedIn]);

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setLeads(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingLead ? `/api/leads/${editingLead.id}` : '/api/leads';
      const method = editingLead ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error(editingLead ? 'Failed to update lead' : 'Failed to create lead');
      await fetchLeads();
      closeDialog();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openCreate() {
    setEditingLead(null);
    setFormData({ name: '', email: '', company: '', status: 'NEW' });
    setDialogOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setFormData({ name: lead.name, email: lead.email, company: lead.company || '', status: lead.status });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingLead(null);
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.company?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!isLoaded) return <div className="p-8 text-center text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Leads</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your pipeline</p>
        </div>
        <Button onClick={openCreate}>New Lead</Button>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-100 text-danger-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              }
            />
            <Select
              options={STATUSES}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 animate-pulse bg-neutral-100 rounded mx-4 my-2 border-b border-neutral-200 last:border-0" />
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title={search || statusFilter ? 'No leads match your filters' : 'No leads yet'}
              description={search || statusFilter ? 'Try adjusting your search or filters.' : 'Add your first lead to start building your pipeline.'}
              action={!search && !statusFilter ? <Button onClick={openCreate}>Create Lead</Button> : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lead</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Company</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Created</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center">
                            <span className="text-brand-600 font-semibold text-sm">{lead.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{lead.name}</p>
                            <p className="text-xs text-neutral-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-600">{lead.company || '—'}</td>
                      <td className="px-5 py-4">
                        <Badge variant={statusColor(lead.status)}>{lead.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-neutral-500">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => router.push(`/leads/${lead.id}`)}>View</Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(lead)}>Edit</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingLead ? 'Edit Lead' : 'New Lead'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} loading={loading}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <Input label="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
          <Select
            label="Status"
            options={STATUSES.slice(1)}
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
          />
        </form>
      </Dialog>
    </div>
  );
}

function statusColor(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' {
  switch (status) {
    case 'NEW': return 'brand';
    case 'CONTACTED': return 'info';
    case 'REPLIED': return 'warning';
    case 'QUALIFIED': return 'brand';
    case 'PROPOSAL': return 'info';
    case 'WON': return 'success';
    case 'LOST': return 'danger';
    case 'DORMANT': return 'neutral';
    default: return 'neutral';
  }
}