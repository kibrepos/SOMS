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
export const adminAuth = admin.auth(); // For Firebase Authentication management
export const adminFirestore = admin.firestore(); // For Firestore access
