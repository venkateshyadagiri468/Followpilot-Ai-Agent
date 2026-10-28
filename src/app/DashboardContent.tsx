'use client';

import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: string;
  createdAt: string;
}

export function DashboardContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }
    void fetchLeads();
  }, [isLoaded, isSignedIn]);

  async function fetchLeads() {
    try {
      const orgRes = await fetch('/api/organizations/me', { credentials: 'include' });
      if (!orgRes.ok) throw new Error('Failed to fetch organization');
      const orgData = await orgRes.json();
      const orgId = orgData.data?.organization?.id;
      if (!orgId) throw new Error('No organization found');

      const leadsRes = await fetch('/api/leads', { credentials: 'include' });
      if (!leadsRes.ok) throw new Error('Failed to fetch leads');
      const leadsData = await leadsRes.json();
      setLeads(leadsData.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusCounts = leads.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalActive = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const activeStatuses = ['NEW', 'CONTACTED', 'REPLIED', 'QUALIFIED', 'PROPOSAL'];

  if (!isLoaded) return <div className="p-8 text-center text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">Next actions and pipeline overview</p>
      </header>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-100 text-danger-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Total Leads</p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">{leads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Active Pipeline</p>
            <p className="text-3xl font-bold text-brand-600 mt-1">{totalActive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Needs Follow-up</p>
            <p className="text-3xl font-bold text-warning-600 mt-1">
              {(statusCounts.REPLIED || 0) + (statusCounts.PROPOSAL || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Closed Won</p>
            <p className="text-3xl font-bold text-success-600 mt-1">{statusCounts.WON || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Next Actions */}
      <Card>
        <CardHeader title="Next Actions" description="Leads requiring your attention" />
        <CardContent className="p-5 pt-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-neutral-100 rounded-md" />
              ))}
            </div>
          ) : leads.filter(l => activeStatuses.includes(l.status)).length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="All caught up"
              description="No leads need immediate follow-up. Create a new lead to get started."
              action={<Button size="sm" onClick={() => window.location.href = '/leads'}>Create Lead</Button>}
            />
          ) : (
            <div className="space-y-3">
              {leads
                .filter(l => activeStatuses.includes(l.status))
                .slice(0, 5)
                .map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                        <span className="text-brand-600 font-semibold text-sm">
                          {lead.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{lead.name}</p>
                        <p className="text-xs text-neutral-500">{lead.company || lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor(lead.status)}>{lead.status}</Badge>
                      <Button size="sm" variant="secondary">View</Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card>
        <CardHeader
          title="Recent Leads"
          description={leads.length === 0 ? 'No leads yet' : undefined}
          action={
            <Button size="sm" onClick={() => window.location.href = '/leads'}>View All</Button>
          }
        />
        <CardContent className="p-5 pt-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-neutral-100 rounded-md" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="No leads yet"
              description="Add your first lead to start building your pipeline."
              action={<Button onClick={() => window.location.href = '/leads'}>Create Lead</Button>}
            />
          ) : (
            <div className="space-y-3">
              {leads.slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                      <span className="text-brand-600 font-semibold text-sm">
                        {lead.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{lead.name}</p>
                      <p className="text-xs text-neutral-500">{lead.company || lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor(lead.status)}>{lead.status}</Badge>
                    <Button size="sm" variant="ghost">View</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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