import React, { useEffect, useState } from 'react'; // Import useState
import { onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, signOut, getAuth } from 'firebase/auth';
import { firestore } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const auth = getAuth();

export const authStateListener = (callback: (user: any | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

const getUserRoleFromFirestore = async (uid: string): Promise<'student' | 'faculty' | 'admin' | null> => {
  const studentDoc = await getDoc(doc(firestore, "students", uid));
  if (studentDoc.exists()) return 'student';

  const facultyDoc = await getDoc(doc(firestore, "faculty", uid));
  if (facultyDoc.exists()) return 'faculty';

  const adminDoc = await getDoc(doc(firestore, "admin", uid));
  if (adminDoc.exists()) return 'admin';

  return null; // If no match found, return null
};

export const signupWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Error during signup:", error);
    throw error;
  }
};

export const signUserOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState<'student' | 'faculty' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authStateListener(async (user) => {
      if (user) {
        console.log("Logged-in User:", user);
        
        if (!user.emailVerified) {
          await signUserOut(); // Sign out if not verified
          setIsAuthenticated(false);
          setUserType(null);
          setLoading(false);
          return;
        }

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
