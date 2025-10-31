# 📋 Database Schema & Implementation Audit Report

## 🔍 Current Database Structure (PostgreSQL/Supabase)

### **Backend:** Supabase (PostgreSQL)
### **Storage:** Supabase Storage (NOT Firebase)
### **Architecture:** Relational Database with Foreign Keys

---

## 📊 Exact Database Tables & Fields

### 1. **`shops` Table**
```sql
Columns:
- id (UUID, PRIMARY KEY)
- name (TEXT)
- description (TEXT)
- address (TEXT)
- city (TEXT)
- state (TEXT)
- zip_code (TEXT)
- country (TEXT, DEFAULT 'USA')
- phone (TEXT)
- email (TEXT)
- website (TEXT)
- logo_url (TEXT) ← Currently stores single image
- cover_image_url (TEXT) ← Exists but not used in UI
- gallery_images (TEXT[]) ← Array, not used
- business_hours (JSONB)
- latitude (DECIMAL)
- longitude (DECIMAL)
- rating (DECIMAL)
- total_reviews (INTEGER)
- total_bookings (INTEGER)
- is_active (BOOLEAN)
- is_verified (BOOLEAN)
- created_by (UUID, FK to auth.users)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**✅ Findings:**
- `logo_url` exists (mapped in current UI as `shopImage`)
- `cover_image_url` exists (NOT mapped in UI - **needs implementation**)
- `zip_code`, `state`, `country` exist in DB (NOT in UI form - **needs implementation**)
- `website` exists in DB (in UI but **should be removed** per requirements)
- Image storage uses Supabase Storage URLs

---

### 2. **`shop_staff` Table** (for Managers & Barbers)
```sql
Columns:
- id (UUID, PRIMARY KEY)
- shop_id (UUID, FK to shops.id, CASCADE DELETE)
- user_id (UUID, FK to profiles.id, CASCADE DELETE)
- role (TEXT: 'admin', 'manager', 'barber')
- bio (TEXT)
- specialties (TEXT[])
- experience_years (INTEGER)
- rating (DECIMAL)
- total_reviews (INTEGER)
- is_available (BOOLEAN)
- is_active (BOOLEAN)
- invited_by (UUID, FK to profiles.id)
- hired_date (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**✅ Findings:**
- Uses **relational table** (NOT subcollections)
- Managers and Barbers stored together with `role` field
- `invited_by` field exists (but no invitation system implemented)
- Unique constraint: `(shop_id, user_id)` - one role per user per shop

---

### 3. **`services` Table**
```sql
Columns:
- id (UUID, PRIMARY KEY)
- shop_id (UUID, FK to shops.id, CASCADE DELETE)
- name (TEXT)
- description (TEXT)
- price (DECIMAL)
- duration (INTEGER) ← Minutes
- category (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**✅ Findings:**
- Uses **relational table** (NOT subcollections or arrays)
- NO image field (`icon_url` or `image_url` NOT in schema - **needs migration**)
- Fetched via JOIN queries by `shop_id`

---

### 4. **`profiles` Table** (Users)
```sql
Columns:
- id (UUID, PRIMARY KEY, FK to auth.users)
- name (TEXT)
- email (TEXT, UNIQUE)
- phone (TEXT)
- profile_image (TEXT)
- is_active (BOOLEAN)
- onboarding_completed (BOOLEAN)
- is_platform_admin (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**✅ Findings:**
- User data separate from auth
- Profile images stored as URLs

---

### 5. **`bookings` Table**
```sql
Columns:
- id (UUID)
- shop_id (UUID, FK to shops)
- customer_id (UUID, FK to profiles)
- barber_id (UUID, FK to profiles, NULLABLE)
- services (JSONB) ← Array of service objects
- appointment_date (DATE)
- appointment_time (TIME)
- status (TEXT: 'pending', 'confirmed', 'completed', 'cancelled')
- total_amount (DECIMAL)
- customer_notes (TEXT)
- shop_rating (DECIMAL)
- shop_review (TEXT)
- barber_rating (DECIMAL)
- barber_review (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

### 6. **`shop_reviews` Table**
```sql
Columns:
- id (UUID)
- shop_id (UUID, FK to shops)
- customer_id (UUID, FK to profiles)
- booking_id (UUID, FK to bookings)
- rating (DECIMAL, 0-5)
- review_text (TEXT)
- barber_id (UUID, FK to profiles, NULLABLE)
- barber_rating (DECIMAL)
- services (JSONB)
- helpful_count (INTEGER)
- is_visible (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 🗂️ Current Storage Paths (Supabase Storage)

**Current Implementation:**
- Images uploaded to Supabase Storage
- URLs stored in database
- Path structure: **NOT DEFINED** (needs implementation)

**Recommended Paths:**
```
shops/
  {shopId}/
    logo.jpg         → logo_url
    cover.jpg        → cover_image_url
    banner.jpg       → (NEW: banner_image_url)
    services/
      {serviceId}.jpg → services.image_url (NEW field needed)
```

---

## 🔄 Data Model: Relational (NOT Subcollections)

**Architecture:**
```
shops (parent table)
  ↓
shop_staff (foreign key: shop_id)
  ↓
services (foreign key: shop_id)
  ↓
bookings (foreign key: shop_id)
  ↓
shop_reviews (foreign key: shop_id)
```

**Fetching Pattern:**
```javascript
// Current implementation uses JOINs
SELECT * FROM shop_staff WHERE shop_id = ?
SELECT * FROM services WHERE shop_id = ?
```

**NOT using:** Firebase-style subcollections or embedded arrays

---

## 🐛 Current Issues Found

### 1. **Image Handling**
- ❌ Only `logo_url` mapped in UI (as `shopImage`)
- ❌ `cover_image_url` exists in DB but NOT in CreateShopScreen UI
- ❌ NO banner image field (needs DB migration)
- ❌ Services table has NO image field (needs DB migration)

### 2. **Address Fields**
- ❌ `zip_code`, `state`, `country` exist in DB but NOT in UI form
- ⚠️ Form only captures: name, address, city, phone, email

### 3. **Website Field**
- ⚠️ Exists in UI and DB, but requirements say to REMOVE it

### 4. **Services Data**
- ❌ NO image storage for services
- ❌ Services don't have `icon_url` or `image_url` field in DB
- ⚠️ Need to add image field via migration

### 5. **Invitation System**
- ❌ `invited_by` field exists in `shop_staff` but NO invitation workflow
- ❌ No `invitations` table
- ❌ No accept/decline flow

### 6. **Data Display After Create**
- ✅ Navigation works (goes to ShopDetailsScreen)
- ✅ Staff, services fetched and displayed
- ❌ BUT: Images might not show if not uploaded to storage properly

---

## 📝 Required Database Migrations

### Migration 1: Add Banner Image to Shops
```sql
-- Already has cover_image_url, can repurpose
-- OR add new column:
ALTER TABLE shops ADD COLUMN IF NOT EXISTS banner_image_url TEXT;
```

### Migration 2: Add Image to Services
```sql
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_url TEXT;
```

### Migration 3: Create Invitations Table
```sql
CREATE TABLE IF NOT EXISTS shop_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_user_id UUID REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('manager', 'barber')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  invited_by UUID NOT NULL REFERENCES profiles(id),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_invitations_email ON shop_invitations(invitee_email);
CREATE INDEX idx_invitations_status ON shop_invitations(status);
CREATE INDEX idx_invitations_shop ON shop_invitations(shop_id);
```

---

## 📊 Field Mapping: DB ↔ UI

### CreateShopScreen Form Fields:
```javascript
Current UI → DB Mapping:
- formData.name → shops.name ✅
- formData.description → shops.description ✅
- formData.address → shops.address ✅
- formData.city → shops.city ✅
- formData.phone → shops.phone ✅
- formData.email → shops.email ✅
- shopImage → shops.logo_url ✅
- ❌ NO UI for zip_code → shops.zip_code
- ❌ NO UI for state → shops.state  
- ❌ NO UI for country → shops.country
- ❌ NO UI for cover/banner → shops.cover_image_url
```

### Required NEW Fields:
```javascript
NEW UI Fields Needed:
- bannerImage → shops.banner_image_url (NEW column)
- logoImage → shops.logo_url (rename shopImage)
- coverImage → shops.cover_image_url (existing)
- zipCode → shops.zip_code (existing)
- state → shops.state (existing)
- country → shops.country (existing)
```

---

## 🎯 API Functions Status

### Existing Functions (shopAuth.js):
```javascript
✅ createShop(shopData) - Creates shop, adds admin
✅ addShopStaff(shopId, userId, role) - Adds manager/barber
✅ createShopService(shopId, serviceData) - Adds service
✅ getShopDetails(shopId) - Fetches shop
✅ getShopStaff(shopId) - Fetches all staff (managers + barbers)
✅ getShopServices(shopId) - Fetches services
✅ deleteShop(shopId) - Cascading delete (JUST IMPLEMENTED)
```

### Missing Functions:
```javascript
❌ uploadShopImage(shopId, imageFile, imageType) - Upload to storage
❌ createInvitation(shopId, email, role) - Send invitation
❌ acceptInvitation(invitationId) - Accept invite
❌ declineInvitation(invitationId) - Decline invite
❌ getInvitations(userId) - Get user's invitations
❌ uploadServiceImage(serviceId, imageFile) - Upload service image
```

---

## 🚀 Implementation Plan

### Phase 1: Database Migrations ✅ FIRST
1. Add `banner_image_url` to shops table
2. Add `image_url` to services table
3. Create `shop_invitations` table

### Phase 2: Image Upload System
1. Create Supabase Storage bucket structure
2. Implement upload functions for shop images
3. Implement upload functions for service images
4. Add image preview components

### Phase 3: Update CreateShopScreen UI
1. Add logo upload field (rename shopImage → logoImage)
2. Add banner upload field (new)
3. Add cover upload field (optional)
4. Add address fields: zipCode, state, country
5. Remove website field
6. Add validation for 1+ manager, barber, service

### Phase 4: Fix Data Display
1. Update shop details to show banner + logo
2. Update services to show images
3. Add proper placeholders
4. Fix image fetching/display bugs

### Phase 5: Invitation System
1. Create invitation API functions
2. Add invitation UI in AddManagerModal
3. Create InvitationsScreen
4. Add notification badge
5. Implement accept/decline flow

### Phase 6: Role-Based UI
1. Ensure Add buttons always visible to admin/manager
2. Hide from barbers
3. Add delete icon for admin only (DONE)

---

## ✅ Summary

**Database Type:** PostgreSQL (Supabase)  
**Data Model:** Relational tables with foreign keys  
**Storage:** Supabase Storage (NOT Firebase)  
**Current Status:** Schema exists, but UI incomplete  

**Key Issues:**
1. Missing image fields (banner, service images)
2. Missing address fields in UI (zip, state, country)
3. No invitation system
4. Services have no images

**Next Steps:**
1. Run database migrations (add missing columns)
2. Implement image upload system
3. Update CreateShopScreen UI
4. Build invitation system
5. Fix data display issues

---

**Date:** October 11, 2025  
**Status:** Audit Complete - Ready for Implementation
