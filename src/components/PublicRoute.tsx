// src/components/PublicRoute.tsx
import React, { useEffect, useState, ReactNode } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { authStateListener } from '../services/auth';

interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authStateListener((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  if (loading) return <p>Loading...</p>;

  if (user) {
    // Redirect to the appropriate dashboard based on user role
    const redirectTo = user.role === 'admin' ? '/admin-dashboard' :
                        user.role === 'faculty' ? '/Faculty/dashboard' :
                        '/Student/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
