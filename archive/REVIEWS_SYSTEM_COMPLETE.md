# REVIEWS SYSTEM - Complete Implementation

## 📋 Overview
Complete reviews system for barbers in the app. Customers can write reviews, barbers see them in their profile, and ratings are automatically calculated.

---

## 🗂️ Database Setup

### 1. Run SQL Script
Execute this in Supabase SQL Editor:
```bash
CREATE_REVIEWS_TABLE.sql
```

### 2. What It Creates

#### **`reviews` Table**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `barber_id` | UUID | References profiles(id) |
| `customer_id` | UUID | References profiles(id) |
| `customer_name` | TEXT | Customer's display name |
| `rating` | DECIMAL(2,1) | 1.0 to 5.0 |
| `review_text` | TEXT | Review content |
| `services` | TEXT[] | Array of service names |
| `created_at` | TIMESTAMP | Auto-set |
| `updated_at` | TIMESTAMP | Auto-updated |

#### **Auto-Rating Trigger**
- **Function**: `update_barber_rating()`
- **Triggers**: After INSERT, UPDATE, DELETE on reviews
- **Action**: Automatically calculates:
  - Average rating from all reviews
  - Total review count
  - Updates `profiles.rating` and `profiles.total_reviews`

#### **RLS Policies**
```sql
-- Anyone can read reviews
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);

-- Customers can edit/delete own reviews
CREATE POLICY "Customers edit own" ON reviews 
  FOR ALL USING (auth.uid() = customer_id);
```

---

## 💻 Backend Functions

All functions are in `src/lib/auth.js`:

### 1. **fetchBarberReviews(barberId)**
```javascript
const reviews = await fetchBarberReviews(barberId);
// Returns: [
//   {
//     id: 'uuid',
//     customerName: 'John Smith',
//     rating: 5.0,
//     review: 'Excellent service!',
//     services: ['Haircut', 'Shave'],
//     date: '2 days ago'
//   }
// ]
```

### 2. **createReview(reviewData)**
```javascript
const newReview = await createReview({
  barber_id: 'barber-uuid',
  rating: 5.0,
  review_text: 'Great service!',
  services: ['Haircut']
});
```
Auto-gets customer_id and customer_name from current user.

### 3. **updateReview(reviewId, updates)**
```javascript
await updateReview('review-uuid', {
  rating: 4.5,
  review_text: 'Updated review text',
  services: ['Haircut', 'Shave']
});
```

### 4. **deleteReview(reviewId)**
```javascript
await deleteReview('review-uuid');
```

### 5. **formatReviewDate(dateString)**
```javascript
formatReviewDate('2024-01-15T10:30:00Z');
// Returns: "Today", "Yesterday", "2 days ago", "3 weeks ago", etc.
```

---

## 🎨 Frontend Components

### **BarberProfileCard.jsx**

#### Display Logic
```jsx
{barberProfile.reviews.length === 0 ? (
  // Empty State - No Reviews
  <View style={styles.noReviewsContainer}>
    <Ionicons name="chatbox-ellipses-outline" size={48} color="#DDD" />
    <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
    <Text style={styles.noReviewsText}>
      You haven't received any customer reviews yet.
      Keep providing great service to earn your first review! 💈
    </Text>
  </View>
) : (
  // Show Reviews - First 2 displayed
  barberProfile.reviews.slice(0, 2).map((review, index) => (
    <View key={index} style={styles.reviewContainer}>
      {/* Review UI */}
    </View>
  ))
)}
```

#### "View All" Button
- Only shows when `reviews.length > 0`
- Opens modal with all reviews

### **HomeScreen.jsx**

#### Real Data Fetching
```javascript
const fetchCurrentBarberProfile = async (profile) => {
  // 1. Fetch services and map specialties
  const services = await supabase.from('services')...

  // 2. Fetch reviews
  const reviews = await fetchBarberReviews(profile.id);
  console.log(`✅ Reviews loaded: ${reviews.length}`);

  // 3. Return complete profile
  return {
    ...profile,
    specialties: services.map(s => s.name),
    reviews: reviews  // Real reviews from database
  };
};
```

#### Pull-to-Refresh
```jsx
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  }
>
  {/* Content */}
</ScrollView>
```

---

## 🧪 Testing Guide

### Step 1: Create Reviews Table
```sql
-- Run in Supabase SQL Editor
-- File: CREATE_REVIEWS_TABLE.sql
```

### Step 2: Get User IDs
```sql
-- Find barbers
SELECT id, name, email FROM profiles WHERE role = 'barber';

-- Find customers  
SELECT id, name, email FROM profiles WHERE role = 'customer';
```

### Step 3: Insert Sample Reviews
```sql
-- File: INSERT_SAMPLE_REVIEWS.sql
-- Replace BARBER_ID_HERE and CUSTOMER_ID_HERE with actual UUIDs

INSERT INTO reviews (barber_id, customer_id, customer_name, rating, review_text, services)
VALUES (
  'BARBER_UUID'::UUID,
  'CUSTOMER_UUID'::UUID,
  'John Smith',
  5.0,
  'Excellent service!',
  ARRAY['Haircut', 'Shave']
);
```

