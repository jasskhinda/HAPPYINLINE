# Add Manager Feature - Complete Guide

## Overview
Shop owners can now add managers to their shop in TWO ways:
1. **Search Existing Users** - Add someone who already has an account
2. **Create New Account** - Create a brand new manager account for someone

---

## How It Works

### Tab 1: Search Existing Users
**Use this when**: The person already has a Happy Inline account

**Steps:**
1. Click "Add Manager" button
2. Stay on "Search Existing" tab (default)
3. Type their email in the search box
4. If found, their details show below
5. Click "Add Manager" to add them to your shop

**What happens:**
- They get added to `shop_staff` table with `role = 'admin'`
- They can now login and manage your shop
- They don't need to create a new account
- They see your shop in their manager dashboard

---

### Tab 2: Create New Account
**Use this when**: The person doesn't have an account yet

**Steps:**
1. Click "Add Manager" button
2. Switch to "Create New" tab
3. Fill in the form:
   - **Email**: Their email address (will be their login)
   - **Full Name**: Their display name
   - **Phone**: Their phone number (optional but recommended)
   - **Password**: Login password (minimum 6 characters)
4. Click "Create Manager Account"

**What happens:**
1. Creates Supabase Auth account with their email/password
2. Creates profile in `profiles` table with `role = 'manager'`
3. Adds them to `shop_staff` table with `role = 'admin'`
4. They receive a confirmation email (optional - can be configured)
5. They can immediately login with email/password

**Smart flow:**
- If you search for an email and it's not found, you'll see:
  - "User not found. Would you like to create a new account for them?"
  - Click "Create New Account" to switch to create mode with email pre-filled

---

## Permissions Explained

### Platform Role (`profiles.role = 'manager'`)
When you create a manager account, they get:
- Access to **Manager Dashboard** (not customer view)
- Ability to manage shops they're added to
- Professional features and tools

### Shop Role (`shop_staff.role = 'admin'`)
Within YOUR shop specifically, they can:
- ✅ Edit shop details (name, hours, location, etc.)
- ✅ Add/remove services
- ✅ Add/remove staff (barbers, other managers)
- ✅ View all bookings for the shop
- ✅ Manage all appointments
- ✅ Change shop settings
- ✅ View shop analytics/stats
- ✅ Respond to reviews

