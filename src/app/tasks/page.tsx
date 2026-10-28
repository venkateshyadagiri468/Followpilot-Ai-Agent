import { Protected } from '@/components/app-shell/Protected';
import { TasksContent } from './TasksContent';

export default function TasksPage() {
  return (
    <Protected>
      <TasksContent />
    </Protected>
  );
}