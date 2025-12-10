# 💈 Barber App - Complete Setup Guide

> **One file for everything**: Database setup, roles, features, and troubleshooting

---

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Database Structure](#database-structure)
3. [Role-Based Permissions](#role-based-permissions)
4. [Setup Instructions](#setup-instructions)
5. [Available Features](#available-features)
6. [Functions Reference](#functions-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Step 1: Run Database Setup
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy entire contents of `DATABASE_SETUP.sql`
3. Click **Run**
4. Done! ✅

### Step 2: Make Yourself Admin
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### Step 3: Create Storage Bucket
1. Go to **Storage** → Click **New Bucket**
2. Name: `service-icons`
3. **Make it Public** ✅
4. Add storage policies (see below)

### Step 4: Add Storage Policies
```sql
-- Public Read
CREATE POLICY "Public can view service icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-icons');

-- Managers/Admins Upload
CREATE POLICY "Managers and Admins can upload icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-icons' 
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin')
  )
);

-- Managers/Admins Delete
CREATE POLICY "Managers and Admins can delete icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-icons' 
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin')
  )
);
```

---

## 📊 Database Structure

### Table 1: `profiles`
**Purpose**: Store all users (customers, barbers, managers, admins)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | User ID (references auth.users) |
| `email` | TEXT | Email address (unique) |
| `name` | TEXT | Full name |
| `role` | TEXT | customer \| barber \| manager \| admin |
| `profile_image` | TEXT | Profile image URL |
| `phone` | TEXT | Phone number |
| `bio` | TEXT | User bio/description |
| `specialties` | UUID[] | Array of service IDs (for barbers) |
| `rating` | DECIMAL | Average rating (0-5) |
| `total_reviews` | INTEGER | Total number of reviews |
| `is_active` | BOOLEAN | Account status |
| `onboarding_completed` | BOOLEAN | Onboarding status |
| `created_at` | TIMESTAMP | Account creation date |
| `updated_at` | TIMESTAMP | Last update date |

### Table 2: `services`
**Purpose**: Store available barber services

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Service ID |
| `name` | TEXT | Service name (required) |
| `description` | TEXT | Service description |
| `icon_url` | TEXT | Service icon image URL |
| `price` | DECIMAL | Price in dollars |
| `duration` | INTEGER | Duration in minutes |
| `created_at` | TIMESTAMP | Creation date |
| `updated_at` | TIMESTAMP | Last update date |

---

## 👥 Role-Based Permissions

### 🔴 Admin (Full Access)
**Can Do:**
- ✅ Create and manage managers
- ✅ Create and manage barbers
- ✅ Create and manage services
- ✅ View and edit all profiles
- ✅ View all bookings
- ✅ Full database access

**Access:** All management screens

### 🟠 Manager (Barber & Service Management)
**Can Do:**
- ✅ Create and manage barbers
- ✅ Create and manage services
- ✅ View all profiles
- ✅ View bookings
- ❌ Cannot create managers

**Access:** Service Management, Barber Management

### 🟢 Barber (Own Profile & Appointments)
**Can Do:**
- ✅ View their appointments
- ✅ Update own profile
- ✅ View services
- ❌ Cannot manage other users

**Access:** Own bookings, own profile

### 🔵 Customer (Booking & Profile)
**Can Do:**
- ✅ Book appointments
- ✅ View own bookings
- ✅ Update own profile
- ✅ View services and barbers
- ❌ No management access

**Access:** Booking, profile editing

---

## ⚙️ Setup Instructions

### Complete Setup Steps

#### 1. Supabase Authentication
1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. Set:
   - ✅ Enable Email Signup: **ON**
   - ⚠️ Confirm Email: **OFF**
   - ✅ Enable Email OTP: **ON**
3. Click **Save**

#### 2. Database Setup
1. Go to **SQL Editor**
2. Copy entire `DATABASE_SETUP.sql`
3. Paste and click **Run**
4. Verify tables created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'services');
```

#### 3. Set Your Role to Admin
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

Verify:
```sql
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

#### 4. Create Storage Bucket
1. Dashboard → **Storage** → **New Bucket**
2. Bucket name: `service-icons`
3. **Make it Public** ✅
4. Click **Create**

#### 5. Add Storage Policies
Run the storage policies from **Step 4** in Quick Start

#### 6. Verify Setup
```sql
-- Check services exist
SELECT name, price, duration FROM services;

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('profiles', 'services');

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'service-icons';
```

---

## 🎯 Available Features

### ✅ Implemented Features

#### 1. Authentication
- Email-based OTP login (passwordless)
- Auto-create profile on signup
- Role assignment (customer by default)
- Session management

#### 2. Service Management (Manager/Admin Only)
**Location:** Home → Manager Mode → Service Management

Features:
- ✅ View all services
- ✅ Add new service (name, description, price, duration)
- ✅ Upload service icon image
- ✅ Edit existing services
- ✅ Delete services
- ✅ Pull to refresh
- ✅ Search services
- ✅ Loading states

#### 3. Barber Management (Manager/Admin Only)
**Location:** Home → Manager Mode → Barber Management

Features:
- ✅ View all barbers
- ✅ Add new barber (name, email, phone, bio)
- ✅ Assign service specialties
- ✅ Edit barber profiles
- ✅ Delete barbers (soft delete to customer)
- ✅ Search by name/email
- ✅ Display rating & reviews
- ✅ Pull to refresh
- ✅ Loading states

#### 4. Manager Management (Admin Only)
**Functions available in code:**
- `createManager()` - Add new manager
- `updateManager()` - Edit manager
- `deleteManager()` - Remove manager
- `fetchAllManagers()` - Get all managers

**UI:** Can be built using same pattern as BarberManagementScreen

#### 5. Home Screen
- View all barbers
- View all services
- Search barbers
- Role-based UI (customer/barber/manager/admin)
- Manager mode toggle

---

## 🔧 Functions Reference

### In `src/lib/auth.js`

#### Authentication Functions
```javascript
// Sign up with email
signUpWithEmail(email)

// Sign in with email
signInWithEmail(email)

// Verify OTP code
verifyEmailOTP(email, otp)

// Sign out
signOut()

// Get current user
getCurrentUser()

// Setup user profile after signup
setupUserProfile(userId, name)
```

#### Barber Management (Manager/Admin)
```javascript
// Get all barbers
fetchAllBarbers()

// Create new barber
createBarber({
  email: 'barber@example.com',
  name: 'John Doe',
  phone: '+1234567890',
  bio: 'Experienced barber',
  specialties: ['service-uuid-1', 'service-uuid-2']
})

// Update barber
updateBarber(barberId, {
  name: 'Updated Name',
  phone: '+0987654321',
  specialties: ['service-uuid-3']
})

// Delete barber (soft delete to customer role)
deleteBarber(barberId)

// Get barbers for display (HomeScreen)
fetchBarbers()
```

#### Manager Management (Admin Only)
```javascript
// Get all managers
fetchAllManagers()

// Create new manager
createManager({
  email: 'manager@example.com',
  name: 'Jane Smith',
  phone: '+1234567890'
})

// Update manager
updateManager(managerId, {
  name: 'Updated Name',
  phone: '+0987654321'
})

// Delete manager (soft delete to customer role)
deleteManager(managerId)
```

#### Service Management (Manager/Admin)
```javascript
// Get all services
fetchServices()

// Create new service
createService({
  name: 'New Service',
  description: 'Service description',
  price: 25.00,
  duration: 30,
  icon_url: 'https://...'
})

// Update service
updateService(serviceId, {
  name: 'Updated Name',
  price: 30.00
})

// Delete service
deleteService(serviceId)

// Upload service icon
uploadServiceIcon(fileUri, serviceId)
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### ❌ Error: "User not allowed"
**Cause:** Missing RLS policies or user doesn't have correct role

**Fix:**
1. Check your role:
```sql
SELECT role FROM profiles WHERE email = 'your@email.com';
```

2. Update to admin/manager:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

3. Verify RLS policies exist:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
```

4. Re-run `DATABASE_SETUP.sql` if policies missing

---

#### ❌ Cannot Create Barber/Service
**Cause:** User role is not manager or admin

**Fix:**
```sql
-- Check current role
SELECT id, email, role FROM profiles WHERE id = auth.uid();

-- Update to manager
UPDATE profiles SET role = 'manager' WHERE email = 'your@email.com';

-- Or update to admin
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

#### ❌ Services Not Showing
**Cause:** Empty services table

**Fix:**
```sql
-- Check if services exist
SELECT COUNT(*) FROM services;

-- Re-insert sample services (from DATABASE_SETUP.sql)
INSERT INTO services (name, description, icon_url, price, duration) VALUES
  ('Haircut', 'Professional haircut', 'https://...', 25.00, 30),
  ('Shaving', 'Clean shave', 'https://...', 15.00, 20);
```

---

#### ❌ Image Upload Fails
**Cause:** Storage bucket doesn't exist or no policies

**Fix:**
1. Create bucket: Dashboard → Storage → `service-icons` → Public
2. Add storage policies (see Setup Step 4)
3. Verify:
```sql
SELECT * FROM storage.buckets WHERE name = 'service-icons';
SELECT * FROM storage.policies WHERE bucket_id = 'service-icons';
```

---

#### ❌ Cannot Login / OTP Not Sent
**Cause:** OTP not enabled in Supabase

**Fix:**
1. Dashboard → Authentication → Providers → Email
2. Enable Email OTP: **ON**
3. Disable Confirm Email: **OFF**
4. Save

---

#### ❌ Profile Not Created After Signup
**Cause:** Trigger `handle_new_user` not working

**Fix:**
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'users';

-- Recreate trigger (from DATABASE_SETUP.sql)
CREATE OR REPLACE FUNCTION handle_new_user() ...
```

---

### Verification Commands

```sql
-- Check your current user
SELECT id, email, name, role FROM profiles WHERE id = auth.uid();

-- View all profiles
SELECT email, name, role FROM profiles ORDER BY created_at DESC;

-- View all services
SELECT name, price, duration FROM services;

-- Check RLS policies
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename IN ('profiles', 'services');

-- Check storage bucket
SELECT * FROM storage.buckets;

-- Check storage policies
SELECT * FROM storage.policies;

-- Test barber creation (as admin/manager)
SELECT COUNT(*) FROM profiles WHERE role = 'barber';
```

---

## 📱 How to Use in App

### As Admin/Manager

#### 1. Enable Manager Mode
1. Open app → Home Screen
2. Toggle **Manager Mode** ON (top right)
3. You'll see management buttons

#### 2. Manage Services
1. Home → Service Management
2. Click **Add Service**
3. Fill details: Name, Description, Price, Duration
4. Tap image area to upload icon
5. Click **Add** to save

#### 3. Manage Barbers
1. Home → Barber Management
2. Click **Add Barber**
3. Fill: Name, Email, Phone, Bio
4. Select specialties from services
5. Click **Add** to save

#### 4. Edit/Delete
- Tap **pencil icon** to edit
- Tap **trash icon** to delete
- Pull down to refresh list
- Use search bar to find specific item

### As Customer

#### 1. View Barbers
- Home Screen shows all barbers
- See ratings and reviews
- Tap barber to view details

#### 2. Book Appointment
1. Select a barber
2. Choose services
3. Pick date and time
4. Confirm booking

#### 3. View Bookings
- Bottom tab → Bookings
- See upcoming appointments
- Reschedule or cancel

---

## 📊 Database Cheat Sheet

### Quick Commands

```sql
-- Make user admin
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';

-- Make user manager
UPDATE profiles SET role = 'manager' WHERE email = 'user@example.com';

-- Make user barber
UPDATE profiles SET role = 'barber' WHERE email = 'user@example.com';

-- View all users by role
SELECT role, COUNT(*) as count FROM profiles GROUP BY role;

-- Delete all services
DELETE FROM services;

-- Reset user role to customer
UPDATE profiles SET role = 'customer' WHERE id = 'user-uuid';

-- Check who is admin
SELECT email, name FROM profiles WHERE role = 'admin';

-- View barbers with specialties
SELECT name, email, specialties FROM profiles WHERE role = 'barber';
```

---

## 🎉 You're All Set!

Your barber app now has:
- ✅ Complete database with 2 tables (profiles, services)
- ✅ Row Level Security (RLS) policies
- ✅ Role-based access control (4 roles)
- ✅ Service management (full CRUD)
- ✅ Barber management (full CRUD)
- ✅ Manager functions (admin can create)
- ✅ Image upload to Supabase Storage
- ✅ Auto profile creation on signup
- ✅ Sample services data

### Next Steps:
1. Build Manager Management Screen (use BarberManagementScreen as template)
2. Connect Booking Management to database
3. Implement reviews and ratings
4. Add real-time chat

---

**Questions?** Check your console logs or Supabase Dashboard → Logs for detailed errors.

**Everything documented in ONE place!** 🚀