They CANNOT:
- ❌ Delete the shop (only original owner can)
- ❌ See other shops (unless they're added to those too)
- ❌ Approve/reject shops (that's super admin only)
- ❌ Access super admin features

---

## Use Cases

### Case 1: Adding Your Business Partner
**Scenario**: You own a barbershop with your friend. They don't have an account.

**Solution**: Use "Create New" tab
1. Enter their email: partner@gmail.com
2. Enter their name: John Smith
3. Enter their phone: 555-1234
4. Set password: Partner123
5. Click "Create Manager Account"

**Result**:
- They get an account with login credentials
- They see Manager Dashboard when they login
- They have full control over your shop
- You both can manage the business equally

---

### Case 2: Hiring a Shop Manager
**Scenario**: You hired someone to help run your shop. They already use the app as a customer.

**Solution**: Use "Search Existing" tab
1. Type their email: manager@example.com
2. Their profile shows up (name, phone, current role)
3. Click "Add Manager"

**Result**:
- Their role upgrades from customer to manager
- They see Manager Dashboard now
- They can manage your shop
- Their customer account stays (they can still book at other shops)

---

### Case 3: Multi-Shop Manager
**Scenario**: Someone manages Shop A and you want them to manage your Shop B too.

**Solution**: Use "Search Existing" tab
1. Search their email
2. Add them to Shop B

**Result**:
- They see BOTH shops in their manager dashboard
- They can switch between shops
- Each shop has separate settings/staff/bookings
- One login, multiple shops

---

## Database Structure

When you create a new manager account, three things happen:

### 1. Auth Account Created
```sql
-- Supabase creates this automatically
INSERT INTO auth.users (email, encrypted_password)
VALUES ('email@example.com', 'hashed_password');
```

### 2. Profile Created (via trigger)
```sql
-- handle_new_user() trigger creates this
INSERT INTO profiles (id, email, name, phone, role)
VALUES (
  user_id,
  'email@example.com',
  'Manager Name',
  '555-1234',
  'manager'  -- Platform role
);
```

### 3. Shop Staff Created
```sql
-- Your app creates this
INSERT INTO shop_staff (shop_id, user_id, role)
VALUES (
  'your-shop-id',
  user_id,
  'admin'  -- Shop-specific role
);
```

---

## Testing Guide

### Test 1: Create New Manager
1. Login as shop owner
2. Go to Staff Management
3. Click "Add Manager"
4. Switch to "Create New" tab
5. Enter test data:
   - Email: testmanager@test.com
   - Name: Test Manager
   - Phone: 555-9999
   - Password: Test123
6. Click "Create Manager Account"

**Expected result:**
- Success message appears
- Modal closes
- New manager appears in staff list
- They can login with testmanager@test.com / Test123
- They see Manager Dashboard
- They see your shop in their dashboard

---

### Test 2: Add Existing User
1. Have a friend who uses the app
2. Click "Add Manager"
3. Stay on "Search Existing" tab
4. Type their email
5. Click "Add Manager"

**Expected result:**
- They appear in your staff list
- Next time they login, they see Manager Dashboard
- Your shop shows in their list

---

### Test 3: Search Not Found → Create
1. Click "Add Manager"
2. Search for: nonexistent@test.com
3. See "User not found" message
4. Click "Create New Account" button
5. Email pre-fills to nonexistent@test.com
6. Complete the form
7. Create account

**Expected result:**
- Smooth flow from search to create
- Email already filled in
- Account created successfully

---

## Security Notes

### Password Requirements
- Minimum 6 characters (Supabase default)
- Can be changed later by the manager
- Stored securely with bcrypt hashing

### Email Verification
- Currently disabled for easier testing
- Can be enabled in Supabase settings
- If enabled, new managers must verify email before login

### Permissions
- Only shop owners (shop_staff.role = 'admin') can add managers
- RLS policies prevent unauthorized access
- Managers can't remove the original shop owner

---

## Common Questions

**Q: Can managers add other managers?**
A: Yes! If they have `role = 'admin'` in shop_staff, they can add more managers.

**Q: What if I enter the wrong email?**
A: The account will be created but the person won't have access unless they know the password. You can remove them from Staff Management.

**Q: Can I make someone a barber instead of admin?**
A: Not from this modal. This is specifically for adding managers with full access. To add barbers, use "Add Staff" → "Barber" option (different feature).

**Q: What if the email already exists?**
A: Supabase will return an error "User already exists". You should use "Search Existing" tab instead.

**Q: Can managers see my personal bookings?**
A: They can see all shop bookings. If you book at your own shop, yes. Personal bookings at other shops, no.

**Q: Can I limit what managers can do?**
A: Currently, `role = 'admin'` gives full access. If you want limited access, you'd add them as `role = 'manager'` (less permissions) - this is a future enhancement.

---

## Troubleshooting

### "User already exists" error
**Problem**: Email already has an account
**Solution**: Use "Search Existing" tab instead of "Create New"

### Created account but they can't login
**Problem**: Email verification might be enabled
**Solution**: Check Supabase dashboard → Authentication → Email verification settings

### Manager doesn't see shop after being added
**Problem**: They might still be logged in with old session
**Solution**: Have them logout and login again to refresh their session

### Password too weak error
**Problem**: Password less than 6 characters
**Solution**: Use at least 6 characters (or configure Supabase password policy)

---

## Next Steps

After adding managers, they can:
1. Login with their email/password
2. See Manager Dashboard
3. View your shop in their shop list
4. Manage services, staff, bookings
5. View analytics and reports
6. Update shop settings

You can:
- View all managers in Staff Management
- Remove managers if needed
- Add multiple managers to one shop
- See what each manager has access to

---

## File Reference

**Component**: [src/components/shop/AddManagerModal.jsx](src/components/shop/AddManagerModal.jsx)
**Lines**: Complete rewrite (685 lines)
**Key functions**:
- `handleCreateManager()`: Lines 75-171 - Creates new Supabase auth account
- `handleAddExistingUser()`: Lines 173-178 - Adds existing user
- Search UI: Lines 439-536
- Create UI: Lines 538-683
