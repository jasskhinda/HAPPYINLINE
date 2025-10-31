import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import Onboarding from './presentation/onboarding/Onboarding';
import Toast from 'react-native-toast-message';
import SplashScreen from './presentation/splash/SplashScreen';
import EmailAuthScreen from './presentation/auth/EmailAuthScreen';
import OTPVerificationScreen from './presentation/auth/OTPVerificationScreen';
import MainScreen from './presentation/main/MainScreen';
import HomeScreen from './presentation/main/bottomBar/home/HomeScreen';
import ChatScreen from './presentation/main/bottomBar/chat/ChatScreen';
import ProfileScreen from './presentation/main/bottomBar/profile/ProfileScreen';
import MyBookingScreen from './presentation/main/bottomBar/bookings/MyBookingScreen';
import BookingConfirmationScreen from './presentation/booking/BookingConfirmationScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import EditProfileScreen from './presentation/main/bottomBar/profile/screens/EditProfileScreen';
import BarberInfoScreen from './presentation/main/bottomBar/home/BarberInfoScreen';
import ServiceBarbersScreen from './presentation/main/bottomBar/home/ServiceBarbersScreen';
import ServiceSearchScreen from './presentation/main/bottomBar/home/ServiceSearchScreen';
import ChatConversationScreen from './presentation/main/bottomBar/chat/ChatConversationScreen';
import RateServiceScreen from './presentation/main/bottomBar/bookings/RateServiceScreen';
import RescheduleBookingScreen from './presentation/main/bottomBar/bookings/RescheduleBookingScreen';
import BookingDetailScreen from './presentation/main/bottomBar/bookings/BookingDetailScreen';
import ServiceManagementScreen from './presentation/main/bottomBar/home/manager/ServiceManagementScreen';
import BarberManagementScreen from './presentation/main/bottomBar/home/manager/BarberManagementScreen';
import BookingManagementScreen from './presentation/main/bottomBar/home/manager/BookingManagementScreen';
import ManagerManagementScreen from './presentation/main/bottomBar/home/manager/ManagerManagementScreen';
import AdminManagementScreen from './presentation/main/bottomBar/home/manager/AdminManagementScreen';
import BarberReviewsScreen from './presentation/main/bottomBar/home/BarberReviewsScreen';
import SearchScreen from './presentation/main/bottomBar/home/SearchScreen';
import StaffManagementScreen from './presentation/main/bottomBar/home/StaffManagementScreen';

// Multi-shop screens
import ShopSelectionScreen from './presentation/shop/ShopSelectionScreen';
import CreateShopScreen from './presentation/shop/CreateShopScreen';
import ShopDetailsScreen from './presentation/main/bottomBar/home/ShopDetailsScreen';
import ShopSettingsScreen from './presentation/main/bottomBar/home/ShopSettingsScreen';
import ServiceShopsScreen from './presentation/main/bottomBar/home/ServiceShopsScreen';

import { checkAuthState, onAuthStateChange, hasCompletedOnboarding, clearAllAppData } from './lib/auth';
import { needsShopSelection, getCurrentShopId, clearShopData } from './lib/multiShopAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RootStack = createNativeStackNavigator();

