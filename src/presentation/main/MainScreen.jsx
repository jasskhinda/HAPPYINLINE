import { Text, View, StyleSheet, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../main/bottomBar/home/HomeScreen';
import ChatScreen from '../main/bottomBar/chat/ChatScreen';
import ProfileScreen from '../main/bottomBar/profile/ProfileScreen';
import MyBookingScreen from '../main/bottomBar/bookings/MyBookingScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  HomeScreen: 'home-outline',
  ChatScreen: 'chatbubble-ellipses-outline',
  MyBookingScreen: 'calendar-outline',
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
  tabBarIcon: ({ color, size, focused }) => (
    <View style={styles.tabItem}>
      <Icon
        name={TAB_ICONS[route.name]}
        size={focused ? size + 6 : size}
        color={focused ? 'white' : 'rgba(255,255,255,0.5)'}
      />
      {focused && (
        <Text 
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.activeLabel}>
          {route.name.replace('Screen', '')}
        </Text>
      )}
    </View>
  ),
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
        <Tab.Screen name="ChatScreen" component={ChatScreen} />
        <Tab.Screen name="MyBookingScreen" component={MyBookingScreen} />
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
  },
  activeLabel: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    includeFontPadding: false, // Android-specific
    textAlignVertical: 'center',
    lineHeight: 12, // Optional, helps prevent wrapping
  },
});

export default MainScreen;