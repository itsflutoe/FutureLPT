import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from './ui/Spinner';

export function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  // Wait for session resolution
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admin routes: wait until profile is loaded before deciding access.
  // Previously profile was still null on hard refresh → false redirect to /dashboard.
  if (adminOnly) {
    if (profileLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      );
    }
    if (profile?.role !== 'ADMIN') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
