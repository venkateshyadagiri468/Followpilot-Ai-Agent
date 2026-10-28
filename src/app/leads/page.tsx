import { Protected } from '@/components/app-shell/Protected';
import { LeadsContent } from './LeadsContent';

export default function LeadsPage() {
  return (
    <Protected>
      <LeadsContent />
    </Protected>
  );
}