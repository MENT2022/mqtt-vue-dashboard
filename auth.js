// Simple auth service
const authService = {
    // In a real application, these would be stored securely and not in client-side code
    credentials: {
        username: 'admin',
        password: ',uF6N20Apu~%X7!1£'
    },

    isAuthenticated: false,

    login(username, password) {
        if (username === this.credentials.username && password === this.credentials.password) {
            this.isAuthenticated = true;
            localStorage.setItem('isAuthenticated', 'true');
            return true;
        }
        return false;
    },

    logout() {
        this.isAuthenticated = false;
        localStorage.removeItem('isAuthenticated');
    },

    checkAuth() {
        this.isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        return this.isAuthenticated;
    }
};

export default authService;
