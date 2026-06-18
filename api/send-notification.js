const admin = require('firebase-admin');

// Firebase Admin ko secure environment variables se initialize karein
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Newlines (\n) ko sahi se format karne ke liye replacement zaroori hai
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}

const db = admin.firestore();

export default async function handler(req, res) {
    // Sirf POST requests (Data bhejni hai) ko allow karein
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

        // 2. Agar token mil gaya, toh smart push notification fire karein
        if (fcmToken) {
            const payload = {
                notification: {
                    title: senderName || 'New Message',
                    body: text || 'Sent a file',
                },
                data: {
                    senderId: senderId, // Smart filtering ke liye zaroori hai
                    click_action: 'https://mathurshaab.github.io/chat-app/' // PWA Opening Link
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