'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';

interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

interface Membership {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  createdAt: string;
}

export function SettingsContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }
    async function fetchData() {
      try {
        const [orgRes, memRes] = await Promise.all([
          fetch('/api/organizations/me', { credentials: 'include' }),
          fetch('/api/organizations/me/members', { credentials: 'include' }),
        ]);
        if (orgRes.ok) {
          const data = await orgRes.json();
          setOrg(data.data?.organization || null);
        }
        if (memRes.ok) {
          const data = await memRes.json();
          setMemberships(data.data || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [isLoaded, isSignedIn]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/organizations/me/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: 'member' }),
      });
      if (res.ok) {
        setInviteEmail('');
        setDialogOpen(false);
        // refetch
        const memRes = await fetch('/api/organizations/me/members', { credentials: 'include' });
        if (memRes.ok) {
          const data = await memRes.json();
          setMemberships(data.data || []);
        }
      }
    } catch {
      // error handling
    }
  }

  if (!isLoaded) return <div className="p-8 text-center text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your organization and team</p>
      </header>

      {/* Organization */}
      <Card>
        <CardHeader title="Organization" description="Basic organization settings" />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50">
            <div>
              <p className="text-sm font-medium text-neutral-900">{org?.name || 'Unnamed Organization'}</p>
              <p className="text-xs text-neutral-500">ID: {org?.id || '—'}</p>
            </div>
            <Badge variant="brand">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader
          title="Team Members"
          description="Invite and manage team members"
          action={<Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>Invite Member</Button>}
        />
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse bg-neutral-100 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {memberships.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center">
                      <span className="text-brand-600 font-semibold text-xs">{member.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{member.name}</p>
                      <p className="text-xs text-neutral-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === 'owner' ? 'brand' : 'neutral'}>
                      {member.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setInviteEmail(''); }}
        title="Invite Team Member"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setDialogOpen(false); setInviteEmail(''); }}>Cancel</Button>
            <Button onClick={handleInvite} loading={loading}>Send Invite</Button>
          </>
        }
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
        </form>
      </Dialog>

      {/* Danger Zone */}
      <Card className="border-danger-200">
        <CardHeader title="Danger Zone" description="Irreversible actions" />
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-danger-600">Delete Organization</p>
              <p className="text-xs text-neutral-500 mt-1">Permanently delete this organization and all its data</p>
            </div>
            <Button variant="danger">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}