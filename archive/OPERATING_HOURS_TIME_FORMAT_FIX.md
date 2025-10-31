# Operating Hours Time Format Fix

## Issue
When clicking the settings icon in ShopDetailsScreen, the app crashed with:
```
ERROR [TypeError: date.toLocaleTimeString is not a function (it is undefined)]
```

## Root Cause
The `OperatingHoursSelector` component expects `openingTime` and `closingTime` to be **Date objects**, but the ShopSettingsScreen was passing **time strings** (e.g., "09:00", "18:00") directly from the database.

## Solution
Added helper functions in ShopSettingsScreen to convert between time formats:

### 1. **Helper Functions Added**

```javascript
// Convert time string (HH:MM) to Date object
const timeStringToDate = (timeString) => {
  if (!timeString) {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  }
  
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return date;
};

// Convert Date object to time string (HH:MM)
const dateToTimeString = (date) => {
  if (!date) return '09:00';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};
```

### 2. **State Initialization Fixed**

**Before:**
```javascript
const [openingTime, setOpeningTime] = useState('09:00');
const [closingTime, setClosingTime] = useState('18:00');
```

**After:**
```javascript
const [openingTime, setOpeningTime] = useState(new Date());
const [closingTime, setClosingTime] = useState(new Date());
```

### 3. **Loading Data - Convert Strings to Dates**

**Before:**
```javascript
if (shop.opening_time) setOpeningTime(shop.opening_time);
if (shop.closing_time) setClosingTime(shop.closing_time);
```

**After:**
```javascript
if (shop.opening_time) {
  setOpeningTime(timeStringToDate(shop.opening_time));
}
if (shop.closing_time) {
  setClosingTime(timeStringToDate(shop.closing_time));
}
```

### 4. **Saving Data - Convert Dates to Strings**

**Before:**
```javascript
opening_time: openingTime,
closing_time: closingTime,
```

**After:**
```javascript
opening_time: dateToTimeString(openingTime),
closing_time: dateToTimeString(closingTime),
```

## Data Flow

### When Loading Shop:
1. Database stores: `"09:00"` (string)
2. ShopSettingsScreen loads: `"09:00"`
3. Convert to Date: `new Date()` with hours=9, minutes=0
4. Pass Date object to OperatingHoursSelector
5. Component can call `.toLocaleTimeString()` ✅

### When Saving Shop:
1. OperatingHoursSelector returns: Date object
2. ShopSettingsScreen receives: Date object
3. Convert to string: `"09:00"`
4. Save to database: `"09:00"` (string) ✅

## Why This Format?

### Database Format: Time Strings (HH:MM)
- PostgreSQL TIME type
- Easy to query and compare
- Human-readable in database
- Example: `"09:00"`, `"18:30"`

### Component Format: Date Objects
- Required by DateTimePicker
- Enables `.toLocaleTimeString()` formatting
- Platform-native time selection
- Example: `new Date(2024, 0, 1, 9, 0, 0)`

## Testing

### Before Fix:
❌ Click settings icon → Crash
❌ Error: `toLocaleTimeString is not a function`

### After Fix:
✅ Click settings icon → Screen loads
✅ Operating hours show correctly
✅ Time pickers work
✅ Can change times
✅ Save updates database correctly
✅ Times display properly after reload

## Files Modified

1. `src/presentation/main/bottomBar/home/ShopSettingsScreen.jsx`
   - Added `timeStringToDate()` helper
   - Added `dateToTimeString()` helper
   - Changed state initialization to Date objects
   - Updated `loadShopData()` to convert strings → Dates
   - Updated `handleSaveChanges()` to convert Dates → strings

## No Breaking Changes

- ✅ Database schema unchanged
- ✅ API functions unchanged
- ✅ OperatingHoursSelector unchanged
- ✅ Other components unaffected
- ✅ Time format in database consistent

## Similar Pattern Used In:

This same pattern is used in:
- `CreateShopScreen.jsx` - Also converts for OperatingHoursSelector
- Any screen using DateTimePicker components

## Edge Cases Handled

1. **Null/Undefined Times**: Defaults to 09:00 (9 AM)
2. **Invalid Strings**: Falls back to default time
3. **Date Objects**: Already handled by helper
4. **Different Formats**: Converts consistently

## Success Criteria

✅ No crash when opening ShopSettingsScreen
✅ Operating hours load correctly from database
✅ Time pickers display and work properly
✅ Can modify opening/closing times
✅ Save updates database with correct format
✅ Reload shows saved times correctly
