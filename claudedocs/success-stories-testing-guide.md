# Success Stories - Comprehensive Testing Guide

Complete testing checklist for the success stories feature with manual and automated tests.

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Database Testing](#database-testing)
- [API Testing](#api-testing)
- [Frontend Testing](#frontend-testing)
- [Integration Testing](#integration-testing)
- [Test Scenarios](#test-scenarios)
- [Common Issues](#common-issues)

---

## Prerequisites

### ✅ Pre-Test Checklist

- [ ] Database migration has been run: `database/migrations/create_success_stories_table.sql`
- [ ] Next.js development server is running: `npm run dev`
- [ ] Supabase is accessible and environment variables are set
- [ ] Admin account exists and you can log in to `/admin/login`
- [ ] Cloudinary credentials are configured for photo uploads

### Environment Variables Verification

```bash
# Check required env vars
echo "NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:20}..."
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo "CLOUDINARY_CLOUD_NAME: $NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
```

---

## Database Testing

### 1. Verify Table Creation

**Supabase SQL Editor**:
```sql
-- Check table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'success_stories';

-- Verify columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'success_stories'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'success_stories';

-- Verify RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'success_stories';
```

**Expected Results**:
- ✅ Table `success_stories` exists
- ✅ 18 columns present
- ✅ 6 indexes created
- ✅ 4 RLS policies active

### 2. Test Database Constraints

```sql
-- Test couple_names length constraint (should fail)
INSERT INTO success_stories (couple_names, location, story_text)
VALUES ('AB', 'City', 'This is a test story with at least 50 characters in it for validation.');
-- Expected: Error - couple_names too short

-- Test story_text length constraint (should fail)
INSERT INTO success_stories (couple_names, location, story_text)
VALUES ('Test & Story', 'City', 'Short');
-- Expected: Error - story_text too short

-- Test valid insertion (should succeed)
INSERT INTO success_stories (
  couple_names, location, story_text,
  is_featured, is_published, display_order,
  submission_type, status
) VALUES (
  'Test Couple & Names',
  'Test City',
  'This is a valid test story with more than 50 characters to pass validation requirements.',
  true,
  true,
  10,
  'admin',
  'approved'
) RETURNING *;
-- Expected: Success with returned row
```

### 3. Test RLS Policies

```sql
-- As anon user, should only see published stories
SET ROLE anon;
SELECT * FROM success_stories;
-- Expected: Only published stories

-- As authenticated user, can insert own submissions
SET ROLE authenticated;
INSERT INTO success_stories (
  couple_names, location, story_text,
  submission_type, status, submitted_by
) VALUES (
  'User Test & Story',
  'User City',
  'User submitted story with more than 50 characters for testing purposes.',
  'user_submitted',
  'pending',
  auth.uid()
);
-- Expected: Success (if auth.uid() is valid)

-- Reset role
RESET ROLE;
```

---

## API Testing

### 1. Public API Tests

**Test GET /api/success-stories**:

```bash
# Basic request
curl http://localhost:3000/api/success-stories

# With query parameters
curl "http://localhost:3000/api/success-stories?limit=10&offset=0"

# Featured stories only
curl "http://localhost:3000/api/success-stories?limit=6&featured_only=true"

# Check response headers
curl -I http://localhost:3000/api/success-stories
```

**Expected Responses**:

```json
{
  "stories": [...],
  "total": 3,
  "pagination": {
    "limit": 6,
    "offset": 0,
    "hasMore": false
  }
}
```

**Cache Headers**:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`

### 2. Admin API Tests

**Important**: These require admin authentication. For testing, you'll need to:
1. Log in to `/admin/login` in browser
2. Use browser DevTools to copy session cookies
3. Include cookies in curl requests

**Test GET /api/admin/success-stories**:

```bash
# List all stories
curl -H "Cookie: admin-session=..." \
  http://localhost:3000/api/admin/success-stories

# Filter by status
curl -H "Cookie: admin-session=..." \
  "http://localhost:3000/api/admin/success-stories?status=pending"

# Filter by published
curl -H "Cookie: admin-session=..." \
  "http://localhost:3000/api/admin/success-stories?published=true"

# Pagination
curl -H "Cookie: admin-session=..." \
  "http://localhost:3000/api/admin/success-stories?page=1&limit=20"
```

**Test POST /api/admin/success-stories**:

```bash
curl -X POST http://localhost:3000/api/admin/success-stories \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=..." \
  -d '{
    "couple_names": "API Test & Couple",
    "location": "Mumbai",
    "story_text": "This is an API test story created via cURL with sufficient characters for validation.",
    "is_featured": true,
    "is_published": true,
    "display_order": 5
  }'
```

**Test PATCH /api/admin/success-stories/[id]**:

```bash
# Update featured status
curl -X PATCH http://localhost:3000/api/admin/success-stories/[STORY_ID] \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=..." \
  -d '{"is_featured": true}'

# Update multiple fields
curl -X PATCH http://localhost:3000/api/admin/success-stories/[STORY_ID] \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=..." \
  -d '{
    "is_published": true,
    "display_order": 20,
    "status": "approved"
  }'
```

**Test DELETE /api/admin/success-stories/[id]**:

```bash
curl -X DELETE http://localhost:3000/api/admin/success-stories/[STORY_ID] \
  -H "Cookie: admin-session=..."
```

---

## Frontend Testing

### 1. Homepage Integration Test

**Manual Steps**:

1. **Navigate to Homepage**:
   - Open `http://localhost:3000`
   - Scroll to "Family Success Stories" section

2. **Verify Loading State**:
   - Should see 3 skeleton loading cards initially
   - Cards should have animated pulse effect

3. **Verify Stories Display**:
   - After loading, stories should appear
   - Each card should show:
     - ⭐ 5 stars rating
     - Story text (50-1000 characters)
     - Couple photo OR initials in circle
     - Couple names
     - Location with globe icon

4. **Verify Empty State**:
   - If no stories exist, should show:
     - Heart icon (gray)
     - "No success stories available yet" message

5. **Test Responsiveness**:
   - Desktop: 3 columns grid
   - Tablet: 2 columns grid
   - Mobile: 1 column stack

**Browser Console Tests**:

```javascript
// Check API call was made
fetch('/api/success-stories?limit=6&featured_only=true')
  .then(r => r.json())
  .then(console.log)

// Expected: { stories: [...], total: N, pagination: {...} }
```

### 2. Admin Navigation Test

**Manual Steps**:

1. **Login to Admin**:
   - Navigate to `http://localhost:3000/admin/login`
   - Enter admin credentials
   - Click "Login"

2. **Verify Navigation Menu**:
   - **Desktop**: Check top navigation bar
     - Should see "Success Stories" with ❤️ Heart icon
     - Between "Verification Queue" and "Settings"
   - **Mobile**: Open hamburger menu
     - Should see "Success Stories" in menu list
     - Same position as desktop

3. **Click Menu Item**:
   - Click "Success Stories"
   - Should navigate to `/admin/success-stories`
   - URL should update
   - Page should load without errors

4. **Verify Active State**:
   - "Success Stories" menu item should be highlighted
   - Text should be white (vs slate-300 for inactive)

### 3. Admin Panel Functionality Test

**Test Dashboard/Stats**:

1. **Stats Cards** (top of page):
   - [ ] Total Stories (count of all)
   - [ ] Published (count where is_published=true)
   - [ ] Pending Approval (count where status='pending')
   - [ ] Featured (count where is_featured=true)
   - Numbers should update in real-time after actions

**Test Filter Tabs**:

1. **All Tab**:
   - Click "All" tab
   - Should show all stories regardless of status
   - Count badge should match total

2. **Pending Approval Tab**:
   - Click "Pending Approval" tab
   - Should filter to only status='pending'
   - Count badge should match pending count

3. **Published Tab**:
   - Click "Published" tab
   - Should filter to is_published=true
   - Count badge should match published count

4. **Drafts Tab**:
   - Click "Drafts" tab
   - Should filter to is_published=false
   - Count badge should match unpublished count

**Test Data Table**:

1. **Columns Display**:
   - [ ] Couple (photo + names + submission type)
   - [ ] Location
   - [ ] Status (color-coded badge)
   - [ ] Featured (star icon toggle)
   - [ ] Published (eye icon toggle)
   - [ ] Display Order (number)
   - [ ] Actions (buttons)

2. **Row Data**:
   - Photo displays correctly OR initials fallback
   - Submission type shows "User Submitted" or "Admin Created"
   - Status badges colored correctly:
     - Yellow for Pending
     - Green for Approved
     - Red for Rejected

### 4. Create Story Test

**Manual Steps**:

1. **Open Create Dialog**:
   - Click "Create New Story" button (top right)
   - Dialog should open with form

2. **Fill Form**:
   - Couple Names: "Test & Couple"
   - Location: "Test City"
   - Story Text: "This is a comprehensive test story with more than 50 characters to validate the form properly works."
   - Upload couple photo (optional)
   - Marriage Date: Select a date (optional)
   - Display Order: 10
   - Check "Featured"
   - Check "Published"

3. **Character Counter**:
   - Should show "X / 1000 characters"
   - Should turn red if < 50 or > 1000
   - Should be green/gray if valid range

4. **Validation**:
   - Try submitting with < 50 characters
   - Should show error: "Story must be at least 50 characters"
   - Try with empty couple names
   - Should show error: "Couple names must be at least 5 characters"

5. **Submit**:
   - Click "Create Story"
   - Should show toast: "Story created successfully"
   - Dialog should close
   - Table should refresh and show new story
   - Stats cards should update

6. **Verify in Table**:
   - New story appears at top/bottom based on sort
   - Featured star is filled
   - Eye icon is open (published)
   - Display order shows 10

### 5. Edit Story Test

**Manual Steps**:

1. **Open Edit Dialog**:
   - Find a story in table
   - Click ✏️ (Edit) button
   - Dialog opens with pre-filled data

2. **Verify Pre-Fill**:
   - All fields populated with existing data
   - Checkboxes reflect current state
   - Photo preview shows if exists

3. **Make Changes**:
   - Change couple names
   - Update story text
   - Toggle featured/published
   - Change display order

4. **Submit**:
   - Click "Update Story"
   - Should show toast: "Story updated successfully"
   - Dialog closes
   - Table updates with new data

5. **Verify Changes**:
   - Changes reflected immediately in table
   - No page refresh needed
   - Stats update if published status changed

### 6. Delete Story Test

**Manual Steps**:

1. **Open Delete Confirmation**:
   - Find a story in table
   - Click 🗑️ (Delete) button
   - AlertDialog opens

2. **Verify Confirmation**:
   - Dialog title: "Delete Success Story?"
   - Message includes couple names
   - Warning: "This action cannot be undone"
   - Two buttons: Cancel, Delete (red)

3. **Cancel Test**:
   - Click "Cancel"
   - Dialog closes
   - Story remains in table

4. **Delete Test**:
   - Re-open delete dialog
   - Click "Delete" (red button)
   - Should show toast: "Story deleted successfully"
   - Dialog closes
   - Story removed from table
   - Stats update

### 7. Quick Actions Test

**Featured Toggle**:

1. **Toggle ON**:
   - Find story with empty star
   - Click ⭐ (Star) icon
   - Should show toast: "Story featured"
   - Star should fill with yellow color
   - Stats card "Featured" count increases

2. **Toggle OFF**:
   - Click filled star icon
   - Should show toast: "Story unfeatured"
   - Star becomes outline only
   - Stats card "Featured" count decreases

**Published Toggle**:

1. **Publish**:
   - Find unpublished story (EyeOff icon)
   - Click 👁️‍🗨️ icon
   - Should show toast: "Story published"
   - Icon changes to Eye (open)
   - Stats card "Published" count increases
   - Story now visible on homepage

2. **Unpublish**:
   - Click Eye icon on published story
   - Should show toast: "Story unpublished"
   - Icon changes to EyeOff
   - Stats card "Published" count decreases
   - Story removed from homepage

**Approve/Reject (for pending stories)**:

1. **Approve**:
   - Filter to "Pending Approval" tab
   - Find story with status='pending'
   - Click ✓ (Check) button
   - Should show toast: "Story approved and published"
   - Status badge changes to Green "Approved"
   - Story auto-published (eye icon opens)
   - Story moves to "Published" tab

2. **Reject**:
   - Find pending story
   - Click ✗ (X) button
   - Should show toast: "Story rejected"
   - Status badge changes to Red "Rejected"
   - Story remains unpublished

---

## Integration Testing

### 1. End-to-End Workflow

**Test: Admin Creates → Homepage Displays**

1. Create story in admin panel
2. Set featured=true, published=true, display_order=100
3. Navigate to homepage
4. Story appears first in grid
5. Verify photo, names, location, text all display correctly

**Test: User Submits → Admin Approves → Homepage Updates**

1. User submits story (via future user submission form)
2. Story appears in admin "Pending Approval" tab
3. Admin reviews and clicks "Approve"
4. Story published automatically
5. Homepage shows new story
6. Homepage API returns updated list

### 2. Photo Upload Integration

**Test Upload Flow**:

1. **Create/Edit Dialog**:
   - Click "Choose File" for couple photo
   - Select image file (JPG/PNG)
   - Should show "Uploading..." text
   - After upload, preview appears
   - URL saved to `couple_photo_url` field

2. **Verify Cloudinary**:
   - Check Cloudinary dashboard
   - Photo should be in `soulmatch/success-stories/` folder
   - URL should be HTTPS
   - Image accessible via URL

3. **Homepage Display**:
   - Story with photo shows actual image
   - Image loads quickly (Cloudinary CDN)
   - Fallback to initials if photo fails

### 3. Display Order Functionality

**Test Ordering Logic**:

1. Create 5 stories with different display orders:
   - Story A: display_order = 100
   - Story B: display_order = 90
   - Story C: display_order = 80
   - Story D: display_order = 0
   - Story E: display_order = 0 (created later)

2. Homepage should show:
   - Position 1: Story A (100)
   - Position 2: Story B (90)
   - Position 3: Story C (80)
   - Position 4: Story E (0, newer created_at)
   - Position 5: Story D (0, older created_at)

3. Change Story D display_order to 95
4. Refresh homepage
5. Story D should now be position 2

---

## Test Scenarios

### Scenario 1: Fresh Installation

**Goal**: Verify fresh install works

1. Run database migration
2. Start Next.js server
3. Navigate to homepage
4. Should see "No success stories available yet"
5. Login to admin
6. Navigate to Success Stories
7. Should see empty table
8. Create first story
9. Homepage should update immediately

**Expected**: ✅ All steps complete without errors

### Scenario 2: Featured Stories Only

**Goal**: Verify featured filter works

1. Create 10 stories
2. Mark only 3 as featured
3. Homepage API call: `?featured_only=true`
4. Should return only 3 stories
5. Homepage displays only those 3

**Expected**: ✅ Only featured stories appear

### Scenario 3: User Submission Approval

**Goal**: Verify approval workflow

1. User submits story (status=pending, published=false)
2. Admin sees in "Pending Approval" tab
3. Admin clicks "Approve"
4. Story status=approved, published=true
5. Homepage displays new story
6. User can see their approved story

**Expected**: ✅ Complete workflow functions

### Scenario 4: Bulk Operations

**Goal**: Test multiple rapid actions

1. Create 20 stories quickly
2. Toggle featured on 10 stories
3. Publish all 20 stories
4. Change display orders
5. Delete 5 stories
6. Verify stats remain accurate
7. Verify homepage reflects changes

**Expected**: ✅ No race conditions or errors

### Scenario 5: Validation Edge Cases

**Goal**: Test all validation rules

1. **Couple Names**:
   - Too short (< 5): ❌ Error
   - Too long (> 100): ❌ Error
   - Valid (5-100): ✅ Success

2. **Location**:
   - Too short (< 2): ❌ Error
   - Too long (> 100): ❌ Error
   - Valid (2-100): ✅ Success

3. **Story Text**:
   - Too short (< 50): ❌ Error
   - Too long (> 1000): ❌ Error
   - Valid (50-1000): ✅ Success

4. **Wedding Photos**:
   - > 5 photos: ❌ Error
   - ≤ 5 photos: ✅ Success

**Expected**: ✅ All validations work correctly

---

## Common Issues

### Issue 1: API Returns Empty Array

**Symptoms**: Homepage shows "No success stories available"

**Debugging**:
```sql
-- Check if stories exist
SELECT COUNT(*) FROM success_stories;

-- Check published stories
SELECT COUNT(*) FROM success_stories WHERE is_published = true;

-- Check RLS policies
SELECT * FROM success_stories; -- As anon user
```

**Solutions**:
- Ensure stories have `is_published = true`
- Ensure stories have `status = 'approved'`
- Check RLS policies are correct
- Verify API endpoint returns data

### Issue 2: Photos Not Uploading

**Symptoms**: Upload button does nothing or fails

**Debugging**:
```bash
# Check Cloudinary env vars
echo $NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET

# Test upload endpoint directly
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/test-image.jpg"
```

**Solutions**:
- Verify Cloudinary credentials
- Check file size < 5MB
- Ensure file is valid image format
- Check network tab for errors

### Issue 3: Admin Menu Not Showing

**Symptoms**: Success Stories menu item missing

**Debugging**:
- Check `src/modules/admin/config/index.ts` has `SUCCESS_STORIES` route
- Check `src/components/admin/AdminHeader.tsx` imports `Heart` icon
- Refresh browser cache (Ctrl+Shift+R)
- Check browser console for errors

**Solutions**:
- Restart dev server
- Clear browser cache
- Verify file changes saved
- Check for TypeScript errors

### Issue 4: Toggles Not Working

**Symptoms**: Clicking star/eye does nothing

**Debugging**:
```javascript
// Browser console
fetch('/api/admin/success-stories/STORY_ID', {
  method: 'PATCH',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({is_featured: true})
}).then(r => r.json()).then(console.log)
```

**Solutions**:
- Check admin authentication
- Verify STORY_ID is correct UUID
- Check network tab for 403/401 errors
- Ensure `createAdminClient()` is used in API route

### Issue 5: Table Not Refreshing

**Symptoms**: Changes don't appear immediately

**Debugging**:
- Open browser DevTools → Network tab
- Perform action (create/edit/delete)
- Check if `fetchStories()` API call is made
- Verify response contains updated data

**Solutions**:
- Check `fetchStories()` is called after mutations
- Verify state updates: `setStories(data.stories)`
- Check for JavaScript errors in console
- Ensure async/await is properly handled

---

## Performance Testing

### Load Testing

```bash
# Test concurrent requests
ab -n 100 -c 10 http://localhost:3000/api/success-stories

# Expected:
# - All requests succeed (200 OK)
# - Average response time < 500ms
# - No errors
```

### Cache Testing

```bash
# First request (cache miss)
curl -I http://localhost:3000/api/success-stories
# Should have: Cache-Control header

# Second request (cache hit)
curl -I http://localhost:3000/api/success-stories
# Should be faster due to caching
```

---

## Automated Testing Scripts

### Quick Smoke Test

```bash
#!/bin/bash
# smoke-test.sh - Quick validation

echo "Testing public API..."
RESPONSE=$(curl -s http://localhost:3000/api/success-stories)
if echo "$RESPONSE" | grep -q '"stories"'; then
  echo "✅ Public API working"
else
  echo "❌ Public API failed"
  exit 1
fi

echo "Testing homepage loads..."
if curl -s http://localhost:3000 | grep -q "Success Stories"; then
  echo "✅ Homepage contains Success Stories section"
else
  echo "❌ Homepage missing Success Stories"
  exit 1
fi

echo "Testing admin page exists..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/success-stories)
if [ "$STATUS" -eq "200" ]; then
  echo "✅ Admin page accessible"
else
  echo "❌ Admin page not accessible (status: $STATUS)"
  exit 1
fi

echo ""
echo "🎉 All smoke tests passed!"
```

---

## Testing Checklist Summary

### Database
- [ ] Table created
- [ ] Constraints working
- [ ] RLS policies active
- [ ] Triggers functioning

### API
- [ ] Public GET returns data
- [ ] Public GET respects filters
- [ ] Admin GET works with auth
- [ ] Admin POST creates stories
- [ ] Admin PATCH updates stories
- [ ] Admin DELETE removes stories
- [ ] Validation errors return 400
- [ ] Auth errors return 401/403

### Frontend
- [ ] Homepage displays stories
- [ ] Loading states work
- [ ] Empty state displays
- [ ] Admin nav menu appears
- [ ] Admin page loads
- [ ] Stats cards accurate
- [ ] Filter tabs work
- [ ] Create dialog functions
- [ ] Edit dialog pre-fills
- [ ] Delete confirmation works
- [ ] Photo upload works
- [ ] Toggles update immediately
- [ ] Approve/reject work
- [ ] Form validation works
- [ ] Toast notifications show

### Integration
- [ ] Create → Homepage flow
- [ ] Edit → Homepage updates
- [ ] Delete → Homepage removes
- [ ] Featured filter works
- [ ] Display order sorts correctly
- [ ] Photos display properly
- [ ] Cache headers present
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Accessibility compliance

---

**Last Updated**: 2025-01-26
**Version**: 1.0
**Author**: SoulMatch Development Team
