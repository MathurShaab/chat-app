import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyCKS7WnCGLmvmzUQhl4s8wzlyDgEW5fpN0",
    authDomain: "chat-app-f41b6.firebaseapp.com",
    projectId: "chat-app-f41b6",
    storageBucket: "chat-app-f41b6.firebasestorage.app",
    messagingSenderId: "1038348968275",
    appId: "1:1038348968275:web:d1048a111385e974d541a6",
    measurementId: "G-HSB3QF0902"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- FREEZE BYPASS CODE HERE ---
// Top-level await hata kar isko background promise mein daal diya
export let messaging = null;
isSupported().then(supported => {
    if (supported) {
        messaging = getMessaging(app);
    }
}).catch(err => console.log("Push notifications not supported on this node:", err));