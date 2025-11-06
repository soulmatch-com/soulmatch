# Admin Success Stories Management Guide

Comprehensive guide for managing family success stories in the SoulMatch matrimonial platform.

---

## Table of Contents
- [Overview](#overview)
- [Getting Started](#getting-started)
- [Creating Success Stories](#creating-success-stories)
- [Managing User Submissions](#managing-user-submissions)
- [Featured Stories Strategy](#featured-stories-strategy)
- [Photo Management](#photo-management)
- [Display Order Optimization](#display-order-optimization)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Success Stories feature allows you to showcase happy couples and successful alliances on the SoulMatch homepage. This builds trust and credibility with prospective users and their families.

### Key Features
- ✅ **Admin-Created Stories**: Create verified success stories directly
- ✅ **User Submissions**: Approve stories submitted by happy couples
- ✅ **Featured Control**: Highlight best stories on homepage
- ✅ **Display Order**: Manually control story sequence
- ✅ **Photo Integration**: Upload couple and wedding photos
- ✅ **Publish Control**: Draft, review, and publish workflow

### Success Story Lifecycle

```
1. CREATION
   ├─ Admin creates directly → Status: approved, Published: true
   └─ User submits → Status: pending, Published: false

2. REVIEW (for user submissions)
   ├─ Admin reviews content and photos
   └─ Admin approves/rejects

3. PUBLISHING
   ├─ Set is_published = true
   └─ Optionally set is_featured = true

4. HOMEPAGE DISPLAY
   ├─ Featured stories appear first
   └─ Ordered by display_order (highest first)
```

---

## Getting Started

### Access the Admin Panel

1. Navigate to `/admin/login`
2. Sign in with admin credentials
3. Go to **Success Stories** section from sidebar

### Dashboard Overview

The Success Stories management page shows:
- **Total Stories**: Count of all stories in database
- **Published**: Stories visible on homepage
- **Pending Approval**: User submissions awaiting review
- **Featured**: Stories marked as featured

### Filter Tabs
- **All**: View all stories regardless of status
- **Pending Approval**: User submissions needing review
- **Published**: Currently visible stories
- **Drafts**: Unpublished stories

---

## Creating Success Stories

### Method 1: Create Story Directly

**Use Case**: When you have verified success stories from couples you've helped

**Steps**:
1. Click **"Create New Story"** button
2. Fill in story details:
   - **Couple Names**: Display name (e.g., "Priya & Rahul")
   - **Location**: City/region (e.g., "Mumbai, Maharashtra")
   - **Story Text**: Testimonial (50-1000 characters)
   - **Marriage Date**: Optional wedding date
3. Upload photos (optional but recommended):
   - **Couple Photo**: Profile photo of the couple
   - **Wedding Photos**: Up to 5 ceremony photos
4. Set display options:
   - **Featured**: Toggle on to highlight on homepage
   - **Published**: Toggle on to make visible immediately
   - **Display Order**: Higher numbers appear first (0-100 recommended)
5. Click **"Create Story"**

**Best Practices**:
- Use authentic, verified testimonials
- Include couple photo for credibility
- Keep story text concise and impactful
- Highlight key platform benefits (verification, family involvement, etc.)

### Example Story Structure

```
Couple Names: Anjali & Vikram
Location: Delhi
Story: "After careful consideration, both families found the perfect match
through MyThirumanam.in. The detailed family information and professional
approach made the process smooth. We're grateful for the platform's role
in bringing our families together!"

Featured: ✅
Published: ✅
Display Order: 10
```

---

## Managing User Submissions

### Review Workflow

Users can submit their own success stories from their dashboard. These require admin approval.

**Review Process**:

1. **Access Pending Queue**
   - Navigate to **Pending Approval** tab
   - View all user submissions with `status: pending`

2. **Review Criteria**
   - ✅ Story is authentic and appropriate
   - ✅ Photos are suitable for public display
   - ✅ No promotional content or external links
   - ✅ Language is family-friendly
   - ✅ Testimonial reflects well on platform

3. **Approval Actions**
   - **Approve**: Set `status: approved`, `is_published: true`
   - **Approve + Feature**: Also set `is_featured: true`
   - **Reject**: Set `status: rejected` (story hidden from user)
   - **Edit Before Approval**: Modify story text/details, then approve

4. **Track Approver**
   - System automatically records `approved_by` field with your admin ID
   - Audit trail for compliance

### Approval Examples

```typescript
// Approve and publish immediately
{
  status: 'approved',
  is_published: true,
  approved_by: 'admin-uuid'
}

// Approve but keep as draft for later
{
  status: 'approved',
  is_published: false,
  approved_by: 'admin-uuid'
}

// Reject submission
{
  status: 'rejected',
  is_published: false
}
```

---

## Featured Stories Strategy

### What Makes a Story "Featured"?

Featured stories appear first on the homepage and are typically the most impactful testimonials.

**Criteria for Featured Stories**:
- ✅ Compelling and detailed testimonial
- ✅ High-quality couple/wedding photos
- ✅ Represents diverse demographics (location, community, age)
- ✅ Highlights unique platform benefits
- ✅ Recent success (within last year preferred)

### Featured Story Limits

**Recommendation**: Maintain 6-12 featured stories
- Homepage displays 6 featured stories by default
- Rotation keeps content fresh
- Too many dilutes "featured" status

### Rotation Strategy

**Monthly Rotation Plan**:
1. **Week 1-2**: Review performance metrics (if tracking enabled)
2. **Week 3**: Select new stories to feature
3. **Week 4**: Update featured status and display order

**Seasonal Updates**:
- Q1 (Jan-Mar): Focus on winter weddings
- Q2 (Apr-Jun): Spring/summer success stories
- Q3 (Jul-Sep): Monsoon season engagements
- Q4 (Oct-Dec): Festival season alliances

---

## Photo Management

### Photo Requirements

**Couple Photo**:
- **Purpose**: Main visual identifier for the couple
- **Dimensions**: Minimum 400x400px, recommended 800x800px
- **Format**: JPG, PNG, WebP
- **Size**: Maximum 5MB
- **Content**: Clear, well-lit photo of both partners

**Wedding Photos**:
- **Quantity**: Up to 5 photos per story
- **Dimensions**: Minimum 800x600px, recommended 1200x900px
- **Format**: JPG, PNG, WebP
- **Size**: Maximum 5MB each
- **Content**: Ceremony, celebration, family moments

### Upload Process

1. **Prepare Photos**
   - Crop to appropriate aspect ratio
   - Optimize file size (use TinyPNG or similar)
   - Ensure faces are clearly visible

2. **Upload via Admin Panel**
   - Drag and drop or click to select files
   - Photos automatically uploaded to Cloudinary
   - Stored in `soulmatch/success-stories/` folder

3. **Photo URLs Saved**
   - `couple_photo_url`: Single URL for main photo
   - `wedding_photos`: Array of URLs for gallery

### Photo Guidelines

**DO**:
- ✅ Use high-resolution, professional photos
- ✅ Ensure proper lighting and focus
- ✅ Show happy, genuine moments
- ✅ Include traditional/cultural elements
- ✅ Maintain family-friendly content

**DON'T**:
- ❌ Use blurry or low-quality images
- ❌ Include inappropriate content
- ❌ Use watermarked photos without permission
- ❌ Upload photos without couple's consent

---

## Display Order Optimization

### Understanding Display Order

The `display_order` field controls story sequence on the homepage:
- **Higher values** appear first
- **Same values** sorted by `created_at` (newest first)
- **Recommended range**: 0-100

### Strategic Ordering

**Priority Levels**:
```
90-100: Top-tier featured stories (best testimonials, photos)
70-89:  High-quality featured stories
50-69:  Standard featured stories
20-49:  Recently published stories (not featured)
1-19:   Older stories or awaiting rotation
0:      Default (chronological order)
```

### Example Display Order Setup

```
Story 1: "Meera & Raj" - display_order: 95 (top testimonial)
Story 2: "Anjali & Vikram" - display_order: 90 (excellent photos)
Story 3: "Priya & Rahul" - display_order: 85 (diverse location)
Story 4: "Sneha & Arjun" - display_order: 75 (recent success)
Story 5: "Riya & Karthik" - display_order: 70 (good testimonial)
Story 6: "Pooja & Amit" - display_order: 65 (standard story)
```

### Reordering Stories

**Method 1: Drag and Drop** (when UI is implemented)
- Drag stories in management table
- Auto-updates display_order values

**Method 2: Manual Update**
- Edit story
- Change display_order number
- Save changes

**Bulk Reordering**:
```typescript
// Update multiple stories at once
const updates = [
  { id: 'uuid-1', display_order: 95 },
  { id: 'uuid-2', display_order: 90 },
  { id: 'uuid-3', display_order: 85 }
];

updates.forEach(async (update) => {
  await fetch(`/api/admin/success-stories/${update.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ display_order: update.display_order })
  });
});
```

---

## Best Practices

### Content Guidelines

**Story Text Best Practices**:
- ✅ **Length**: 100-300 characters ideal for homepage cards
- ✅ **Tone**: Positive, grateful, family-focused
- ✅ **Focus**: Highlight platform benefits and family involvement
- ✅ **Authenticity**: Use genuine testimonials, not marketing copy

**Example Good vs. Bad**:

**Good**:
> "Our families connected through MyThirumanam.in and we celebrated our wedding last month. The platform's verification process and cultural matching helped our families trust the alliance. Forever grateful!"

**Bad**:
> "This is the best matrimonial site ever! Everyone should use it! We got married and it was amazing! 10/10!"

### Diversity & Representation

**Ensure Variety Across**:
- **Geography**: Urban, semi-urban, rural locations
- **Communities**: Different religions, castes, regions
- **Age Groups**: Young professionals, established careers, second marriages
- **Occupations**: Diverse professional backgrounds
- **Languages**: Regional language representation

### Quality Control Checklist

Before publishing a success story:
- [ ] Story text is 50-1000 characters
- [ ] Couple names are accurate and properly formatted
- [ ] Location is specific (city + state preferred)
- [ ] Photos are high-quality and appropriate
- [ ] No spelling/grammar errors
- [ ] Story reflects positively on platform
- [ ] Couple has given consent for publication
- [ ] Photos have appropriate permissions

---

## Troubleshooting

### Common Issues

**Issue**: Story not appearing on homepage
- **Check**: Is `is_published = true`?
- **Check**: Is `status = 'approved'`?
- **Check**: Clear browser cache
- **Check**: API response from `/api/success-stories`

**Issue**: Featured stories not showing first
- **Check**: Is `is_featured = true`?
- **Check**: Compare `display_order` values
- **Check**: Database query ORDER BY clause

**Issue**: Photos not displaying
- **Check**: Photo URL is valid and accessible
- **Check**: Cloudinary URLs are HTTPS
- **Check**: Photos haven't been deleted from Cloudinary
- **Check**: Next.js image domain configuration

**Issue**: Validation errors when creating story
- **Check**: Story text length (50-1000 chars)
- **Check**: Couple names length (5-100 chars)
- **Check**: Location length (2-100 chars)
- **Check**: Wedding photos count (max 5)

### Database Queries

**Find all published stories**:
```sql
SELECT * FROM success_stories
WHERE is_published = true AND status = 'approved'
ORDER BY display_order DESC, created_at DESC;
```

**Find pending approvals**:
```sql
SELECT * FROM success_stories
WHERE status = 'pending'
ORDER BY created_at ASC;
```

**Find featured stories**:
```sql
SELECT * FROM success_stories
WHERE is_featured = true AND is_published = true
ORDER BY display_order DESC;
```

### Performance Optimization

**Homepage Load Time**:
- Featured stories query is cached (5 min CDN cache)
- Limit to 6 stories for optimal performance
- Use optimized image URLs from Cloudinary

**Admin Panel Performance**:
- Pagination for large story counts (20 per page)
- Filter queries for specific subsets
- Index on `is_published`, `is_featured`, `status`

---

## Appendix: Quick Reference

### Story Status Values
- `pending`: Awaiting admin approval
- `approved`: Approved by admin
- `rejected`: Rejected by admin

### Submission Types
- `admin`: Created by admin directly
- `user_submitted`: Submitted by user

### Recommended Workflow

**New Admin**: Start here
1. Review existing stories
2. Create 3-5 test stories in drafts
3. Practice approval workflow with user submissions
4. Set up 6 featured stories
5. Establish monthly rotation schedule

**Ongoing Management**:
- **Daily**: Review new user submissions
- **Weekly**: Check homepage story display
- **Monthly**: Rotate featured stories
- **Quarterly**: Audit all stories for quality

---

## Support & Resources

**Technical Documentation**: See `success-stories-api-docs.md`
**Database Schema**: `database/migrations/create_success_stories_table.sql`
**API Endpoints**: `/api/success-stories` (public), `/api/admin/success-stories` (admin)

---

**Last Updated**: January 26, 2025
**Version**: 1.0
**Maintained By**: SoulMatch Development Team
