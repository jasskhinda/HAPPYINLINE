import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { checkAuthState } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

const SplashScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const authState = await checkAuthState();

      if (!authState.isAuthenticated) {
        navigation.replace('ProviderWelcomeScreen');
        return;
      }

      // Verify user has provider/owner access
      const profile = authState.profile;
      const isProviderRole = ['owner', 'provider', 'super_admin'].includes(profile?.role);

      if (!isProviderRole) {
        // Check shop_staff as fallback
        const { data: staffEntries } = await supabase
          .from('shop_staff')
          .select('id')
          .eq('user_id', authState.user.id)
          .eq('is_active', true)
          .limit(1);

        if (!staffEntries || staffEntries.length === 0) {
          Toast.show({
            type: 'error',
            text1: 'Access Denied',
            text2: 'This app is for business owners and staff only.',
          });
          await supabase.auth.signOut();
          navigation.replace('ProviderWelcomeScreen');
          return;
        }
      }

      navigation.replace('ProviderMainScreen');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please try again',
      });
      navigation.replace('ProviderWelcomeScreen');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/logowithouttagline.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Happy InLine</Text>
        <Text style={styles.tagline}>Business</Text>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
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
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 20,
    color: '#4A90E2',
    fontWeight: '600',
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
