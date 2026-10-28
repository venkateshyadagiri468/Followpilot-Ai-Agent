import { Protected } from '@/components/app-shell/Protected';
import { SettingsContent } from './SettingsContent';

export default function SettingsPage() {
  return (
    <Protected>
      <SettingsContent />
    </Protected>
  );
}