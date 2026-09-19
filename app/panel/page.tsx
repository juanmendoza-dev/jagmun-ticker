import { isDirector } from '@/lib/auth';
import Panel from './panel';

export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  // The real gate is in the route handlers; this just saves a director re-typing the
  // passcode every time they lock their phone.
  return <Panel authed={await isDirector()} />;
}
