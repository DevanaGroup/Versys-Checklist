// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBfqnHWfO5cTSrHSdPRU2BrPGFZ6X53qiA",
  authDomain: "versys-4529f.firebaseapp.com",
  projectId: "versys-4529f",
  storageBucket: "versys-4529f.firebasestorage.app",
  messagingSenderId: "293747502592",
  appId: "1:293747502592:web:3abe13ef202f170b7732e5",
  measurementId: "G-PH7Y1LRK46"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 