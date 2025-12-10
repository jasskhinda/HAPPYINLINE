# 🚀 Complete Implementation Plan - Shop Creation System

## 📋 Executive Summary

**Database:** PostgreSQL (Supabase) with Relational Model  
**Storage:** Supabase Storage (NOT Firebase)  
**Current Status:** Schema exists, UI incomplete, image system needs work  

---

## ✅ STEP 1: RUN DATABASE MIGRATIONS (MUST DO FIRST)

**File:** `DATABASE_MIGRATIONS.sql`

**What it does:**
1. Adds `banner_image_url` column to `shops` table
2. Adds `image_url` and `icon_url` columns to `services` table
3. Creates `shop_invitations` table with full invitation system
4. Adds helper functions for invitation management
5. Sets up proper indexes and constraints

**How to run:**
```sql
-- In Supabase SQL Editor:
1. Open DATABASE_MIGRATIONS.sql
2. Copy all content
3. Paste in SQL Editor
4. Run
5. Verify success messages
```

---

## 🎯 STEP 2: CREATE IMAGE UPLOAD SYSTEM

### A. Create Supabase Storage Buckets

**In Supabase Dashboard:**
```
Storage → Create Bucket → "shop-images" (public)
Storage → Create Bucket → "service-images" (public)
```

**Bucket Policies:**
```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload shop images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-images');

CREATE POLICY "Anyone can view shop images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shop-images');
```

### B. Create Image Upload Functions

**New file:** `src/lib/imageUpload.js`
```javascript
import { supabase } from './supabase';

export const uploadShopImage = async (shopId, imageFile, imageType) => {
  // imageType: 'logo', 'banner', 'cover'
  const fileExt = imageFile.name.split('.').pop();
  const fileName = `shops/${shopId}/${imageType}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('shop-images')
    .upload(fileName, imageFile, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) return { success: false, error: error.message };
  
  const { data: { publicUrl } } = supabase.storage
    .from('shop-images')
    .getPublicUrl(fileName);
  
  return { success: true, url: publicUrl };
};

