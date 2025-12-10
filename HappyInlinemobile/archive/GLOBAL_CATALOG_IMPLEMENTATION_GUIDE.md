# 🎯 GLOBAL SERVICE CATALOG - Complete Implementation Guide

## 📋 Overview

**NEW APPROACH:** Services are stored globally and shared across all shops. Each shop links to services with their own custom pricing.

### Benefits:
- ✅ **No duplicate services** - "Haircut" exists once in global catalog
- ✅ **Easy service discovery** - Shops can browse existing services
- ✅ **Custom pricing** - Each shop sets their own price
- ✅ **Efficient** - Reduces database bloat
- ✅ **Scalable** - New shops can quickly add popular services

---

## 🏗️ Database Structure

### 1. `services` Table (Global Catalog)
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,           -- "Haircut", "Beard Trim", etc.
  description TEXT,
  default_duration INTEGER,   -- Suggested duration in minutes
  category TEXT,              -- "Hair", "Beard", "Grooming"
  image_url TEXT,
  created_by UUID,            -- Who created this service
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Purpose:** Global catalog of ALL services

### 2. `shop_services` Table (Linking)
```sql
CREATE TABLE shop_services (
  id UUID PRIMARY KEY,
  shop_id UUID → shops(id),
  service_id UUID → services(id),
  custom_price NUMERIC,       -- Shop's price for this service
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(shop_id, service_id) -- Each service once per shop
);
```

**Purpose:** Links services to shops with custom pricing

---

## 📊 Data Flow Examples

### Example 1: Shop A Creates "Haircut"
```
1. User creates service → INSERT INTO services
   - name: "Haircut"
   - default_duration: 30 min
   
2. Automatically link to Shop A → INSERT INTO shop_services
   - shop_id: shop-A
   - service_id: haircut-service-id
   - custom_price: $25
```

### Example 2: Shop B Adds "Haircut"
```
1. User searches services → finds "Haircut" in global catalog

2. User sets custom price → $30

3. Link to Shop B → INSERT INTO shop_services
   - shop_id: shop-B
   - service_id: haircut-service-id (SAME as Shop A!)
   - custom_price: $30
```

### Result:
```
services table:
  - id: haircut-123, name: "Haircut", default_duration: 30

shop_services table:
  - id: 1, shop_id: shop-A, service_id: haircut-123, price: $25
  - id: 2, shop_id: shop-B, service_id: haircut-123, price: $30
```

**ONE service, TWO shops, TWO prices!** ✅

---

## 🚀 Setup Instructions

### Step 1: Run SQL Setup
```sql
-- In Supabase SQL Editor:
-- Copy and run: GLOBAL_SERVICE_CATALOG_SETUP.sql
```

This creates:
- ✅ `services` table
- ✅ `shop_services` table
- ✅ Helper functions
- ✅ RLS policies
- ✅ Sample services

### Step 2: Replace ServiceSelectorModal
```bash
# Backup old file
mv src/components/shop/ServiceSelectorModal.jsx src/components/shop/ServiceSelectorModal_Old.jsx

# Use new file
mv src/components/shop/ServiceSelectorModal_New.jsx src/components/shop/ServiceSelectorModal.jsx
```

### Step 3: Update ServiceManagementScreen

Replace service loading to use new functions:

```javascript
import { 
  getShopServices,              // Get shop's services
  getAvailableServicesForShop,  // Get services to add
  createAndAddService,           // Create new + add to shop
  addServiceToShop,              // Add existing to shop
  updateShopService,             // Update price
  removeServiceFromShop          // Remove from shop
} from '../../lib/shopAuth';

// Load shop's services
const loadServices = async () => {
  const { success, services } = await getShopServices(shopId);
  if (success) {
    setServices(services);
  }
};

// Handle modal callbacks
const handleSelectExisting = async (serviceId, customPrice) => {
  const { success } = await addServiceToShop(shopId, serviceId, customPrice);
  if (success) {
    loadServices(); // Refresh
    Alert.alert('Success', 'Service added!');
  }
};

const handleCreateNew = async (serviceData) => {
  const { success } = await createAndAddService(shopId, serviceData);
  if (success) {
    loadServices(); // Refresh
    Alert.alert('Success', 'Service created and added!');
  }
};
```

---

## 💡 UI Workflow

### When User Clicks "Add Service":

#### Modal Opens with 2 Tabs:

**Tab 1: Select Existing**
```
┌─────────────────────────────────────┐
│ 🔍 Search services...               │
├─────────────────────────────────────┤
│ ✂️  Haircut                         │
│    Classic men's haircut            │
│    30 min · Hair                    │
│                             [Add +] │
├─────────────────────────────────────┤
│ 🧔 Beard Trim                       │
│    Beard shaping and trimming       │
│    20 min · Beard                   │
│                             [Add +] │
└─────────────────────────────────────┘
```

**Click service → Price input popup:**
```
┌─────────────────────────────────┐
│ Set Your Price                  │
│                                 │
│ Haircut                         │
│ Suggested: 30 min               │
│                                 │
│ Your Price: [$ 25.00]           │
│                                 │
│ [Cancel]  [Add Service]         │
└─────────────────────────────────┘
```

**Tab 2: Create New**
```
┌─────────────────────────────────────┐
│ [📷 Upload Image]                   │
│                                     │
│ Service Name: [Fade Haircut]        │
│ Description: [Modern fade...]       │
│ Category: [Hair]                    │
│ Default Duration: [45] min          │
│ Your Price: [$ 30.00]               │
│                                     │
│       [Create & Add to Shop]        │
└─────────────────────────────────────┘
```

---

