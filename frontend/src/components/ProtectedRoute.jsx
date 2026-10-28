import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, refreshUser } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (user) {
        if (!cancelled) setChecking(false);
        return;
      }
      await refreshUser();
      if (!cancelled) setChecking(false);
    }

    check();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return <div className="page-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}