import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { isNativePlatform } from './utils/platform';

/**
 * Root redirect: signed in → /app, signed out → /welcome (web) or /auth (native).
 * Also handles ?logout=1 from the Chrome extension to sign the user out.
 */
export function RootRedirect() {
  const { user, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const logoutRequested = searchParams.get('logout') === '1';

  useEffect(() => {
    if (logoutRequested && user) {
      signOut().catch((err) => console.error('Logout from query param failed:', err));
    }
  }, [logoutRequested, user, signOut]);

  if (loading) return null;
  if (logoutRequested) return null;

  if (user) return <Navigate to="/app" replace />;
  return <Navigate to={isNativePlatform() ? '/auth' : '/welcome'} replace />;
}
