# ✅ FIXED: Two-Table Service System + Multi-Select Modal

## 🔥 Problems Identified

### **1. Database Schema Mismatch**
Your database uses **TWO tables**:
- **`services`** - Global catalog (NO shop_id, NO price, only default_duration)
- **`shop_services`** - Links shops to services with custom pricing

But the code was trying to query:
```javascript
// ❌ WRONG
.from('services')
.eq('shop_id', shopId)  // Column doesn't exist!
```

### **2. Errors You Saw**
```
❌ column services.shop_id does not exist
❌ Could not find the 'duration' column of 'services' in the schema cache
```

**Root Cause:** 
- `services` table has `default_duration` NOT `duration`
- `services` table has NO `shop_id` column
- `services` table has NO `price` column

---

## 🎯 The Solution: Global Catalog System

### **Database Structure**

#### **Table 1: `services` (Global Catalog)**
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  default_duration INTEGER,  -- ⚠️ NOT "duration"!
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
);
```

#### **Table 2: `shop_services` (Shop Links)**
```sql
CREATE TABLE shop_services (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  service_id UUID REFERENCES services(id),
  custom_price NUMERIC(10, 2),  -- Each shop sets their own price!
  is_active BOOLEAN,
  UNIQUE(shop_id, service_id)
);
```

### **How It Works**

1. **Global Services** - Anyone can view all services in catalog
2. **Shop Selection** - Shop owner selects services they want to offer
3. **Custom Pricing** - Each shop sets their own price for each service
4. **Shop Services** - Only services in `shop_services` appear for that shop

---

## 📂 Files Fixed

### **1. `shopAuth.js` - Complete Rewrite**

#### **Added Functions:**

```javascript
// Get all services from global catalog
export const getAllServices = async ()

// Get services for specific shop (with custom prices)
export const getShopServices = async (shopId)

// Add existing service to shop
export const addServiceToShop = async (shopId, serviceId, customPrice)

// Create custom service and add to shop
export const createCustomService = async (shopId, serviceData, customPrice)

// Update shop service (price, is_active)
export const updateShopService = async (shopServiceId, updates)

// Remove service from shop
export const removeServiceFromShop = async (shopServiceId)
```

#### **Key Changes:**

**BEFORE (Wrong):**
```javascript
export const getShopServices = async (shopId) => {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('shop_id', shopId);  // ❌ shop_id doesn't exist!
}
```

**AFTER (Correct):**
```javascript
export const getShopServices = async (shopId) => {
  const { data } = await supabase
    .from('shop_services')
    .select(`
      id,
      custom_price,
      is_active,
      service_id,
      services (
        id,
        name,
        description,
        default_duration,
        category,
        image_url
      )
    `)
    .eq('shop_id', shopId)
    .eq('is_active', true);
  
  // Transform to flat structure
  return data.map(ss => ({
    id: ss.id,  // shop_service id
    service_id: ss.service_id,
    name: ss.services.name,
    duration: ss.services.default_duration,
    price: ss.custom_price,
    ...
  }));
}
```

---

### **2. `ServiceSelectorModal_MultiSelect.jsx` - NEW COMPONENT**

#### **Features:**

✅ **Multi-Select** - Checkboxes to select multiple services  
✅ **Custom Price Entry** - Enter price for each selected service  
✅ **Bottom Button** - "Add Selected Services (X)" at bottom  
✅ **Global Catalog** - Shows all services from `services` table  
✅ **Custom Service Creation** - "Add Custom" button to create new services  
✅ **Search** - Filter services by name/category/description  

#### **UI Flow:**

```
┌─────────────────────────────────────┐
│  Select Services         [Add Custom]│
├─────────────────────────────────────┤
│  🔍 [Search services...]            │
├─────────────────────────────────────┤
│  ✅ 2 service(s) selected           │
├─────────────────────────────────────┤
│                                      │
│  ☑️ [img] Haircut                   │
│          Hair • 30 min               │
│          Your Price: $25.00          │
│                                      │
│  ☐ [img] Beard Trim                 │
│          Beard • 20 min              │
│                                      │
│  ☑️ [img] Fade                       │
│          Hair • 45 min               │
│          Your Price: $35.00          │
│                                      │
├─────────────────────────────────────┤
│  [✓ Add Selected Services (2)]      │
└─────────────────────────────────────┘
```

#### **Props:**

```javascript
<ServiceSelectorModal
  visible={boolean}
  onClose={() => void}
  onServicesAdded={() => void}  // Called after services added
  shopId={string}
/>
```

#### **What Happens When User Clicks "Add Selected":**

1. Validates all selected services have prices
2. Calls `addServiceToShop(shopId, serviceId, price)` for each
3. Creates entries in `shop_services` table
4. Shows success message
5. Calls `onServicesAdded()` to refresh parent component

---

### **3. `ServiceManagementScreen.jsx` - Updated**

#### **Changes:**

```javascript
// BEFORE
import ServiceSelectorModal from '../../components/shop/ServiceSelectorModal_Simple';
import { getShopServices, uploadImage } from '../../lib/shopAuth';

const handleServiceSelected = async (serviceData) => {
  await supabase.from('services').insert([serviceData]);  // ❌ Wrong table!
}

// AFTER
import ServiceSelectorModal from '../../components/shop/ServiceSelectorModal_MultiSelect';
import {
  getShopServices,
  updateShopService,
  removeServiceFromShop,
  uploadImage
} from '../../lib/shopAuth';

