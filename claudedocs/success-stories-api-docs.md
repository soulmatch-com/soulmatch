# Success Stories API Documentation

Complete API documentation for managing success stories in the SoulMatch matrimonial application.

---

## Table of Contents
- [Public API](#public-api)
- [Admin API](#admin-api)
- [Request/Response Examples](#requestresponse-examples)
- [Error Handling](#error-handling)
- [Photo Upload Integration](#photo-upload-integration)
- [Security & Authentication](#security--authentication)

---

## Public API

### GET /api/success-stories

Fetch published success stories for display on the homepage.

**Authentication**: None required (public endpoint)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 6 | Number of stories to return (max: 50) |
| `offset` | number | 0 | Pagination offset |
| `featured_only` | boolean | false | Return only featured stories |

**Response** (200 OK):
```json
{
  "stories": [
    {
      "id": "uuid",
      "couple_names": "Priya & Rahul",
      "location": "Mumbai",
      "story_text": "Our families connected through...",
      "couple_photo_url": "https://res.cloudinary.com/...",
      "wedding_photos": ["https://...", "https://..."],
      "marriage_date": "2024-03-15",
      "is_featured": true,
      "is_published": true,
      "display_order": 10,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "pagination": {
    "limit": 6,
    "offset": 0,
    "hasMore": true
  }
}
```

**Cache Headers**:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Stories are cached for 5 minutes with stale-while-revalidate of 10 minutes

**Example Usage**:
```typescript
// Fetch featured stories for homepage
const response = await fetch('/api/success-stories?limit=6&featured_only=true');
const data = await response.json();

// Pagination
const response = await fetch('/api/success-stories?limit=10&offset=10');
```

---

## Admin API

### GET /api/admin/success-stories

Fetch all success stories with admin filtering capabilities.

**Authentication**: Required (Admin only)

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `pending`, `approved`, `rejected` |
| `featured` | boolean | Filter by featured status |
| `published` | boolean | Filter by published status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Response** (200 OK):
```json
{
  "stories": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 153,
    "totalPages": 8
  }
}
```

**Example Usage**:
```typescript
// Fetch pending approval stories
const response = await fetch('/api/admin/success-stories?status=pending&page=1');

// Fetch all featured stories
const response = await fetch('/api/admin/success-stories?featured=true');
```

---

### POST /api/admin/success-stories

Create a new success story.

**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "profile1_id": "uuid-optional",
  "profile2_id": "uuid-optional",
  "couple_names": "Anjali & Vikram",
  "location": "Delhi",
  "story_text": "After careful consideration...",
  "couple_photo_url": "https://res.cloudinary.com/...",
  "wedding_photos": ["https://...", "https://..."],
  "marriage_date": "2024-02-20",
  "is_featured": true,
  "is_published": true,
  "display_order": 5,
  "submission_type": "admin",
  "status": "approved"
}
```

**Validation Rules**:
- `couple_names`: 5-100 characters
- `location`: 2-100 characters
- `story_text`: 50-1000 characters
- `wedding_photos`: Maximum 5 photos
- `marriage_date`: YYYY-MM-DD format

**Response** (201 Created):
```json
{
  "message": "Success story created successfully",
  "story": {
    "id": "generated-uuid",
    ...
  }
}
```

**Example Usage**:
```typescript
const newStory = {
  couple_names: "Sneha & Arjun",
  location: "Bangalore",
  story_text: "MyThirumanam.in helped our families...",
  is_featured: false,
  is_published: true
};

const response = await fetch('/api/admin/success-stories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newStory)
});
```

---

### GET /api/admin/success-stories/[id]

Fetch a single success story by ID.

**Authentication**: Required (Admin only)

**Response** (200 OK):
```json
{
  "story": {
    "id": "uuid",
    "couple_names": "Priya & Rahul",
    ...
  }
}
```

---

### PATCH /api/admin/success-stories/[id]

Update an existing success story.

**Authentication**: Required (Admin only)

**Request Body** (partial update):
```json
{
  "is_featured": true,
  "display_order": 15,
  "status": "approved",
  "approved_by": "admin-uuid"
}
```

**Response** (200 OK):
```json
{
  "message": "Success story updated successfully",
  "story": {
    "id": "uuid",
    ...
  }
}
```

**Common Update Operations**:

```typescript
// Approve a user submission
await fetch(`/api/admin/success-stories/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'approved',
    is_published: true,
    approved_by: adminId
  })
});

// Toggle featured status
await fetch(`/api/admin/success-stories/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ is_featured: !currentValue })
});

// Update display order
await fetch(`/api/admin/success-stories/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ display_order: newOrder })
});
```

---

### DELETE /api/admin/success-stories/[id]

Delete a success story.

**Authentication**: Required (Admin only)

**Response** (200 OK):
```json
{
  "message": "Success story deleted successfully"
}
```

**Example Usage**:
```typescript
await fetch(`/api/admin/success-stories/${id}`, {
  method: 'DELETE'
});
```

---

## Request/Response Examples

### Complete Admin Workflow

```typescript
// 1. Create new success story
const createResponse = await fetch('/api/admin/success-stories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    couple_names: "Riya & Karthik",
    location: "Chennai",
    story_text: "We found each other through...",
    couple_photo_url: "https://cloudinary.com/photo.jpg",
    is_featured: true,
    is_published: true,
    display_order: 1
  })
});
const { story } = await createResponse.json();

// 2. Update featured status
await fetch(`/api/admin/success-stories/${story.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ is_featured: false })
});

