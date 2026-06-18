export const AuthComponent = {
    renderLoginView() {
        return `
        <div class="min-h-full flex items-center justify-center p-4 bg-appBg">
            <div class="w-full max-w-md bg-appCard p-8 rounded-3xl border border-white/5 shadow-2xl transition-all duration-300">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold tracking-tight text-appText mb-2">Nexus <span class="text-appAccent">Chat</span></h1>
                    <p class="text-appMuted text-sm">Welcome to the 2026 communications ecosystem</p>
                </div>
                <div id="auth-alert" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center"></div>
                <form id="login-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-appMuted mb-2">Email Address</label>
                        <input type="email" id="auth-email" required class="w-full bg-appBg border border-white/5 text-appText p-3.5 rounded-xl text-sm transition-all focus:border-appAccent" placeholder="name@domain.com">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-appMuted mb-2">Secure Password</label>
                        <input type="password" id="auth-password" required class="w-full bg-appBg border border-white/5 text-appText p-3.5 rounded-xl text-sm transition-all focus:border-appAccent" placeholder="••••••••">
                    </div>
                    <button type="submit" class="w-full bg-appAccent text-appText py-3.5 font-medium rounded-xl text-sm transition-all hover:bg-opacity-90 transform active:scale-[0.99] shadow-lg shadow-appAccent/20">Sign In to Dashboard</button>
                </form>
                <div class="relative my-6 flex items-center">
                    <div class="flex-grow border-t border-white/5"></div>
                    <span class="mx-3 text-xs uppercase text-appMuted tracking-widest">Or Secure Link</span>
                    <div class="flex-grow border-t border-white/5"></div>
                </div>
                <button id="google-auth-btn" class="w-full bg-appBg border border-white/5 text-appText py-3.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center space-x-2 transition-all hover:bg-white/5">
                    <span>Connect via Google Portal</span>
                </button>
                <p class="text-center text-xs text-appMuted mt-6">
                    New to Nexus? <button id="switch-to-signup" class="text-appAccent hover:underline font-medium focus:outline-none">Establish Identifier Node</button>
                </p>
            </div>
        </div>`;
    },
    renderSignupView() {
        return `
        <div class="min-h-full flex items-center justify-center p-4 bg-appBg">
            <div class="w-full max-w-md bg-appCard p-8 rounded-3xl border border-white/5 shadow-2xl transition-all duration-300">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold tracking-tight text-appText mb-2">Create <span class="text-appAccent">Account</span></h1>
                    <p class="text-appMuted text-sm">Register your structural identity across the network</p>
                </div>
                <div id="auth-alert" class="hidden mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center"></div>
                <form id="signup-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-appMuted mb-2">Display Profile Name</label>
                        <input type="text" id="auth-username" required class="w-full bg-appBg border border-white/5 text-appText p-3.5 rounded-xl text-sm transition-all focus:border-appAccent" placeholder="Alex Mercer">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-appMuted mb-2">Email Address</label>
                        <input type="email" id="auth-email" required class="w-full bg-appBg border border-white/5 text-appText p-3.5 rounded-xl text-sm transition-all focus:border-appAccent" placeholder="name@domain.com">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold uppercase tracking-wider text-appMuted mb-2">Set Secret Password</label>
                        <input type="password" id="auth-password" required class="w-full bg-appBg border border-white/5 text-appText p-3.5 rounded-xl text-sm transition-all focus:border-appAccent" placeholder="••••••••">
                    </div>
                    <button type="submit" class="w-full bg-appAccent text-appText py-3.5 font-medium rounded-xl text-sm transition-all hover:bg-opacity-90 transform active:scale-[0.99] shadow-lg shadow-appAccent/20">Provision Node Identity</button>
                </form>
                <p class="text-center text-xs text-appMuted mt-6">
                    Registered already? <button id="switch-to-login" class="text-appAccent hover:underline font-medium focus:outline-none">De-serialize Existing Profile</button>
                </p>
            </div>
        </div>`;
    }
};