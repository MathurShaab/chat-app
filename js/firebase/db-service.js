import { db } from "./firebase-init.js";
import { 
    collection, doc, addDoc, setDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, getDoc
} from "firebase/firestore";

export const DbService = {
    async searchUsers(searchQuery, currentUserId) {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);
        const results = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // SAFE CHECK: Pehle ensure karein ki data, displayName aur email teeno maujood hain
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
        await updateDoc(chatRef, {
            lastMessage: text.trim(),
            lastMessageTimestamp: serverTimestamp(),
            lastMessageSenderId: senderId
        });
    },

    listenToMessages(chatId, callback) {
        const q = query(
            collection(db, "chats", chatId, "messages"), 
            orderBy("timestamp", "asc")
        );
        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(messages);
        });
    }
};