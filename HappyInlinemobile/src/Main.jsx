import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState, useEffect, useRef } from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import Toast from 'react-native-toast-message';
import SplashScreen from './presentation/splash/SplashScreen';
import WelcomeScreen from './presentation/auth/WelcomeScreen';
import {
  initializeOneSignal,
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  setExternalUserId,
  removeExternalUserId,
} from './lib/notifications';

// Customer Auth Screens
import CustomerLogin from './presentation/auth/CustomerLogin';
import ExclusiveCustomerRegistration from './presentation/auth/ExclusiveCustomerRegistration';
import ExclusiveCustomerLogin from './presentation/auth/ExclusiveCustomerLogin';
import ForgotPasswordScreen from './presentation/auth/ForgotPasswordScreen';
import QRShopSignup from './presentation/auth/QRShopSignup';

// Main Customer Screens
import CustomerMainScreen from './presentation/main/CustomerMainScreen';
import ExclusiveCustomerHomeScreen from './presentation/main/bottomBar/home/ExclusiveCustomerHomeScreen';
import ShopDetailsScreen from './presentation/main/bottomBar/home/ShopDetailsScreen';
import ServiceShopsScreen from './presentation/main/bottomBar/home/ServiceShopsScreen';
import CategoryShopsScreen from './presentation/main/bottomBar/home/CategoryShopsScreen';
import SearchScreen from './presentation/main/bottomBar/home/SearchScreen';

// Booking Screens
import BookingConfirmationScreen from './presentation/booking/BookingConfirmationScreen';
import ProviderSelectionScreen from './presentation/booking/ProviderSelectionScreen';
import RateServiceScreen from './presentation/main/bottomBar/bookings/RateServiceScreen';
import RescheduleBookingScreen from './presentation/main/bottomBar/bookings/RescheduleBookingScreen';
import BookingDetailScreen from './presentation/main/bottomBar/bookings/BookingDetailScreen';

// Profile Screens
import ProfileScreen from './presentation/main/bottomBar/profile/ProfileScreen';
import EditProfileScreen from './presentation/main/bottomBar/profile/screens/EditProfileScreen';

// Provider Profile (view only for customers)
import ProviderProfileScreen from './presentation/main/bottomBar/home/ProviderProfileScreen';
import ServiceProvidersScreen from './presentation/main/bottomBar/home/ServiceProvidersScreen';
import ProviderReviewsScreen from './presentation/main/bottomBar/home/ProviderReviewsScreen';

// Chat
import ChatConversationScreen from './presentation/main/bottomBar/chat/ChatConversationScreen';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { onAuthStateChange, hasCompletedOnboarding } from './lib/auth';

const RootStack = createNativeStackNavigator();

const Main = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const navigationRef = useNavigationContainerRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  // Setup OneSignal push notifications
  useEffect(() => {
    initializeOneSignal();
    registerForPushNotifications();

    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received:', notification);
    });

    responseListener.current = addNotificationResponseListener((response) => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification?.request?.content?.data || {};

      if (navigationRef.current && data.type) {
        switch (data.type) {
          case 'message':
            if (data.conversationId) {
              navigationRef.current.navigate('ChatConversationScreen', {
                conversationId: data.conversationId,
              });
            }
            break;
          case 'booking':
          case 'booking_confirmed':
          case 'booking_cancelled':
          case 'booking_reminder':
            if (data.bookingId) {
              navigationRef.current.navigate('BookingDetailScreen', {
                bookingId: data.bookingId,
              });
            }
            break;
          default:
            console.log('Unknown notification type:', data.type);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    const subscription = onAuthStateChange(async (event, session, profile) => {
      console.log('🔄 Auth state changed:', event);

      if (event === 'INITIAL_SESSION') {
        console.log('📱 Initial session loaded');
        return;
      }

      if (event === 'SIGNED_IN') {
        console.log('✅ Customer signed in');
        setIsAuthenticated(true);

        if (session?.user?.id) {
          setExternalUserId(session.user.id);
        }

        const hasOnboarded = await hasCompletedOnboarding();
        setOnboardingComplete(hasOnboarded);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 Customer signed out');
        setIsAuthenticated(false);
        setOnboardingComplete(false);
        removeExternalUserId();
      } else if (event === 'USER_UPDATED') {
        console.log('👤 User data updated');
        if (session) {
          const hasOnboarded = await hasCompletedOnboarding();
          setOnboardingComplete(hasOnboarded);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const linking = {
    prefixes: ['happyinline://', 'https://happyinline.app'],
    config: {
      screens: {
        QRShopSignup: 'signup/shop/:shopId',
      },
    },
  };

  const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || '';

  return (
    <>
      <StripeProvider publishableKey={stripePublishableKey}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <RootStack.Navigator
              screenOptions={{ headerShown: false }}
              initialRouteName="SplashScreen"
            >
              {/* Splash & Welcome */}
              <RootStack.Screen name="SplashScreen" component={SplashScreen} />
              <RootStack.Screen name="WelcomeScreen" component={WelcomeScreen} />

              {/* Customer Auth */}
              <RootStack.Screen name="CustomerLogin" component={CustomerLogin} />
              <RootStack.Screen name="ExclusiveCustomerRegistration" component={ExclusiveCustomerRegistration} />
              <RootStack.Screen name="ExclusiveCustomerLogin" component={ExclusiveCustomerLogin} />
              <RootStack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
              <RootStack.Screen name="QRShopSignup" component={QRShopSignup} />

              {/* Main Customer App */}
              <RootStack.Screen name="CustomerMainScreen" component={CustomerMainScreen} />
              <RootStack.Screen name="ExclusiveCustomerHomeScreen" component={ExclusiveCustomerHomeScreen} />

              {/* Shop Browsing */}
              <RootStack.Screen name="ShopDetailsScreen" component={ShopDetailsScreen} />
              <RootStack.Screen name="ServiceShopsScreen" component={ServiceShopsScreen} />
              <RootStack.Screen name="CategoryShopsScreen" component={CategoryShopsScreen} />
              <RootStack.Screen name="SearchScreen" component={SearchScreen} />

              {/* Booking Flow */}
              <RootStack.Screen name="BookingConfirmationScreen" component={BookingConfirmationScreen} />
              <RootStack.Screen name="ProviderSelectionScreen" component={ProviderSelectionScreen} />
              <RootStack.Screen name="RateServiceScreen" component={RateServiceScreen} />
              <RootStack.Screen name="RescheduleBookingScreen" component={RescheduleBookingScreen} />
              <RootStack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />

              {/* Profile */}
              <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
              <RootStack.Screen name="EditProfileScreen" component={EditProfileScreen} />

              {/* Provider Profiles (view only) */}
              <RootStack.Screen name="ProviderProfileScreen" component={ProviderProfileScreen} />
              <RootStack.Screen name="ServiceProvidersScreen" component={ServiceProvidersScreen} />
              <RootStack.Screen name="ProviderReviewsScreen" component={ProviderReviewsScreen} />

              {/* Chat */}
              <RootStack.Screen name="ChatConversationScreen" component={ChatConversationScreen} />
            </RootStack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </StripeProvider>

      <Toast topOffset={40} />
    </>
  );
};

export default Main;
