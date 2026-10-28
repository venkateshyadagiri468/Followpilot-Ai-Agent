'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  status: string;
  dealValue?: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  type: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

interface Task {
  id: string;
  type: string;
  dueDate: string;
  status: string;
}

interface Recommendation {
  id: string;
  action: string;
  rationale: string;
  confidence: number;
  status: string;
  draft?: { subject: string; body: string };
}

export function LeadDetailContent({ id }: { id: string }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'tasks' | 'recommendations'>('overview');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', status: 'NEW', dealValue: '' });

  useEffect(() => {
    async function fetchLead() {
      try {
        const [leadRes, actRes, taskRes, recRes] = await Promise.all([
          fetch(`/api/leads/${id}`, { credentials: 'include' }),
          fetch(`/api/leads/${id}/activities`, { credentials: 'include' }),
          fetch(`/api/tasks?leadId=${id}`, { credentials: 'include' }),
          fetch(`/api/recommendations?leadId=${id}`, { credentials: 'include' }),
        ]);
        if (leadRes.ok) setLead(await leadRes.json().then(d => d.data));
        if (actRes.ok) setActivities(await actRes.json().then(d => d.data));
        if (taskRes.ok) setTasks(await taskRes.json().then(d => d.data));
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecommendation(recData.data?.[0] || null);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    void fetchLead();
  }, [id]);

  function openEdit() {
    if (!lead) return;
    setFormData({ name: lead.name, email: lead.email, company: lead.company || '', status: lead.status, dealValue: lead.dealValue || '' });
    setEditing(true);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.data);
        setDialogOpen(false);
      }
    } catch {
      // error handling
    }
  }

  if (loading) return <div className="p-8 text-center text-neutral-500">Loading…</div>;
  if (!lead) return <EmptyState title="Lead not found" description="This lead may have been deleted." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <span className="text-brand-600 font-bold text-xl">{lead.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{lead.name}</h1>
              <p className="text-sm text-neutral-500">{lead.email} {lead.company && `· ${lead.company}`}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-neutral-500">Created {new Date(lead.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusColor(lead.status)} className="text-sm px-3 py-1">{lead.status}</Badge>
          <Button variant="secondary" onClick={openEdit}>Edit</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="recommendations">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Status" description="Current pipeline stage" />
              <CardContent>
                <p className="text-2xl font-bold text-neutral-900">{lead.status}</p>
                <p className="text-sm text-neutral-500 mt-1">Last updated {new Date(lead.updatedAt).toLocaleDateString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Deal Value" description="Estimated value" />
              <CardContent>
                <p className="text-2xl font-bold text-brand-600">{lead.dealValue ? `$${parseFloat(lead.dealValue).toLocaleString()}` : '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Contact" />
              <CardContent className="space-y-2">
                <p className="text-sm text-neutral-600"><span className="font-medium text-neutral-900">Email:</span> {lead.email}</p>
                <p className="text-sm text-neutral-600"><span className="font-medium text-neutral-900">Company:</span> {lead.company || '—'}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          {activities.length === 0 ? (
            <EmptyState title="No activity yet" description="Activity will appear here as you work with this lead." />
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="h-full w-0.5 bg-neutral-200 mt-1" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{formatActivityType(activity.type)}</p>
                    <p className="text-xs text-neutral-500">{new Date(activity.createdAt).toLocaleString()}</p>
                    {activity.meta && Object.keys(activity.meta).length > 0 && (
                      <pre className="mt-1 text-xs text-neutral-400 overflow-x-auto">{JSON.stringify(activity.meta, null, 2)}</pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks"
              description="Create follow-up tasks to stay on top of this lead."
              action={<Button size="sm" onClick={() => window.location.href = '/tasks'}>Create Task</Button>}
            />
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center">
                      <span className="text-brand-600 font-semibold text-xs">{task.type.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{task.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-neutral-500">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={task.status === 'COMPLETED' ? 'success' : task.status === 'OVERDUE' ? 'danger' : 'warning'}>
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendation ? (
            <Card>
              <CardHeader title="AI Recommendation" description="Generated from lead context" />
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50">
                  <Badge variant="brand">{recommendation.action}</Badge>
                  <span className="text-sm font-medium text-brand-700">{Math.round(recommendation.confidence * 100)}% confidence</span>
                </div>
                <p className="text-sm text-neutral-700">{recommendation.rationale}</p>
                {recommendation.draft && (
                  <div className="border-t border-neutral-200 pt-4 space-y-3">
                    <p className="text-sm font-medium text-neutral-900">Draft Email</p>
                    <p className="text-sm font-medium text-neutral-900">{recommendation.draft.subject}</p>
                    <p className="text-sm text-neutral-600 whitespace-pre-wrap">{recommendation.draft.body}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              title="No recommendation"
              description="Generate an AI recommendation from the lead actions."
              action={<Button size="sm" variant="secondary">Generate Recommendation</Button>}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? 'Edit Lead' : 'New Lead'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          <Input label="Company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
          <Input label="Deal Value" type="number" placeholder="0" value={formData.dealValue} onChange={(e) => setFormData({...formData, dealValue: e.target.value})} />
          <Select
            label="Status"
            options={[
              { value: 'NEW', label: 'New' },
              { value: 'CONTACTED', label: 'Contacted' },
              { value: 'REPLIED', label: 'Replied' },
              { value: 'QUALIFIED', label: 'Qualified' },
              { value: 'PROPOSAL', label: 'Proposal' },
              { value: 'WON', label: 'Won' },
              { value: 'LOST', label: 'Lost' },
              { value: 'DORMANT', label: 'Dormant' },
            ]}
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

function formatActivityType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}