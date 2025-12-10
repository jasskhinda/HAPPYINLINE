# ✅ GLOBAL SERVICE CATALOG - COMPLETE IMPLEMENTATION

## Overview

Successfully implemented a **shared global service catalog** where:
- All services are stored in a global `services` table
- Any shop can select existing services OR create new ones
- Each shop sets their own custom price for services
- Services are linked to shops via `shop_services` table

---

## 🗄️ Database Structure

### 1. **`services` Table** (Global Catalog)
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,                -- Service name (globally unique)
  description TEXT,
  default_duration INTEGER,        -- Default duration in minutes
  category TEXT,
  image_url TEXT,
  icon_url TEXT,
  created_by UUID,                 -- User who created it
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```
**NO shop_id** - services are global!
**NO price** - each shop sets their own price!

### 2. **`shop_services` Table** (Linking Table)
```sql
CREATE TABLE shop_services (
  id UUID PRIMARY KEY,
  shop_id UUID → shops(id),
  service_id UUID → services(id),
  custom_price NUMERIC,            -- Shop's custom price for this service
  is_active BOOLEAN,
  UNIQUE(shop_id, service_id)      -- One service per shop
);
```

---

## 🎯 How It Works

### **For Shop Owners:**

1. **Add Service** → Opens modal with 2 tabs:
   
   **Tab 1: "Select Existing"**
   - Browse all services in global catalog
   - Search by name/category
   - Select service → Set your custom price → Add to shop
   
   **Tab 2: "Create New"**
   - Service doesn't exist? Create it!
   - Fills out: Name, Description, Duration, Category, Image
   - Sets custom price
   - Service is added to GLOBAL catalog AND your shop

2. **Edit Service**
   - Can only edit the **price** (custom_price in shop_services)
   - Cannot edit name/description (global service properties)

3. **Remove Service**
   - Removes service from YOUR shop only
   - Service remains in global catalog for other shops

---

## 📝 SQL Setup

**Run this in Supabase SQL Editor:**

```sql
-- Located in: SETUP_GLOBAL_SERVICE_CATALOG.sql
-- This script will:
✅ Backup existing data
✅ Recreate services table (remove shop_id, price)
✅ Create shop_services linking table
✅ Migrate old data
✅ Add default services (Haircut, Beard Trim, etc.)
```

**To run:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy content from `SETUP_GLOBAL_SERVICE_CATALOG.sql`
4. Execute

---

## 🔧 API Functions (shopAuth.js)

### **Global Catalog Functions:**

```javascript
// Get all services in global catalog
const { success, services } = await getAllServices();

// Get services available to add (not already in shop)
const { success, services } = await getAvailableServicesForShop(shopId);

// Get shop's services (with custom pricing)
const { success, services } = await getShopServices(shopId);
```

### **Service Management:**

```javascript
// Create new service in global catalog
const { success, service } = await createGlobalService({
  name: 'Haircut',
  description: 'Classic haircut',
  default_duration: 30,
  category: 'Hair',
  image_url: 'https://...'
});

// Add existing service to shop with custom price
const { success } = await addServiceToShop(shopId, serviceId, customPrice);

// Update shop service (price only)
const { success } = await updateShopService(shopServiceId, {
  custom_price: 35.00
});

// Remove service from shop
const { success } = await removeServiceFromShop(shopServiceId);
```

---

## 🎨 UI Components

### **ServiceSelectorModal** (Dual Mode)

**Props:**
```javascript
<ServiceSelectorModal
  visible={true}
  onClose={() => {}}
  onSelectExisting={(serviceId, customPrice) => {}}  // Tab 1
  onCreateNew={(serviceData) => {}}                   // Tab 2
  shopId={shopId}
/>
```

**Tab 1: Select Existing**
- Shows available services (not already added)
- Search functionality
- Each service shows: name, category, default duration
- Input field for custom price
- "Add to Shop" button

**Tab 2: Create New**
- Form fields:
  - Name (required)
  - Description
  - Duration (required)
  - Category
  - Custom Price (required)
  - Image upload
- "Create & Add to Shop" button

---

## 🔄 Updated Screens

### **ServiceManagementScreen.jsx**

**Key Changes:**
```javascript
// OLD (shop-specific services)
import { getServices, createService, updateService, deleteService } from '../../lib/shopAuth';

