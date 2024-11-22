// firebaseAdminConfig.ts
import admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';

// Ensure Firebase Admin SDK is initialized only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

// Export initialized Firebase Admin services
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();

// If you're using Firebase Functions within Admin SDK, you can export it like this:
export const functions = admin.app().functions();
