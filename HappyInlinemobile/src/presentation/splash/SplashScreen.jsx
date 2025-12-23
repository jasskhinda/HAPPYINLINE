import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { checkAuthState, hasCompletedOnboarding } from '../../lib/auth';
import Toast from 'react-native-toast-message';

const SplashScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      console.log('\n\n');
      console.log('🚀 SPLASH SCREEN - Checking Authentication...');
      console.log('━'.repeat(60));

      // Small delay for better UX (show logo briefly)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check authentication state
      console.log('\n🔐 Step 1: Checking authentication state...');
      const authState = await checkAuthState();

      console.log('\n📊 Auth result:');
      console.log('   - Authenticated:', authState.isAuthenticated);
      console.log('   - User ID:', authState.user?.id);
      console.log('   - User Email:', authState.user?.email);
      console.log('   - Profile Name:', authState.profile?.name);
      console.log('   - Profile Role:', authState.profile?.role);
      console.log('   - Exclusive Shop ID:', authState.profile?.exclusive_shop_id);
      console.log('   - Full Profile:', JSON.stringify(authState.profile, null, 2));

      // Decision logic
      if (!authState.isAuthenticated) {
        // User not authenticated - Show professional welcome screen
        console.log('\n❌ NOT AUTHENTICATED');
        console.log('→ Decision: Not logged in -> Show WelcomeScreen');
        console.log('   (User will choose: Customer or Business path)');
        console.log('━'.repeat(60));
        navigation.replace('WelcomeScreen');
        return;
      }

      // User is authenticated - check if onboarding is complete
      console.log('\n✅ AUTHENTICATED - Checking onboarding status...');
      console.log('🔍 Step 2: Checking if onboarding completed...');
      
      // Pass user ID from session to avoid another network call
      const hasOnboarded = await hasCompletedOnboarding(authState.user.id);
      
      console.log('   ✓ Onboarding complete:', hasOnboarded);
      
      if (!hasOnboarded) {
        console.log('\n⚠️ AUTHENTICATED BUT ONBOARDING INCOMPLETE');
        console.log('→ Decision: Show name input screen');
        console.log('━'.repeat(60));
        navigation.replace('Onboarding', { fromOTP: true });
        return;
      }

      // User is authenticated and onboarding complete
      console.log('\n✅✅✅ FULLY AUTHENTICATED & ONBOARDING COMPLETE');
      console.log('→ Decision: Navigate to CustomerMainScreen');
      console.log('━'.repeat(60));
      console.log('\n\n');
      navigation.replace('CustomerMainScreen');

    } catch (error) {
      console.error('\n❌ CRITICAL ERROR in splash screen:');
      console.error('   Error:', error);
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      console.log('━'.repeat(60));
      
      // On error, show onboarding slides
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please try again',
        position: 'top',
      });
      
      navigation.replace('Onboarding');
    }
  };

  return (
    <View style={styles.container}>
      {/* App Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/logowithouttagline.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
  },
});
