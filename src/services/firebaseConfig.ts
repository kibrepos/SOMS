import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCpWTYsidx6NspFX18gxswg8WO7PW_aGkw",
  authDomain: "dlsud-soms.firebaseapp.com",
  projectId: "dlsud-soms",
  storageBucket: "dlsud-soms.appspot.com",
  messagingSenderId: "812441194712",
  appId: "1:812441194712:web:38f58165149af5d0c247ad",
  measurementId: "G-81V18QP214"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);