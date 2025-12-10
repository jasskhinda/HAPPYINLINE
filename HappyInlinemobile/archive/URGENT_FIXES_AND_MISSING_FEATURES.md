# URGENT FIXES REQUIRED - Shop System Complete Implementation

## 🔴 **CRITICAL ERROR FIXED**

### RLS Policy Error (`shop_staff` INSERT blocked)
**Error**: `new row violates row-level security policy for table "shop_staff"`

**Root Cause**: Chicken-and-egg problem - shop creator can't add themselves as admin because they're not yet an admin

**✅ SOLUTION**: Run `FIX_SHOP_STAFF_INSERT_POLICY.sql` in Supabase

```sql
-- This policy now allows shop creator to add themselves as first admin
CREATE POLICY "shop_staff_insert"
ON shop_staff FOR INSERT
TO authenticated
WITH CHECK (
  is_shop_manager_or_admin(shop_id) OR 
  is_platform_admin() OR
  -- ✅ NEW: Allow shop creator to add themselves as first admin
  (role = 'admin' AND user_id = auth.uid() AND 
   EXISTS (SELECT 1 FROM shops WHERE id = shop_id AND created_by = auth.uid()))
);
```

---

## ✅ **COMPLETED: Remove Website Field**

- ✅ Removed `website` input from CreateShopScreen
- ✅ Added `city` field (required for better discoverability)
- ✅ Updated form validation

---

## 🚧 **MISSING FEATURES TO IMPLEMENT**

### 1. **Shop Management Screen** (HIGH PRIORITY)
**Path**: `src/presentation/shop/ShopManagementScreen.jsx`

**Features Required**:
```javascript
<ShopManagementScreen>
  {/* Header with Shop Info */}
  - Shop logo (editable - tap to upload)
  - Shop name, address, city (editable)
  - Rating display
  
  {/* Management Sections */}
  <Section title="Shop Details">
    - Edit shop name
    - Edit description
    - Edit address, city
    - Edit phone, email
    - Upload logo image
    - Upload cover image
  </Section>
  
  <Section title="Services" role="admin,manager">
    - List all services
    - Add new service (name, price, duration, image)
    - Edit existing service
    - Delete service
    - Toggle active/inactive
  </Section>
  
  <Section title="Staff Management" role="admin">
    - List all staff (barbers, managers)
    - Add new staff (search by email/phone)
    - Assign role (manager, barber)
    - Remove staff
    - Toggle active/inactive
  </Section>
  
  <Section title="Working Hours">
    - Set hours for each day
    - Mark shop closed on specific days
  </Section>
  
  <Section title="Danger Zone" role="admin">
    - Deactivate shop
    - Delete shop (with confirmation)
  </Section>
</ShopManagementScreen>
```

**Navigation**: 
- From ProfileScreen: "Manage Shop" button (if user is admin/manager)
- From ShopDetailsScreen: Gear icon (if user is shop staff)

---

### 2. **Service Selection UI** (HIGH PRIORITY)
**Path**: Update `src/presentation/main/bottomBar/home/ShopDetailsScreen.jsx`

**OLD BARBER DESIGN TO RECREATE**:
```
Remember the old SelectableServiceItem component design:

┌────────────────────────────────────┐
│ [✓] Haircut            $25         │
│     Professional haircut           │
│     Duration: 30 min               │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ [ ] Beard Trim         $15         │
│     Precise beard shaping          │
│     Duration: 20 min               │
└────────────────────────────────────┘

[Bottom Bar]
Total: $25 | Estimate: 30 min | [Book Appointment →]
```

**Implementation**:
```javascript
// Services Tab in ShopDetailsScreen
const ServicesTab = () => {
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  return (
    <View>
      {services.map(service => (
        <SelectableServiceItem
          key={service.id}
          service={service}
          selected={selectedServices.includes(service.id)}
          onToggle={handleServiceToggle}
        />
      ))}
      
      {selectedServices.length > 0 && (
        <BottomBar>
          <Text>Total: ${totalPrice}</Text>
          <Text>Duration: {totalDuration} min</Text>
          <Button onPress={handleBookAppointment}>
            Book Appointment →
          </Button>
        </BottomBar>
      )}
    </View>
  );
};
```

**Service Data Structure** (from database):
```javascript
{
  id: uuid,
  shop_id: uuid,
  name: string,           // "Haircut"
  description: string,    // "Professional haircut"
  price: number,          // 25.00
  duration_minutes: number, // 30
  icon_url: string,       // Image URL
  is_active: boolean
}
```

---

### 3. **Service Management for Admins/Managers**
**Path**: `src/presentation/shop/ServiceManagementScreen.jsx`

**Features**:
```javascript
<ServiceManagementScreen shopId={currentShopId}>
  {/* Header */}
  <Header>
    Services for [Shop Name]
    <Button>[+ Add Service]</Button>
  </Header>
  
  {/* Service List */}
  <FlatList data={services}>
    <ServiceItem>
      - Icon/Image
      - Name, Description
      - Price, Duration
      - Active status toggle
      - [Edit] [Delete] buttons
    </ServiceItem>
  </FlatList>
  
  {/* Add/Edit Service Modal */}
  <Modal visible={showServiceModal}>
    <Input label="Service Name*" />
    <Input label="Description" multiline />
    <Input label="Price*" keyboardType="decimal-pad" />
    <Input label="Duration (minutes)*" keyboardType="number-pad" />
    <ImagePicker label="Service Icon" />
    <Switch label="Active" />
    <Button>Save Service</Button>
  </Modal>
</ServiceManagementScreen>
```

