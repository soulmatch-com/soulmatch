# Test Admin Login - Step by Step

## 🚀 Quick Test

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Clear browser cache** (important!):
   - Press `F12` to open DevTools
   - Go to **Application** tab
   - Click **Local Storage** → `http://localhost:3000`
   - Click **Clear All** button
   - Close DevTools

3. **Go to admin login:**
   ```
   http://localhost:3000/admin/login
   ```

4. **Login with:**
   ```
   Email:    admin@soulmatch.com
   Password: Admin@123
   ```

5. **Click "Sign in as Admin"**

6. **Expected Result:**
   - ✅ Toast message: "Welcome back, Admin!"
   - ✅ URL changes to: `http://localhost:3000/admin/dashboard`
   - ✅ Dashboard loads with: "Welcome back, Super Admin"
   - ✅ Stats cards visible (Total Users, Active Profiles, etc.)

---

## 🔍 Detailed Testing

### Test 1: Fresh Login (Clean State)
```bash
1. Open browser in incognito/private mode
2. Go to: http://localhost:3000/admin/login
3. Enter credentials
4. Click "Sign in as Admin"

Expected:
✅ Success toast appears
✅ Redirect to dashboard happens within 1 second
✅ Dashboard shows admin name
✅ No redirect back to login
```

---

### Test 2: Already Logged In
```bash
1. After successful login (from Test 1)
2. Manually go to: http://localhost:3000/admin/login
3. Observe behavior

Expected:
✅ Brief "Redirecting to dashboard..." message
✅ Immediate redirect to dashboard
✅ NO login form shown
```

---

### Test 3: Session Persistence
```bash
1. Login successfully
2. Note you're on dashboard
3. Close the browser tab
4. Open new tab
5. Go to: http://localhost:3000/admin/dashboard

Expected:
✅ Dashboard loads immediately
✅ No login required
✅ Admin session persisted from localStorage
```

---

### Test 4: Refresh Dashboard
```bash
1. Login and go to dashboard
2. Press F5 or Ctrl+R to refresh page
3. Observe behavior

Expected:
✅ Dashboard reloads
✅ No redirect to login
✅ Admin data still present
✅ Stats load correctly
```

---

### Test 5: Direct Dashboard Access (Not Logged In)
```bash
1. Clear localStorage (F12 → Application → Local Storage → Clear)
2. Go directly to: http://localhost:3000/admin/dashboard

Expected:
✅ Redirect to /admin/login
✅ Login form shows
✅ Can login and return to dashboard
```

---

## 🐛 Troubleshooting

### Issue: Stuck on "Redirecting to dashboard..."

**Check:**
```javascript
// Open browser console (F12)
localStorage.getItem('admin-storage')
```

**Should show:**
```json
{
  "state": {
    "admin": {
      "id": "...",
      "email": "admin@soulmatch.com",
      "name": "Super Admin",
      "role": "super_admin"
    }
  },
  "version": 0
}
```

**If null:** Login didn't save to localStorage
**Fix:** Check Network tab for API errors

---

### Issue: Dashboard redirects to login immediately

**Check:**
1. Open browser console
2. Type: `localStorage.getItem('admin-storage')`
3. If returns null → localStorage not being set

**Debug:**
```javascript
// In AdminLoginForm.tsx, check if setAdmin is called
console.log('Setting admin:', admin)
```

---

### Issue: API login fails

**Check Network Tab (F12):**
1. Find `POST /api/admin/auth/login`
2. Check Status Code
3. Check Response

**Common errors:**
- 401: Wrong password → Reset password
- 404: Admin not found → Check email
- 500: Server error → Check terminal logs

---

### Issue: "Invalid email or password"

**Solutions:**
```bash
# Reset password
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com Admin@123

# Verify admin exists
npx tsx scripts/verify-admin-table.ts
```

---

## ✅ Success Criteria

All of these should work:
- [x] Can login with correct credentials
- [x] Dashboard loads after login
- [x] No redirect loop
- [x] Session persists on refresh
- [x] Already-logged-in users redirected from login page
- [x] Not-logged-in users redirected to login from dashboard
- [x] LocalStorage contains admin data after login

---

## 📊 Browser Console Logs

**During successful login, you should see:**
```
1. [Network] POST /api/admin/auth/login → 200 OK
2. [Console] Setting admin: {id: "...", email: "...", ...}
3. [Toast] "Welcome back, Admin!"
4. [Router] Navigating to /admin/dashboard
5. [Console] Admin data: {...}
```

**If you see errors:**
```
❌ POST /api/admin/auth/login → 401 Unauthorized
   → Check credentials

❌ TypeError: Cannot read property 'admin' of null
   → Store not initialized properly

❌ Network request failed
   → Dev server not running
```

---

## 🎬 Video Walkthrough (Steps)

**Record your screen showing:**
1. Clear localStorage
2. Open /admin/login
3. Enter credentials
4. Click sign in
5. See success toast
6. Dashboard loads
7. Refresh page
8. Dashboard still loads
9. Go to /admin/login
10. Redirected back to dashboard

**Share video if issue persists for debugging**

---

## 🔧 Quick Fixes

### Fix 1: Clear All Cache
```bash
# Clear everything
1. F12 → Application
2. Clear storage → Clear site data
3. Hard refresh: Ctrl+Shift+R
```

### Fix 2: Reset Admin Password
```bash
npx tsx scripts/quick-reset-admin.ts admin@soulmatch.com NewPassword123
```

### Fix 3: Restart Dev Server
```bash
# Ctrl+C to stop
npm run dev
```

### Fix 4: Check Admin Table
```bash
npx tsx scripts/verify-admin-table.ts
```

---

**Testing Date:** January 16, 2026
**Expected Duration:** 5-10 minutes
**Difficulty:** Easy ✅
