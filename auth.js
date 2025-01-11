const authService = {
    credentials: {
        username: import.meta.env?.VITE_AUTH_USERNAME,
        password: import.meta.env?.VITE_AUTH_PASSWORD
    },

    isAuthenticated: false,

    login(username, password) {
        if (!this.credentials.username || !this.credentials.password) {
            console.error('Authentication credentials not properly configured');
            return false;
        }
        
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
        return localStorage.getItem('isAuthenticated') === 'true';
    }
};

export default authService;
