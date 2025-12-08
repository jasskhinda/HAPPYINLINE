import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useState, useEffect } from 'react';
import HomeScreen from '../main/bottomBar/home/HomeScreen';
import ProfessionalChatScreen from '../main/bottomBar/chat/ProfessionalChatScreen';
import ProfileScreen from '../main/bottomBar/profile/ProfileScreen';
import BookingsTabScreen from '../main/bottomBar/bookings/BookingsTabScreen';
import ShopBrowserScreen from '../main/bottomBar/home/ShopBrowserScreen';
import ProviderServicesScreen from '../main/bottomBar/home/ProviderServicesScreen';
import { getCurrentUser } from '../../lib/auth';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  HomeScreen: 'home-outline',
  ChatScreen: 'chatbubble-ellipses-outline',
  BookingsTabScreen: 'calendar-outline',
  ShopBrowserScreen: 'storefront-outline',
  ProfileScreen: 'person-outline',
  ProviderServicesScreen: 'cut-outline',
};

const getScreenOptions = ({ route }) => ({
  headerShown: false,
  tabBarStyle: {
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabBarIcon: ({ color, size, focused }) => {
    // Custom labels for each tab
    const labels = {
      HomeScreen: 'Dashboard',
      ChatScreen: 'Chat',
      BookingsTabScreen: 'Bookings',
      ShopBrowserScreen: 'Manage Listings',
      ProfileScreen: 'Profile',
      ProviderServicesScreen: 'Services',
    };

    return (
      <View style={styles.tabItem}>
        <Icon
          name={TAB_ICONS[route.name]}
          size={focused ? 26 : 24}
          color={focused ? '#4A90E2' : '#666666'}
        />
        <Text
          numberOfLines={1}
          style={[styles.tabLabel, focused && styles.activeLabel]}>
          {labels[route.name] || route.name}
        </Text>
      </View>
    );
  },
  tabBarShowLabel: false,
});

const MainScreen = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { profile } = await getCurrentUser();
        setUserRole(profile?.role || 'customer');
        console.log('👤 MainScreen user role:', profile?.role);
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole('customer');
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  if (loading) {
    return null; // Or a loading spinner
  }

  // Render tabs based on role
  const renderTabs = () => {
    // Super Admin: Home, Shop Browser, Profile
    if (userRole === 'super_admin') {
      return (
        <>
          <Tab.Screen name="HomeScreen" component={HomeScreen} />
          <Tab.Screen name="ShopBrowserScreen" component={ShopBrowserScreen} />
          <Tab.Screen name="ProfileScreen" component={ProfileScreen} />
        </>
      );
    }

    // Provider (barber): Home (Provider Dashboard), My Services, Bookings, Profile - NO Chat
    if (userRole === 'barber') {
      return (
        <>
          <Tab.Screen name="HomeScreen" component={HomeScreen} />
          <Tab.Screen name="ProviderServicesScreen" component={ProviderServicesScreen} />
          <Tab.Screen name="BookingsTabScreen" component={BookingsTabScreen} />
          <Tab.Screen name="ProfileScreen" component={ProfileScreen} />
        </>
      );
    }

    // Owner, Admin, Customer: Home, Chat, Bookings, Profile
    return (
      <>
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatScreen" component={ProfessionalChatScreen} />
        <Tab.Screen name="BookingsTabScreen" component={BookingsTabScreen} />
        <Tab.Screen name="ProfileScreen" component={ProfileScreen} />
      </>
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <Tab.Navigator screenOptions={getScreenOptions}>
        {renderTabs()}
      </Tab.Navigator>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    minWidth: 60,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#666666',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  activeLabel: {
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default MainScreen;