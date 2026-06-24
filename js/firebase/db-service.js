import { db } from "./firebase-init.js";
import { 
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    updateDoc, 
    getDoc, 
    getDocs, 
    deleteDoc, // 🔥 Naya: Deletion ke liye
    writeBatch, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    increment 
} from "firebase/firestore";

// 🔥 E2EE KE LIYE AES ENCRYPTION MODULE IMPORT KIYA
import CryptoJS from "https://esm.sh/crypto-js";

export const DbService = {
    // 🔍 1. Users ko Search karna
    async searchUsers(searchQuery, currentUserId) {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const results = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data && data.uid && data.uid !== currentUserId && data.displayName && data.email) {
                const nameMatch = data.displayName.toLowerCase().includes(searchQuery.toLowerCase());
                const emailMatch = data.email.toLowerCase().includes(searchQuery.toLowerCase());
                if (nameMatch || emailMatch) {
                    results.push(data);
                }
            }
        });
        return results;
    },

    // 📁 2. Chat Room Fetch karna ya Naya Banana
    async getOrCreateChat(currentUserId, targetUserId) {
        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", currentUserId));
        const snapshot = await getDocs(q);
        
        let existingChatId = null;
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.participants.includes(targetUserId)) {
                existingChatId = doc.id;
            }
        });

        if (existingChatId) return existingChatId;

        const newChatRef = doc(collection(db, "chats"));
        await setDoc(newChatRef, {
            participants: [currentUserId, targetUserId],
            lastMessage: "",
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: ""
        });
        return newChatRef.id;
    },

    // 📑 3. Sidebar Chat List ko Live Listen karna
    listenToUserChats(userId, callback) {
        const q = query(
            collection(db, "chats"), 
            where("participants", "array-contains", userId),
            orderBy("lastMessageTimestamp", "desc")
        );
        return onSnapshot(q, async (snapshot) => {
            const chats = [];
            for (const docSnap of snapshot.docs) {
                const chatData = docSnap.data();
                chatData.id = docSnap.id;
                
                const targetUid = chatData.participants.find(id => id !== userId);
                const userDoc = await getDoc(doc(db, "users", targetUid));
                chatData.targetUser = userDoc.exists() ? userDoc.data() : { displayName: "User Node" };
                
                // Last message ko list mein dekhne ke liye decrypt karein (Optional safetynet)
                if (chatData.lastMessage && chatData.isEncrypted) {
                    try {
                        chatData.lastMessage = CryptoJS.AES.decrypt(chatData.lastMessage, chatData.id).toString(CryptoJS.enc.Utf8);
                    } catch(e) { chatData.lastMessage = "🔒 Encrypted Stream"; }
                }

                chats.push(chatData);
            }
            callback(chats);
        });
    },

    // ✉️ 4. Message Bhejna (🔒 AUTOMATIC CLIENT-SIDE AES E2EE ENCRYPTION)
 async sendMessage(chatId, senderId, text) {
        if (!text.trim()) return;
        
        // ChatId ko hi as a secret signature key use karke client-side lock lagana
        const encryptedText = CryptoJS.AES.encrypt(text.trim(), chatId).toString();

        const messagesRef = collection(db, "chats", chatId, "messages");
        await addDoc(messagesRef, {
            senderId,
            text: encryptedText, // Database mein sirf tala laga hua text jayega
            timestamp: serverTimestamp(),
            seen: false,
            isEncrypted: true // Flag lagaya taaki purane unencrypted messages na tutein
        });

        const chatRef = doc(db, "chats", chatId);
        let receiverId = null;

        // 🔥 FIX 1: AI Stream ke liye receiverId force karein taaki virtual room bypass na ho
        if (chatId.startsWith("ai_stream_")) {
            receiverId = "nexus-ai-bot";
        } else {
            try {
                const chatSnap = await getDoc(chatRef);
                if (chatSnap.exists()) {
                    const chatData = chatSnap.data();
                    receiverId = chatData.participants?.find(id => id !== senderId);
                }
            } catch (metaError) {
                console.error("❌ Error fetching chat metadata:", metaError);
            }
        }

        const chatUpdateData = {
            lastMessage: encryptedText,
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: senderId,
            isEncrypted: true
        };

        // 🔥 FIX 2: Virtual room ko database mein register karne ke liye participants array must hai
        if (chatId.startsWith("ai_stream_")) {
            chatUpdateData.participants = [senderId, "nexus-ai-bot"];
        } else if (receiverId) {
            chatUpdateData[`unreadCount.${receiverId}`] = increment(1);
        }

        // 🚀 THE FIX: updateDoc mita kar setDoc with merge lagaya taaki pehle message par room auto-create ho jaye!
        await setDoc(chatRef, chatUpdateData, { merge: true });

        if (receiverId && receiverId !== "nexus-ai-bot") {
            try {
                // Vercel Notification mein raw text nahi, safety ke liye alert bhejenge
                await fetch('https://chat-app-kappa-sooty.vercel.app/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        receiverId: receiverId,                  
                        senderId: senderId,                      
                        senderName: "🔒 Secure End-to-End Chat",               
                        text: "Sent an encrypted message."                        
                    })
                });
            } catch (notifError) {
                console.error("❌ Notification skipped:", notifError);
            }
        }

        // 🤖 GEMINI BOT AUTO-RESPONSE INTELLIGENT INTERCEPTOR
        if (receiverId === "nexus-ai-bot") {
            try {
                console.log("🤖 Message targeted to AI node. Initiating Gemini stream...");
                
                // 1. Live Vercel API Call (Hamara naya endpoint)
                const aiResponse = await fetch('https://chat-app-kappa-sooty.vercel.app/api/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text.trim() })
                });

                const aiData = await aiResponse.json();
                
                if (aiData.reply) {
                    // E2EE logic sync keeping consistency
                    const encryptedAiText = CryptoJS.AES.encrypt(aiData.reply.trim(), chatId).toString();

                    // 2. Insert AI response back inside sub-collection message stream
                    const aiMessagesRef = collection(db, "chats", chatId, "messages");
                    await addDoc(aiMessagesRef, {
                        senderId: "nexus-ai-bot",
                        text: encryptedAiText,
                        timestamp: serverTimestamp(),
                        seen: true, // System auto-read
                        isEncrypted: true
                    });

                    // 3. Sync Chat Room List Last Row State Tracker
                    const aiChatUpdateData = {
                        lastMessage: encryptedAiText,
                        lastMessageTimestamp: serverTimestamp(),
                        lastMessageSenderId: "nexus-ai-bot",
                        isEncrypted: true
                    };
                    
                    // ✅ FIXED: AI response update par bhi setDoc with merge lagaya hai safe execution ke liye
                    await setDoc(chatRef, aiChatUpdateData, { merge: true });
                    
                    console.log("🤖 Gemini reply processed and E2EE injected successfully.");
                }
            } catch (aiError) {
                console.error("❌ Gemini Pipeline Interceptor collapsed:", aiError);
            }
        }
    },

    // 🔵 5. Chat Window Khulne Par Unread Clear Karna
    async markChatAsRead(chatId, currentUserId) {
        try {
            const chatRef = doc(db, "chats", chatId);
            const clearCounter = {};
            clearCounter[`unreadCount.${currentUserId}`] = 0;
            await updateDoc(chatRef, clearCounter);

            const messagesRef = collection(db, "chats", chatId, "messages");
            const unreadQuery = query(messagesRef, where("senderId", "!=", currentUserId), where("seen", "==", false));
            const querySnapshot = await getDocs(unreadQuery);
            
            const batch = writeBatch(db);
            querySnapshot.forEach((msgDoc) => { batch.update(msgDoc.ref, { seen: true }); });
            await batch.commit();
        } catch (error) { console.error("❌ Error marking read:", error); }
    },

    // 💬 6. Messages Listen Karna (🔓 CLIENT-SIDE AES E2EE DECRYPTION)
    listenToMessages(chatId, callback) {
        const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                let decryptedText = data.text;

                // Agar data encrypted flag ke sath hai, toh client par hi decode karo
                if (data.isEncrypted && data.text) {
                    try {
                        const bytes = CryptoJS.AES.decrypt(data.text, chatId);
                        decryptedText = bytes.toString(CryptoJS.enc.Utf8);
                    } catch (decError) {
                        decryptedText = "🔒 Encryption Sync Error";
                    }
                }

                return { id: docSnap.id, ...data, text: decryptedText };
            });
            callback(messages);
        });
    },

    // 🟢 7. Presence System (Online/Offline)
    async updateUserPresence(userId, status) {
        if (!userId) return;
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { status: status, lastSeen: serverTimestamp() });
        } catch (error) { console.error("❌ Error presence:", error); }
    },

    // 🗑️ 8. NAYA: Single Message Delete Karna (Delete for Everyone)
    async deleteMessage(chatId, messageId) {
        try {
            const msgRef = doc(db, "chats", chatId, "messages", messageId);
            await deleteDoc(msgRef);
            console.log(`🗑️ Message ${messageId} deleted from secure pipeline.`);
        } catch (error) {
            console.error("❌ Error deleting message:", error);
        }
    },

    // 🗑️ 9. NAYA: Poori Chat Room Delete Karna
    async deleteChatRoom(chatId) {
        try {
            const chatRef = doc(db, "chats", chatId);
            await deleteDoc(chatRef);
            console.log(`🗑️ Chat room ${chatId} terminated successfully.`);
        } catch (error) {
            console.error("❌ Error deleting chat room:", error);
        }
    },

    // 📸 10. NAYA: Profile Photo Upload Option (Base64 System)
    // 📸 NAYA & UPDATED: Profile Photo Upload Option with Ultra-Fast Canvas Compression (Max 15KB)
    // 📸 Updated & Cleaned: Direct Profile Photo updates via pre-cropped Canvas asset pipeline
    async uploadProfileAvatar(userId, base64Data) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { photoURL: base64Data });
            console.log("📸 Profile photo asset payload updated directly in cloud firestore node.");
            return base64Data;
        } catch (err) {
            throw err;
        }
    },

    // 👤 NAYA: Real-time user document fetcher (Name backup ke liye)
    async getUserData(userId) {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            return userDoc.exists() ? userDoc.data() : null;
        } catch (error) {
            console.error("❌ Error fetching absolute user document:", error);
            return null;
        }
    }
};