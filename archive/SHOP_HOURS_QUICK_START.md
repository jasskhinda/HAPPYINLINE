# 🚀 QUICK START - Shop Hours & Status

## Step-by-Step Implementation

### 1️⃣ Install Required Package
```bash
npm install @react-native-community/datetimepicker
```

### 2️⃣ Run Database Migration
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste contents of `ADD_SHOP_HOURS_AND_STATUS.sql`
4. Click **Run**
5. Wait for "Success" message

### 3️⃣ Test Shop Creation
1. Open your app
2. Navigate to **Create Shop**
3. Fill in basic details
4. Scroll to **Operating Hours** section
5. Select days (e.g., Mon-Sat)
6. Set times (e.g., 9 AM - 6 PM)
7. Complete shop creation

### 4️⃣ Verify on HomeScreen
- Open HomeScreen
- Check shop list shows status badge
- Verify hours are displayed

---

## 📋 What's Changed

### ✅ Database
- Added 4 new columns to `shops` table
- Created helper function `is_shop_open()`
- Updated RLS policies

### ✅ Components
- New: `OperatingHoursSelector.jsx`
- New: `ShopStatusBadge.jsx`

### ✅ Screens
- Updated: `CreateShopScreen.jsx` (added hours section)
- Updated: `HomeScreen.jsx` (shows status)

### ✅ Functions
- Added: `toggleShopStatus()` in shopAuth.js
- Added: `isShopOpen()` in shopAuth.js
- Updated: `getAllShops()` to fetch new fields

---

## 🎯 What You Can Do Now

### As a Shop Owner:
- ✅ Set operating days when creating shop
- ✅ Set opening and closing times
- ✅ Same hours apply to all selected days

### As a Customer:
- ✅ See which shops are currently open
- ✅ See shop operating hours in list
- ✅ Plan visits based on hours

### As Admin/Manager (To Implement Next):
- ⏳ Toggle shop open/closed manually
- ⏳ Override schedule for special occasions

---

## 🔍 Testing

### Test Case 1: Create Shop with Hours
**Steps:**
1. Create new shop
2. Select Mon-Fri
3. Set 10:00 AM - 8:00 PM
4. Submit

**Expected:**
- Shop created successfully
- Hours saved to database

### Test Case 2: View Status on HomeScreen
**Steps:**
1. Open app at 2:00 PM on Tuesday
2. View shop from Test Case 1

**Expected:**
- Shows "Open Now" badge (green)
- Shows "10:00 AM - 8:00 PM"

### Test Case 3: View Status Outside Hours
**Steps:**
1. Open app at 9:00 PM on Tuesday
2. View shop from Test Case 1

**Expected:**
- Shows "Closed" badge (orange)
- Shows "10:00 AM - 8:00 PM"

### Test Case 4: View Status on Closed Day
**Steps:**
1. Open app on Sunday
2. View shop from Test Case 1

**Expected:**
- Shows "Closed" badge (orange)
- Shows "10:00 AM - 8:00 PM"

---

## ⚠️ Important Notes

1. **Time Format:**
   - Database stores as `HH:MM:SS` (24-hour)
   - UI shows as `HH:MM AM/PM` (12-hour)

2. **Operating Days:**
   - Stored as JSON array: `["monday", "tuesday", ...]`
   - All lowercase day names

3. **Manual Close:**
   - `is_manually_closed` defaults to `false`
   - When `true`, shop shows as closed regardless of schedule

4. **Status Calculation:**
   - Happens in real-time on client
   - Based on device's current time/date

---

## 🐛 Troubleshooting

### Package Error
```bash
npm install @react-native-community/datetimepicker
```

### SQL Migration Error
- Check if columns already exist
- Use `ADD COLUMN IF NOT EXISTS`
- Verify RLS policies

### Status Not Showing
- Verify `getAllShops()` includes new fields
- Check `isShopOpen()` function
- Console log shop data

---

## 📞 Need Help?

Check the full documentation: `SHOP_HOURS_AND_STATUS_COMPLETE.md`
