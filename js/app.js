import { AuthService } from "./firebase/auth-service.js";
import { DbService } from "./firebase/db-service.js";
import { MessagingService } from "./firebase/messaging-service.js";
import { AuthComponent } from "./components/auth-component.js";
import { ChatComponent } from "./components/chat-component.js";

class AppCore {
    constructor() {
        console.log("🛰️ STEP 1: AppCore Engine started successfully!");
        this.mainContent = document.getElementById("main-content");
        this.appLoader = document.getElementById("app-loader");
        this.currentUser = null;
        this.activeChatId = null;
        this.unsubChats = null;
        this.unsubMessages = null;
        this.init();
    }

    async init() {
        // 🔥 DYNAMIC SUB-FOLDER SERVICE WORKER REGISTRATION
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                    const swPath = `${basePath}firebase-messaging-sw.js`;
                    const reg = await navigator.serviceWorker.register(swPath, { scope: basePath });
                    console.log('🚀 PWA Service Worker Registered at Scope:', reg.scope);
                } catch (err) {
                    console.error('❌ Service Worker Registration Failed:', err);
                }
            });
        }
        
        // 🔥 TOP PRIORITY NOTIFICATION PROMPT
        try {
            if ('Notification' in window) {
                console.log("📢 Bootup: Requesting early notification permission...");
                const earlyPermission = await Notification.requestPermission();
                console.log("📢 Bootup: Notification permission status:", earlyPermission);
            }
        } catch (error) {
            console.warn("📢 Bootup: Early notification request bypassed:", error);
        }

        // Auth Changes Observer Pipeline
        AuthService.listenToAuthChanges((user) => {
            console.log("🛰️ STEP 3: Firebase responded! User state received:", user);
            this.hideGlobalSplashLoader();
            if (user) {
                this.currentUser = user;
                this.routeToDashboard(user);
            } else {
                this.currentUser = null;
                this.cleanupListeners();
                this.routeToAuthGate("login");
            }
        });
    }

    cleanupListeners() {
        if (this.unsubChats) this.unsubChats();
        if (this.unsubMessages) this.unsubMessages();
    }

    hideGlobalSplashLoader() {
        if (this.appLoader) {
            this.appLoader.classList.add("opacity-0");
            setTimeout(() => this.appLoader.remove(), 300);
        }
    }

    routeToAuthGate(viewType = "login") {
        if (viewType === "login") {
            this.mainContent.innerHTML = AuthComponent.renderLoginView();
            this.bindLoginEventListeners();
        } else {
            this.mainContent.innerHTML = AuthComponent.renderSignupView();
            this.bindSignupEventListeners();
        }
    }

    async routeToDashboard(user) {
        this.mainContent.innerHTML = ChatComponent.renderMainLayout();
        
        // 👤 NAME RESOLUTION ENGINE: Auth state agar wrong backup de, toh seedha Firestore database node se real name uthao
        const nameElement = document.getElementById("current-user-name");
        nameElement.textContent = user.displayName || "Syncing profile...";

        try {
            const dbUserData = await DbService.getUserData(user.uid);
            if (dbUserData && dbUserData.displayName) {
                nameElement.textContent = dbUserData.displayName; // Registration waala real username set ho gaya!
                if(dbUserData.photoURL) {
                    document.getElementById("current-user-avatar").src = dbUserData.photoURL;
                }
            }
        } catch (nameErr) {
            console.error("⚠️ Failed to resolve real username fallback:", nameErr);
        }
        
        this.bindDashboardEvents();
        this.loadInboxStreams();
        
        MessagingService.requestPermissionAndGetToken(user.uid);
        MessagingService.listenForForegroundMessages();

        // 📸 PROFILE AVATAR UPLOAD INTERFACE WITH REALTIME UPLOAD LOADER VISUALS
        const uploader = document.getElementById("avatar-file-uploader");
        if (uploader) {
            uploader.addEventListener("change", async (e) => {
                const file = e.target.files[0];
                if(file) {
                    const loader = document.getElementById("avatar-loader");
                    if(loader) loader.classList.remove("hidden"); // 🔥 UI PROCESS LOADER START (Spinner Dikhao)
                    
                    try {
                        console.log("📸 Activating micro-canvas compression array...");
                        const compressedBase64 = await DbService.uploadProfileAvatar(this.currentUser.uid, file);
                        document.getElementById("current-user-avatar").src = compressedBase64;
                    } catch (uploadError) {
                        console.error("❌ Avatar persistence vector collapsed:", uploadError);
                    } finally {
                        if(loader) loader.classList.add("hidden"); // 🔥 UI PROCESS LOADER END (Spinner Chupao)
                    }
                }
            });
        }
    }

    bindDashboardEvents() {
        document.getElementById("logout-btn").addEventListener("click", () => AuthService.logout());

        let searchTimeout;
        const searchInput = document.getElementById("user-search-input");
        const searchSection = document.getElementById("search-results-section");
        const searchList = document.getElementById("search-users-list");

        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchTimeout);
            const value = e.target.value.trim();

            if (!value) {
                searchSection.classList.add("hidden");
                return;
            }

            searchTimeout = setTimeout(async () => {
                const results = await DbService.searchUsers(value, this.currentUser.uid);
                searchList.innerHTML = "";
                if (results.length > 0) {
                    searchSection.classList.remove("hidden");
                    results.forEach(user => {
                        searchList.innerHTML += ChatComponent.renderUserItem(user);
                    });
                    this.bindSearchResultsClick();
                } else {
                    searchSection.classList.add("hidden");
                }
            }, 400);
        });
    }

    loadInboxStreams() {
        const inboxContainer = document.getElementById("inbox-chats-list");
        let isFirstLoad = true; 

        this.unsubChats = DbService.listenToUserChats(this.currentUser.uid, (chats) => {
            inboxContainer.innerHTML = "";
            if (chats.length === 0) {
                inboxContainer.innerHTML = `<p class="text-center text-[11px] text-zinc-600 py-4">No active connection rooms.</p>`;
                return;
            }

            chats.forEach(chat => {
                inboxContainer.innerHTML += ChatComponent.renderChatItem(chat, this.currentUser.uid);
                
                // SMART IN-APP NOTIFICATION INTERCEPTOR
                if (!isFirstLoad && chat.lastMessageSenderId !== this.currentUser.uid && this.activeChatId !== chat.id) {
                    if (Notification.permission === "granted") {
                        new Notification(`Message from ${chat.targetUser?.displayName || 'Secure User'}`, {
                            body: "🔒 Encrypted Content Locked",
                            icon: chat.targetUser?.photoURL || "assets/images/default-avatar.svg"
                        });
                    }
                }
            });

            isFirstLoad = false; 
            this.bindInboxChatsClick();
        });
    }

    bindSearchResultsClick() {
        document.querySelectorAll(".search-user-row").forEach(row => {
            row.addEventListener("click", async () => {
                const targetUid = row.getAttribute("data-uid");
                document.getElementById("user-search-input").value = "";
                document.getElementById("search-results-section").classList.add("hidden");
                
                const chatId = await DbService.getOrCreateChat(this.currentUser.uid, targetUid);
                this.openChatRoom(chatId, row.querySelector("p").textContent, row.querySelector("img").src);
            });
        });
    }

    bindInboxChatsClick() {
        document.querySelectorAll(".chat-inbox-row").forEach(row => {
            row.addEventListener("click", () => {
                const chatId = row.getAttribute("data-chat-id");
                const targetName = row.querySelector("p").textContent;
                const targetAvatar = row.querySelector("img").src;
                this.openChatRoom(chatId, targetName, targetAvatar);
            });
        });
    }

    async openChatRoom(chatId, targetName, targetAvatar) {
        this.activeChatId = chatId;
        
        // WhatsApp/Insta Rule: Clear target workspace counter nodes upon entry
        await DbService.markChatAsRead(chatId, this.currentUser.uid);
        
        document.getElementById("no-chat-selected").classList.add("hidden");
        const activeChatBox = document.getElementById("active-chat-box");
        activeChatBox.classList.remove("hidden");

        const sidebar = document.getElementById("sidebar-panel");
        if(window.innerWidth < 768) {
            sidebar.classList.add("-ml-[100%]");
        }

        document.getElementById("active-chat-name").textContent = targetName;
        document.getElementById("active-chat-avatar").src = targetAvatar;

        if (this.unsubMessages) this.unsubMessages();

        const feed = document.getElementById("messages-feed");
        
        // 🔒 LIVE MESSAGES DECRYPTION & RENDERING PIPELINE
        this.unsubMessages = DbService.listenToMessages(chatId, (messages) => {
            feed.innerHTML = "";
            messages.forEach(msg => {
                feed.innerHTML += ChatComponent.renderMessageItem(msg, this.currentUser.uid);
            });
            feed.scrollTop = feed.scrollHeight;

            // 🔥 NAYA: INSTANT DOUBLE-CLICK TO UNSEND MESSAGE TRACE CONSOLE
            document.querySelectorAll(".message-bubble-row").forEach(bubble => {
                bubble.addEventListener("dblclick", async () => {
                    const msgId = bubble.getAttribute("data-msg-id");
                    // System checks if layout direction maps to our own UID node
                    if (bubble.classList.contains("justify-end")) {
                        if (confirm("Unsend this encrypted message for everyone?")) {
                            await DbService.deleteMessage(chatId, msgId);
                        }
                    }
                });
            });
        });

        const form = document.getElementById("message-send-form");
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById("message-text-input");
            const text = input.value;
            if(!text.trim()) return;
            input.value = "";
            await DbService.sendMessage(this.activeChatId, this.currentUser.uid, text);
        };

        // 🗑️ TERMINATE SESSION CONTROL (Delete Full Chat Document)
        document.getElementById("delete-chat-btn").onclick = async () => {
            if(confirm("Are you sure you want to terminate this full secure stream session?")) {
                await DbService.deleteChatRoom(chatId);
                document.getElementById("back-to-list-btn").click();
            }
        };

        document.getElementById("back-to-list-btn").onclick = async () => {
            this.activeChatId = null; 
            await DbService.markChatAsRead(chatId, this.currentUser.uid);
            sidebar.classList.remove("-ml-[100%]");
            activeChatBox.classList.add("hidden");
            document.getElementById("no-chat-selected").classList.remove("hidden");
        };
    }

    bindLoginEventListeners() {
        const form = document.getElementById("login-form");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                await AuthService.loginWithEmail(document.getElementById("auth-email").value, document.getElementById("auth-password").value);
            } catch (err) { alert(err.message); }
        });
        document.getElementById("google-auth-btn").addEventListener("click", () => AuthService.loginWithGoogle());
        document.getElementById("switch-to-signup").addEventListener("click", () => this.routeToAuthGate("signup"));
    }

    bindSignupEventListeners() {
        const form = document.getElementById("signup-form");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            try {
                await AuthService.registerWithEmail(document.getElementById("auth-email").value, document.getElementById("auth-password").value, document.getElementById("auth-username").value);
            } catch (err) { alert(err.message); }
        });
        document.getElementById("switch-to-login").addEventListener("click", () => this.routeToAuthGate("login"));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.NexusApp = new AppCore();
});