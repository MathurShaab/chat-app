export const ChatComponent = {
    renderMainLayout() {
        return `
        <div class="h-full flex bg-appBg overflow-hidden">
            <aside id="sidebar-panel" class="w-full md:w-[380px] h-full flex flex-col border-r border-white/5 bg-[#121214] z-20 transition-all duration-300">
                <div class="p-4 flex items-center justify-between border-b border-white/5">
                    <div class="flex items-center space-x-3">
                        <img id="current-user-avatar" src="assets/images/default-avatar.svg" class="w-10 h-10 rounded-full border border-appAccent/30 object-cover">
                        <div>
                            <h3 id="current-user-name" class="text-sm font-semibold text-appText truncate max-w-[150px]">Loading...</h3>
                            <span class="text-[10px] text-emerald-400 flex items-center"><span class="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block mr-1"></span>Online</span>
                        </div>
                    </div>
                    <button id="logout-btn" class="p-2 text-appMuted hover:text-red-400 transition-colors rounded-xl hover:bg-white/5">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>

                <div class="p-3">
                    <div class="relative">
                        <input type="text" id="user-search-input" class="w-full bg-appBg border border-white/5 text-appText pl-10 pr-4 py-2.5 rounded-xl text-xs placeholder-appMuted focus:border-appAccent transition-all" placeholder="Search global users node...">
                        <svg class="w-4 h-4 text-appMuted absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto px-2 pb-4">
                    <div id="search-results-section" class="hidden mb-4">
                        <p class="text-[10px] uppercase tracking-wider text-appAccent font-semibold px-2 mb-2">Search Results</p>
                        <div id="search-users-list" class="space-y-1"></div>
                        <div class="border-b border-white/5 my-3"></div>
                    </div>

                    <p class="text-[10px] uppercase tracking-wider text-appMuted font-semibold px-2 mb-2">Recent Streams</p>
                    <div id="inbox-chats-list" class="space-y-1">
                        <div class="p-3 animate-pulse flex space-x-3 bg-white/5 rounded-xl">
                            <div class="w-11 h-11 bg-white/10 rounded-full"></div>
                            <div class="flex-1 space-y-2 py-1">
                                <div class="h-3 bg-white/10 rounded w-1/3"></div>
                                <div class="h-3 bg-white/10 rounded w-3/4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <section id="chat-workspace" class="flex-1 h-full flex flex-col bg-appBg relative">
                <div id="no-chat-selected" class="absolute inset-0 flex flex-col justify-center items-center p-6 text-center z-10 bg-appBg">
                    <div class="w-20 h-20 rounded-2xl bg-appCard flex items-center justify-center border border-white/5 shadow-xl mb-4 text-appAccent">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h2 class="text-lg font-bold text-appText">Nexus Workspace Ready</h2>
                    <p class="text-appMuted text-xs max-w-xs mt-1">Select an active contact channel from the panel or execute a search query to initiate real-time streaming.</p>
                </div>

                <div id="active-chat-box" class="hidden h-full flex flex-col w-full">
                    <header class="p-4 glass-effect flex items-center justify-between border-b border-white/5 z-10">
                        <div class="flex items-center space-x-3">
                            <button id="back-to-list-btn" class="md:hidden p-2 -ml-2 text-appMuted hover:text-appText">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <img id="active-chat-avatar" src="assets/images/default-avatar.png" class="w-10 h-10 rounded-full object-cover border border-white/5">
                            <div>
                                <h4 id="active-chat-name" class="text-sm font-semibold text-appText">...</h4>
                                <span id="active-chat-status" class="text-[10px] text-appMuted">Updating network node...</span>
                            </div>
                        </div>
                    </header>

                    <main id="messages-feed" class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0c0c0d]"></main>

                    <footer class="p-4 bg-transparent">
                        <form id="message-send-form" class="max-w-4xl mx-auto flex items-center space-x-2 bg-appCard border border-white/5 p-2 rounded-2xl shadow-xl glass-effect">
                            <input type="text" id="message-text-input" autocomplete="off" class="flex-1 bg-transparent text-appText text-sm px-3 py-2.5 border-none focus:ring-0 placeholder-appMuted" placeholder="Write an encrypted message...">
                            <button type="submit" class="p-2.5 bg-appAccent hover:bg-opacity-90 text-appText rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center">
                                <svg class="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </form>
                    </footer>
                </div>
            </section>
        </div>`;
    },

    renderUserItem(user) {
        return `
        <div data-uid="${user.uid}" class="search-user-row p-2.5 flex items-center space-x-3 rounded-xl hover:bg-appAccent/10 cursor-pointer border border-transparent transition-all">
            <img src="${user.photoURL}" class="w-9 h-9 rounded-full object-cover">
            <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-appText truncate">${user.displayName}</p>
                <p class="text-[10px] text-appMuted truncate">${user.email}</p>
            </div>
        </div>`;
    },

    renderChatItem(chat, currentUserId) {
        return `
        <div data-chat-id="${chat.id}" class="chat-inbox-row p-3 flex items-center space-x-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent transition-all">
            <img src="${chat.targetUser.photoURL}" class="w-11 h-11 rounded-full object-cover border border-white/5">
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold text-appText truncate">${chat.targetUser.displayName}</p>
                    <span class="text-[9px] text-appMuted">${chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                </div>
                <p class="text-[11px] text-appMuted truncate mt-0.5">${chat.lastMessage || 'Tap to begin streaming...'}</p>
            </div>
        </div>`;
    },

    renderMessageItem(msg, currentUserId) {
        const isMe = msg.senderId === currentUserId;
        return `
        <div class="flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in">
            <div class="max-w-[75%] px-4 py-2.5 rounded-2xl text-xs shadow-md shadow-black/10 line-clamp-none break-words
                ${isMe ? 'bg-appAccent text-appText rounded-tr-none' : 'bg-appCard text-appText rounded-tl-none border border-white/5'}">
                <p class="leading-relaxed">${msg.text}</p>
                <div class="flex items-center justify-end space-x-1 mt-1 text-[8px] opacity-60">
                    <span>${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    ${isMe ? `
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                    ` : ''}
                </div>
            </div>
        </div>`;
    }
};