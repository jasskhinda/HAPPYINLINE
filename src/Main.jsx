import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';
import Onboarding from './presentation/onboarding/Onboarding';
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
import CustomerOnboarding from './presentation/auth/CustomerOnboarding';
import ExclusiveCustomerRegistration from './presentation/auth/ExclusiveCustomerRegistration';
import ExclusiveCustomerLogin from './presentation/auth/ExclusiveCustomerLogin';
import BusinessRegistration from './presentation/auth/BusinessRegistration';
import BusinessLoginScreen from './presentation/auth/BusinessLoginScreen';
import ForgotPasswordScreen from './presentation/auth/ForgotPasswordScreen';
import RegistrationSuccessScreen from './presentation/auth/RegistrationSuccessScreen';
import PaymentMethodScreen from './presentation/auth/PaymentMethodScreen';
import PaymentSuccessScreen from './presentation/auth/PaymentSuccessScreen';
import EmailAuthScreen from './presentation/auth/EmailAuthScreen';
import OTPVerificationScreen from './presentation/auth/OTPVerificationScreen';
import CustomerRegistration from './presentation/auth/CustomerRegistration';
import CustomerLogin from './presentation/auth/CustomerLogin';
import QRShopSignup from './presentation/auth/QRShopSignup';
import ProviderLoginScreen from './presentation/auth/ProviderLoginScreen';
import ProviderOTPScreen from './presentation/auth/ProviderOTPScreen';
import ProviderSetPasswordScreen from './presentation/auth/ProviderSetPasswordScreen';
import MainScreen from './presentation/main/MainScreen';
import ExclusiveCustomerMainScreen from './presentation/main/ExclusiveCustomerMainScreen';
import ShopBrowserScreen from './presentation/main/bottomBar/home/ShopBrowserScreen';
import ExclusiveCustomerHomeScreen from './presentation/main/bottomBar/home/ExclusiveCustomerHomeScreen';
import ShopDetailsScreen from './presentation/main/bottomBar/home/ShopDetailsScreen';
import ShopSettingsScreen from './presentation/main/bottomBar/home/ShopSettingsScreen';
import AdminBusinessDetailsScreen from './presentation/main/bottomBar/home/AdminBusinessDetailsScreen';
import ServiceShopsScreen from './presentation/main/bottomBar/home/ServiceShopsScreen';
import CategoryShopsScreen from './presentation/main/bottomBar/home/CategoryShopsScreen';
import CreateShopScreen from './presentation/shop/CreateShopScreen';
import ShopSelectionScreen from './presentation/shop/ShopSelectionScreen';
import ServiceManagementScreen_New from './presentation/shop/ServiceManagementScreen';
import ShopReviewSubmission from './presentation/shop/ShopReviewSubmission';
import ShopPendingReview from './presentation/shop/ShopPendingReview';
import ChatScreen from './presentation/main/bottomBar/chat/ChatScreen';
import ProfileScreen from './presentation/main/bottomBar/profile/ProfileScreen';
import MyBookingScreen from './presentation/main/bottomBar/bookings/MyBookingScreen';
import BookingConfirmationScreen from './presentation/booking/BookingConfirmationScreen';
import ProviderSelectionScreen from './presentation/booking/ProviderSelectionScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import EditProfileScreen from './presentation/main/bottomBar/profile/screens/EditProfileScreen';
import ProviderProfileScreen from './presentation/main/bottomBar/home/ProviderProfileScreen';
import ServiceProvidersScreen from './presentation/main/bottomBar/home/ServiceProvidersScreen';
import ServiceSearchScreen from './presentation/main/bottomBar/home/ServiceSearchScreen';
import ChatConversationScreen from './presentation/main/bottomBar/chat/ChatConversationScreen';
import SuperAdminChatScreen from './presentation/main/bottomBar/chat/SuperAdminChatScreen';
import RateServiceScreen from './presentation/main/bottomBar/bookings/RateServiceScreen';
import RescheduleBookingScreen from './presentation/main/bottomBar/bookings/RescheduleBookingScreen';
import BookingDetailScreen from './presentation/main/bottomBar/bookings/BookingDetailScreen';
import ServiceManagementScreen from './presentation/main/bottomBar/home/manager/ServiceManagementScreen';
import StaffManagementScreenManager from './presentation/main/bottomBar/home/manager/BarberManagementScreen';
import BookingManagementScreen from './presentation/main/bottomBar/home/manager/BookingManagementScreen';
import AdminManagementScreen from './presentation/main/bottomBar/home/manager/AdminManagementScreen';
import ProviderReviewsScreen from './presentation/main/bottomBar/home/ProviderReviewsScreen';
import SearchScreen from './presentation/main/bottomBar/home/SearchScreen';
import StaffManagementScreen from './presentation/main/bottomBar/home/StaffManagementScreen';
import InvitationsScreen from './presentation/invitations/InvitationsScreen';
import PaymentTrackingScreen from './presentation/admin/PaymentTrackingScreen';
import UpgradePlanScreen from './presentation/shop/UpgradePlanScreen';
import ResubscribeScreen from './presentation/shop/ResubscribeScreen';
import { checkAuthState, onAuthStateChange, hasCompletedOnboarding, clearAllAppData, isCreatingProvider } from './lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RootStack = createNativeStackNavigator();

