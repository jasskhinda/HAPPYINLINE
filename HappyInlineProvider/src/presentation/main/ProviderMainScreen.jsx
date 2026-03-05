import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import DashboardScreen from './dashboard/DashboardScreen';
import BookingsListScreen from './bookings/BookingsListScreen';
import ConversationListScreen from './chat/ConversationListScreen';
import ProviderProfileScreen from './profile/ProviderProfileScreen';
import CalendarScreen from './bookings/CalendarScreen';
import { getCurrentUser } from '../../lib/auth';
import { getTotalUnreadCount } from '../../lib/messaging';
import { getProviderShop } from '../../lib/providerAuth';

const Tab = createBottomTabNavigator();

const ProviderMainScreen = () => {
  const route = useRoute();
  const initialTab = route.params?.initialTab || 'DashboardScreen';
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState('owner');

  const fetchUnreadCount = async () => {
    try {
      const { profile } = await getCurrentUser();
      if (profile?.id) {
        const result = await getTotalUnreadCount(profile.id);
        if (result.success) setUnreadCount(result.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      const result = await getProviderShop();
      if (result.success && result.role) {
        setUserRole(result.role);
      }
    };
    fetchRole();
  }, []);

  const isOwner = userRole === 'owner' || userRole === 'super_admin';

  const TAB_ICONS_ACTIVE = {
    DashboardScreen: 'grid',
    CalendarTab: 'calendar',
    BookingsListScreen: 'calendar',
    ConversationListScreen: 'chatbubble-ellipses',
    ProviderProfileScreen: 'person',
  };

  const TAB_ICONS_INACTIVE = {
    DashboardScreen: 'grid-outline',
    CalendarTab: 'calendar-outline',
    BookingsListScreen: 'calendar-outline',
    ConversationListScreen: 'chatbubble-ellipses-outline',
    ProviderProfileScreen: 'person-outline',
  };

  const TAB_LABELS = {
    DashboardScreen: 'Dashboard',
    CalendarTab: 'Schedule',
    BookingsListScreen: 'Bookings',
    ConversationListScreen: 'Messages',
    ProviderProfileScreen: 'Profile',
  };

  const getScreenOptions = ({ route }) => ({
    headerShown: false,
    tabBarStyle: {
      height: Platform.OS === 'ios' ? 90 : 75,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      paddingHorizontal: 4,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 0,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      elevation: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    tabBarIcon: ({ color, size, focused }) => {
      const showBadge = route.name === 'ConversationListScreen' && unreadCount > 0;
      const iconName = focused
        ? (TAB_ICONS_ACTIVE[route.name] || 'ellipse')
        : (TAB_ICONS_INACTIVE[route.name] || 'ellipse-outline');

      return (
        <View style={styles.tabItem}>
          <View style={styles.iconContainer}>
            <Icon
              name={iconName}
              size={24}
              color={focused ? '#4A90E2' : '#B0B8C1'}
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
            style={[
              styles.tabLabel,
              focused && styles.activeLabel,
            ]}
          >
            {TAB_LABELS[route.name] || route.name}
          </Text>
          {focused && <View style={styles.activeDot} />}
        </View>
      );
    },
    tabBarShowLabel: false,
  });

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <Tab.Navigator screenOptions={getScreenOptions} initialRouteName={isOwner ? initialTab : 'CalendarTab'}>
        {isOwner && (
          <Tab.Screen name="DashboardScreen" component={DashboardScreen} />
        )}
        <Tab.Screen name="CalendarTab" component={CalendarScreen} />
        <Tab.Screen name="BookingsListScreen" component={BookingsListScreen} />
        <Tab.Screen
          name="ConversationListScreen"
          component={ConversationListScreen}
          listeners={{ focus: () => fetchUnreadCount() }}
        />
        <Tab.Screen name="ProviderProfileScreen" component={ProviderProfileScreen} />
      </Tab.Navigator>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingTop: 2,
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
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabLabel: {
    fontSize: 10,
    color: '#B0B8C1',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: '#1A202C',
    fontWeight: '700',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4A90E2',
    marginTop: 4,
  },
});

export default ProviderMainScreen;
