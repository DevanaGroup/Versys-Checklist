// Import the functions you need from the SDKs you need
import { initializeApp, getApps, deleteApp } from "firebase/app";
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

// Force reinitialize Firebase
const existingApps = getApps();
if (existingApps.length > 0) {
  existingApps.forEach(app => deleteApp(app));
}

// Initialize Firebase with correct storage bucket
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Storage with correct domain
export const storage = getStorage(app);

console.log('🔧 Firebase Storage configurado:', storage.app.options.storageBucket);

export default app; 