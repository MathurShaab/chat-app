import { db } from "./firebase-init.js";
import { 
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    updateDoc, 
    getDoc, 
    getDocs, 
    writeBatch, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    increment 
} from "firebase/firestore";

export const DbService = {
    // 🔍 1. Users ko Search karna (Name ya Email se)
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
                
                chats.push(chatData);
            }
            callback(chats);
        });
    },

    // ✉️ 4. Message Bhejna (+ Unread Count Auto-Increment + Vercel Notification Trigger)
    async sendMessage(chatId, senderId, text) {
        if (!text.trim()) return;
        
        const messagesRef = collection(db, "chats", chatId, "messages");
        await addDoc(messagesRef, {
            senderId,
            text: text.trim(),
            timestamp: serverTimestamp(),
            seen: false
        });

        const chatRef = doc(db, "chats", chatId);
        let receiverId = null;

        try {
            const chatSnap = await getDoc(chatRef);
            if (chatSnap.exists()) {
                const chatData = chatSnap.data();
                receiverId = chatData.participants?.find(id => id !== senderId);
            }
        } catch (metaError) {
            console.error("❌ Error fetching chat metadata:", metaError);
        }

        const chatUpdateData = {
            lastMessage: text.trim(),
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: senderId
        };

        if (receiverId) {
            chatUpdateData[`unreadCount.${receiverId}`] = increment(1);
        }

        await updateDoc(chatRef, chatUpdateData);

        if (receiverId) {
            try {
                await fetch('https://chat-app-kappa-sooty.vercel.app/api/send-notification', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        receiverId: receiverId,                  
                        senderId: senderId,                      
                        senderName: "New Message",               
                        text: text.trim()                        
                    })
                });
                console.log("🛰️ Smart notification command dispatched to Vercel!");
            } catch (notifError) {
                console.error("❌ Failed to trigger Vercel notification:", notifError);
            }
        }
    },

    // 🔵 5. Chat Window Khulne Par Unread Clear Karna aur Ticks Blue Karna
    async markChatAsRead(chatId, currentUserId) {
        try {
            const chatRef = doc(db, "chats", chatId);
            
            const clearCounter = {};
            clearCounter[`unreadCount.${currentUserId}`] = 0;
            await updateDoc(chatRef, clearCounter);

            const messagesRef = collection(db, "chats", chatId, "messages");
            const unreadQuery = query(
                messagesRef, 
                where("senderId", "!=", currentUserId), 
                where("seen", "==", false)
            );

            const querySnapshot = await getDocs(unreadQuery);
            
            const batch = writeBatch(db);
            querySnapshot.forEach((msgDoc) => {
                batch.update(msgDoc.ref, { seen: true });
            });
            
            await batch.commit();
            console.log("🔵 Chat marked as read and Blue Ticks synced!");
        } catch (error) {
            console.error("❌ Error marking messages as read:", error);
        }
    },

    // 💬 6. Chat Window Ke Messages Live Listen Karna
    listenToMessages(chatId, callback) {
        const q = query(
            collection(db, "chats", chatId, "messages"), 
            orderBy("timestamp", "asc")
        );
        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(messages);
        });
    },

    // 🟢 7. Online / Offline Status Update Karna (Presence System)
    async updateUserPresence(userId, status) {
        if (!userId) return;
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, {
                status: status,       // "online" ya "offline"
                lastSeen: serverTimestamp()
            });
            console.log(`🟢 Presence updated to '${status}' for user: ${userId}`);
        } catch (error) {
            console.error("❌ Error updating user presence:", error);
        }
    }
};