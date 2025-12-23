import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import CustomerHomeScreen from './bottomBar/home/CustomerHomeScreen';
import ProfessionalChatScreen from './bottomBar/chat/ProfessionalChatScreen';
import ProfileScreen from './bottomBar/profile/ProfileScreen';
import BookingsTabScreen from './bottomBar/bookings/BookingsTabScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  CustomerHomeScreen: 'home-outline',
  ChatScreen: 'chatbubble-ellipses-outline',
  BookingsTabScreen: 'calendar-outline',
  ProfileScreen: 'person-outline',
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
    const labels = {
      CustomerHomeScreen: 'Home',
      ChatScreen: 'Chat',
      BookingsTabScreen: 'Bookings',
      ProfileScreen: 'Profile',
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

const CustomerMainScreen = () => {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <Tab.Navigator screenOptions={getScreenOptions}>
        <Tab.Screen name="CustomerHomeScreen" component={CustomerHomeScreen} />
        <Tab.Screen name="ChatScreen" component={ProfessionalChatScreen} />
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