const Main = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [shopSelectionNeeded, setShopSelectionNeeded] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const subscription = onAuthStateChange(async (event, session, profile) => {
      console.log('🔄 Auth state changed in Main.jsx:', event);
      
      // Only handle meaningful auth state changes, ignore token refreshes
      if (event === 'INITIAL_SESSION') {
        console.log('📱 Initial session loaded from storage');
        await checkShopSelection();
        return;
      }
      
      if (event === 'SIGNED_IN') {
        console.log('✅ User signed in');
        setIsAuthenticated(true);
        
        // Check onboarding status
        const hasOnboarded = await hasCompletedOnboarding();
        setOnboardingComplete(hasOnboarded);
        
        // Check shop selection if onboarding is complete
        if (hasOnboarded) {
          await checkShopSelection();
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setIsAuthenticated(false);
        setOnboardingComplete(false);
        setShopSelectionNeeded(false);
        await clearShopData();
      } else if (event === 'USER_UPDATED') {
        console.log('👤 User data updated');
        // User updated, check onboarding again
        if (session) {
          const hasOnboarded = await hasCompletedOnboarding();
          setOnboardingComplete(hasOnboarded);
          
          if (hasOnboarded) {
            await checkShopSelection();
          }
        }
      }
    });

    // Initial setup
    const initializeApp = async () => {
      try {
        // Check auth state
        const authResult = await checkAuthState();
        if (authResult.isAuthenticated) {
          setIsAuthenticated(true);
          
          const hasOnboarded = await hasCompletedOnboarding();
          setOnboardingComplete(hasOnboarded);
          
          if (hasOnboarded) {
            await checkShopSelection();
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setInitializing(false);
      }
    };

    initializeApp();

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const checkShopSelection = async () => {
    try {
      const currentShopId = await getCurrentShopId();
      const needsSelection = await needsShopSelection();
      
      console.log('🏪 Shop selection check:', { currentShopId, needsSelection });
      
      // If user has no current shop but has access to shops, they need to select
      setShopSelectionNeeded(!currentShopId && needsSelection);
    } catch (error) {
      console.error('Error checking shop selection:', error);
      setShopSelectionNeeded(false);
    }
  };

  // Show loading while initializing
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Initializing...</Text>
      </View>
    );
  }

  const getInitialRouteName = () => {
    if (!isAuthenticated) {
      return 'SplashScreen';
    }
    
    if (!onboardingComplete) {
      return 'Onboarding';
    }
    
    if (shopSelectionNeeded) {
      return 'ShopSelectionScreen';
    }
    
    return 'MainScreen';
  };

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <RootStack.Navigator 
            screenOptions={{ headerShown: false }}
            initialRouteName={getInitialRouteName()}
          >
            {/* Auth Screens */}
            <RootStack.Screen name="SplashScreen" component={SplashScreen}/>
            <RootStack.Screen name="EmailAuthScreen" component={EmailAuthScreen}/>
            <RootStack.Screen name="OTPVerificationScreen" component={OTPVerificationScreen}/>
            <RootStack.Screen name="Onboarding" component={Onboarding}/>
            
            {/* Shop Selection Screens */}
            <RootStack.Screen name="ShopSelectionScreen" component={ShopSelectionScreen}/>
            <RootStack.Screen name="CreateShopScreen" component={CreateShopScreen}/>
            <RootStack.Screen name="ShopDetailsScreen" component={ShopDetailsScreen}/>
            <RootStack.Screen name="ShopSettingsScreen" component={ShopSettingsScreen}/>
            <RootStack.Screen name="ServiceShopsScreen" component={ServiceShopsScreen}/>
            
            {/* Main App Screens */}
            <RootStack.Screen name="MainScreen" component={MainScreen}/>
            <RootStack.Screen name="HomeScreen" component={HomeScreen}/>
            <RootStack.Screen name="ChatScreen" component={ChatScreen}/>
            <RootStack.Screen name="MyBookingScreen" component={MyBookingScreen}/>
            <RootStack.Screen name="BookingConfirmationScreen" component={BookingConfirmationScreen}/>
            <RootStack.Screen name="ProfileScreen" component={ProfileScreen}/>
            <RootStack.Screen name="EditProfileScreen" component={EditProfileScreen}/>
            <RootStack.Screen name="BarberInfoScreen" component={BarberInfoScreen}/>
            <RootStack.Screen name="ServiceBarbersScreen" component={ServiceBarbersScreen}/>
            <RootStack.Screen name="ServiceSearchScreen" component={ServiceSearchScreen}/>
            <RootStack.Screen name="ChatConversationScreen" component={ChatConversationScreen}/>
            <RootStack.Screen name="RateServiceScreen" component={RateServiceScreen}/>
            <RootStack.Screen name="RescheduleBookingScreen" component={RescheduleBookingScreen}/>
            <RootStack.Screen name="BookingDetailScreen" component={BookingDetailScreen}/>
            <RootStack.Screen name="ServiceManagementScreen" component={ServiceManagementScreen} />
            <RootStack.Screen name="BarberManagementScreen" component={BarberManagementScreen} />
            <RootStack.Screen name="BookingManagementScreen" component={BookingManagementScreen} />
            <RootStack.Screen name="ManagerManagementScreen" component={ManagerManagementScreen} />
            <RootStack.Screen name="AdminManagementScreen" component={AdminManagementScreen} />
            <RootStack.Screen name="BarberReviewsScreen" component={BarberReviewsScreen} />
            <RootStack.Screen name="SearchScreen" component={SearchScreen} />
            <RootStack.Screen name="StaffManagementScreen" component={StaffManagementScreen} />
          </RootStack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>

      <Toast topOffset={40}/>
    </>
  );
};

export default Main;