export const uploadServiceImage = async (shopId, serviceId, imageFile) => {
  const fileExt = imageFile.name.split('.').pop();
  const fileName = `services/${shopId}/${serviceId}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('service-images')
    .upload(fileName, imageFile, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) return { success: false, error: error.message };
  
  const { data: { publicUrl } } = supabase.storage
    .from('service-images')
    .getPublicUrl(fileName);
  
  return { success: true, url: publicUrl };
};

export const deleteShopImages = async (shopId) => {
  // Delete all images for a shop
  const { data, error } = await supabase.storage
    .from('shop-images')
    .remove([
      `shops/${shopId}/logo.jpg`,
      `shops/${shopId}/logo.png`,
      `shops/${shopId}/banner.jpg`,
      `shops/${shopId}/banner.png`,
      `shops/${shopId}/cover.jpg`,
      `shops/${shopId}/cover.png`
    ]);
  
  return { success: !error, error };
};
```

---

## 🎨 STEP 3: UPDATE CreateShopScreen UI

### Changes Needed:

#### 1. Add Three Image Upload Fields
```javascript
const [logoImage, setLogoImage] = useState(null);
const [bannerImage, setBannerImage] = useState(null);
const [coverImage, setCoverImage] = useState(null); // optional
```

**UI Structure:**
```jsx
<View style={styles.imageSection}>
  <Text style={styles.sectionTitle}>Shop Images</Text>
  
  {/* Logo Image */}
  <View style={styles.imageField}>
    <Text style={styles.imageLabel}>Logo Image *</Text>
    <Text style={styles.imageHint}>Displayed in shop cards (required)</Text>
    <ImagePickerButton 
      image={logoImage}
      onSelect={setLogoImage}
      placeholder="No Logo Added"
    />
  </View>
  
  {/* Banner Image */}
  <View style={styles.imageField}>
    <Text style={styles.imageLabel}>Banner Image *</Text>
    <Text style={styles.imageHint}>Displayed at top of shop page (required)</Text>
    <ImagePickerButton 
      image={bannerImage}
      onSelect={setBannerImage}
      placeholder="No Banner Added"
    />
  </View>
  
  {/* Cover Image (Optional) */}
  <View style={styles.imageField}>
    <Text style={styles.imageLabel}>Cover Image</Text>
    <Text style={styles.imageHint}>Optional profile cover</Text>
    <ImagePickerButton 
      image={coverImage}
      onSelect={setCoverImage}
      placeholder="No Cover Added"
    />
  </View>
</View>
```

#### 2. Add Address Fields
```javascript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',        // NEW
  zipCode: '',      // NEW
  country: 'USA',   // NEW with default
  phone: '',
  email: '',
  // REMOVE: website
});
```

**UI:**
```jsx
<View style={styles.addressSection}>
  <Text style={styles.sectionTitle}>Address</Text>
  
  <TextInput
    placeholder="Street Address *"
    value={formData.address}
    onChangeText={(val) => handleInputChange('address', val)}
  />
  
  <View style={styles.row}>
    <TextInput
      style={styles.halfInput}
      placeholder="City *"
      value={formData.city}
      onChangeText={(val) => handleInputChange('city', val)}
    />
    <TextInput
      style={styles.halfInput}
      placeholder="State *"
      value={formData.state}
      onChangeText={(val) => handleInputChange('state', val)}
    />
  </View>
  
  <View style={styles.row}>
    <TextInput
      style={styles.halfInput}
      placeholder="Zip Code *"
      value={formData.zipCode}
      onChangeText={(val) => handleInputChange('zipCode', val)}
    />
    <TextInput
      style={styles.halfInput}
      placeholder="Country"
      value={formData.country}
      onChangeText={(val) => handleInputChange('country', val)}
    />
  </View>
</View>
```

#### 3. Remove Website Field
```javascript
// DELETE this from form:
// <TextInput placeholder="Website" ... />
```

#### 4. Update Validation
```javascript
const validateForm = () => {
  const newErrors = {};
  
  if (!formData.name.trim()) newErrors.name = 'Shop name required';
  if (!formData.address.trim()) newErrors.address = 'Address required';
  if (!formData.city.trim()) newErrors.city = 'City required';
  if (!formData.state.trim()) newErrors.state = 'State required';
  if (!formData.zipCode.trim()) newErrors.zipCode = 'Zip code required';
  if (!formData.phone.trim()) newErrors.phone = 'Phone required';
  
  // Image validation
  if (!logoImage) newErrors.logo = 'Logo image required';
  if (!bannerImage) newErrors.banner = 'Banner image required';
  
  // Staff validation
  if (managers.length === 0) {
    newErrors.managers = 'At least 1 manager required';
  }
  if (barbers.length === 0) {
    newErrors.barbers = 'At least 1 barber required';
  }
  if (services.length === 0) {
    newErrors.services = 'At least 1 service required';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## 💾 STEP 4: UPDATE handleCreateShop Function

**New flow with image uploads:**

```javascript
const handleCreateShop = async () => {
  if (!validateForm()) {
    Alert.alert('Validation Error', 'Please fill all required fields');
    return;
  }
  
  try {
    setLoading(true);
    
    // Step 1: Create shop WITHOUT images first
    const { success, shop, error } = await createShop({
      ...formData,
      zip_code: formData.zipCode,
      // Don't include website
    });
    
    if (!success || !shop) {
      Alert.alert('Error', error || 'Failed to create shop');
      setLoading(false);
      return;
    }
    
    const shopId = shop.id;
    console.log('✅ Shop created:', shopId);
    
    // Step 2: Upload images
    const imageUploads = [];
    
    if (logoImage) {
      const logoResult = await uploadShopImage(shopId, logoImage, 'logo');
      if (logoResult.success) {
        imageUploads.push({ logo_url: logoResult.url });
      }
    }
    
    if (bannerImage) {
      const bannerResult = await uploadShopImage(shopId, bannerImage, 'banner');
      if (bannerResult.success) {
        imageUploads.push({ banner_image_url: bannerResult.url });
      }
    }
    
    if (coverImage) {
      const coverResult = await uploadShopImage(shopId, coverImage, 'cover');
      if (coverResult.success) {
        imageUploads.push({ cover_image_url: coverResult.url });
      }
    }
    
    // Update shop with image URLs
    if (imageUploads.length > 0) {
      const imageData = Object.assign({}, ...imageUploads);
      await updateShop(shopId, imageData);
      console.log('✅ Images uploaded');
    }
    
    // Step 3: Add managers
    for (const manager of managers) {
      await addShopStaff(shopId, manager.id, 'manager');
      console.log('✅ Added manager:', manager.name);
    }
    
    // Step 4: Add barbers
    for (const barber of barbers) {
      await addShopStaff(shopId, barber.id, 'barber');
      console.log('✅ Added barber:', barber.name);
    }
    
    // Step 5: Add services
    for (const service of services) {
      // Upload service image if exists
      let serviceImageUrl = null;
      if (service.image) {
        const result = await uploadServiceImage(shopId, service.tempId, service.image);
        if (result.success) {
          serviceImageUrl = result.url;
        }
      }
      
      await createShopService(shopId, {
        name: service.name,
        description: service.description || '',
        price: service.price,
        duration: service.duration_minutes,
        category: service.category || 'General',
        image_url: serviceImageUrl,
        is_active: true
      });
      console.log('✅ Added service:', service.name);
    }
    
    // Step 6: Navigate to shop details
    Alert.alert(
      'Success!',
      `Shop "${shop.name}" created successfully!`,
      [{
        text: 'View Shop',
        onPress: () => {
          navigation.replace('ShopDetailsScreen', { shopId });
        }
      }]
    );
    
  } catch (error) {
    console.error('Error creating shop:', error);
    Alert.alert('Error', 'Failed to create shop. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

---

## 🎨 STEP 5: UPDATE AddServiceModal

**Add image upload to service modal:**

```javascript
const [serviceImage, setServiceImage] = useState(null);

// In form:
<View style={styles.imageField}>
  <Text style={styles.label}>Service Image</Text>
  <ImagePickerButton 
    image={serviceImage}
    onSelect={setServiceImage}
    placeholder="Add service image"
  />
</View>

// In handleAdd:
const handleAddService = () => {
  if (!validateService()) return;
  
  onAdd({
    tempId: Date.now().toString(),
    name: serviceName,
    description: serviceDescription,
    price: parseFloat(price),
    duration_minutes: parseInt(duration),
    category,
    image: serviceImage, // Pass image file
  });
  
  // Reset form...
};
```

---

## 📱 STEP 6: UPDATE ShopDetailsScreen

### A. Display Banner Image
```jsx
{/* Shop Banner */}
<View style={styles.bannerContainer}>
  {shop?.banner_image_url ? (
    <Image
      source={{ uri: shop.banner_image_url }}
      style={styles.bannerImage}
      resizeMode="cover"
    />
  ) : (
    <View style={[styles.bannerImage, styles.placeholderBanner]}>
      <Ionicons name="image-outline" size={60} color="#999" />
      <Text style={styles.placeholderText}>No Banner</Text>
    </View>
  )}
</View>

{/* Shop Logo (overlaid on banner) */}
<View style={styles.logoContainer}>
  {shop?.logo_url ? (
    <Image
      source={{ uri: shop.logo_url }}
      style={styles.logoImage}
    />
  ) : (
    <View style={[styles.logoImage, styles.placeholderLogo]}>
      <Ionicons name="storefront" size={40} color="#999" />
    </View>
  )}
</View>
```

### B. Display Services with Images
```jsx
<TouchableOpacity style={styles.serviceCard}>
  {service.image_url && (
    <Image
      source={{ uri: service.image_url }}
      style={styles.serviceImage}
    />
  )}
  <View style={styles.serviceInfo}>
    <Text style={styles.serviceName}>{service.name}</Text>
    <Text style={styles.servicePrice}>${service.price}</Text>
    <Text style={styles.serviceDuration}>{service.duration} min</Text>
  </View>
</TouchableOpacity>
```

---

## 🔔 STEP 7: CREATE INVITATION SYSTEM

### A. Create Invitation API Functions

**Add to shopAuth.js:**
```javascript
export const createInvitation = async (shopId, email, role, message = '') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const { data, error } = await supabase
      .from('shop_invitations')
      .insert({
        shop_id: shopId,
        invitee_email: email.toLowerCase(),
        role,
        invited_by: user.id,
        message,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) return { success: false, error: error.message };
    return { success: true, invitation: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getMyInvitations = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    const { data, error } = await supabase
      .rpc('get_user_invitations', {
        p_email: profile.email,
        p_user_id: user.id
      });
    
    if (error) return { success: false, error: error.message };
    return { success: true, invitations: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const acceptInvitation = async (invitationId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const { data, error } = await supabase
      .rpc('accept_invitation', {
        p_invitation_id: invitationId,
        p_user_id: user.id
      });
    
    if (error) return { success: false, error: error.message };
    const result = data[0];
    
    if (!result.success) {
      return { success: false, error: result.error_message };
    }
    
    return { success: true, shopId: result.shop_id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const declineInvitation = async (invitationId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    
    const { data, error } = await supabase
      .rpc('decline_invitation', {
        p_invitation_id: invitationId,
        p_user_id: user.id
      });
    
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### B. Update AddManagerModal

**Add invitation option:**
```javascript
const handleAddManager = async () => {
  if (!selectedUser) return;
  
  // Option 1: Add directly if they're already a user
  if (selectedUser.hasAccount) {
    onAdd(selectedUser);
    handleClose();
  } 
  // Option 2: Send invitation if not in system yet
  else {
    const { success, error } = await createInvitation(
      shopId,
      searchText,
      'manager',
      'You have been invited to join as a manager'
    );
    
    if (success) {
      Alert.alert('Success', 'Invitation sent! They will see it when they log in.');
      handleClose();
    } else {
      Alert.alert('Error', error);
    }
  }
};
```

### C. Create InvitationsScreen

**New file:** `src/presentation/invitations/InvitationsScreen.jsx`
```jsx
const InvitationsScreen = ({ navigation }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadInvitations();
  }, []);
  
  const loadInvitations = async () => {
    const { success, invitations: data } = await getMyInvitations();
    if (success) {
      const pending = data.filter(i => i.status === 'pending');
      setInvitations(pending);
    }
    setLoading(false);
  };
  
  const handleAccept = async (invitationId) => {
    const { success, shopId, error } = await acceptInvitation(invitationId);
    if (success) {
      Alert.alert('Success', 'Invitation accepted!');
      navigation.navigate('ShopDetailsScreen', { shopId });
    } else {
      Alert.alert('Error', error);
    }
  };
  
  const handleDecline = async (invitationId) => {
    const { success, error } = await declineInvitation(invitationId);
    if (success) {
      Alert.alert('Success', 'Invitation declined');
      loadInvitations();
    } else {
      Alert.alert('Error', error);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invitations</Text>
      </View>
      
      {invitations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mail-outline" size={60} color="#DDD" />
          <Text style={styles.emptyText}>No pending invitations</Text>
        </View>
      ) : (
        <ScrollView>
          {invitations.map((inv) => (
            <View key={inv.invitation_id} style={styles.invitationCard}>
              <Image source={{ uri: inv.shop_logo }} style={styles.shopLogo} />
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationTitle}>
                  You are invited as {inv.role.toUpperCase()}
                </Text>
                <Text style={styles.shopName}>{inv.shop_name}</Text>
                <Text style={styles.invitedBy}>
                  Invited by {inv.invited_by_name}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={() => handleAccept(inv.invitation_id)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.declineButton]}
                  onPress={() => handleDecline(inv.invitation_id)}
                >
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
```

---

## ✅ STEP 8: FINAL CHECKLIST

Before deployment, verify:

- [ ] Database migrations run successfully
- [ ] Storage buckets created with public access
- [ ] Logo, banner, cover image uploads work
- [ ] Service image uploads work
- [ ] Address fields (zip, state, country) save correctly
- [ ] Website field removed from UI
- [ ] Validation requires 1+ manager, barber, service
- [ ] Shop data displays immediately after creation
- [ ] Banner image shows on shop details page
- [ ] Logo image shows in shop cards
- [ ] Service images display in service cards
- [ ] Invitation system sends invitations
- [ ] Users see pending invitations
- [ ] Accept invitation adds user to shop_staff
- [ ] Decline invitation updates status
- [ ] Add buttons visible to admin/manager only
- [ ] Delete icon visible to admin only
- [ ] Delete shop removes all related data

---

**Total Files to Modify:** 8-10  
**Estimated Time:** 6-8 hours  
**Priority:** HIGH  
**Status:** Ready for Implementation

