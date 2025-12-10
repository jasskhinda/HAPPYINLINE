# ✅ Fixed: Database Column Mismatch - Service Duration Field

## 🐛 Error Description

```
ERROR ❌ Error creating service: 
{
  "code": "23502", 
  "details": null, 
  "hint": null, 
  "message": "null value in column \"duration\" of relation \"services\" 
              violates not-null constraint"
}
```

## 🔍 Root Cause

**Problem:** Field name mismatch between frontend and database

| Location | Field Name Used |
|----------|----------------|
| **Frontend (React)** | `duration_minutes` ❌ |
| **Database (Supabase)** | `duration` ✅ |
| **Backend API** | Expects `duration` ✅ |

The form was using `duration_minutes` but the database table has a column named `duration`, so the value was never sent to the database, resulting in a NULL constraint violation.

## ✅ Solution Applied

### **Changed All Occurrences:**

1. **State initialization:**
   ```javascript
   // BEFORE
   duration_minutes: ''
   
   // AFTER
   duration: ''
   ```

2. **Form data handling:**
   ```javascript
   // BEFORE
   duration_minutes: Number(formData.duration_minutes)
   
   // AFTER
   duration: Number(formData.duration)
   ```

3. **Input field value:**
   ```javascript
   // BEFORE
   value={formData.duration_minutes}
   onChangeText={(value) => setFormData(prev => ({ ...prev, duration_minutes: value }))}
   
   // AFTER
   value={formData.duration}
   onChangeText={(value) => setFormData(prev => ({ ...prev, duration: value }))}
   ```

4. **Validation:**
   ```javascript
   // BEFORE
   if (!formData.duration_minutes || isNaN(formData.duration_minutes) ...
   
   // AFTER
   if (!formData.duration || isNaN(formData.duration) ...
   ```

5. **Display in list (backward compatible):**
   ```javascript
   // BEFORE
   <Text>{item.duration_minutes} min</Text>
   
   // AFTER
   <Text>{item.duration || item.duration_minutes} min</Text>
   ```

## 📝 Changes Made

### **File Modified:** `src/presentation/shop/ServiceManagementScreen.jsx`

**Lines Changed:**
1. Line ~31: State initialization
2. Line ~60: handleAddService reset
3. Line ~73: handleEditService (with fallback)
4. Line ~93: Validation check
5. Line ~101: serviceData object
6. Line ~205: Service display
7. Line ~339: TextInput value
8. Line ~340: TextInput onChangeText

## 🔄 Backward Compatibility

Added fallback in two places for existing data that might have the old field name:

```javascript
// When editing
duration: (service.duration || service.duration_minutes).toString()

// When displaying
{item.duration || item.duration_minutes} min
```

This ensures:
- ✅ New services use `duration`
- ✅ Old services with `duration_minutes` still display correctly
- ✅ Editing old services works

## 🧪 Testing

### **Test Creating New Service:**
1. Click + icon
2. Fill in:
   - Service Name: "Haircut"
   - Description: "Professional haircut"
   - Price: 25
   - Duration: 30
   - Active: ON
3. Click "Create Service"
4. **Expected:** ✅ Success message, service created
5. **Previous:** ❌ NULL constraint error

### **Test Editing Service:**
1. Click edit icon on existing service
2. Modal opens with populated fields
3. Change duration to 45
4. Click "Update Service"
5. **Expected:** ✅ Success message, service updated

### **Test Display:**
1. View services list
2. **Expected:** Duration shows correctly (e.g., "30 min")
3. Works for both old and new services

## 📊 Database Schema Reference

Based on the error and shopAuth.js, the services table schema is:

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  name VARCHAR NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL,
  duration INTEGER NOT NULL,  -- ← This is the column name!
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** Column is `duration` not `duration_minutes`

## ✅ Summary

**Issue:** Frontend using `duration_minutes`, database expects `duration`  
**Fix:** Changed all references from `duration_minutes` to `duration`  
**Result:** Services can now be created successfully  

---

## 🎉 Status: FIXED

You can now create and edit services without the NULL constraint error!

**Try creating a service now - it should work!** 🚀
