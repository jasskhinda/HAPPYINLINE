# Multi-Industry Terminology Guide

## Overview
Happy Inline has transitioned from a barbershop-specific app to a multi-industry booking platform supporting salons, gyms, spas, clinics, and more.

## Terminology Strategy

### User-Facing Terms (UI/UX)
- **Provider** - Generic term for service professionals (replaces "barber")
- **Staff** - Team members who provide services
- **Service Professional** - Formal term when needed

### Database Schema (Backwards Compatible)
We've chosen to keep existing database column names for backwards compatibility:

| Database Column | Meaning in Multi-Industry Context |
|----------------|-----------------------------------|
| `barber_id` | → Provider ID (service professional) |
| `barber_rating` | → Provider rating |

**Why?** Changing these would require complex migrations and could break existing data. The column names are internal implementation details not exposed to users.

### Code Guidelines

1. **New Code**: Use generic terms like "provider" or "staff"
2. **Existing DB Queries**: Keep `barber_id` etc. for compatibility
3. **Comments**: Add clarifying comments where needed:
   ```javascript
   // barber_id represents the service provider (multi-industry)
   const providerId = booking.barber_id;
   ```

4. **User-Facing Text**: Always use industry-neutral language:
   - ✅ "Select a provider"
   - ✅ "Choose your service professional"
   - ❌ "Select a barber"

## Updated Areas

### License-Based Pricing
- ✅ BusinessRegistration.jsx - Removed "barber" from license explanation
- ✅ UPDATE_LICENSE_BASED_PLANS.sql - Uses 'staff', 'manager', 'provider' roles

### Booking Management
- ✅ BookingManagementScreen.jsx - Uses "Provider" label instead of "Barber"

## Pending Updates
Areas that still reference "barber" but are lower priority:
- Internal function names (e.g., `getShopBarbers` → can stay for now)
- Archive/documentation files
- Test data scripts

## Future Consideration
If we ever need to do a major database refactor, we can:
1. Create new columns (`provider_id`)
2. Migrate data from old columns (`barber_id`)
3. Deprecate old columns gradually
4. Update all references

For now, the hybrid approach (database uses "barber", UI uses "provider") works well.
