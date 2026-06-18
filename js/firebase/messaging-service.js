import { messaging, db } from "./firebase-init.js";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";

export const MessagingService = {
    async requestPermissionAndGetToken(userId) {
        try {
            if (!messaging) return;

            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                
                // 🔥 DYNAMIC PATH FOR GITHUB PAGES SUB-FOLDER 🔥
                const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                const swPath = `${basePath}firebase-messaging-sw.js`;
                
                console.log(`🛰️ Fetching Service Worker from: ${swPath}`);
                
                // Explicitly sub-folder ke scope par register karke instance nikalie
                const registration = await navigator.serviceWorker.register(swPath, { scope: basePath });
                
                // SECURITY CHECK: Wait karein jab tak service worker poori tarah ready na ho jaye
                await navigator.serviceWorker.ready; 

                console.log("🛰️ Requesting FCM Token from Firebase...");
                const currentToken = await getToken(messaging, { 
                    vapidKey: "BFcYPtqen8CtLS0llB1Wde5vIHSD5L4wBRXTbQVQ8ipoSIGHwamHun_-Lx0fP1WNu7X31IjyXLUD6PuRtpQGUf4",
                    serviceWorkerRegistration: registration // Yeh fresh aur tight instance pass kiya
                });

                if (currentToken) {
                    const userRef = doc(db, "users", userId);
                    await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
                    console.log("🛰️ FCM Token successfully synced in Sub-folder!");
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