const Main = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const navigationRef = useNavigationContainerRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  // Setup OneSignal push notifications
  useEffect(() => {
    // Initialize OneSignal first (must be called before any other OneSignal methods)
    initializeOneSignal();

    // Register for push notifications when app starts
    registerForPushNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received:', notification);
      // Show in-app notification (already handled by notification handler)
    });

    // Listen for user tapping on notifications
    responseListener.current = addNotificationResponseListener((response) => {
      console.log('👆 Notification tapped:', response);
      // OneSignal uses additionalData for custom data
      const data = response.notification?.request?.content?.data || {};

      // Navigate based on notification type
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
    // Listen for auth state changes
    const subscription = onAuthStateChange(async (event, session, profile) => {
      console.log('🔄 Auth state changed in Main.jsx:', event);

      // IMPORTANT: Ignore auth state changes while creating a provider
      // This prevents the app from switching views during provider creation
      if (isCreatingProvider()) {
        console.log('⏳ Ignoring auth event during provider creation');
        return;
      }

      // Only handle meaningful auth state changes, ignore token refreshes
      if (event === 'INITIAL_SESSION') {
        console.log('📱 Initial session loaded from storage');
        return;
      }

      if (event === 'SIGNED_IN') {
        console.log('✅ User signed in');
        setIsAuthenticated(true);

        // Set OneSignal external user ID for targeting
        if (session?.user?.id) {
          setExternalUserId(session.user.id);
        }

        // Check onboarding status
        const hasOnboarded = await hasCompletedOnboarding();
        setOnboardingComplete(hasOnboarded);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setIsAuthenticated(false);
        setOnboardingComplete(false);

        // Remove OneSignal external user ID on logout
        removeExternalUserId();
      } else if (event === 'USER_UPDATED') {
        console.log('👤 User data updated');
        // User updated, check onboarding again
        if (session) {
          const hasOnboarded = await hasCompletedOnboarding();
          setOnboardingComplete(hasOnboarded);
        }
      }
    });

    // Cleanup subscription
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
            <RootStack.Screen name="SplashScreen" component={SplashScreen}/>
            <RootStack.Screen name="WelcomeScreen" component={WelcomeScreen}/>
            <RootStack.Screen name="CustomerOnboarding" component={CustomerOnboarding}/>
            <RootStack.Screen name="ExclusiveCustomerRegistration" component={ExclusiveCustomerRegistration} />
            <RootStack.Screen name="ExclusiveCustomerLogin" component={ExclusiveCustomerLogin} />
            <RootStack.Screen name="BusinessRegistration" component={BusinessRegistration}/>
            <RootStack.Screen name="BusinessLoginScreen" component={BusinessLoginScreen}/>
            <RootStack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} options={{ headerShown: false }}/>
            <RootStack.Screen name="RegistrationSuccessScreen" component={RegistrationSuccessScreen}/>
            <RootStack.Screen name="PaymentMethodScreen" component={PaymentMethodScreen} options={{ headerShown: false }}/>
            <RootStack.Screen name="PaymentSuccessScreen" component={PaymentSuccessScreen} options={{ headerShown: false }}/>
            <RootStack.Screen name="EmailAuthScreen" component={EmailAuthScreen}/>
            <RootStack.Screen name="OTPVerificationScreen" component={OTPVerificationScreen}/>
            <RootStack.Screen name="CustomerRegistration" component={CustomerRegistration}/>
            <RootStack.Screen name="CustomerLogin" component={CustomerLogin}/>
            <RootStack.Screen name="QRShopSignup" component={QRShopSignup}/>
            <RootStack.Screen name="ProviderLoginScreen" component={ProviderLoginScreen}/>
            <RootStack.Screen name="ProviderOTPScreen" component={ProviderOTPScreen}/>
            <RootStack.Screen name="ProviderSetPasswordScreen" component={ProviderSetPasswordScreen}/>
            <RootStack.Screen name="Onboarding" component={Onboarding}/>
            <RootStack.Screen name="MainScreen" component={MainScreen}/>
            <RootStack.Screen name="ExclusiveCustomerMainScreen" component={ExclusiveCustomerMainScreen}/>
            <RootStack.Screen name="HomeScreen" component={ShopBrowserScreen}/>
            <RootStack.Screen name="ExclusiveCustomerHomeScreen" component={ExclusiveCustomerHomeScreen}/>
            <RootStack.Screen name="ShopDetailsScreen" component={ShopDetailsScreen}/>
            <RootStack.Screen name="ShopSettingsScreen" component={ShopSettingsScreen}/>
            <RootStack.Screen name="AdminBusinessDetailsScreen" component={AdminBusinessDetailsScreen}/>
            <RootStack.Screen name="ServiceShopsScreen" component={ServiceShopsScreen}/>
            <RootStack.Screen name="CategoryShopsScreen" component={CategoryShopsScreen}/>
            <RootStack.Screen name="CreateShopScreen" component={CreateShopScreen}/>
            <RootStack.Screen name="ShopSelectionScreen" component={ShopSelectionScreen}/>
            <RootStack.Screen name="ShopReviewSubmission" component={ShopReviewSubmission}/>
            <RootStack.Screen name="ShopPendingReview" component={ShopPendingReview}/>
            <RootStack.Screen name="ChatScreen" component={ChatScreen}/>
            <RootStack.Screen name="MyBookingScreen" component={MyBookingScreen}/>
            <RootStack.Screen name="BookingConfirmationScreen" component={BookingConfirmationScreen}/>
            <RootStack.Screen name="ProviderSelectionScreen" component={ProviderSelectionScreen}/>
            <RootStack.Screen name="ProfileScreen" component={ProfileScreen}/>
            <RootStack.Screen name="EditProfileScreen" component={EditProfileScreen}/>
            <RootStack.Screen name="ProviderProfileScreen" component={ProviderProfileScreen}/>
            <RootStack.Screen name="ServiceProvidersScreen" component={ServiceProvidersScreen}/>
            <RootStack.Screen name="ServiceSearchScreen" component={ServiceSearchScreen}/>
            <RootStack.Screen name="ChatConversationScreen" component={ChatConversationScreen}/>
            <RootStack.Screen name="SuperAdminChatScreen" component={SuperAdminChatScreen}/>
            <RootStack.Screen name="RateServiceScreen" component={RateServiceScreen}/>
            <RootStack.Screen name="RescheduleBookingScreen" component={RescheduleBookingScreen}/>
            <RootStack.Screen name="BookingDetailScreen" component={BookingDetailScreen}/>
            <RootStack.Screen name="ServiceManagementScreen" component={ServiceManagementScreen_New} />
            <RootStack.Screen name="StaffManagementScreenManager" component={StaffManagementScreenManager} />
            <RootStack.Screen name="BookingManagementScreen" component={BookingManagementScreen} />
            <RootStack.Screen name="AdminManagementScreen" component={AdminManagementScreen} />
            <RootStack.Screen name="ProviderReviewsScreen" component={ProviderReviewsScreen} />
            <RootStack.Screen name="SearchScreen" component={SearchScreen} />
            <RootStack.Screen name="StaffManagementScreen" component={StaffManagementScreen} />
            <RootStack.Screen name="InvitationsScreen" component={InvitationsScreen} />
            <RootStack.Screen name="PaymentTrackingScreen" component={PaymentTrackingScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="UpgradePlanScreen" component={UpgradePlanScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="ResubscribeScreen" component={ResubscribeScreen} options={{ headerShown: false }} />
            {/*
            <RootStack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen}/>
            <RootStack.Screen name="TermsPolicyScreen" component={TermsPolicyScreen}/> */}
          </RootStack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
      </StripeProvider>

      <Toast topOffset={40}/>
    </>
  );
};

export default Main;
