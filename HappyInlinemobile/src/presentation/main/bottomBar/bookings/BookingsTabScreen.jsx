import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../../../../lib/supabase';
import BookingManagementScreen from '../home/manager/BookingManagementScreen';
import MyBookingScreen from './MyBookingScreen';

/**
 * Smart wrapper that shows different booking screens based on user role:
 * - Owner/Admin → BookingManagementScreen (Pending/Approved/Completed/Rejected)
 * - Customer/Staff → MyBookingScreen (Upcoming/Pass)
 */
const BookingsTabScreen = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectUserRole();
  }, []);

  const detectUserRole = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserRole('customer');
        setLoading(false);
        return;
      }

      // Get user's profile role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Check if user is owner or has admin role in any shop
      if (profile?.role === 'owner') {
        setUserRole('owner');
      } else {
        // Check if user is admin of any shop
        const { data: staffData } = await supabase
          .from('shop_staff')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .limit(1);

        if (staffData && staffData.length > 0) {
          setUserRole('admin');
        } else {
          setUserRole('customer');
        }
      }
    } catch (error) {
      console.error('Error detecting user role:', error);
      setUserRole('customer');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  // Show Booking Management for owners and admins
  if (userRole === 'owner' || userRole === 'admin') {
    return <BookingManagementScreen />;
  }

  // Show My Bookings for customers and staff
  return <MyBookingScreen />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});

export default BookingsTabScreen;
