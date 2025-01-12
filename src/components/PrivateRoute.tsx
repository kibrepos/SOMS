import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { auth, firestore } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { authStateListener } from '../services/auth';

interface PrivateRouteProps {
  requiredRoles: Array<'student' | 'faculty' | 'admin'>; // Allow multiple roles
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ requiredRoles }) => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: number; message: string } | null>(null);

  useEffect(() => {
    const unsubscribe = authStateListener((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user role based on UID
        fetchUserRole(currentUser.uid);
      } else {
        window.location.href = '/login'; // Redirect to the login page
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserRole = async (uid: string) => {
    try {
      let userDoc = await getDoc(doc(firestore, 'students', uid));
      if (userDoc.exists()) {
        setUserRole('student');
      } else {
        userDoc = await getDoc(doc(firestore, 'faculty', uid));
        if (userDoc.exists()) {
          setUserRole('faculty');
        } else {
          userDoc = await getDoc(doc(firestore, 'admin', uid));
          if (userDoc.exists()) {
            setUserRole('admin');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user role: ', error);
      setError({ code: 500, message: 'An error occurred while checking your access.' });
    }
    setLoading(false);
  };

  if (loading) return <p>Loading...</p>;

  // Display error if the user is not logged in or has the wrong role
  if (error || (userRole && !requiredRoles.includes(userRole as 'student' | 'faculty' | 'admin'))) {
    const errorCode = error?.code || 403;
    const errorMessage =
      error?.message || `You are not authorized to access this page.`;

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '3rem', color: '#D9534F' }}>{errorCode} - Forbidden</h1>
        <p style={{ fontSize: '1.2rem', color: '#6C757D' }}>{errorMessage}</p>
        <button
          onClick={() => window.history.back()}
          style={{
            textDecoration: 'none',
            backgroundColor: '#007BFF',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
            marginTop: '20px',
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default PrivateRoute;
