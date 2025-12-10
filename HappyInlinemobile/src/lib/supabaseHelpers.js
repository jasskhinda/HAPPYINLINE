// Example: How to integrate Supabase with your existing screens

import { supabase } from '../lib/supabase';

// ============================================
// 1. PHONE AUTHENTICATION INTEGRATION
// ============================================

// In PhoneAuthScreen.jsx - Send OTP
export const sendOTP = async (phoneNumber) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });

    if (error) throw error;

    console.log('OTP sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending OTP:', error.message);
    return { success: false, error: error.message };
  }
};

// In OTPVerificationScreen.jsx - Verify OTP
export const verifyOTP = async (phoneNumber, otp) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: otp,
      type: 'sms',
    });

    if (error) throw error;

    console.log('OTP verified successfully:', data);
    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 2. FETCH BARBERS - HomeScreen.jsx
// ============================================

export const fetchBarbers = async () => {
  try {
    const { data, error } = await supabase
      .from('barbers')
      .select('*')
      .order('rating', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching barbers:', error.message);
    return { success: false, error: error.message };
  }
};

// Usage in HomeScreen.jsx:
// const [barbers, setBarbers] = useState([]);
// useEffect(() => {
//   const loadBarbers = async () => {
//     const result = await fetchBarbers();
//     if (result.success) {
//       setBarbers(result.data);
//     }
//   };
//   loadBarbers();
// }, []);

// ============================================
// 3. CREATE BOOKING - BarberInfoScreen.jsx
// ============================================

export const createBooking = async (bookingData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          barber_id: bookingData.barberId,
          customer_id: user.id,
          service: bookingData.service,
          date_time: bookingData.dateTime,
          status: 'pending',
        }
      ])
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error creating booking:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 4. FETCH USER BOOKINGS - MyBookingScreen.jsx
// ============================================

export const fetchUserBookings = async (isBarberMode = false) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('bookings')
      .select(`
        *,
        barbers (
          name,
          image,
          rating
        ),
        customers:users!customer_id (
          name,
          phone
        )
      `);

    if (isBarberMode) {
      // Get bookings where the user is the barber
      query = query.eq('barber_id', user.id);
    } else {
      // Get bookings where the user is the customer
      query = query.eq('customer_id', user.id);
    }

    const { data, error } = await query.order('date_time', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 5. UPDATE BOOKING STATUS - BookingManagementScreen.jsx
// ============================================

export const updateBookingStatus = async (bookingId, newStatus) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error updating booking:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 6. SUBMIT REVIEW - RateServiceScreen.jsx
// ============================================

export const submitReview = async (reviewData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          barber_id: reviewData.barberId,
          customer_id: user.id,
          rating: reviewData.rating,
          review: reviewData.reviewText,
          services: reviewData.services,
        }
      ])
      .select();

    if (error) throw error;

    // Update barber's average rating
    await updateBarberRating(reviewData.barberId);

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error submitting review:', error.message);
    return { success: false, error: error.message };
  }
};

// Helper function to update barber's average rating
const updateBarberRating = async (barberId) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('barber_id', barberId);

    if (error) throw error;

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await supabase
      .from('barbers')
      .update({
        rating: averageRating.toFixed(1),
        total_reviews: totalReviews
      })
      .eq('id', barberId);
  } catch (error) {
    console.error('Error updating barber rating:', error.message);
  }
};

// ============================================
// 7. FETCH BARBER REVIEWS - BarberReviewsScreen.jsx
// ============================================

export const fetchBarberReviews = async (barberId) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        customer:users!customer_id (
          name,
          profile_image
        )
      `)
      .eq('barber_id', barberId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching reviews:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 8. CHAT MESSAGES - ChatConversationScreen.jsx
// ============================================

export const fetchMessages = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          name,
          profile_image
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching messages:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendMessage = async (conversationId, message) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: user.id,
          message: message,
        }
      ])
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error sending message:', error.message);
    return { success: false, error: error.message };
  }
};

// Real-time chat subscription
export const subscribeToChatMessages = (conversationId, onNewMessage) => {
  const channel = supabase
    .channel(`chat-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();

  return channel;
};

// Unsubscribe from chat
export const unsubscribeFromChat = (channel) => {
  supabase.removeChannel(channel);
};

// ============================================
// 9. USER PROFILE - ProfileScreen.jsx
// ============================================

export const fetchUserProfile = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching profile:', error.message);
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('id', user.id)
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error updating profile:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 10. MANAGER FUNCTIONS - ServiceManagementScreen.jsx
// ============================================

export const fetchServices = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching services:', error.message);
    return { success: false, error: error.message };
  }
};

export const createService = async (serviceData) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error creating service:', error.message);
    return { success: false, error: error.message };
  }
};

export const deleteService = async (serviceId) => {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting service:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================
// 11. AUTHENTICATION STATE LISTENER
// ============================================

// Use this in your Main.jsx or App.js to handle auth state changes
export const setupAuthListener = (onAuthStateChange) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event);
      onAuthStateChange(event, session);
    }
  );

  return subscription;
};

// Usage:
// useEffect(() => {
//   const subscription = setupAuthListener((event, session) => {
//     if (event === 'SIGNED_IN') {
//       navigation.replace('MainScreen');
//     } else if (event === 'SIGNED_OUT') {
//       navigation.replace('PhoneAuthScreen');
//     }
//   });
//
//   return () => {
//     subscription.unsubscribe();
//   };
// }, []);

// ============================================
// 12. LOGOUT FUNCTION
// ============================================

export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error logging out:', error.message);
    return { success: false, error: error.message };
  }
};