// NEW (global catalog)
import { 
  getShopServices,           // Get shop's services
  createGlobalService,       // Create in global catalog
  addServiceToShop,          // Link existing to shop
  updateShopService,         // Update price
  removeServiceFromShop      // Remove from shop
} from '../../lib/shopAuth';
```

**Handlers:**
- `handleSelectExistingService(serviceId, customPrice)` - Add existing service to shop
- `handleCreateNewService(serviceData)` - Create new + add to shop
- `handleDeleteService(service)` - Remove from shop (not delete globally)

### **ShopDetailsScreen.jsx**

**Already using `getShopServices(shopId)`** ✅ - No changes needed!

---

## 📊 Data Flow

### **Adding Existing Service:**
```
1. User opens ServiceSelectorModal (Tab 1: Select)
2. Browses available services
3. Selects service, enters custom price
4. Clicks "Add to Shop"
   ↓
5. addServiceToShop(shopId, serviceId, customPrice)
   ↓
6. INSERT INTO shop_services (shop_id, service_id, custom_price)
   ↓
7. Service appears in shop's service list
```

### **Creating New Service:**
```
1. User opens ServiceSelectorModal (Tab 2: Create)
2. Fills form (name, duration, price, etc.)
3. Clicks "Create & Add"
   ↓
4. createGlobalService({ name, description, default_duration, ... })
   ↓
5. INSERT INTO services (returns service.id)
   ↓
6. addServiceToShop(shopId, service.id, customPrice)
   ↓
7. Service available globally + added to shop
```

---

## 🧪 Testing Guide

### **Test 1: Select Existing Service**
1. Navigate to Service Management
2. Click "Add Service"
3. Go to "Select Existing" tab
4. Choose a service (e.g., "Haircut")
5. Enter price (e.g., $25)
6. Click "Add to Shop"
7. **Expected:** Service appears in list with your price

### **Test 2: Create New Service**
1. Click "Add Service"
2. Go to "Create New" tab
3. Fill form:
   - Name: "Hot Towel Shave"
   - Duration: 20
   - Price: $30
   - Category: "Beard"
4. Click "Create & Add"
5. **Expected:** Service created and added to shop

### **Test 3: Edit Price**
1. Click edit on a service
2. Change price
3. Save
4. **Expected:** Price updated (cannot edit name/description)

### **Test 4: Remove Service**
1. Click delete on a service
2. Confirm removal
3. **Expected:** Service removed from YOUR shop only
4. Check other shops - service still exists globally

### **Test 5: Service Sharing**
1. Shop A creates "Fade Haircut" @ $35
2. Shop B opens "Select Existing"
3. **Expected:** "Fade Haircut" appears in list
4. Shop B adds it @ $40
5. **Expected:** Both shops have the service with different prices

---

## ✅ Completed Tasks

1. ✅ Updated `services` table schema (removed shop_id, price)
2. ✅ Created `shop_services` linking table
3. ✅ Added global catalog API functions
4. ✅ Implemented dual-mode ServiceSelectorModal
5. ✅ Updated ServiceManagementScreen
6. ✅ Verified ShopDetailsScreen compatibility
7. ✅ No build errors

---

## 🚀 Next Steps

1. **Run the SQL script:**
   - Open `SETUP_GLOBAL_SERVICE_CATALOG.sql`
   - Execute in Supabase SQL Editor

2. **Test in the app:**
   - Add existing services
   - Create new services
   - Edit prices
   - Remove services

3. **Verify data:**
   ```sql
   -- Check global catalog
   SELECT * FROM services;
   
   -- Check shop-service links
   SELECT * FROM shop_services;
   ```

---

## 📋 Summary

**What Changed:**
- Services are now globally shared
- Each shop sets their own price
- Can select from existing OR create new
- UI has dual-mode modal (Select/Create)

**What Stayed:**
- Shop-specific permissions (via shop_staff)
- Image upload functionality
- Service categories
- Active/inactive status

**Benefits:**
- ✅ No duplicate service data
- ✅ Shops can reuse services
- ✅ Easy to browse what's available
- ✅ Still flexible with custom pricing
- ✅ Creates network effect (more shops = more services)

---

**Ready to test!** 🎉
