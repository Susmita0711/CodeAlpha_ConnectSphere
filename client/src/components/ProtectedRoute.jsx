import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="page-loading"><span className="spinner" /> Loading your workspace…</div>;
  return user ? children : <Navigate to="/login" replace />;
}
