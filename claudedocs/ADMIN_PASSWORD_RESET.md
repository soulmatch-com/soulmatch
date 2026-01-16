# Admin Password Reset - Quick Reference

## Your Current Admin Credentials

```
Email:    admin@soulmatch.com
Password: Admin@123
Role:     super_admin
```

**Login URL:** http://localhost:3000/admin/login

---

## How to Reset Admin Password Anytime

### Quick Method (Recommended)

```bash
npx tsx scripts/quick-reset-admin.ts <email> <new-password>
```

**Example:**
```bash
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com MyNewPassword123
```

---

### List All Admin Users

```bash
npx tsx scripts/quick-reset-admin.ts
```

This will show all admin users and usage instructions.

---

### Verify Admin Table

```bash
npx tsx scripts/verify-admin-table.ts
```

Shows all admin users with details.

---

## Password Requirements

- Minimum 6 characters
- Can include letters, numbers, symbols
- Example strong passwords:
  - `Admin@123`
  - `SuperAdmin2024!`
  - `SoulMatch#Admin`

---

## Troubleshooting Login Issues

### 1. Check Admin Exists

```bash
npx tsx scripts/verify-admin-table.ts
```

**Expected output:**
- Shows your admin user
- Status should be "🟢 Active"

---

### 2. Reset Password

```bash
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com YourNewPassword
```

---

### 3. Test Login

1. Open: http://localhost:3000/admin/login
2. Enter email: `admin@soulmatch.com`
3. Enter password: `Admin@123` (or your new password)
4. Click "Sign In"

**Expected:** Redirect to admin dashboard

---

### 4. Check Browser Console

If login fails:
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed API calls

---

### 5. Check Server Logs

Look at terminal where `npm run dev` is running for error messages.

---

## Common Issues

### Issue: "Invalid email or password"

**Solutions:**
1. Reset password using script above
2. Verify email is correct (lowercase)
3. Check admin is active in database

---

### Issue: "Account is inactive"

**Solution:**
```sql
-- Run in Supabase SQL Editor
UPDATE admins
SET is_active = true
WHERE email = 'admin@soulmatch.com';
```

---

### Issue: "Admin table does not exist"

**Solution:**
1. Run migration: `src/lib/database/migrations/create_admins_table.sql`
2. See: `ADMIN_SETUP.md` for full setup instructions

---

## Create New Admin User

```bash
npx tsx src/scripts/create-admin.ts
```

Follow the prompts to create a new admin user.

---

## Security Best Practices

1. ✅ Use strong passwords (8+ characters, mixed case, numbers, symbols)
2. ✅ Don't share admin credentials
3. ✅ Change default passwords immediately
4. ✅ Use different passwords for different admins
5. ✅ Disable inactive admin accounts
6. ⚠️ Never commit passwords to git

---

## Quick Commands Reference

```bash
# Reset password
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com NewPassword123

# Verify admin table
npx tsx scripts/verify-admin-table.ts

# Create new admin
npx tsx src/scripts/create-admin.ts

# List admins
npx tsx scripts/quick-reset-admin.ts
```

---

**Last Updated:** January 16, 2026
**Default Admin:** admin@soulmatch.com
**Default Password:** Admin@123

⚠️ **Remember to change the default password for production!**
