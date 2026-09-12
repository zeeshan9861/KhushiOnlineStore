# Khushi Electronics - Admin Console Authentication Guide

## 🔐 Login Credentials

### Demo Admin Account
- **Email:** `admin@khushi.com`
- **Password:** `Khushi@12345`
- **Role:** Super Admin

### Owner Account (Gmail)
- **Email:** `khushielectronics@gmail.com`
- **Role:** Owner
- **Authentication Method:** Gmail

---

## 📋 Admin Roles & Permissions

### Role Hierarchy

| Role | Level | Permissions |
|------|-------|-------------|
| **Super Admin** | 3 | Full access - Can add, edit, delete products, manage settings, export/import data |
| **Owner** | 2 | Can add, edit products, view statistics, manage categories |
| **Admin** | 1 | Can add, edit products, view statistics only |

### Permission Matrix

| Action | Super Admin | Owner | Admin |
|--------|---|---|---|
| Add Product | ✅ | ✅ | ✅ |
| Edit Product | ✅ | ✅ | ✅ |
| Delete Product | ✅ | ❌ | ❌ |
| Delete All Products | ✅ | ❌ | ❌ |
| Export/Import Data | ✅ | ❌ | ❌ |
| Backup/Restore | ✅ | ❌ | ❌ |
| Access Settings | ✅ | ❌ | ❌ |

---

## 🚀 How to Access the Admin Console

### Step 1: Open Login Page
Open your browser and navigate to:
```
admin-login.html
```

### Step 2: Enter Credentials
- Email: `admin@khushi.com`
- Password: `Khushi@12345`
- Check "Remember me" to auto-login next time (optional)

### Step 3: Click Login
- For Email/Password: Click "Login to Admin Console" button
- For Gmail: Click "Login with Gmail" button (enter authorized email)

### Step 4: Access Admin Console
After successful login, you'll be redirected to the admin console dashboard.

---

## 📧 Gmail Login Integration

### How Gmail Login Works
1. Click "Login with Gmail" button on the login page
2. Enter your Gmail address when prompted
3. Only authorized Gmail addresses can login:
   - `khushielectronics@gmail.com` (Owner)
   - Additional accounts can be added by Super Admin

### Adding New Gmail Admins
To add a new Gmail admin account:

1. Open your browser console (F12 key)
2. Run this command:
```javascript
// Get current admins
let admins = JSON.parse(localStorage.getItem('khushi_admins'));

// Add new Gmail admin
admins.push({
  id: 'admin_003',
  email: 'newemail@gmail.com',
  name: 'Admin Name',
  role: 'admin',
  createdAt: new Date().toISOString(),
  authMethod: 'gmail'
});

// Save back to localStorage
localStorage.setItem('khushi_admins', JSON.stringify(admins));
console.log('✅ New admin added!');
```

---

## 🔑 Managing Admin Accounts

### Add New Email/Password Admin

Run in browser console:
```javascript
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

let admins = JSON.parse(localStorage.getItem('khushi_admins'));

admins.push({
  id: 'admin_004',
  email: 'newadmin@khushi.com',
  password: hashPassword('NewPassword@123'),
  name: 'New Admin',
  role: 'admin',
  createdAt: new Date().toISOString(),
  authMethod: 'email'
});

localStorage.setItem('khushi_admins', JSON.stringify(admins));
console.log('✅ Admin added successfully!');
```

### Delete Admin Account

Run in browser console:
```javascript
let admins = JSON.parse(localStorage.getItem('khushi_admins'));

// Remove admin by email
admins = admins.filter(a => a.email !== 'admin@khushi.com');

localStorage.setItem('khushi_admins', JSON.stringify(admins));
console.log('✅ Admin deleted!');
```

### Change Admin Password

Run in browser console:
```javascript
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

let admins = JSON.parse(localStorage.getItem('khushi_admins'));

let admin = admins.find(a => a.email === 'admin@khushi.com');
if (admin) {
  admin.password = hashPassword('NewPassword@123');
  localStorage.setItem('khushi_admins', JSON.stringify(admins));
  console.log('✅ Password changed!');
}
```

