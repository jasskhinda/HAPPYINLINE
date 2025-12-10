import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import ExclusiveCustomerHomeScreen from './bottomBar/home/ExclusiveCustomerHomeScreen';
import ProfessionalChatScreen from './bottomBar/chat/ProfessionalChatScreen';
import ProfileScreen from './bottomBar/profile/ProfileScreen';
import ShopDetailsScreen from './bottomBar/home/ShopDetailsScreen';
import ChatConversationScreen from './bottomBar/chat/ChatConversationScreen';
import BookingDetailScreen from './bottomBar/bookings/BookingDetailScreen';
import MyBookingScreen from './bottomBar/bookings/MyBookingScreen';
import EditProfileScreen from './bottomBar/profile/screens/EditProfileScreen';
import BookingConfirmationScreen from '../booking/BookingConfirmationScreen';
import ProviderSelectionScreen from '../booking/ProviderSelectionScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const BookingsStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: 'home-outline',
  Bookings: 'calendar-outline',
  Chat: 'chatbubble-ellipses-outline',
  Profile: 'person-outline',
};

const TAB_LABELS = {
  Home: 'Home',
  Bookings: 'Bookings',
  Chat: 'Chat',
  Profile: 'Profile',
};

// Home Stack Navigator - includes all screens accessible from Home tab
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="ExclusiveCustomerHome" component={ExclusiveCustomerHomeScreen} />
      <HomeStack.Screen name="ShopDetailsScreen" component={ShopDetailsScreen} />
      <HomeStack.Screen name="ProviderSelectionScreen" component={ProviderSelectionScreen} />
      <HomeStack.Screen name="BookingConfirmationScreen" component={BookingConfirmationScreen} />
      <HomeStack.Screen name="BookingScreen" component={BookingConfirmationScreen} />
    </HomeStack.Navigator>
  );
};

// Bookings Stack Navigator - includes all screens accessible from Bookings tab
const BookingsStackNavigator = () => {
  return (
    <BookingsStack.Navigator screenOptions={{ headerShown: false }}>
      <BookingsStack.Screen name="MyBookings" component={MyBookingScreen} />
      <BookingsStack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
    </BookingsStack.Navigator>
  );
};

// Chat Stack Navigator - includes all screens accessible from Chat tab
const ChatStackNavigator = () => {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ProfessionalChat" component={ProfessionalChatScreen} />
      <ChatStack.Screen name="ChatConversationScreen" component={ChatConversationScreen} />
    </ChatStack.Navigator>
  );
};

// Profile Stack Navigator - includes all screens accessible from Profile tab
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfileScreen" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
};

const getScreenOptions = ({ route }) => ({
  headerShown: false,
  tabBarStyle: {
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingTop: 5,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingHorizontal: 8,
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
    return (
      <View style={styles.tabItem}>
        <Icon
          name={TAB_ICONS[route.name]}
          size={focused ? 24 : 22}
          color={focused ? '#4A90E2' : '#666666'}
        />
        <Text style={[styles.tabLabel, focused && styles.activeLabel]}>
          {TAB_LABELS[route.name]}
        </Text>
      </View>
    );
  },
  tabBarShowLabel: false,
});

const ExclusiveCustomerMainScreen = () => {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <Tab.Navigator screenOptions={getScreenOptions}>
        <Tab.Screen name="Home" component={HomeStackNavigator} />
        <Tab.Screen name="Bookings" component={BookingsStackNavigator} />
        <Tab.Screen name="Chat" component={ChatStackNavigator} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} />
      </Tab.Navigator>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    minWidth: 80,
    flex: 1,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    color: '#666666',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeLabel: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});

export default ExclusiveCustomerMainScreen;
