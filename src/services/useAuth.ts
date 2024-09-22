// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { authStateListener } from './auth'; // Importing the listener from your auth service
import { firestore } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const getUserRoleFromFirestore = async (uid: string): Promise<'student' | 'faculty' | 'admin' | null> => {
    // Check students collection
    const studentDoc = await getDoc(doc(firestore, "students", uid));
    if (studentDoc.exists()) return 'student';
  
    // Check faculty collection
    const facultyDoc = await getDoc(doc(firestore, "faculty", uid));
    if (facultyDoc.exists()) return 'faculty';
  
    // Check admin collection
    const adminDoc = await getDoc(doc(firestore, "admin", uid));
    if (adminDoc.exists()) return 'admin';
  
    return null; // If no match found, return null
  };
  
  export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userType, setUserType] = useState<'student' | 'faculty' | 'admin' | null>(null);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
      const unsubscribe = authStateListener(async (user) => {
        if (user) {
          console.log("Logged-in User:", user);
          // Retrieve the role from Firestore based on the UID
          const role = await getUserRoleFromFirestore(user.uid);
          setIsAuthenticated(true);
          setUserType(role);
        } else {
          setIsAuthenticated(false);
          setUserType(null);
        }
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, []);
  
    return { isAuthenticated, userType, loading };
  };