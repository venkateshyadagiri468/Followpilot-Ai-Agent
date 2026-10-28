import { Protected } from '@/components/app-shell/Protected';
import { LeadDetailContent } from './LeadDetailContent';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  return (
    <Protected>
      <LeadDetailContent id={params.id} />
    </Protected>
  );
}