### Update Admin Role

Run in browser console:
```javascript
let admins = JSON.parse(localStorage.getItem('khushi_admins'));

let admin = admins.find(a => a.email === 'admin@khushi.com');
if (admin) {
  admin.role = 'super_admin'; // 'admin', 'owner', or 'super_admin'
  localStorage.setItem('khushi_admins', JSON.stringify(admins));
  console.log('✅ Role updated!');
}
```

---

## 🛡️ Security Features

### Session Management
- ✅ Sessions stored in localStorage
- ✅ Auto-login with "Remember me" option
- ✅ Logout clears session data
- ✅ Session expires when browser closes (without Remember Me)

### Password Hashing
- ✅ Passwords hashed using simple hash algorithm
- ✅ Never stored in plain text
- ✅ Hash verified during login

### Permission Checks
- ✅ Delete operations require Super Admin role
- ✅ Settings access restricted to Super Admin
- ✅ Role-based access control for all sensitive operations

### Best Practices
1. **Never share credentials** - Each admin should have their own account
2. **Use strong passwords** - Minimum 8 characters, mix of upper/lower/numbers/symbols
3. **Remember Me carefully** - Only check on trusted devices
4. **Logout when done** - Always logout before closing the browser
5. **Change default password** - Update the demo password after first login

---

## ⚠️ Troubleshooting

### "Invalid email or password"
- Check email spelling
- Verify password is correct
- Ensure caps lock is off
- Try with/without whitespace

### "Gmail account is not authorized for admin access"
- Contact Super Admin to add your email
- Ask to add you as a Gmail admin (see Adding New Gmail Admins section)

### Can't login after "Remember me"
- Clear browser cache and localStorage
- Open developer console (F12) and run:
```javascript
localStorage.removeItem('khushi_admin_session');
localStorage.removeItem('khushi_admin_remember');
```
- Refresh the page

### Forgot password
- Contact the Super Admin at: `khushielectronics@gmail.com`
- Ask them to reset your password using the console commands above

### "You do not have permission to delete products"
- You need Super Admin role to delete
- Contact your Super Admin to upgrade your role
- Super Admin can run the role update command (see "Update Admin Role" section)

---

## 🔄 Session & Cookies

### Where is session stored?
Session data is stored in browser's localStorage:
- `khushi_admin_session` - Current login session
- `khushi_admin_remember` - Remember me data
- `khushi_admins` - All admin accounts (in admin-login.js)

### View current session
Open browser console and run:
```javascript
JSON.parse(localStorage.getItem('khushi_admin_session'));
```

### Clear all session data
```javascript
localStorage.removeItem('khushi_admin_session');
localStorage.removeItem('khushi_admin_remember');
console.log('✅ Session cleared');
```

---

## 📱 Multi-Device Access

You can login from multiple devices:
1. Each device maintains its own session
2. Sessions are independent - logout on one device doesn't affect others
3. Use "Remember me" on trusted devices only
4. Check localStorage for active sessions on each device

---

## 🎯 Accessing Admin Console Features

### After Logging In:

**Products Tab** (All Roles)
- Search products
- Filter by category
- Sort by name/price
- View product details
- Edit products (if permitted)
- Delete products (Super Admin only)

**Add Product Tab** (Admin & Above)
- Add new products
- Enter product details
- Set prices and images
- Assign to categories

**Statistics Tab** (Admin & Above)
- View total products
- See average prices
- Category breakdown
- Price range analysis

**Categories Tab** (Admin & Above)
- Add new categories
- Delete empty categories
- View products per category

**Settings Tab** (Super Admin Only)
- Export products as JSON
- Import products from JSON
- Backup products
- Restore from backup
- Delete all products

---

## 📞 Support

For issues or to request additional access:
- Email: `khushielectronics@gmail.com`
- Contact: Khushi Electronics Admin Team

---

**Last Updated:** November 27, 2025
**Version:** 1.0
**Admin System:** Authenticated with Role-Based Access Control