## 🔧 API Functions Reference

### Get Services
```javascript
// Get all services in global catalog
const { services } = await getAllServices();

// Get services available for shop to add
const { services } = await getAvailableServicesForShop(shopId);

// Get services shop currently offers
const { services } = await getShopServices(shopId);
```

### Add/Create Services
```javascript
// Create new service in global catalog
const { service } = await createGlobalService({
  name: 'Fade Haircut',
  description: 'Modern fade',
  default_duration: 45,
  category: 'Hair',
  image_url: 'url'
});

// Add existing service to shop
const { shopService } = await addServiceToShop(
  shopId,
  serviceId,
  customPrice
);

// Create and add in one call
const { shopService } = await createAndAddService(shopId, {
  name: 'New Service',
  description: '...',
  default_duration: 30,
  custom_price: 25,
  category: 'Hair',
  image_url: 'url'
});
```

### Update/Remove Services
```javascript
// Update shop's price for a service
await updateShopService(shopServiceId, {
  custom_price: 30.00
});

// Remove service from shop
await removeServiceFromShop(shopServiceId);
```

---

## 📱 User Stories

### Story 1: New Shop Owner
```
1. Creates shop "Bob's Barbers"
2. Clicks "Add Service"
3. Sees 50+ existing services other shops created
4. Selects "Haircut" → sets price $25
5. Selects "Beard Trim" → sets price $15
6. Done! Shop has 2 services in 30 seconds
```

### Story 2: Established Shop
```
1. Wants to offer "Hot Towel Shave"
2. Searches global catalog → not found
3. Clicks "Create New"
4. Fills form and creates
5. Now available for ALL other shops!
```

### Story 3: Customer Booking
```
1. Views Shop A's services
2. Sees "Haircut - $25"
3. Books appointment

Behind the scenes:
  - Booking references shop_services.id
  - Shop A gets $25 for this service
  - Shop B offers same "Haircut" for $30
```

---

## 🎯 Key Differences from Old Approach

### OLD (Shop-Specific Services):
```
services table:
  - id: 1, shop_id: shop-A, name: "Haircut", price: 25
  - id: 2, shop_id: shop-B, name: "Haircut", price: 30  ❌ DUPLICATE!
  - id: 3, shop_id: shop-C, name: "Haircut", price: 28  ❌ DUPLICATE!
```

**Problems:**
- Duplicate service names
- Each shop creates from scratch
- No service discovery
- Database bloat

### NEW (Global Catalog):
```
services table:
  - id: haircut-123, name: "Haircut", default_duration: 30

shop_services table:
  - shop_id: shop-A, service_id: haircut-123, price: 25
  - shop_id: shop-B, service_id: haircut-123, price: 30
  - shop_id: shop-C, service_id: haircut-123, price: 28
```

**Benefits:**
- ✅ One service entry
- ✅ Easy to add for new shops
- ✅ Each shop sets own price
- ✅ Efficient database

---

## 🧪 Testing Checklist

### Test 1: Create New Service
- [ ] Click "Add Service" → "Create New"
- [ ] Fill form with all fields
- [ ] Upload image
- [ ] Click "Create & Add to Shop"
- [ ] Service appears in shop's service list

### Test 2: Add Existing Service
- [ ] Click "Add Service" → "Select Existing"
- [ ] Search for service
- [ ] Click service → enter price
- [ ] Click "Add Service"
- [ ] Service appears in shop's list with custom price

### Test 3: Multiple Shops Same Service
- [ ] Shop A adds "Haircut" for $25
- [ ] Shop B adds same "Haircut" for $30
- [ ] Both shops see service in their list
- [ ] Prices are different
- [ ] Only ONE "Haircut" in `services` table

### Test 4: Update Price
- [ ] Edit service in shop
- [ ] Change price from $25 to $30
- [ ] Save
- [ ] Other shops not affected

### Test 5: Remove Service
- [ ] Delete service from shop
- [ ] Removed from shop's list
- [ ] Still in global catalog
- [ ] Other shops still have it

---

## 📊 SQL Queries for Testing

```sql
-- View all services in global catalog
SELECT * FROM services ORDER BY category, name;

-- View shop's services with prices
SELECT 
  s.name,
  s.default_duration,
  ss.custom_price,
  ss.is_active
FROM shop_services ss
JOIN services s ON s.id = ss.service_id
WHERE ss.shop_id = 'YOUR_SHOP_ID';

-- Count how many shops offer each service
SELECT 
  s.name,
  COUNT(ss.id) as shop_count
FROM services s
LEFT JOIN shop_services ss ON ss.service_id = s.id
GROUP BY s.id, s.name
ORDER BY shop_count DESC;

-- Find most popular services
SELECT 
  s.name,
  COUNT(ss.id) as shops_offering,
  AVG(ss.custom_price) as avg_price
FROM services s
LEFT JOIN shop_services ss ON ss.service_id = s.id
GROUP BY s.id, s.name
HAVING COUNT(ss.id) > 0
ORDER BY shops_offering DESC
LIMIT 10;
```

---

## ✨ Summary

**What Changed:**
- ❌ OLD: Each shop creates duplicate services
- ✅ NEW: Global catalog, shops link with custom prices

**Files to Update:**
1. Run `GLOBAL_SERVICE_CATALOG_SETUP.sql` in Supabase
2. Replace `ServiceSelectorModal.jsx` with new version
3. Update `ServiceManagementScreen.jsx` to use new API functions

**Benefits:**
- Faster service setup for new shops
- No duplicate data
- Service discovery
- Custom pricing per shop
- Scalable architecture

**Ready to implement!** 🚀
