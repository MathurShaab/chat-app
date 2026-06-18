import { messaging, db } from "./firebase-init.js";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";

export const MessagingService = {
    async requestPermissionAndGetToken(userId) {
        try {
            if (!messaging) return;

            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                
                console.log("🛰️ Registering sub-folder Service Worker for GitHub Pages...");
                
                // 🔥 THE FIX: Direct path se fresh registration object nikaal rahe hain
                // Isse Firebase main root par bhagna band kar dega
                const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
                
                console.log("🛰️ Requesting FCM Token with custom registration instance...");
                const currentToken = await getToken(messaging, { 
                    vapidKey: "BFcYPtqen8CtLS0llB1Wde5vIHSD5L4wBRXTbQVQ8ipoSIGHwamHun_-Lx0fP1WNu7X31IjyXLUD6PuRtpQGUf411",
                    serviceWorkerRegistration: registration // Fresh instance pass kiya
                });

                if (currentToken) {
                    const userRef = doc(db, "users", userId);
                    await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
                    console.log("🛰️ FCM Token successfully synced on GitHub Pages!");
                } else {
                    console.log("No registration token available.");
                }
            } else {
                console.log("Notification permission denied.");
            }
        } catch (error) {
            console.error("FCM Token Generation Error:", error);
        }
    },

    listenForForegroundMessages() {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            console.log("🛰️ Message received in foreground: ", payload);
            alert(`New Notification: ${payload.notification.title}\n${payload.notification.body}`);
        });
    }
};