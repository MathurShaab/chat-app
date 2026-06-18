import { db } from "./firebase-init.js";
import { doc, setDoc } from "firebase/firestore"; // updateDoc ki jagah setDoc use karenge
import { messaging } from "./firebase-init.js";
import { getToken, onMessage } from "firebase/messaging";

export const MessagingService = {
    async requestPermissionAndGetToken(userId) {
        try {
            if (!messaging) return;
            
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                const currentToken = await getToken(messaging, { 
                    vapidKey: "BFcYPtqen8CtLS0llB1Wde5vIHSD5L4wBRXTbQVQ8ipoSIGHwamHun_-Lx0fP1WNu7X31IjyXLUD6PuRtpQGUf4" // Aapki VAPID key yahan hogi
                });
                
                if (currentToken) {
                    // --- BULLETPROOF FIX HERE ---
                    // updateDoc ki jagah setDoc aur { merge: true } lagaya
                    // Isse agar user ka doc nahi bhi hoga, toh crash nahi hoga
                    const userRef = doc(db, "users", userId);
                    await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
                    console.log("🛰️ FCM Token synced successfully!");
                }
            }
        } catch (error) {
            console.error("FCM Token Generation Error:", error);
        }
    },
    
    listenForForegroundMessages() {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            console.log("Message received in foreground: ", payload);
            // Notification ka UI alert ya toast dikhane ka logic yahan aayega
            alert(`New Message: ${payload.notification.body}`);
        });
    }
};