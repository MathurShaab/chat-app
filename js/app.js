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
        console.log("🛰️ STEP 1: AppCore Engine started successfully!");

        // 🔥 DYNAMIC SUB-FOLDER SERVICE WORKER REGISTRATION 🔥
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    // Yeh automatic pata lagayega ki app kis sub-folder mein chal rahi hai
                    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
                    const swPath = `${basePath}firebase-messaging-sw.js`;
                    
                    // Scope ke sath register karein taaki GitHub Pages khush rahe
                    const reg = await navigator.serviceWorker.register(swPath, { scope: basePath });
                    console.log('🚀 PWA Service Worker Registered at Scope:', reg.scope);
                } catch (err) {
                    console.error('❌ Service Worker Registration Failed:', err);
                }
            });
        }
        
        // 🔥 TOP PRIORITY NOTIFICATION PROMPT 🔥
        // App load hote hi, bina login ka wait kiye, sabse pehle permission maango
        try {
            if ('Notification' in window) {
                console.log("📢 Bootup: Requesting early notification permission...");
                const earlyPermission = await Notification.requestPermission();
                console.log("📢 Bootup: Notification permission status:", earlyPermission);
            }
        } catch (error) {
            console.warn("📢 Bootup: Early notification request bypassed:", error);
        }

        // Baki ka auth listener code jo pehle se tha:
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

    // Iske niche ka hideGlobalSplashLoader aur baki code bilkul same rehne dein...

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

   routeToDashboard(user) {
    this.mainContent.innerHTML = ChatComponent.renderMainLayout();
    
    document.getElementById("current-user-name").textContent = user.displayName;
    
    // --- DATABASE OLD PATH FALLBACK FIX ---
    // Agar database se purana .png path aaye, toh use automatic .svg par divert kar do
    let avatarPath = user.photoURL || "assets/images/default-avatar.svg";
    if (avatarPath.endsWith("default-avatar.svg")) {
        avatarPath = "assets/images/default-avatar.svg";
    }
    
    const avatarImg = document.getElementById("current-user-avatar");
    if (avatarImg) {
        avatarImg.src = avatarPath;
    }

    this.bindDashboardEvents();
    this.loadInboxStreams();
    
    MessagingService.requestPermissionAndGetToken(user.uid);
    MessagingService.listenForForegroundMessages();
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
        let isFirstLoad = true; // Taaki page refresh hote hi purane messages ka pop-up na aaye

        this.unsubChats = DbService.listenToUserChats(this.currentUser.uid, (chats) => {
            inboxContainer.innerHTML = "";
            if (chats.length === 0) {
                inboxContainer.innerHTML = `<p class="text-center text-[11px] text-appMuted py-4">No active connection rooms.</p>`;
                return;
            }

            chats.forEach(chat => {
                inboxContainer.innerHTML += ChatComponent.renderChatItem(chat, this.currentUser.uid);
                
                // 🔥 SMART IN-APP NOTIFICATION PIPELINE 🔥
                // Agar pehla load nahi hai, naya message kisi aur ne bheja hai, aur wo chat window abhi khuli nahi hai
                if (!isFirstLoad && chat.lastMessageSenderId !== this.currentUser.uid && this.activeChatId !== chat.id) {
                    
                    // 1. Browser Desktop Notification (Agar permission mili hui hai)
                    if (Notification.permission === "granted") {
                        new Notification(`Message from ${chat.targetUser.displayName}`, {
                            body: chat.lastMessage,
                            icon: chat.targetUser.photoURL || "assets/images/default-avatar.svg"
                        });
                    } else {
                        // 2. Fallback: Agar browser permission nahi hai toh in-app alert dialog box
                        alert(`📩 New message from ${chat.targetUser.displayName}: "${chat.lastMessage}"`);
                    }
                }
            });

            // Pehle load ke baad trigger chalu karein taaki sirf real-time naye messages track hon
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
        
        document.getElementById("no-chat-selected").classList.add("hidden");
        const activeChatBox = document.getElementById("active-chat-box");
        activeChatBox.classList.remove("hidden");

        const sidebar = document.getElementById("sidebar-panel");
        if(window.innerWidth < 768) {
            sidebar.classList.add("-ml-[100%]");
        }

        document.getElementById("active-chat-name").textContent = targetName;
        document.getElementById("active-chat-avatar").src = targetAvatar;
        document.getElementById("active-chat-status").textContent = "Active Stream Pipeline";

        if (this.unsubMessages) this.unsubMessages();

        const feed = document.getElementById("messages-feed");
        this.unsubMessages = DbService.listenToMessages(chatId, (messages) => {
            feed.innerHTML = "";
            messages.forEach(msg => {
                feed.innerHTML += ChatComponent.renderMessageItem(msg, this.currentUser.uid);
            });
            feed.scrollTop = feed.scrollHeight;
        });

        const form = document.getElementById("message-send-form");
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById("message-text-input");
            const text = input.value;
            input.value = "";
            await DbService.sendMessage(this.activeChatId, this.currentUser.uid, text);
        };

        document.getElementById("back-to-list-btn").onclick = () => {
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