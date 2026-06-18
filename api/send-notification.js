const admin = require('firebase-admin');

export default async function handler(req, res) {
    // 1. 🔥 SECURITY CHECK: OPTIONS (Preflight) request ko sabse pehle bina kisi check ke 200 OK do
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Sirf POST requests allow karenge
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 2. 🔐 SAFE INITIALIZATION: Firebase ko sirf POST request aane par hi initialize karein
    try {
        if (!admin.apps.length) {
            if (!process.env.FIREBASE_PRIVATE_KEY) {
                throw new Error("Missing FIREBASE_PRIVATE_KEY in Vercel Dashboard!");
            }
            
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Private key ke string format ko crash-proof banana
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                })
            });
        }
    } catch (initError) {
        console.error("🔥 Firebase Init Error:", initError);
        // Agar key mein koi galti hai, toh CORS error nahi aayega, saaf-saaf yeh error dikhega
        return res.status(500).json({ error: "Backend configuration failed", details: initError.message });
    }

    const db = admin.firestore();
    const { receiverId, senderId, senderName, text } = req.body;

    if (!receiverId || !senderId) {
        return res.status(400).json({ error: 'Missing critical parameters' });
    }

    try {
        // 3. Recipient User ka FCM Token database se nikalein
        const userDoc = await db.collection('users').doc(receiverId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Receiver not found in Firestore' });
        }

        const fcmToken = userDoc.data().fcmToken;

        // 4. Agar token mil gaya, toh push notification fire karein
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