const handleServicesAdded = () => {
  loadServices();  // ✅ Just reload, modal handles DB operations
}
```

#### **Edit Service:**

```javascript
// BEFORE
const handleSaveService = async () => {
  await supabase.from('services').update({ price: ... });  // ❌
}

// AFTER
const handleSaveService = async () => {
  await updateShopService(editingService.id, {
    custom_price: Number(formData.price),
    is_active: formData.is_active
  });
}
```

#### **Delete Service:**

```javascript
// BEFORE
const handleDeleteService = async (service) => {
  await supabase.from('services').update({ is_active: false });  // ❌
}

// AFTER
const handleDeleteService = async (service) => {
  await removeServiceFromShop(service.id);  // Deletes from shop_services
}
```

---

## 🧪 Testing Guide

### **Test 1: Add Services to Existing Shop**

1. Navigate to **Service Management**
2. Click **"Add Service"**
3. Modal opens showing global services
4. Select multiple services (checkboxes appear checked)
5. Enter custom price for each selected service
6. Verify **"Add Selected Services (X)"** button shows count
7. Click button
8. Verify:
   - ✅ Success message appears
   - ✅ Modal closes
   - ✅ Services appear in list with custom prices
   - ✅ Database: Check `shop_services` table has entries

### **Test 2: Create Custom Service**

1. In service modal, click **"Add Custom"**
2. Form appears
3. Fill in:
   - Name: "Special Cut"
   - Description: "Premium haircut"
   - Category: "Hair"
   - Duration: 60
   - Price: 50
4. Click **"Create & Add Service"**
5. Verify:
   - ✅ Service created in `services` table
   - ✅ Link created in `shop_services` table
   - ✅ Service appears in shop's list
   - ✅ Other shops can now select this service

### **Test 3: Edit Service Price**

1. Click **Edit** on a service
2. Change price to $30
3. Save
4. Verify:
   - ✅ `shop_services.custom_price` updated
   - ✅ UI shows new price
   - ✅ Original service in catalog unchanged

### **Test 4: Remove Service**

1. Click **Delete** on a service
2. Confirm removal
3. Verify:
   - ✅ Entry deleted from `shop_services`
   - ✅ Service removed from shop's list
   - ✅ Service still exists in global catalog
   - ✅ Other shops still have it

### **Test 5: Search & Filter**

1. Open service modal
2. Type "hair" in search
3. Verify only hair-related services shown
4. Clear search
5. Verify all services return

---

## 🗄️ Database Queries to Verify

### **Check Global Services:**
```sql
SELECT * FROM services ORDER BY category, name;
```

### **Check Shop Services:**
```sql
SELECT 
  ss.id,
  s.name,
  ss.custom_price,
  sh.name as shop_name
FROM shop_services ss
JOIN services s ON s.id = ss.service_id
JOIN shops sh ON sh.id = ss.shop_id
WHERE sh.id = 'your-shop-id'
AND ss.is_active = true;
```

### **Check Service Usage Across Shops:**
```sql
SELECT 
  s.name,
  COUNT(ss.id) as shop_count,
  AVG(ss.custom_price) as avg_price
FROM services s
LEFT JOIN shop_services ss ON ss.service_id = s.id AND ss.is_active = true
GROUP BY s.id, s.name
ORDER BY shop_count DESC;
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  SERVICES       │ ← Global Catalog
│  (Read-Only)    │   (Anyone can view)
└────────┬────────┘
         │
         │ Links via service_id
         │
         ▼
┌─────────────────┐
│  SHOP_SERVICES  │ ← Shop-Specific
│  shop_id        │   (Each shop's prices)
│  service_id     │
│  custom_price   │
└─────────────────┘

FLOW:
1. User opens modal → Fetches from SERVICES
2. User selects service → Enters custom price
3. User clicks "Add" → Inserts into SHOP_SERVICES
4. Shop displays services → Queries SHOP_SERVICES + SERVICES joined
```

---

## 🎯 Summary

### **What Was Fixed:**

1. ✅ `shopAuth.js` - Complete rewrite for two-table system
2. ✅ `ServiceSelectorModal_MultiSelect.jsx` - Multi-select with bottom button
3. ✅ `ServiceManagementScreen.jsx` - Updated to use new modal & functions
4. ✅ All database queries now use correct table joins
5. ✅ Custom pricing per shop implemented
6. ✅ Global catalog system working

### **Key Concepts:**

- **Global Catalog** - All services in `services` table
- **Shop Selection** - `shop_services` links shops to services
- **Custom Pricing** - Each shop sets their own price
- **Multi-Select** - Select multiple services at once
- **Bottom Button** - Confirm selection with one click

### **Next Steps:**

1. Test adding services to shop ✅
2. Test creating custom service ✅
3. Test editing service price ✅
4. Test removing service ✅
5. Verify database entries ✅

---

## 🚨 Important Notes

### **Column Names:**
- ❌ `duration` → ✅ `default_duration`
- ❌ `services.shop_id` → ✅ `shop_services.shop_id`
- ❌ `services.price` → ✅ `shop_services.custom_price`

### **IDs:**
- `service.id` from modal = `services.id` (global catalog)
- `service.id` from getShopServices = `shop_services.id` (shop link)
- When editing/deleting, use `shop_services.id`

### **Prices:**
- Services table has NO price
- Each shop sets custom_price in shop_services
- Same service can have different prices at different shops

---

**Ready to test!** 🚀