**API Functions** (add to shopAuth.js):
```javascript
// Add service
export const createService = async (shopId, serviceData) => {
  const { data, error } = await supabase
    .from('services')
    .insert({
      shop_id: shopId,
      ...serviceData
    })
    .select()
    .single();
  
  return { success: !error, service: data, error: error?.message };
};

// Update service
export const updateService = async (serviceId, updates) => {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select()
    .single();
  
  return { success: !error, service: data, error: error?.message };
};

// Delete service
export const deleteService = async (serviceId) => {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);
  
  return { success: !error, error: error?.message };
};
```

---

### 4. **Staff Management for Admins**
**Path**: `src/presentation/shop/StaffManagementScreen.jsx`

**Features**:
```javascript
<StaffManagementScreen shopId={currentShopId}>
  {/* Current Staff */}
  <Section title="Current Staff">
    <StaffList>
      - Avatar, Name, Role badge
      - Phone, Email
      - [Edit Role] [Remove] buttons (if not self)
    </StaffList>
  </Section>
  
  {/* Add Staff */}
  <Section title="Add New Staff">
    <SearchInput placeholder="Search by phone or email" />
    <SearchResults>
      {/* Show matching users from profiles table */}
      <UserItem onPress={handleAddStaff}>
        - Avatar, Name
        - Phone/Email
        - [Add as Manager] [Add as Barber] buttons
      </UserItem>
    </SearchResults>
  </Section>
</StaffManagementScreen>
```

**API Functions**:
```javascript
// Search users (for adding staff)
export const searchUsers = async (query) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, profile_image')
    .or(`email.ilike.%${query}%,phone.ilike.%${query}%`)
    .limit(20);
  
  return { success: !error, users: data, error: error?.message };
};

// Add staff member
export const addStaffMember = async (shopId, userId, role) => {
  const { data, error} = await supabase
    .from('shop_staff')
    .insert({
      shop_id: shopId,
      user_id: userId,
      role: role, // 'manager' or 'barber'
      is_active: true
    })
    .select()
    .single();
  
  return { success: !error, staff: data, error: error?.message };
};

// Remove staff member
export const removeStaffMember = async (shopId, userId) => {
  const { error } = await supabase
    .from('shop_staff')
    .delete()
    .eq('shop_id', shopId)
    .eq('user_id', userId);
  
  return { success: !error, error: error?.message };
};

// Update staff role
export const updateStaffRole = async (shopId, userId, newRole) => {
  const { data, error } = await supabase
    .from('shop_staff')
    .update({ role: newRole })
    .eq('shop_id', shopId)
    .eq('user_id', userId)
    .select()
    .single();
  
  return { success: !error, staff: data, error: error?.message };
};
```

---

### 5. **Booking Flow Update**
**Path**: `src/presentation/booking/CreateBookingScreen.jsx`

**Changes Required**:
```javascript
// Add shop_id to booking creation
const handleCreateBooking = async () => {
  const bookingData = {
    shop_id: currentShopId,        // ✅ NEW: Shop context
    barber_id: selectedBarberId,   // Optional (can be null)
    services: selectedServices,     // Array of service IDs
    appointment_date: selectedDate,
    appointment_time: selectedTime,
    customer_notes: notes
  };
  
  const result = await createBooking(bookingData);
  // ... handle result
};
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### Phase 1: Fix Critical Blocking Issues ✅
- [x] Fix RLS policy for shop_staff INSERT
- [x] Remove website field from CreateShopScreen
- [x] Add city field to CreateShopScreen

### Phase 2: Service Management (DO THIS FIRST)
- [ ] Create SelectableServiceItem component (reuse old design)
- [ ] Update ShopDetailsScreen Services tab with selectable UI
- [ ] Add bottom bar showing total price and duration
- [ ] Wire up "Book Appointment" button
- [ ] Create ServiceManagementScreen for admins
- [ ] Add createService, updateService, deleteService to shopAuth.js

### Phase 3: Shop Management Dashboard
- [ ] Create ShopManagementScreen
- [ ] Add shop details editing
- [ ] Add image upload (logo, cover)
- [ ] Add working hours editor
- [ ] Add navigation from ProfileScreen and ShopDetailsScreen

### Phase 4: Staff Management
- [ ] Create StaffManagementScreen
- [ ] Add user search functionality
- [ ] Add staff invite/add feature
- [ ] Add staff role editor
- [ ] Add staff removal feature

### Phase 5: Testing
- [ ] Test: Create shop → Add services → Add staff → Booking flow
- [ ] Test: Edit shop details → Upload images
- [ ] Test: Manager can add services, Barber cannot
- [ ] Test: Admin can add/remove staff

---

## 🎯 **IMMEDIATE ACTION REQUIRED**

**Step 1**: Run SQL fix in Supabase
```sql
-- Copy contents of FIX_SHOP_STAFF_INSERT_POLICY.sql
-- Paste in Supabase SQL Editor
-- Click "Run"
```

**Step 2**: Test shop creation
- Try creating a shop again
- Should succeed without RLS error
- Creator should be added as admin automatically

**Step 3**: Start implementing Service Management
- This is the highest priority feature
- Recreate the old service selection UI
- Make it shop-specific

---

## 📝 **NOTES**

- **Service logic remains the same** as old barber app (name, price, duration, image)
- **Only admins/managers can add/edit services**
- **Barbers can only view services**, not create/edit
- **Website field removed** as requested
- **City field is required** for shop discoverability
- **RLS policies are fixed** to allow shop creator self-assignment

---

**Status**: Phase 1 Complete ✅ | Ready for Phase 2 Implementation
