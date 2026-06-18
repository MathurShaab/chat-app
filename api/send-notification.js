const admin = require('firebase-admin');

// Firebase Admin initialization
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    // 🔥 STEP 1: CORS HEADERS ADD KIYE (Security Guard ko pass dena)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Yeh har origin (GitHub Pages) ko allow karega
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 🔥 STEP 2: BROWSER KE PREFLIGHT (OPTIONS) REQUEST KO HANDLE KARNA
    // Browser asal data bhejne se pehle ek 'OPTIONS' request bhejkar check karta hai
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Sirf POST requests allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { receiverId, senderId, senderName, text } = req.body;

    if (!receiverId || !senderId) {
        return res.status(400).json({ error: 'Missing critical parameters' });
    }

    try {
        // 1. Recipient User ka FCM Token database se nikalein
        const userDoc = await db.collection('users').doc(receiverId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Receiver not found' });
        }

        const fcmToken = userDoc.data().fcmToken;

        // 2. Agar token mil gaya, toh push notification fire karein
        if (fcmToken) {
            const payload = {
                notification: {
                    title: senderName || 'New Message',
                    body: text || 'Sent a file',
                },
                data: {
                    senderId: senderId,
                    click_action: 'https://mathurshaab.github.io/chat-app/'
                },
                token: fcmToken
            };

            await admin.messaging().send(payload);
            return res.status(200).json({ success: true, message: 'Notification triggered via Vercel!' });
        }

        return res.status(200).json({ success: false, message: 'Receiver has no active FCM Token' });

    } catch (error) {
        console.error('❌ Vercel Backend Error:', error);
        return res.status(500).json({ error: error.message });
    }
}