// src/services/auth.ts
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';

export const authStateListener = (callback: (user: any | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Existing code
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

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
