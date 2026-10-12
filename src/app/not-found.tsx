import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

/** Paths the middleware doesn't localise (e.g. `/foo.bar`): send them to the default locale's home. */
export default function RootNotFound() {
  redirect(`/${routing.defaultLocale}`);
}
