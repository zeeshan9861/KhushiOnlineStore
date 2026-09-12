/**
 * Admin Login Authentication System
 * Supports Email/Password and Gmail OAuth Integration
 */

class AdminAuthManager {
  constructor() {
    this.admins = this.loadAdmins();
    this.currentUser = this.checkLoggedIn();
    this.setupEventListeners();
  }

  setupEventListeners() {
    const form = document.getElementById('login-form');
    const gmailBtn = document.getElementById('gmail-login-btn');

    if (form) {
      form.addEventListener('submit', (e) => this.handleLogin(e));
    }

    if (gmailBtn) {
      gmailBtn.addEventListener('click', () => this.handleGmailLogin());
    }
  }

  // Load admin users from localStorage (pre-configured)
  loadAdmins() {
    const stored = localStorage.getItem('khushi_admins');
    if (stored) {
      return JSON.parse(stored);
    }

    // Default admin credentials (first time setup)
    const defaultAdmins = [
      {
        id: 'admin_001',
        email: 'admin@khushi.com',
        password: this.hashPassword('Khushi@12345'), // Hash stored password
        name: 'Khushi Admin',
        role: 'super_admin',
        createdAt: new Date().toISOString(),
        authMethod: 'email'
      },
      {
        id: 'admin_002',
        email: 'khushielectronics@gmail.com',
        name: 'Khushi Owner',
        role: 'owner',
        createdAt: new Date().toISOString(),
        authMethod: 'gmail'
      }
    ];

    localStorage.setItem('khushi_admins', JSON.stringify(defaultAdmins));
    return defaultAdmins;
  }

  // Simple password hashing (for demo purposes)
  hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return 'hash_' + Math.abs(hash).toString(16);
  }

  // Verify password
  verifyPassword(password, hashedPassword) {
    return this.hashPassword(password) === hashedPassword;
  }

  // Handle standard email/password login
  handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    // Validate inputs
    if (!email || !password) {
      this.showError('Email and password are required');
      return;
    }

    // Find admin user
    const admin = this.admins.find(a => a.email.toLowerCase() === email.toLowerCase());

    if (!admin) {
      this.showError('❌ Invalid email or password');
      console.error('Admin not found:', email);
      return;
    }

    // Verify password
    if (admin.authMethod === 'email' && !this.verifyPassword(password, admin.password)) {
      this.showError('❌ Invalid email or password');
      return;
    }

    // Success
    this.loginUser(admin, remember);
  }

  // Handle Gmail login (simplified OAuth flow)
  handleGmailLogin() {
    const btn = document.getElementById('gmail-login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Connecting to Gmail...';

    // Simulate OAuth flow (in production, use proper Google OAuth)
    setTimeout(() => {
      const email = prompt('Enter your Gmail address:');
      btn.disabled = false;
      btn.innerHTML = '<span class="gmail-icon">📧</span> Login with Gmail';

      if (!email) return;

      // Check if Gmail admin exists
      let admin = this.admins.find(a => a.email.toLowerCase() === email.toLowerCase() && a.authMethod === 'gmail');

      if (!admin) {
        // For demo: allow khushielectronics@gmail.com
        if (email.toLowerCase() === 'khushielectronics@gmail.com') {
          admin = {
            id: 'admin_002',
            email: 'khushielectronics@gmail.com',
            name: 'Khushi Owner',
            role: 'owner',
            authMethod: 'gmail'
          };
          this.loginUser(admin, true);
        } else {
          this.showError(`❌ Gmail account "${email}" is not authorized for admin access`);
        }
      } else {
        this.loginUser(admin, true);
      }
    }, 1000);
  }

  // Login user and set session
  loginUser(admin, remember = false) {
    const session = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      loginTime: new Date().toISOString(),
      authMethod: admin.authMethod
    };

    // Store session
    localStorage.setItem('khushi_admin_session', JSON.stringify(session));

    if (remember) {
      localStorage.setItem('khushi_admin_remember', JSON.stringify({
        email: admin.email,
        rememberTime: new Date().toISOString()
      }));
    }

    this.showSuccess(`✅ Welcome, ${admin.name}!`);
    console.log('✅ Admin logged in:', admin.email);

    // Redirect to admin console after 1.5 seconds
    setTimeout(() => {
      window.location.href = 'admin-console.html';
    }, 1500);
  }

  // Check if user is already logged in
  checkLoggedIn() {
    const session = localStorage.getItem('khushi_admin_session');
    if (session) {
      try {
        return JSON.parse(session);
      } catch (error) {
        console.error('Invalid session:', error);
        return null;
      }
    }
    return null;
  }

  // Show error message
  showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  // Show success message
  showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
      successDiv.textContent = message;
      successDiv.style.display = 'block';
    }
  }
}

// ============================================
// Session & Permission Utilities
// ============================================

class AdminSession {
  static getCurrentSession() {
    const session = localStorage.getItem('khushi_admin_session');
    return session ? JSON.parse(session) : null;
  }

  static isLoggedIn() {
    return this.getCurrentSession() !== null;
  }

  static logout() {
    localStorage.removeItem('khushi_admin_session');
    localStorage.removeItem('khushi_admin_remember');
    window.location.href = 'index.html';
  }

  static getRole() {
    const session = this.getCurrentSession();
    return session ? session.role : null;
  }

  static hasPermission(requiredRole) {
    const role = this.getRole();
    const roleHierarchy = {
      'super_admin': 3,
      'owner': 2,
      'admin': 1
    };
    return (roleHierarchy[role] || 0) >= (roleHierarchy[requiredRole] || 0);
  }

  static canEditProduct() {
    return this.hasPermission('admin');
  }

  static canDeleteProduct() {
    return this.hasPermission('super_admin');
  }

  static canAccessSettings() {
    return this.hasPermission('super_admin');
  }
}

// ============================================
// Initialize Auth Manager on Page Load
// ============================================

let authManager;

document.addEventListener('DOMContentLoaded', () => {
  authManager = new AdminAuthManager();
  console.log('✅ Auth Manager Initialized');
});
