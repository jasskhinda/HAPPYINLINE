# Provider Selection Implementation Guide

## Overview
Adding provider/staff selection to the booking flow so customers can choose their favorite service provider.

## Changes Summary

### 1. Database Changes (RUN THESE FIRST)

**File:** `database/ADD_SERVICE_PROVIDERS_TABLE.sql`
- Creates `service_providers` junction table
- Links services to providers (many-to-many relationship)
- Includes RLS policies for security

**File:** `database/ADD_PROVIDER_TO_BOOKINGS.sql`
- Adds `provider_id` column to `bookings` table
- **Changes booking status default to 'confirmed'** (auto-approval)
- Adds index for better performance

### 2. Updated Components

**File:** `src/components/shop/AddServiceModal.jsx`
- ✅ **COMPLETED** - Updated to include provider selection
- Loads all staff with role 'barber' for the shop
- Multi-select checkboxes for assigning providers to service
- Shows "Provider" label (multi-industry friendly)
- Requires `shopId` prop to be passed

### 3. Components Still Need Updating

#### A. Service Management Screens
**Files to update:**
- `src/presentation/main/bottomBar/home/manager/ServiceManagementScreen.jsx`
- `src/presentation/shop/ServiceManagementScreen.jsx`

**Changes needed:**
1. Pass `shopId` prop to AddServiceModal (if using it)
2. After creating/updating service, save provider assignments to `service_providers` table
3. When editing service, load existing provider assignments
4. Display assigned providers in service list

**Code pattern for saving providers:**
```javascript
// After service is created/updated
const serviceId = result.serviceId;
const providerIds = formData.provider_ids; // from AddServiceModal

// Delete existing assignments
await supabase
  .from('service_providers')
  .delete()
  .eq('service_id', serviceId);

// Insert new assignments
if (providerIds.length > 0) {
  const assignments = providerIds.map(providerId => ({
    service_id: serviceId,
    provider_id: providerId,
    shop_id: shopId,
  }));

  await supabase
    .from('service_providers')
    .insert(assignments);
}
```

#### B. Customer Booking Flow
**New screen needed:** `src/presentation/booking/ProviderSelectionScreen.jsx`

**Flow:**
1. Customer selects service
2. Navigate to Provider Selection Screen
3. Load providers assigned to that service from `service_providers` table
4. Show list of providers with "Any Available" option
5. Customer selects provider
6. Navigate to time selection

**Code pattern for loading providers:**
```javascript
const { data: serviceProviders } = await supabase
  .from('service_providers')
  .select(`
    provider_id,
    users:provider_id (
      id,
      full_name,
      email
    )
  `)
  .eq('service_id', selectedServiceId);

const providers = serviceProviders.map(sp => ({
  id: sp.users.id,
  name: sp.users.full_name || sp.users.email,
}));
```

#### C. Booking Creation
**File:** Update wherever bookings are created (likely in booking confirmation)

**Changes:**
1. Include `provider_id` in booking insert
2. Remove any approval flow (status should default to 'confirmed')
3. If provider not selected, set `provider_id` to null (any available)

```javascript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    shop_id: shopId,
    customer_id: customerId,
    service_id: serviceId,
    provider_id: selectedProviderId || null, // null = any available
    booking_date: selectedDate,
    start_time: selectedTime,
    end_time: calculatedEndTime,
    // status defaults to 'confirmed' now
  });
```

#### D. Booking Display
**Files to update:**
- `src/presentation/main/bottomBar/bookings/BookingDetailScreen.jsx`
- `src/presentation/main/bottomBar/bookings/component/BookingCard.jsx`
- Any other booking display components

**Changes:**
1. Fetch provider details with booking
2. Display provider name with "Provider:" label
3. Handle null provider (show "Any Available")

```javascript
// In query
.select(`
  *,
  provider:provider_id (
    id,
    full_name,
    email
  )
`)

// In UI
{booking.provider ? (
  <View>
    <Text style={styles.providerLabel}>Provider</Text>
    <Text style={styles.providerName}>
      {booking.provider.full_name}
    </Text>
  </View>
) : (
  <Text style={styles.anyProvider}>Any Available</Text>
)}
```

## Testing Checklist

- [ ] Run database migrations successfully
- [ ] Create a service and assign multiple providers
- [ ] Edit a service and change provider assignments
- [ ] View service list showing assigned providers
- [ ] Customer can select a service and see provider options
- [ ] Customer can select "Any Available" provider
- [ ] Customer can select specific provider
- [ ] Booking is created with correct provider_id
- [ ] Booking is auto-approved (status = 'confirmed')
- [ ] Booking details show provider name
- [ ] Booking list shows provider info

## Notes

- **Terminology:** Always use "Provider" not "Barber" for multi-industry support
- **Auto-Approval:** Bookings no longer need manual approval by owner/manager
- **Any Available:** If customer doesn't select provider, provider_id is null
- **RLS Policies:** Already configured in migrations for proper access control
