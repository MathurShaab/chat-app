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
        
        const nameElement = document.getElementById("current-user-name");
        nameElement.textContent = user.displayName || "Syncing profile...";

        try {
            const dbUserData = await DbService.getUserData(user.uid);
            if (dbUserData && dbUserData.displayName) {
                nameElement.textContent = dbUserData.displayName;
                if(dbUserData.photoURL) {
                    document.getElementById("current-user-avatar").src = dbUserData.photoURL;
                }
            }
        } catch (nameErr) {
            console.error("⚠️ Failed to resolve username:", nameErr);
        }
        
        this.bindDashboardEvents();
        this.loadInboxStreams();
        
        MessagingService.requestPermissionAndGetToken(user.uid);
        MessagingService.listenForForegroundMessages();

        // ----------------------------------------------------
        // ✂️ FEATURE 1: WHATSAPP-LIKE CROP, ROTATE & ORIENTATION LOGIC
        // ----------------------------------------------------
        let cropperInstance = null;
        const uploader = document.getElementById("avatar-file-uploader");
        const cropModal = document.getElementById("image-crop-modal");
        const targetCropImg = document.getElementById("cropper-target-img");

        if (uploader) {
            uploader.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (event) => {
                        // Target image source mein binary load karo aur modal dikhao
                        targetCropImg.src = event.target.result;
                        cropModal.classList.remove("hidden");

                        // Purane cropper instance ko clear karein agar exist karta ho
                        if (cropperInstance) cropperInstance.destroy();

                        // WhatsApp Rule: Circle grid, zoomable framework setup
                        cropperInstance = new Cropper(targetCropImg, {
                            aspectRatio: 1, // Full Square Grid
                            viewMode: 1,
                            dragMode: 'move',
                            background: false,
                            autoCropArea: 1,
                            responsive: true
                        });
                    };
                }
            });
        }

        // Rotate Buttons Control Wiring
        document.getElementById("crop-rotate-left").onclick = () => { if(cropperInstance) cropperInstance.rotate(-90); };
        document.getElementById("crop-rotate-right").onclick = () => { if(cropperInstance) cropperInstance.rotate(90); };
        
        // Cancel Operation
        document.getElementById("crop-cancel-btn").onclick = () => {
            cropModal.classList.add("hidden");
            if (cropperInstance) cropperInstance.destroy();
            uploader.value = ""; // Clear file target input
        };

        // Save & Process Cropped Compression Canvas Array
        document.getElementById("crop-save-btn").onclick = async () => {
            if (!cropperInstance) return;

            const avatarLoader = document.getElementById("avatar-loader");
            if (avatarLoader) avatarLoader.classList.remove("hidden"); // Processing loader spinner on
            cropModal.classList.add("hidden");

            // Extract high-res matrix canvas with WhatsApp scaling properties
            const canvas = cropperInstance.getCroppedCanvas({
                width: 160,
                height: 160,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            if (cropperInstance) cropperInstance.destroy();
            uploader.value = "";

            try {
                // Direct update method call on db-service layer
                await DbService.uploadProfileAvatar(this.currentUser.uid, compressedBase64);
                document.getElementById("current-user-avatar").src = compressedBase64;
                console.log("📸 New cropped avatar orientation synced successfully.");
            } catch (err) {
                console.error("❌ Failed to push cropped binary profile stream:", err);
            } finally {
                if (avatarLoader) avatarLoader.classList.add("hidden"); // Processing loader spinner off
            }
        };

        // ----------------------------------------------------
        // 🖼️ FEATURE 2: WHATSAPP STYLE FULLSCREEN INTERACTIVE PREVIEW MODAL
        // ----------------------------------------------------
        const previewModal = document.getElementById("profile-preview-modal");
        const previewModalImg = document.getElementById("preview-modal-img");
        const previewModalName = document.getElementById("preview-modal-username");

        // Global Event Delegation Node to catch clicks on any active user profile avatar
        document.addEventListener("click", (e) => {
            // Check if clicked element has avatar preview trigger metadata
            const trigger = e.target.closest(".avatar-trigger-preview") || (e.target.id === "current-user-avatar" ? e.target : null);
            
            if (trigger) {
                e.stopPropagation();
                
                // Fetch context specific credentials from current row element hierarchy
                let targetName = "Profile Photo";
                const row = trigger.closest(".chat-inbox-row") || trigger.closest("header");
                
                if (row) {
                    const nameNode = row.querySelector("p") || row.querySelector("h4") || row.querySelector("h3");
                    if (nameNode) targetName = nameNode.textContent.replace("🔒 End-to-End Encrypted", "").trim();
                }

                // Inject assets directly inside overlay view box
                previewModalImg.src = trigger.src;
                previewModalName.textContent = targetName;
                previewModal.classList.remove("hidden"); // Open view panel
            }
        });

        // Close View panel controls wire bindings
        const closePreview = () => { previewModal.classList.add("hidden"); };
        document.getElementById("preview-modal-close-btn").onclick = closePreview;
        document.getElementById("profile-preview-close-zone").onclick = closePreview;
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

            // 🤖 ENGINE INJECT: Virtual AI Chat Room Frame Configuration
            // 🤖 ENGINE INJECT: Virtual AI Chat Room Frame Configuration
const aiBotVirtualRoom = {
    id: `ai_stream_${this.currentUser.uid}`, 
    participants: [this.currentUser.uid, "nexus-ai-bot"],
    lastMessage: "🔒 Tap to initiate secure AI brainstorming...",
    lastMessageTimestamp: null,
    lastMessageSenderId: "nexus-ai-bot",
    targetUser: {
        uid: "nexus-ai-bot",
        displayName: "Nexus AI (Gemini)",
        photoURL: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60"
    },
    unreadCount: 0 // 🌟 FIXED: {} hata kar 0 kiya taaki counter smoothly chale
};

            // Check karein kya firestore se real list mein AI room pehle se aa raha hai
            const hasAIRoom = chats.some(c => c.participants?.includes("nexus-ai-bot"));
            
            if (!hasAIRoom) {
                chats.unshift(aiBotVirtualRoom); // Database mein nahi hai toh virtual inject karein top par
            } else {
                // Agar database mein ban chuka hai, toh use dhoodh kar list mein sabse upar priority par laayein
                const aiIdx = chats.findIndex(c => c.participants?.includes("nexus-ai-bot"));
                if (aiIdx > 0) {
                    const [aiRoom] = chats.splice(aiIdx, 1);
                    chats.unshift(aiRoom);
                }
            }

            // Saari rows ko DOM layer par paint karein
            chats.forEach(chat => {
                inboxContainer.innerHTML += ChatComponent.renderChatItem(chat, this.currentUser.uid);
                
                // Real-time notification logic for other human nodes
                if (!isFirstLoad && chat.lastMessageSenderId !== this.currentUser.uid && this.activeChatId !== chat.id && chat.lastMessageSenderId !== "nexus-ai-bot") {
                    if (Notification.permission === "granted") {
                        const notifName = chat.targetUser?.displayName || 'Secure User';
                        new Notification(`Message from ${notifName}`, {
                            body: "🔒 Encrypted Content Locked",
                            icon: chat.targetUser?.photoURL || "assets/images/default-avatar.svg"
                        });
                    }
                }
            });

            isFirstLoad = false; 
            this.bindInboxChatsClick(); // Click listeners ko re-bind karein
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
        // 🌟 click listener ko 'async' kiya hai taaki await kaam kar sake
        row.addEventListener("click", async () => {
            const chatId = row.getAttribute("data-chat-id");
            const targetName = row.querySelector("p").textContent;
            const targetAvatar = row.querySelector("img").src;
            
            // 🚀 INSTAGRAM/WHATSAPP READ TRICK: Chat par click hote hi read mark karein
            // (Hum check kar rahe hain ki ye normal chat ho, AI stream na ho)
            if (chatId && !chatId.startsWith("ai_stream_")) {
                try {
                    await DbService.markChatAsRead(chatId, this.currentUser.uid);
                } catch (error) {
                    console.error("Error marking chat as read on click:", error);
                }
            }

            // Aapka purana chat room open karne ka logic
            this.openChatRoom(chatId, targetName, targetAvatar);
        });
    });
}

    async openChatRoom(chatId, targetName, targetAvatar) {
        this.activeChatId = chatId;
        
        // 🔒 SAFE GUARD: Virtual AI room ke liye Firestore read marker bypass karein
        if (chatId && !chatId.startsWith("ai_stream_")) {
            await DbService.markChatAsRead(chatId, this.currentUser.uid);
        }
        
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
                let processedText = msg.text || "";
                
                // 📑 MODULE A: INLINE DEVMODE SYNTAX SANDBOX BUILDER
                if (processedText && processedText.includes("```")) {
                    // ✅ FIXED REGEX: Single line syntax declaration to avoid compiler errors
                    const codeRegex = /```(?:[a-zA-Z]*)\n?([\s\S]*?)```/g;
                    
                    processedText = processedText.replace(codeRegex, (match, codeText) => {
                        return `
                        <div class="code-sandbox-card bg-zinc-950/90 border border-zinc-800 rounded-xl my-2 overflow-hidden font-mono text-[11px] text-emerald-400 w-full relative group/code shadow-lg">
                            <div class="bg-zinc-900/50 px-3 py-1.5 text-zinc-500 text-[9px] border-b border-zinc-800/60 flex justify-between items-center select-none">
                                <span>TERMINAL SANDBOX</span>
                                <button type="button" class="copy-code-btn text-[#0095F6] hover:text-white transition-colors uppercase font-bold text-[8px]">Copy Code</button>
                            </div>
                            <pre class="p-3 overflow-x-auto whitespace-pre leading-relaxed select-text"><code>${codeText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
                        </div>`;
                    });
                }
                
                const msgCopy = { ...msg, text: processedText };
                let rawHTML = ChatComponent.renderMessageItem(msgCopy, this.currentUser.uid);
                feed.innerHTML += rawHTML;
            });
            feed.scrollTop = feed.scrollHeight;

            // ⚡ CLASS-BASED DEVMODE TERMINAL COPY CODE LOGIC
            document.querySelectorAll(".copy-code-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const card = btn.closest(".code-sandbox-card");
                    const codeElement = card?.querySelector("code");
                    if (codeElement) {
                        navigator.clipboard.writeText(codeElement.innerText).then(() => {
                            const originalText = btn.textContent;
                            btn.textContent = "Copied!";
                            btn.className = "text-emerald-400 font-bold text-[8px] uppercase transition-all";
                            setTimeout(() => {
                                btn.textContent = originalText;
                                btn.className = "copy-code-btn text-[#0095F6] hover:text-white transition-colors uppercase font-bold text-[8px]";
                            }, 2000);
                        }).catch(err => console.error("❌ Clipboard access denied:", err));
                    }
                });
            });

            // ⚡ REGULAR ACTIONS BINDINGS: Unsend on double click handler
            document.querySelectorAll(".message-bubble-row").forEach(bubble => {
                const msgId = bubble.getAttribute("data-msg-id");
                
                bubble.addEventListener("dblclick", async () => {
                    if (bubble.classList.contains("justify-end")) {
                        if (confirm("Unsend this encrypted message for everyone?")) {
                            await DbService.deleteMessage(chatId, msgId);
                        }
                    }
                });

                // 🔍 MODULE B: FLOATING AI CONTEXT MENU PIPELINE (Right-Click & Mobile Long Press)
                const triggerContextMenu = (e) => {
                    e.preventDefault();
                    
                    const oldMenu = document.getElementById("nexus-floating-ai-menu");
                    if (oldMenu) oldMenu.remove();

                    const textParagraph = bubble.querySelector("p");
                    if (!textParagraph) return;
                    const messageContent = textParagraph.innerText;

                    const menu = document.createElement("div");
                    menu.id = "nexus-floating-ai-menu";
                    menu.className = "fixed bg-zinc-900/95 border border-zinc-800 rounded-2xl p-1.5 z-50 flex flex-col space-y-0.5 shadow-2xl backdrop-blur-md min-w-[140px] select-none";
                    
                    let posX = e.clientX || (e.touches && e.touches[0].clientX);
                    let posY = e.clientY || (e.touches && e.touches[0].clientY);
                    if (posX + 150 > window.innerWidth) posX = window.innerWidth - 160;
                    if (posY + 100 > window.innerHeight) posY = window.innerHeight - 110;

                    menu.style.left = `${posX}px`;
                    menu.style.top = `${posY}px`;

                    menu.innerHTML = `
                        <button class="flex items-center space-x-2 px-3 py-2 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors w-full" id="ctx-ai-summarize">
                            <span class="text-purple-400">✨</span> <span>AI Summarize</span>
                        </button>
                        <button class="flex items-center space-x-2 px-3 py-2 text-left text-xs font-medium text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors w-full" id="ctx-ai-factcheck">
                            <span class="text-[#0095F6]">🔍</span> <span>AI Fact-Check</span>
                        </button>
                    `;

                    document.body.appendChild(menu);

                    document.getElementById("ctx-ai-summarize").onclick = () => executeAICorridor("Summarize this context briefly in points: " + messageContent);
                    document.getElementById("ctx-ai-factcheck").onclick = () => executeAICorridor("Fact check this content string and declare accuracy truth percentage explicitly: " + messageContent);

                    const executeAICorridor = async (queryText) => {
                        menu.innerHTML = `<div class="px-3 py-2.5 text-[10px] text-zinc-500 font-medium flex items-center space-x-2 animate-pulse"><span>🤖 Thinking...</span></div>`;
                        try {
                            const res = await fetch('[https://chat-app-kappa-sooty.vercel.app/api/gemini](https://chat-app-kappa-sooty.vercel.app/api/gemini)', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: queryText })
                            });
                            const data = await res.json();
                            if (data.reply) {
                                menu.innerHTML = `
                                    <div class="p-3 max-w-[260px] text-[11px] text-zinc-300 select-text leading-relaxed bg-zinc-950/40 rounded-xl max-h-[200px] overflow-y-auto">
                                        <p class="font-semibold text-purple-400 mb-1 text-[10px] tracking-wider select-none">AI INSIGHTS:</p>
                                        ${data.reply.replace(/\n/g, '<br>')}
                                    </div>
                                    <button onclick="document.getElementById('nexus-floating-ai-menu').remove()" class="w-full text-center text-[9px] text-zinc-500 hover:text-zinc-300 font-bold border-t border-zinc-800/60 mt-1 pt-1.5 pb-0.5">Dismiss</button>
                                `;
                            }
                        } catch (err) {
                            menu.innerHTML = `<div class="px-3 py-2 text-[10px] text-red-400 font-semibold">Pipeline Crash</div>`;
                            setTimeout(() => menu.remove(), 1500);
                        }
                    };
                };

                bubble.addEventListener("contextmenu", triggerContextMenu);
                
                let pressTimer;
                bubble.addEventListener("touchstart", (e) => { pressTimer = setTimeout(() => triggerContextMenu(e), 700); });
                bubble.addEventListener("touchend", () => clearTimeout(pressTimer));
                bubble.addEventListener("touchmove", () => clearTimeout(pressTimer));
            });
        });

        // Global dismiss handler to clean active custom context menus instantly upon viewport click
        document.addEventListener("click", (e) => {
            if (!e.target.closest("#nexus-floating-ai-menu")) {
                const openMenu = document.getElementById("nexus-floating-ai-menu");
                if (openMenu) openMenu.remove();
            }
        });

        // 📝 MESSAGE SEND FORM ACTION SUBMITTER
        const form = document.getElementById("message-send-form");
        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById("message-text-input");
            const text = input.value;
            if(!text.trim()) return;
            input.value = "";
            
            try {
                await DbService.sendMessage(this.activeChatId, this.currentUser.uid, text);
            } catch (sendError) {
                console.error("❌ Message sending stream caught an error:", sendError.message);
            }
        };

        document.getElementById("delete-chat-btn").onclick = async () => {
            if(confirm("Are you sure you want to terminate this full secure stream session?")) {
                await DbService.deleteChatRoom(chatId);
                document.getElementById("back-to-list-btn").click();
            }
        };

        document.getElementById("back-to-list-btn").onclick = async () => {
            this.activeChatId = null; 
            if (chatId && !chatId.startsWith("ai_stream_")) {
                await DbService.markChatAsRead(chatId, this.currentUser.uid);
            }
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