// 3. Fetch all stories
const listResponse = await fetch('/api/admin/success-stories?page=1&limit=20');
const { stories, pagination } = await listResponse.json();

// 4. Delete story
await fetch(`/api/admin/success-stories/${story.id}`, {
  method: 'DELETE'
});
```

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation Error:
```json
{
  "error": "Validation failed",
  "details": {
    "story_text": ["Story must be at least 50 characters"],
    "couple_names": ["Couple names must be at least 5 characters"]
  }
}
```

**404 Not Found**:
```json
{
  "error": "Success story not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error"
}
```

### Error Handling Example

```typescript
try {
  const response = await fetch('/api/admin/success-stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(storyData)
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 400) {
      // Handle validation errors
      console.error('Validation failed:', error.details);
      Object.entries(error.details).forEach(([field, messages]) => {
        showFieldError(field, messages[0]);
      });
    } else {
      // Handle other errors
      console.error('Error:', error.error);
      showNotification(error.error, 'error');
    }
    return;
  }

  const data = await response.json();
  showNotification('Success story created!', 'success');
} catch (error) {
  console.error('Network error:', error);
  showNotification('Failed to connect to server', 'error');
}
```

---

## Photo Upload Integration

Success stories integrate with the existing Cloudinary upload system.

### Upload Flow

```typescript
// 1. Upload couple photo
const formData = new FormData();
formData.append('file', couplePhotoFile);

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});

const { url: couplePhotoUrl } = await uploadResponse.json();

// 2. Upload wedding photos (multiple)
const weddingPhotosUrls = await Promise.all(
  weddingPhotoFiles.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const { url } = await response.json();
    return url;
  })
);

// 3. Create success story with photo URLs
await fetch('/api/admin/success-stories', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    couple_names: "Meera & Raj",
    location: "Pune",
    story_text: "Our journey began...",
    couple_photo_url: couplePhotoUrl,
    wedding_photos: weddingPhotosUrls,
    is_featured: true,
    is_published: true
  })
});
```

### Photo Requirements

- **Couple Photo**: Single photo, recommended 400x400px minimum
- **Wedding Photos**: Up to 5 photos, recommended 800x600px minimum
- **Formats**: JPG, PNG, WebP
- **Max Size**: 5MB per photo (enforced by Cloudinary)
- **Storage**: Cloudinary folder `soulmatch/success-stories/`

---

## Security & Authentication

### Public API Security
- **No authentication required**
- **RLS Policy**: Only returns `is_published = true` and `status = 'approved'` stories
- **Rate limiting**: Recommended via Cloudinary caching
- **XSS Protection**: All text fields sanitized on display

### Admin API Security
- **Authentication**: Admin session required
- **Authorization**: Uses `createAdminClient()` with service role key
- **RLS Bypass**: Admin client bypasses Row Level Security
- **Audit Trail**: `submitted_by` and `approved_by` track actions

### Best Practices

```typescript
// Always validate on frontend AND backend
const validationResult = successStorySchema.safeParse(formData);
if (!validationResult.success) {
  // Show errors before API call
  return;
}

// Sanitize user-generated content
import DOMPurify from 'dompurify';
const sanitizedStory = DOMPurify.sanitize(story.story_text);

// Use environment variables for API URLs
const API_BASE = process.env.NEXT_PUBLIC_APP_URL;
await fetch(`${API_BASE}/api/success-stories`);
```

---

## Appendix: Database Schema

```sql
CREATE TABLE public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile1_id UUID REFERENCES public.profiles(id),
  profile2_id UUID REFERENCES public.profiles(id),
  couple_names TEXT NOT NULL,
  location TEXT NOT NULL,
  story_text TEXT NOT NULL,
  couple_photo_url TEXT,
  wedding_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  marriage_date DATE,
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  submission_type submission_type DEFAULT 'admin',
  status story_status DEFAULT 'approved',
  submitted_by UUID REFERENCES auth.users(id),
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Changelog

### Version 1.0 (2025-01-26)
- Initial API release
- Public and admin endpoints
- Photo upload integration
- Approval workflow support
