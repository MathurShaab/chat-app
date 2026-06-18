import { messaging, db } from "./firebase-init.js";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";

export const MessagingService = {
    async requestPermissionAndGetToken(userId) {
        try {
            if (!messaging) return;

            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                
                // 🔥 GITHUB PAGES SPECIAL FIX 🔥
                // Pehle active service worker ka registration nikalie
                const serviceWorkerRegistration = await navigator.serviceWorker.ready;
                
                // Ab getToken ko batayein ki isi sub-folder waale service worker ko use kare
                const currentToken = await getToken(messaging, { 
                    vapidKey: "BFcYPtqen8CtLS0llB1Wde5vIHSD5L4wBRXTbQVQ8ipoSIGHwamHun_-Lx0fP1WNu7X31IjyXLUD6PuRtpQGUf411",
                    serviceWorkerRegistration: serviceWorkerRegistration // Yeh line add ki hai
                });

                if (currentToken) {
                    const userRef = doc(db, "users", userId);
                    await setDoc(userRef, { fcmToken: currentToken }, { merge: true });
                    console.log("🛰️ FCM Token successfully synced on GitHub Pages!");
                } else {
                    console.log("No registration token available.");
                }
            }
        } catch (error) {
            console.error("FCM Token Generation Error on Mobile:", error);
        }
    },

    listenForForegroundMessages() {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            alert(`New Notification: ${payload.notification.title}\n${payload.notification.body}`);
        });
    }
};