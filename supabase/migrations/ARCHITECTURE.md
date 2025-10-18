# Architecture Overview - Dynamic Admin Dashboard

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Admin Dashboard UI                          │
│                  /admin/dashboard (page.tsx)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP GET Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Endpoint                                │
│              /api/admin/stats (route.ts)                        │
│                                                                  │
│  • Fetches stats from Supabase                                  │
│  • Applies business logic                                       │
│  • Returns JSON response                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Supabase Client Queries
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Database                           │
│                      (profiles table)                            │
│                                                                  │
│  Columns:                                                        │
│  • id, user_id, first_name, last_name                           │
│  • profile_status (CHECK constraint)                            │
│  • is_verified (NEW)                                            │
│  • verified_at (NEW)                                            │
│  • verified_by (NEW)                                            │
│  • created_at, updated_at                                       │
│                                                                  │
│  Indexes:                                                        │
│  • idx_profiles_status                                          │
│  • idx_profiles_is_verified (NEW)                               │
│  • idx_profiles_verified_at (NEW)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### 1. Dashboard Load Flow

```
User Opens Dashboard
      │
      ▼
Authentication Check ──[Failed]──> Redirect to /admin/login
      │
   [Success]
      │
      ▼
Set Loading State
      │
      ▼
Fetch API: GET /api/admin/stats
      │
      ├──> Query: Total Users Count
      ├──> Query: Active Profiles (status='active' AND is_verified=true)
      ├──> Query: Pending Verification (complex OR logic)
      ├──> Query: Incomplete Profiles
      ├──> Query: Suspended Profiles
      ├──> Query: Recent Registrations (last 30 days)
      ├──> Query: Latest Users (5 most recent)
      └──> Query: Pending Profiles (5 most recent pending)
      │
      ▼
API Returns JSON
      │
      ▼
Update React State
      │
      ├──> setStats(...)
      ├──> setLatestUsers(...)
      └──> setPendingProfiles(...)
      │
      ▼
Render Dashboard UI
      │
      ├──> Stats Cards (4 cards)
      ├──> Recent Registrations List
      └──> Verification Queue List
```

---

## Profile Status State Machine

```
                    ┌──────────────┐
                    │   NEW USER   │
                    └──────┬───────┘
                           │
                           ▼
                  ┌────────────────┐
                  │   INCOMPLETE   │◄───┐
                  │ is_verified=F  │    │
                  └───────┬────────┘    │ Admin Rejects
                          │             │
                   User Completes       │
                          │             │
                          ▼             │
                  ┌────────────────┐    │
                  │    PENDING     │────┘
                  │ is_verified=F  │
                  └───────┬────────┘
                          │
                   Admin Approves
                          │
                          ▼
                  ┌────────────────┐
                  │     ACTIVE     │
                  │ is_verified=T  │
                  │ verified_at=NOW│
                  └───────┬────────┘
                          │
              ┌───────────┼───────────┐
              │                       │
       Admin Suspends          User Deletes
              │                       │
              ▼                       ▼
      ┌──────────────┐        ┌──────────────┐
      │  SUSPENDED   │        │   DELETED    │
      │ is_verified=T│        │ is_verified=T│
      └──────────────┘        └──────────────┘
```

---

## Pending Verification Logic

```
Profile is "Pending Verification" when:

┌─────────────────────────────────────────────┐
│  profile_status = 'pending'                 │
│                                             │
│              OR                             │
│                                             │
│  (profile_status = 'active'                 │
│   AND is_verified = false)                  │
└─────────────────────────────────────────────┘

Examples:

Profile 1:                    Profile 2:                    Profile 3:
status: 'pending'            status: 'active'              status: 'active'
is_verified: false           is_verified: false            is_verified: true

✅ Shown in Queue            ✅ Shown in Queue             ❌ NOT in Queue
(Explicitly pending)         (Active but unverified)       (Properly verified)
```

---

## Database Query Patterns

### Active Profiles Query
```sql
SELECT COUNT(*)
FROM profiles
WHERE profile_status = 'active'
  AND is_verified = true;
```

**Why this works:**
- Only counts profiles that are both active AND verified
- Prevents unverified profiles from being counted as active
- Uses index: `idx_profiles_status`, `idx_profiles_is_verified`

### Pending Verification Query
```sql
SELECT COUNT(*)
FROM profiles
WHERE profile_status = 'pending'
   OR (profile_status = 'active' AND is_verified = false);
```

**Why this works:**
- Catches profiles explicitly marked as pending
- Catches active profiles that haven't been verified yet
- Uses index: `idx_profiles_status`, `idx_profiles_is_verified`

