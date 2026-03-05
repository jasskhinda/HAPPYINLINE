import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState, useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChange } from './lib/auth';
import { supabase } from './lib/supabase';
import {
  initializeOneSignal,
  registerForPushNotifications,
  ensurePushTokenSaved,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  setExternalUserId,
  removeExternalUserId,
} from './lib/notifications';

// Splash & Auth
import SplashScreen from './presentation/splash/SplashScreen';
import ProviderWelcomeScreen from './presentation/auth/ProviderWelcomeScreen';
import ProviderLoginScreen from './presentation/auth/ProviderLoginScreen';

import ForgotPasswordScreen from './presentation/auth/ForgotPasswordScreen';

// Main App
import ProviderMainScreen from './presentation/main/ProviderMainScreen';

// Booking Screens
import BookingDetailScreen from './presentation/main/bookings/BookingDetailScreen';
import CalendarScreen from './presentation/main/bookings/CalendarScreen';
import RescheduleBookingScreen from './presentation/main/bookings/RescheduleBookingScreen';

// Business Management
import ShopSettingsScreen from './presentation/business/ShopSettingsScreen';
import StaffManagementScreen from './presentation/business/StaffManagementScreen';
import ServicesManagementScreen from './presentation/business/ServicesManagementScreen';
import OperatingHoursScreen from './presentation/business/OperatingHoursScreen';
import ShopQRCodeScreen from './presentation/business/ShopQRCodeScreen';


// Chat
import ChatConversationScreen from './presentation/main/chat/ChatConversationScreen';

// Profile
import EditProfileScreen from './presentation/main/profile/EditProfileScreen';

const RootStack = createNativeStackNavigator();

const Main = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigationRef = useNavigationContainerRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    initializeOneSignal();
    registerForPushNotifications();

    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    responseListener.current = addNotificationResponseListener(async (response) => {
      const data = response.notification?.request?.content?.data || {};
      if (!navigationRef.current || !data.type) return;

      // Check if user is authenticated before navigating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('⚠️ Notification tapped but user not authenticated, ignoring navigation');
        return;
      }

      switch (data.type) {
        case 'message':
          if (data.conversationId) {
            navigationRef.current.navigate('ChatConversationScreen', {
              conversationId: data.conversationId,
            });
          }
          break;
        case 'booking':
        case 'new_booking':
        case 'booking_confirmed':
        case 'booking_cancelled':
        case 'booking_rescheduled':
          if (data.bookingId) {
            navigationRef.current.navigate('BookingDetailScreen', {
              bookingId: data.bookingId,
            });
          }
          break;
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_IN') {
        setIsAuthenticated(true);
        if (session?.user?.id) {
          setExternalUserId(session.user.id);
          // Re-register push and ensure token is saved now that user is authenticated
          registerForPushNotifications();
          ensurePushTokenSaved();
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        removeExternalUserId();
      }
    });
    return () => subscription?.unsubscribe();
  }, []);

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef}>
          <RootStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SplashScreen">
            {/* Splash & Auth */}
            <RootStack.Screen name="SplashScreen" component={SplashScreen} />
            <RootStack.Screen name="ProviderWelcomeScreen" component={ProviderWelcomeScreen} />
            <RootStack.Screen name="ProviderLoginScreen" component={ProviderLoginScreen} />

            <RootStack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />

            {/* Main App (tabs inside) */}
            <RootStack.Screen name="ProviderMainScreen" component={ProviderMainScreen} />

            {/* Booking Detail */}
            <RootStack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
            <RootStack.Screen name="CalendarScreen" component={CalendarScreen} />
            <RootStack.Screen name="RescheduleBookingScreen" component={RescheduleBookingScreen} />

            {/* Business Management */}
            <RootStack.Screen name="ShopSettingsScreen" component={ShopSettingsScreen} />

            <RootStack.Screen name="StaffManagementScreen" component={StaffManagementScreen} />
            <RootStack.Screen name="ServicesManagementScreen" component={ServicesManagementScreen} />
            <RootStack.Screen name="OperatingHoursScreen" component={OperatingHoursScreen} />
            <RootStack.Screen name="ShopQRCodeScreen" component={ShopQRCodeScreen} />

            {/* Chat */}
            <RootStack.Screen name="ChatConversationScreen" component={ChatConversationScreen} />

            {/* Profile */}
            <RootStack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          </RootStack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
      <Toast topOffset={40} />
    </>
  );
};

export default Main;
