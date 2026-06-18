// Import Firebase SDKs for Service Workers (Compat version is required for SW)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Wahi same config jo humne firebase-init.js mein use ki thi
const firebaseConfig = {
    apiKey: "AIzaSyCKS7WnCGLmvmzUQhl4s8wzlyDgEW5fpN0",
    authDomain: "chat-app-f41b6.firebaseapp.com",
    projectId: "chat-app-f41b6",
    storageBucket: "chat-app-f41b6.firebasestorage.app",
    messagingSenderId: "1038348968275",
    appId: "1:1038348968275:web:d1048a111385e974d541a6"
};

// Initialize app in background
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background payload received: ', payload);
    
    const notificationTitle = payload.notification.title || 'New Message';
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'assets/images/default-avatar.svg', // UPDATED: Changed to .svg & made path relative
        badge: 'assets/images/default-avatar.svg', // UPDATED: Changed to .svg & made path relative
        vibrate: [200, 100, 200],
        data: {
            url: payload.data?.click_action || '/' // Click karne par app open ho
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification Click Handler (Background se app open karne ke liye)
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((windowClients) => {
            // Agar app already open hai toh us tab par focus karein
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Warna naya tab open karein
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});