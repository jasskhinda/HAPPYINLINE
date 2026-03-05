import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import CustomerHomeScreen from './bottomBar/home/CustomerHomeScreen';
import ChatStaffListScreen from './bottomBar/chat/ChatStaffListScreen';
import ProfileScreen from './bottomBar/profile/ProfileScreen';
import BookingsTabScreen from './bottomBar/bookings/BookingsTabScreen';
import { getCurrentUser } from '../../lib/auth';
import { getTotalUnreadCount } from '../../lib/messaging';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  CustomerHomeScreen: 'home-outline',
  ChatScreen: 'chatbubble-ellipses-outline',
  BookingsTabScreen: 'calendar-outline',
  ProfileScreen: 'person-outline',
};

const CustomerMainScreen = () => {
  const route = useRoute();
  const initialTab = route.params?.initialTab || 'CustomerHomeScreen';
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { profile } = await getCurrentUser();
      if (profile?.id) {
        const result = await getTotalUnreadCount(profile.id);
        if (result.success) {
          setUnreadCount(result.count);
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch unread count on mount and set up polling
  useEffect(() => {
    fetchUnreadCount();

    // Poll for unread count every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

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
      const labels = {
        CustomerHomeScreen: 'Home',
        ChatScreen: 'Chat',
        BookingsTabScreen: 'Bookings',
        ProfileScreen: 'Profile',
      };

      const showBadge = route.name === 'ChatScreen' && unreadCount > 0;

      return (
        <View style={styles.tabItem}>
          <View style={styles.iconContainer}>
            <Icon
              name={TAB_ICONS[route.name]}
              size={focused ? 26 : 24}
              color={focused ? '#4A90E2' : '#666666'}
            />
            {showBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
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

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <Tab.Navigator screenOptions={getScreenOptions} initialRouteName={initialTab}>
        <Tab.Screen name="CustomerHomeScreen" component={CustomerHomeScreen} />
        <Tab.Screen
          name="ChatScreen"
          component={ChatStaffListScreen}
          listeners={{
            focus: () => fetchUnreadCount(),
          }}
        />
        <Tab.Screen name="BookingsTabScreen" component={BookingsTabScreen} />
        <Tab.Screen name="ProfileScreen" component={ProfileScreen} />
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
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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

export default CustomerMainScreen;
