// components/ProtectedOrgRoute.tsx
import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useParams, useNavigate } from 'react-router-dom'; // Use navigate for redirects
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../services/firebaseConfig';

interface UserRole {
  role: 'president' | 'officer' | 'member';
  id: string;
}

const ProtectedOrgRoute: React.FC<{ requiredRole?: 'president' | 'officer' | 'member' }> = ({
  requiredRole,
}) => {
  const { organizationName } = useParams(); // Get the org name from the URL
  const [loading, setLoading] = useState(true); // Track loading state
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false); // Track if user is authorized
  const [userRole, setUserRole] = useState<UserRole | null>(null); // Track the user's role
  const auth = getAuth();
  const navigate = useNavigate(); // Use navigate for redirects

  useEffect(() => {
    const checkAccess = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsAuthorized(false); // User not logged in
        setLoading(false);
        navigate('/login'); // Redirect to login if not authenticated
        return;
      }

      try {
        const orgDoc = await getDoc(doc(firestore, 'organizations', organizationName!));
        if (!orgDoc.exists()) {
          setIsAuthorized(false); // Organization does not exist
          setLoading(false);
          navigate('/Student/dashboard'); // Redirect if org doesn't exist
          return;
        }

        const data = orgDoc.data();
        const { status, president, officers = [], members = [] } = data;

        // Check if the organization is archived
        if (status === 'archived') {
          setLoading(false);
          navigate('/Student/dashboard', { replace: true }); // Redirect to Student Dashboard
          return;
        }

        // Determine the user's role in the organization
        let role: UserRole | null = null;
        if (user.uid === president.id) {
          role = { role: 'president', id: user.uid };
        } else if (officers.some((officer: any) => officer.id === user.uid)) {
          role = { role: 'officer', id: user.uid };
        } else if (members.some((member: any) => member.id === user.uid)) {
          role = { role: 'member', id: user.uid };
        }

        // If the user doesn't belong to the organization, deny access
        if (!role) {
          setIsAuthorized(false);
          setLoading(false);
          navigate('/Student/dashboard', { replace: true }); // Redirect if not a member
          return;
        }

        // Store the user's role
        setUserRole(role);

        // Check if the user's role matches the required role for the route
        if (requiredRole && role.role !== requiredRole) {
          setIsAuthorized(false); // User doesn't have the correct role
        } else {
          setIsAuthorized(true); // User is authorized
        }
      } catch (error) {
        console.error('Error checking role or membership:', error);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [auth, organizationName, requiredRole, navigate]);

  if (loading) return <div>Loading...</div>; // Show a loader while checking

  // Redirect unauthorized users to the Student Dashboard
  return isAuthorized ? <Outlet /> : <Navigate to="/Student/dashboard" replace />;
};

export default ProtectedOrgRoute;
