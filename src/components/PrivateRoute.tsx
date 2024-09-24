import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { auth, firestore } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { authStateListener } from '../services/auth';

interface PrivateRouteProps {
  requiredRole: 'student' | 'faculty' | 'admin';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRole }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // User role state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authStateListener((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user role based on UID
        fetchUserRole(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserRole = async (uid: string) => {
    try {
      // Check if the user is a student
      let userDoc = await getDoc(doc(firestore, 'students', uid));
      if (userDoc.exists()) {
        setUserRole('student');
      } else {
        // Check if the user is faculty
        userDoc = await getDoc(doc(firestore, 'faculty', uid));
        if (userDoc.exists()) {
          setUserRole('faculty');
        } else {
          // Check if the user is an admin
          userDoc = await getDoc(doc(firestore, 'admin', uid));
          if (userDoc.exists()) {
            setUserRole('admin');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user role: ', error);
    }
    setLoading(false);
  };

  if (loading) return <p>Loading...</p>;

  // Redirect if user is not logged in or role doesn't match
  if (!user || userRole !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // If the user has the correct role, render the requested page
};

export default PrivateRoute;
