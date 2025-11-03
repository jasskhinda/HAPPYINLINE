import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../main/bottomBar/home/HomeScreen';
import ProfessionalChatScreen from '../main/bottomBar/chat/ProfessionalChatScreen';
import ProfileScreen from '../main/bottomBar/profile/ProfileScreen';
import BookingsTabScreen from '../main/bottomBar/bookings/BookingsTabScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  HomeScreen: 'home-outline',
  ChatScreen: 'chatbubble-ellipses-outline',
  BookingsTabScreen: 'calendar-outline',
  ProfileScreen: 'person-outline',
};

const getScreenOptions = ({ route }) => ({
  headerShown: false,
  tabBarStyle: {
    height: '12%',
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20, // Respect bottom safe area
    backgroundColor: '#9F9F87',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
    elevation: 10,
  },
  tabBarIcon: ({ color, size, focused }) => {
    // Custom labels for each tab
    const labels = {
      HomeScreen: 'Home',
      ChatScreen: 'Chat',
      BookingsTabScreen: 'Bookings',
      ProfileScreen: 'Profile',
    };

    return (
      <View style={styles.tabItem}>
        <Icon
          name={TAB_ICONS[route.name]}
          size={focused ? size + 4 : size}
          color={focused ? 'white' : 'rgba(255,255,255,0.5)'}
        />
        {focused && (
          <Text
            numberOfLines={1}
            style={styles.activeLabel}>
            {labels[route.name] || route.name}
          </Text>
        )}
      </View>
    );
  },
  tabBarShowLabel: false,
});

const MainScreen = () => {
  return (
    <SafeAreaProvider> 
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <Tab.Navigator screenOptions={getScreenOptions} >
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
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
  },
  activeLabel: {
    fontSize: 11,
    color: 'white',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

export default MainScreen;