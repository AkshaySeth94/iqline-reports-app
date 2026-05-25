import { redirect } from 'next/navigation';

/**
 * Root route — always redirects to /login. If the visitor is already
 * authenticated, /login's useAuth hook will bounce them onward to their
 * role's home (/super, /panel, or /dashboard).
 */
export default function RootRedirect() {
  redirect('/login');
}