### Recent Registrations Query
```sql
SELECT COUNT(*)
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**Why this works:**
- Simple date comparison
- Shows growth trend
- No status filtering (all new users counted)

---

## Component Structure

```
AdminDashboardPage
│
├─── State Management
│    ├─── stats: DashboardStats | null
│    ├─── latestUsers: LatestUser[]
│    ├─── pendingProfiles: PendingProfile[]
│    └─── loading: boolean
│
├─── Effects
│    ├─── Authentication Check
│    └─── Data Fetching
│
├─── UI Sections
│    ├─── Header (Welcome message)
│    ├─── Stats Grid (4 cards)
│    │    ├─── Total Users
│    │    ├─── Active Profiles
│    │    ├─── Pending Verification
│    │    └─── Incomplete Profiles
│    │
│    └─── Activity Grid (2 cards)
│         ├─── Recent User Registrations
│         │    └─── Latest 5 users
│         │
│         └─── Profile Verification Queue
│              └─── Latest 5 pending profiles
```

---

## API Response Structure

```typescript
GET /api/admin/stats

Response: {
  stats: {
    totalUsers: number           // Total profiles count
    activeProfiles: number       // Active AND verified
    pendingVerification: number  // Pending OR (active AND unverified)
    incompleteProfiles: number   // Incomplete status
    suspendedProfiles: number    // Suspended status
    recentRegistrations: number  // Created in last 30 days
  },
  latestUsers: [
    {
      user_id: string
      first_name: string
      last_name: string
      created_at: string
      profile_status: string
    }
  ],
  pendingProfiles: [
    {
      id: string
      user_id: string
      first_name: string
      last_name: string
      profile_status: string
      is_verified: boolean
      created_at: string
    }
  ]
}
```

---

## Performance Considerations

### Indexes Usage
```
Query: WHERE profile_status = 'active' AND is_verified = true
Uses: idx_profiles_status + idx_profiles_is_verified
Speed: O(log n) - Fast binary tree search

Query: WHERE created_at >= '2024-09-08'
Uses: Table scan (acceptable for date ranges)
Speed: O(n) - Full scan but optimized by PostgreSQL

Query: ORDER BY created_at DESC LIMIT 5
Uses: created_at index (if exists from base schema)
Speed: O(log n) - Fast with limit
```

### Optimization Tips
1. **Indexes are in place** for all filtered columns
2. **COUNT queries use `head: true`** for performance
3. **LIMIT 5** on list queries prevents large payloads
4. **OR queries** are optimized by PostgreSQL query planner

---

## Security Model

```
┌─────────────────────────────────────────────┐
│           Authentication Layer              │
│    (Admin Store + Session Check)            │
└────────────────┬────────────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
       ▼                   ▼
┌──────────────┐    ┌──────────────┐
│  API Routes  │    │  Dashboard   │
│   (Server)   │    │    (Client)  │
└──────┬───────┘    └──────┬───────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │   Supabase Client   │
      │  (RLS Policies)     │
      └─────────────────────┘
                 │
                 ▼
      ┌─────────────────────┐
      │  Profiles Table     │
      └─────────────────────┘
```

### Access Control
- Admin authentication required at UI level
- API endpoint validates admin session
- Supabase RLS policies provide database-level security
- No direct database access from client

---

## Error Handling Flow

```
API Call
   │
   ├─── Network Error ──> Console.error() ──> Empty State UI
   │
   ├─── Auth Error ──> Redirect to /admin/login
   │
   ├─── Database Error ──> HTTP 500 ──> Console.error() ──> Empty State UI
   │
   └─── Success ──> Update State ──> Render UI
```

---

## Migration Strategy

```
Step 1: Schema Changes
   │
   ├─── Add columns (is_verified, verified_at, verified_by)
   ├─── Add constraint (profile_status CHECK)
   ├─── Create indexes
   └─── Add documentation comments
   │
   ▼
Step 2: Data Validation
   │
   ├─── Update NULL values
   ├─── Fix invalid statuses
   └─── (Optional) Mark existing active as verified
   │
   ▼
Step 3: Verification
   │
   ├─── Run schema check queries
   ├─── Verify constraint works
   └─── Check data distribution
   │
   ▼
Step 4: Deploy Code
   │
   ├─── API changes (route.ts)
   └─── UI changes (page.tsx)
   │
   ▼
Step 5: Test
   │
   └─── Follow TEST_PLAN.md
```

---

## Deployment Checklist

- [ ] Backup database before migration
- [ ] Run migration script in Supabase
- [ ] Verify schema with verification script
- [ ] Check constraint works (try invalid insert)
- [ ] Test API endpoint returns correct data
- [ ] Test dashboard displays real data
- [ ] Verify pending verification logic
- [ ] Check performance with large datasets
- [ ] Test error scenarios
- [ ] Monitor logs for issues
- [ ] Update documentation if needed

---

**This architecture ensures:**
- ✅ Data integrity with constraints
- ✅ Performance with indexes
- ✅ Clear separation of concerns
- ✅ Scalable design
- ✅ Type safety with TypeScript
- ✅ Real-time accurate statistics
- ✅ Production-ready implementation
