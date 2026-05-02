import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { isNativePlatform } from '../utils/platform';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    return <Navigate to={isNativePlatform() ? '/auth' : '/welcome'} replace />;
  }
  return <>{children}</>;
}
