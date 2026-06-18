import { auth, db } from "./firebase-init.js";
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    GoogleAuthProvider, 
    signInWithPopup,
    onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export const AuthService = {
    // Session State Listener (Updated Non-Blocking Version)
    listenToAuthChanges(callback) {
        return onAuthStateChanged(auth, (user) => {
            // UI Loader ko pehle hatao, user ko wait mat કરાવo
            callback(user); 
            
            // Profile sync ko background mein chalne do
            if (user) {
                this.syncUserProfile(user).catch(err => {
                    console.warn("Profile sync running in background background:", err);
                });
            }
        });
    },
    async registerWithEmail(email, password, displayName) {
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            await this.syncUserProfile(credential.user, { displayName, bio: "Hey there! I am using Nexus Chat." });
            return credential.user;
        } catch (error) {
            throw new Error(this.mapAuthError(error.code));
        }
    },

    async loginWithEmail(email, password) {
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            return credential.user;
        } catch (error) {
            throw new Error(this.mapAuthError(error.code));
        }
    },

    async loginWithGoogle() {
        const provider = new GoogleAuthProvider();
        try {
            const credential = await signInWithPopup(auth, provider);
            await this.syncUserProfile(credential.user);
            return credential.user;
        } catch (error) {
            throw new Error(this.mapAuthError(error.code));
        }
    },

    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign-out structural failure", error);
        }
    },

    // Ensure localized firestore matching document node fields (Race-Condition Proof)
    async syncUserProfile(user, additionalData = {}) {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);
        const existingData = snapshot.exists() ? snapshot.data() : null;

        // Agar doc nahi hai, ya fir doc mein email missing hai (token-only document)
        if (!snapshot.exists() || !existingData.email) {
            const payload = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || additionalData.displayName || "Anonymous Nexus",
                photoURL: user.photoURL || "assets/images/default-avatar.svg",
                bio: additionalData.bio || "Available",
                updatedAt: serverTimestamp()
            };
            
            // createdAt sirf ek baar pehli baar banne par hi judega
            if (!snapshot.exists()) {
                payload.createdAt = serverTimestamp();
            }
            
            await setDoc(userRef, payload, { merge: true });
            console.log("🛰️ Core user profile attributes synchronized.");
        }
    },

    mapAuthError(code) {
        switch (code) {
            case "auth/email-already-in-use": return "This email account is already registered.";
            case "auth/wrong-password": return "Invalid email credentials provided.";
            case "auth/user-not-found": return "No user entry linked to this email address.";
            case "auth/weak-password": return "Password metric must exceed 6 tracking elements.";
            case "auth/invalid-email": return "The submitted email expression format is malformed.";
            default: return "An internal operational error was encountered during execution.";
        }
    }
};