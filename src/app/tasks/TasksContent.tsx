'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Task {
  id: string;
  leadId: string;
  leadName: string;
  type: string;
  dueDate: string;
  status: string;
  createdAt: string;
}

export function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await fetch('/api/tasks/next-actions', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTasks(data.data || []);
        }
      } catch {
        // silent — empty state
      } finally {
        setLoading(false);
      }
    }
    void fetchTasks();
  }, []);

  const now = new Date();
  const overdue = tasks.filter(t => new Date(t.dueDate) < now && t.status === 'PENDING');
  const upcoming = tasks.filter(t => new Date(t.dueDate) >= now && t.status === 'PENDING');
  const completed = tasks.filter(t => t.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Tasks</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your follow-up schedule</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Overdue</p>
            <p className="text-3xl font-bold text-danger-600 mt-1">{overdue.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Upcoming</p>
            <p className="text-3xl font-bold text-warning-600 mt-1">{upcoming.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-neutral-500">Completed</p>
            <p className="text-3xl font-bold text-success-600 mt-1">{completed.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Next Actions" description="Tasks requiring your attention" />
        <CardContent className="p-5 pt-0">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse bg-neutral-100 rounded-md" />
              ))}
            </div>
          ) : overdue.length === 0 && upcoming.length === 0 ? (
            <EmptyState
              icon={
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              title="All caught up"
              description="No tasks are due. Create a follow-up task from a lead to get started."
            />
          ) : (
            <div className="space-y-3">
              {[...overdue, ...upcoming].map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      new Date(task.dueDate) < now ? 'bg-danger-50' : 'bg-brand-50'
                    }`}>
                      <span className={`font-semibold text-sm ${
                        new Date(task.dueDate) < now ? 'text-danger-600' : 'text-brand-600'
                      }`}>
                        {task.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{task.type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-neutral-500">Lead: {task.leadName} · Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={new Date(task.dueDate) < now ? 'danger' : 'warning'}>{new Date(task.dueDate) < now ? 'Overdue' : 'Due'}</Badge>
                    <Button size="sm" variant="ghost">Complete</Button>
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