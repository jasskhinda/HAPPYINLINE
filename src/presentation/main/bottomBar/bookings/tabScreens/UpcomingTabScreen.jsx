import { FlatList, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from 'react-native'
import { useState, useEffect } from 'react';
import { fetchUserBookings } from '../../../../../lib/auth';
import BookingCard from '../component/BookingCard';

const UpcomingTabScreen = ({ isBarberMode = false, userRole = 'customer' }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const result = await fetchUserBookings('upcoming');
      if (result.success) {
        setBookings(result.data || []);
      } else {
        console.error('❌ Failed to fetch bookings:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading bookings:', error);
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
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No upcoming bookings</Text>
        <Text style={styles.emptySubText}>
          {isBarberMode ? 'You have no upcoming appointments' : 'Book an appointment to see it here!'}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  )
}

export default UpcomingTabScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
})