### Step 4: Verify Auto-Rating
```sql
-- Check if rating was calculated automatically
SELECT 
  name,
  rating,
  total_reviews
FROM profiles
WHERE id = 'BARBER_UUID';

-- Should see:
-- rating: 5.0 (average of all reviews)
-- total_reviews: 1 (count of reviews)
```

### Step 5: Test in App

#### Test Empty State
1. Login as barber with no reviews
2. Go to Profile tab
3. Should see: "No Reviews Yet" message with icon

#### Test With Reviews
1. Add sample reviews using SQL
2. Login as barber
3. Pull down to refresh
4. Should see:
   - Updated rating (e.g., "4.8 ⭐")
   - Updated review count (e.g., "128 reviews")
   - First 2 reviews displayed
   - "View All" button visible

#### Test Auto-Update
1. Add another review via SQL:
```sql
INSERT INTO reviews (barber_id, customer_id, customer_name, rating, review_text, services)
VALUES ('BARBER_UUID'::UUID, 'CUSTOMER_UUID'::UUID, 'Jane Doe', 3.0, 'Good service', ARRAY['Haircut']);
```
2. Check profiles table:
```sql
SELECT rating, total_reviews FROM profiles WHERE id = 'BARBER_UUID';
-- rating should now be: (5.0 + 3.0) / 2 = 4.0
-- total_reviews should be: 2
```
3. Refresh app → Should see new rating and review

---

## 🔍 How It Works

### When Customer Creates Review:
```
Customer writes review
    ↓
createReview() function called
    ↓
INSERT INTO reviews table
    ↓
Trigger fires: update_barber_rating()
    ↓
Calculates: AVG(rating) and COUNT(*)
    ↓
UPDATE profiles SET rating=X, total_reviews=Y
    ↓
Barber's profile automatically updated
```

### When Barber Opens Profile:
```
HomeScreen loads
    ↓
fetchCurrentBarberProfile() called
    ↓
Fetches services (specialties)
    ↓
Calls fetchBarberReviews(barber.id)
    ↓
Returns formatted reviews with dates
    ↓
BarberProfileCard displays reviews or empty state
```

---

## 📦 Files Modified

### Created
- ✅ `CREATE_REVIEWS_TABLE.sql` - Database schema
- ✅ `INSERT_SAMPLE_REVIEWS.sql` - Test data
- ✅ `REVIEWS_SYSTEM_COMPLETE.md` - This file

### Updated
- ✅ `src/lib/auth.js`
  - Added: `fetchBarberReviews()`
  - Added: `createReview()`
  - Added: `updateReview()`
  - Added: `deleteReview()`
  - Added: `formatReviewDate()`

- ✅ `src/presentation/main/bottomBar/home/HomeScreen.jsx`
  - Updated: `fetchCurrentBarberProfile()` to fetch real reviews
  - Added: Console logging for reviews

- ✅ `src/presentation/main/bottomBar/home/component/BarberProfileCard.jsx`
  - Added: Empty state UI for no reviews
  - Added: Conditional "View All" button
  - Added: Styles for empty state

- ✅ `src/presentation/main/bottomBar/home/component/BarberLayout.jsx`
  - Fixed: Always show rating display
  - Fixed: Field name `total_reviews`
  - Added: `Number()` conversion

---

## ✅ Checklist

### Database Setup
- [ ] Run `CREATE_REVIEWS_TABLE.sql` in Supabase
- [ ] Verify `reviews` table created
- [ ] Verify `update_barber_rating()` function exists
- [ ] Verify RLS policies enabled

### Testing
- [ ] Login as barber with no reviews → See empty state
- [ ] Insert sample reviews via SQL
- [ ] Verify `profiles.rating` and `profiles.total_reviews` updated
- [ ] Refresh app → See reviews displayed
- [ ] Add another review → Verify rating recalculates

### Next Steps
- [ ] Build customer review submission UI
- [ ] Add review editing UI for customers
- [ ] Add review deletion confirmation
- [ ] Add photo upload to reviews (optional)
- [ ] Add review pagination if many reviews

---

## 🚨 Important Notes

### Rating Calculation
- Automatic via database trigger
- No manual calculation needed
- Updates instantly on review insert/update/delete
- Always accurate (uses `AVG()` function)

### Performance
- Reviews are fetched once per profile load
- Pull-to-refresh updates all data
- First 2 reviews shown by default
- "View All" loads full list in modal

### Security
- RLS enabled on reviews table
- Customers can only edit their own reviews
- Everyone can read reviews (public)
- Barber ID verified on insert

### Date Formatting
- Human-readable: "Today", "2 days ago", "3 weeks ago"
- Auto-calculated from `created_at` timestamp
- Updates on each render

---

## 📞 Support

If issues occur:

1. **Reviews not showing:**
   - Check Supabase logs
   - Verify `fetchBarberReviews()` returns data
   - Check console: "✅ Reviews loaded: X"

2. **Rating not updating:**
   - Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_barber_rating';`
   - Test manually: `SELECT update_barber_rating();`
   - Check profiles table: `SELECT rating, total_reviews FROM profiles WHERE role = 'barber';`

3. **Empty state not showing:**
   - Check `barberProfile.reviews.length`
   - Verify conditional: `reviews.length === 0`
   - Check styles imported

---

**Status**: ✅ Complete and ready for testing
**Next**: Run SQL scripts and test with sample data
