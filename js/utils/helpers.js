export const Helpers = {
    // XSS Prevention: HTML tags ko safely clean karne ke liye
    sanitizeHTML(str) {
        if (!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    // Format Firebase timestamp into readable time (HH:MM)
    formatTime(timestamp) {
        if (!timestamp) return '';
        // Agar Firebase timestamp hai toh toDate() use karein, warna normal date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
};