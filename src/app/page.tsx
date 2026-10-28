import { Protected } from '@/components/app-shell/Protected';
import { DashboardContent } from './DashboardContent';

export default function Page() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}