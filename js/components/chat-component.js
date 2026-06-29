function formatChatMessage(text) {
    if (!text) return '';

    // 1. HTML Entities ko escape karein taaki layout safe rahe
    let cleanText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. TRIPLE BACKTICKS: Multi-line Code Blocks (```lang ... ```)
    const codeBlockRegex = /```([a-zA-Z0-9_+-]*)([\s\S]*?)```/g;
    cleanText = cleanText.replace(codeBlockRegex, (match, lang, code) => {
        const language = lang && lang.trim() ? lang.trim().toUpperCase() : 'CODE';
        const codeContent = code.trim();
        
        // Code ko base64 mein encode kar rahe hain taaki parsing crash na ho
        const safeCode = btoa(unescape(encodeURIComponent(codeContent)));

        return `
        <div class="code-block-box my-3 w-full max-w-full rounded-xl overflow-hidden bg-[#0d0d11] border border-zinc-800 font-mono text-[12px] text-left select-text">
            <div class="flex items-center justify-between px-4 py-2 bg-[#16161e] border-b border-zinc-800 text-[10px] text-zinc-400 font-sans tracking-wider select-none">
                <span class="font-bold text-zinc-500">${language}</span>
                <button data-code="${safeCode}" class="copy-code-trigger hover:text-white transition-colors font-medium flex items-center cursor-pointer">
                    Copy
                </button>
            </div>
            <pre class="p-4 overflow-x-auto whitespace-pre text-emerald-400/90 leading-relaxed font-mono"><code>${codeContent}</code></pre>
        </div>`;
    });

    // 3. 🌟 FIXED: MARKDOWN BOLD FILTER (**text** ko real bold banayega)
    cleanText = cleanText.replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="font-bold text-white opacity-95">$1</strong>');

    // 4. SINGLE BACKTICK: Inline Code Highlight (`code`)
    cleanText = cleanText.replace(/`([^`]+)`/g, '<code class="bg-zinc-800 text-pink-400 px-1.5 py-0.5 rounded font-mono text-[11px]">$1</code>');

    return cleanText;
}
// Sidebar Queue ke liye dedicated text preview formatter
function formatChatPreview(text) {
    if (!text) return '';

    let preview = text;

    // 1. Agar message mein code block (```) hai, toh use clean text indicator se badlein
    // Kyunki ek line ki row mein code blocks layout ko crash kar dete hain
    if (preview.includes('```')) {
        preview = preview.replace(/```[\s\S]*?```/g, '💻 [Code Block]');
    }

    // 2. HTML Entities Escape for security
    preview = preview.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // 3. 🌟 FIXED: Markdown Bold (**text**) ko inline bold span mein badlein
    // class 'text-zinc-200' use ki hai taaki message white chamke jab bold ho
    preview = preview.replace(/\*\*([\s\S]+?)\*\*/g, '<span class="font-bold text-zinc-200">$1</span>');

    // 4. Inline code backticks (`code`) ko normal text banayein preview ke liye
    preview = preview.replace(/`([^`]+)`/g, '$1');

    return preview;
}
export const ChatComponent = {
    // 🏢 Instagram Modern Layout Structure (With Crop, Rotate & Fullscreen Modals)
    renderMainLayout() {
        return `
        <div class="h-full flex bg-black text-[#f5f5f5] overflow-hidden antialiased font-sans">
            <aside id="sidebar-panel" class="w-full md:w-[360px] h-full flex flex-col border-r border-zinc-900 bg-black z-20 transition-all duration-300">
                <div class="p-5 flex items-center justify-between border-b border-zinc-900">
                    <div class="flex items-center space-x-3">
                        <div class="relative group cursor-pointer w-9 h-9 flex-shrink-0">
                            <img id="current-user-avatar" src="assets/images/default-avatar.svg" class="w-9 h-9 rounded-full object-cover ring-1 ring-zinc-800 transition-all group-hover:brightness-50">
                            <input type="file" id="avatar-file-uploader" class="hidden" accept="image/*">
                            
                            <div onclick="document.getElementById('avatar-file-uploader').click()" class="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                <svg class="w-3.5 h-3.5 text-white/90" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 8.686 5h6.628c.812 0 1.543.433 1.91 1.135l1.22 2.279a1.152 1.152 0 0 0 .972.61H21a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1.343a1.152 1.152 0 0 0 .972-.61l1.22-2.28z"/>
                                    <circle cx="12" cy="13" r="3"/>
                                </svg>
                            </div>

                            <div id="avatar-loader" class="hidden absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                                <svg class="animate-spin h-4 w-4 text-[#0095F6]" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>

                            <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-black rounded-full"></span>
                        </div>
                        <div>
                            <h3 id="current-user-name" class="text-sm font-semibold tracking-tight text-zinc-100 truncate max-w-[140px]">Loading...</h3>
                            <span class="text-[10px] text-zinc-500 font-medium">Direct Messages</span>
                        </div>
                    </div>
                    <button id="logout-btn" class="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-full transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>

                <div class="p-4">
                    <div class="relative">
                        <input type="text" id="user-search-input" class="w-full bg-[#1c1c1e] border border-transparent text-zinc-200 pl-9 pr-4 py-2 rounded-lg text-xs placeholder-zinc-500 focus:bg-transparent focus:border-zinc-800 transition-all outline-none" placeholder="Search...">
                        <svg class="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
                    <div id="search-results-section" class="hidden mb-4">
                        <p class="text-[10px] uppercase tracking-widest text-[#0095F6] font-bold px-3 mb-2">Search Results</p>
                        <div id="search-users-list" class="space-y-0.5"></div>
                        <div class="border-b border-zinc-900 my-3"></div>
                    </div>

                    <p class="text-[11px] font-semibold text-zinc-400 px-3 mb-2">Messages</p>
                    <div id="inbox-chats-list" class="space-y-0.5">
                        <div class="p-3 flex space-x-3 bg-zinc-900/20 rounded-xl animate-pulse">
                            <div class="w-11 h-11 bg-zinc-800 rounded-full"></div>
                            <div class="flex-1 space-y-2 py-1">
                                <div class="h-2.5 bg-zinc-800 rounded w-1/3"></div>
                                <div class="h-2.5 bg-zinc-800 rounded w-2/3"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <section id="chat-workspace" class="flex-1 h-full flex flex-col bg-black relative">
                <div id="no-chat-selected" class="absolute inset-0 flex flex-col justify-center items-center p-6 text-center z-10 bg-black">
                    <div class="w-24 h-24 rounded-full bg-black border border-zinc-800 flex items-center justify-center shadow-2xl mb-5 text-zinc-200">
                        <svg class="w-11 h-11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h2 class="text-lg font-medium tracking-tight text-zinc-200">Your Messages</h2>
                    <p class="text-zinc-500 text-xs max-w-xs mt-1.5 font-normal leading-relaxed">Send private photos and messages to a friend or group node securely.</p>
                </div>

                <div id="active-chat-box" class="hidden h-full flex flex-col w-full">
                    <header class="p-4 bg-black/80 backdrop-blur-md flex items-center justify-between border-b border-zinc-900 z-10">
                        <div class="flex items-center space-x-3">
                            <button id="back-to-list-btn" class="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <div class="relative">
                                <img id="active-chat-avatar" src="assets/images/default-avatar.svg" class="avatar-trigger-preview cursor-pointer w-9 h-9 rounded-full object-cover">
                            </div>
                            <div>
                                <h4 id="active-chat-name" class="text-sm font-semibold text-zinc-100 tracking-tight">...</h4>
                                <span id="active-chat-status" class="text-[10px] text-[#0095F6] font-medium tracking-wide">🔒 End-to-End Encrypted</span>
                            </div>
                        </div>
                        
                        <button id="delete-chat-btn" class="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900/50 rounded-full transition-all" title="Terminate Stream Session">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </header>

                    <main id="messages-feed" class="flex-1 overflow-y-auto p-5 space-y-2 bg-black flex flex-col"></main>

                    <footer class="p-4 bg-black">
                        <form id="message-send-form" class="max-w-3xl mx-auto flex items-center bg-black border border-zinc-800 rounded-full px-4 py-1.5 focus-within:border-zinc-700 transition-all shadow-inner">
                            <input type="text" id="message-text-input" autocomplete="off" class="flex-1 bg-transparent text-zinc-200 text-xs px-2 py-2 border-none focus:ring-0 outline-none placeholder-zinc-500" placeholder="Message...">
                            <button type="submit" class="text-[#0095F6] hover:text-white font-semibold text-xs px-2 tracking-wide transition-colors active:scale-95">
                                Send
                            </button>
                        </form>
                    </footer>
                </div>
            </section>
        </div>

        <div id="image-crop-modal" class="hidden fixed inset-0 bg-black/95 z-50 flex flex-col justify-between p-5 backdrop-blur-md">
            <header class="flex justify-between items-center max-w-xl mx-auto w-full border-b border-zinc-900 pb-3">
                <h3 class="text-sm font-semibold tracking-tight text-zinc-200">Edit Profile Picture</h3>
                <button id="crop-cancel-btn" class="text-xs text-zinc-400 hover:text-white transition-colors">Cancel</button>
            </header>
            
            <main class="flex-1 max-w-md mx-auto w-full flex items-center justify-center overflow-hidden my-4">
                <div class="max-h-[60vh] max-w-full">
                    <img id="cropper-target-img" class="max-w-full block">
                </div>
            </main>
            
            <footer class="max-w-xl mx-auto w-full flex flex-col space-y-4 border-t border-zinc-900 pt-3 pb-4">
                <div class="flex justify-center space-x-6">
                    <button id="crop-rotate-left" class="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full transition-all active:scale-95">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                    </button>
                    <button id="crop-rotate-right" class="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full transition-all active:scale-95">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                        </svg>
                    </button>
                </div>
                <button id="crop-save-btn" class="w-full py-2.5 bg-[#0095F6] hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition-all active:scale-[0.98]">
                    Set Profile Photo
                </button>
            </footer>
        </div>

        <div id="profile-preview-modal" class="hidden fixed inset-0 bg-black/90 z-50 flex flex-col justify-center items-center p-4 backdrop-blur-lg">
            <div id="profile-preview-close-zone" class="absolute inset-0 cursor-zoom-out"></div>
            
            <div class="relative max-w-sm w-full bg-[#121212] border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl z-10">
                <header class="p-4 flex items-center justify-between border-b border-zinc-900 bg-black/40">
                    <h4 id="preview-modal-username" class="text-xs font-semibold text-zinc-200 tracking-tight">Profile Photo</h4>
                    <button id="preview-modal-close-btn" class="p-1 text-zinc-400 hover:text-white transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </header>
                <div class="w-full aspect-square bg-black flex items-center justify-center">
                    <img id="preview-modal-img" src="assets/images/default-avatar.svg" class="w-full h-full object-cover">
                </div>
            </div>
        </div>`;
    },

    // 🔍 Search Results Item Layout
    renderUserItem(user) {
        const userAvatar = user.photoURL || 'assets/images/default-avatar.svg';
        return `
        <div data-uid="${user.uid}" class="search-user-row p-2.5 flex items-center space-x-3 rounded-lg hover:bg-zinc-900/50 cursor-pointer transition-all">
            <img src="${userAvatar}" class="avatar-trigger-preview cursor-pointer w-9 h-9 rounded-full object-cover">
            <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-zinc-200 truncate">${user.displayName}</p>
                <p class="text-[10px] text-zinc-500 truncate">${user.email}</p>
            </div>
        </div>`;
    },

    // 🟢 Instagram Sleek Chat List Row
renderChatItem(chat, currentUserId) {
    const isUnread = chat.unreadCount > 0;

    // Styling configurations base on active states
    const nameStyle = isUnread ? 'font-bold text-white text-[14px]' : 'text-zinc-300 text-[14px]';
    const msgStyle = isUnread ? 'font-semibold text-zinc-100' : 'text-zinc-400';
    const rowBg = isUnread ? 'bg-zinc-800/40' : 'hover:bg-zinc-800/20';

    // 🚀 MASTER TRICK: Raw text ko parse karke clean HTML preview nikalna
    const cleanedPreview = formatChatPreview(chat.lastMessage || '');

    return `
    <!-- ⚠️ FIXED: Class matches your selector exactly -->
    <div class="chat-inbox-row flex items-center p-3 cursor-pointer transition ${rowBg}" data-chat-id="${chat.id}">
        
        <!-- Avatar Section -->
        <div class="relative w-11 h-11 flex-shrink-0">
            <img src="${chat.targetUser?.photoURL || 'default-avatar.png'}" class="w-full h-full rounded-full object-cover avatar-trigger-preview" alt="avatar">
        </div>
        
        <!-- Details Viewport -->
        <div class="ml-3 flex-1 overflow-hidden flex flex-col justify-center">
            <div class="flex items-center justify-between w-full">
                <!-- ⚠️ CRUCIAL: Retained <p> tag exactly because your click listener tracks row.querySelector("p") -->
                <p class="${nameStyle} truncate m-0 leading-tight">${chat.targetUser?.displayName || 'Secure User'}</p>
            </div>
            
            <!-- ⚠️ FIXED: Changed from <p> to <div> to support inline parsed HTML spans safely, with proper truncation -->
            <div class="text-xs truncate mt-1.5 block max-w-full ${msgStyle} tracking-wide leading-normal">
                ${cleanedPreview}
            </div>
        </div>
        
        <!-- WhatsApp/Instagram Style Blue Notification Dot -->
        ${isUnread ? `<div class="w-2.5 h-2.5 bg-sky-500 rounded-full ml-auto my-auto mr-1 flex-shrink-0 animate-pulse"></div>` : ''}
    </div>`;
},

    // 🔵 Instagram Aesthetic Gradient & Charcoal Bubbles
renderMessageItem(msg, currentUserId) {
    const isMe = msg.senderId === currentUserId;
    const isAI = msg.senderId === "nexus-ai-bot";
    let ticksHTML = '';

    if (isMe) {
        const strokeWidth = msg.seen ? '3' : '2.5';
        const colorClass = msg.seen ? 'text-sky-400 opacity-90' : 'text-zinc-500 opacity-60';
        ticksHTML = `
        <svg class="w-3 h-3 ${colorClass} ml-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}">
            <path d="M2 12l5 5L18 6M10 17l5 5L24 10" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    }

    // Colors & Vibe Customization
    let bubbleStyle = '';
    if (isMe) {
        bubbleStyle = 'bg-gradient-to-tr from-[#3852ff] via-[#863eff] to-[#e433ff] text-white rounded-2xl rounded-tr-sm self-end';
    } else if (isAI) {
        bubbleStyle = 'bg-[#1e1e24] border border-zinc-800 text-[#f3f4f6] rounded-2xl rounded-tl-sm self-start';
    } else {
        bubbleStyle = 'bg-[#262626] text-[#efefef] rounded-2xl rounded-tl-sm self-start';
    }

    // Safe Timestamp Layout
    let timeString = '';
    if (msg.timestamp) {
        const dateObj = typeof msg.timestamp.toDate === 'function' ? msg.timestamp.toDate() : new Date(msg.timestamp);
        timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const finalHTMLContent = formatChatMessage(msg.text || '');

    return `
    <!-- ⚠️ FIXED: Added 'px-3' taaki mobile view mein bubbles screen ki deewar se na takrayein -->
    <div class="flex w-full px-3 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in mb-2 box-border">
        
        <!-- ⚠️ FIXED: Main bubble se 'overflow-hidden' hata diya hai taaki text na cuttey, aur max-width mobile ke liye max-w-[85%] kiya hai -->
        <div data-msg-id="${msg.id || ''}" class="message-bubble-row max-w-[85%] sm:max-w-[75%] md:max-w-[65%] w-auto flex flex-col px-4 py-2.5 shadow-sm font-normal tracking-wide text-[13px] leading-snug break-words ${bubbleStyle}" title="${isMe ? 'Double click to unsend' : 'Secure Message Block'}" style="word-break: break-word;">
            
            <!-- Message core container text viewport -->
            <div class="whitespace-pre-wrap w-full text-left">${finalHTMLContent}</div>
            
            <div class="flex items-center justify-end space-x-0.5 mt-1 text-[8px] opacity-50 select-none w-full">
                <span>${timeString}</span>
                ${ticksHTML}
            </div>
        </div>
    </div>`;
}
};
// Function: Chat message ke text ko professionally parse aur format karne ke liye
