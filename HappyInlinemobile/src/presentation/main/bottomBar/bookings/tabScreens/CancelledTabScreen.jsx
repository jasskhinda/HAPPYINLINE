import { FlatList, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { fetchUserBookings } from '../../../../../lib/auth';
import BookingCard from '../component/BookingCard';

const CancelledTabScreen = ({ isBarberMode = false, userRole = 'customer' }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const result = await fetchUserBookings('cancelled');
      if (result.success) {
        setBookings(result.data || []);
      } else {
        console.error('❌ Failed to fetch cancelled bookings:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading cancelled bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading cancelled bookings...</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
        <Text style={styles.emptyText}>No cancelled bookings</Text>
        <Text style={styles.emptySubText}>
          {isBarberMode
            ? 'No cancelled appointments'
            : 'Your cancelled bookings will appear here'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            isBarberMode={isBarberMode}
            userRole={userRole}
            onBookingChange={loadBookings}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']}
            tintColor="#4A90E2"
          />
        }
      />
    </View>
  )
}

export default CancelledTabScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
})
