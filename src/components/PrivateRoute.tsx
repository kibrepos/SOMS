import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { authStateListener } from '../services/auth';

const PrivateRoute: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authStateListener((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading...</p>;

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
