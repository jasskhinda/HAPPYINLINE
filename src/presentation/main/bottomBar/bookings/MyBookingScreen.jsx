import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';

import UpcomingTabScreen from './tabScreens/UpcomingTabScreen';
import PassTabScreen from './tabScreens/PassTabScreen';

const initialLayout = { width: Dimensions.get('window').width };

const MyBookingScreen = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'upcoming', title: 'Upcoming' },
    { key: 'pass', title: 'Pass' },
  ]);

  // Auto-detect user role in current shop on mount
  useEffect(() => {
    const detectUserRole = async () => {
      try {
        // Import dynamically to avoid circular dependency
        const { getCurrentShopId } = await import('../../../../lib/shopAuth');
        const { supabase } = await import('../../../../lib/supabase');
        
        // Get current shop context
        const currentShopId = await getCurrentShopId();
        
        if (!currentShopId) {
          // No shop selected = customer
          console.log('🛍️ No shop context - Customer mode');
          setUserRole('customer');
          setLoading(false);
          return;
        }
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUserRole('customer');
          setLoading(false);
          return;
        }
        
        // Check if user has a role in current shop
        const { data: staffData } = await supabase
          .from('shop_staff')
          .select('role')
          .eq('shop_id', currentShopId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (staffData?.role) {
          console.log(`👔 User role in shop: ${staffData.role}`);
          setUserRole(staffData.role);
        } else {
          console.log('🛍️ No staff role - Customer mode');
          setUserRole('customer');
        }
      } catch (error) {
        console.error('Error detecting user role:', error);
        // Default to customer on error
        setUserRole('customer');
      } finally {
        setLoading(false);
      }
    };

    detectUserRole();
  }, []);

  // Render scenes dynamically based on route key
  const renderScene = ({ route }) => {
    const isBarberMode = userRole === 'barber';
    
    switch (route.key) {
      case 'upcoming':
        return <UpcomingTabScreen isBarberMode={isBarberMode} userRole={userRole} />;
      case 'pass':
        return <PassTabScreen isBarberMode={isBarberMode} userRole={userRole} />;
      default:
        return null;
    }
  };

  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      renderLabel={({ route, focused }) => (
        <Text style={[
          styles.tabLabel,
          focused && styles.tabLabelActive
        ]}>
          {route.title}
        </Text>
      )}
    />
  );

  // Show loading state while detecting role
  if (loading) {
    return (
      <View style={styles.outerWrapper}>
        <SafeAreaView style={styles.appBarWrapper} edges={['top', 'left', 'right']}>
          <View style={styles.appBar}>
            <Image
              source={require('../../../../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.titleContainer}>
              <Text style={styles.titleText}>My Bookings</Text>
            </View>
          </View>
        </SafeAreaView>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerWrapper}>
      {/* App Bar inside SafeArea only */}
      <SafeAreaView style={styles.appBarWrapper} edges={['top', 'left', 'right']}>
        <View style={styles.appBar}>
          <Image
            source={require('../../../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>
              {userRole === 'barber' ? 'My Appointments' : 'My Bookings'}
            </Text>
            {userRole === 'barber' && (
              <Text style={styles.subtitleText}>View your assigned appointments</Text>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* TabView container with radius */}
      <View style={styles.container}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={initialLayout}
          renderTabBar={renderTabBar}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
};

export default MyBookingScreen;

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#9F9F87',
  },
  appBarWrapper: {
    backgroundColor: '#EEEEEE',
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  titleContainer: {
    marginLeft: 10,
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
  },
  subtitleText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  tabBar: {
    backgroundColor: '#9F9F87',
    borderRadius: 20,
    marginHorizontal: 20,
    paddingVertical: 7,
  },
  tabIndicator: {
    height: 0,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabLabelActive: {
    color: '#FFF',
  },
});
