import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const handleCustomerPath = () => {
    navigation.navigate('CustomerOnboarding');
  };

  const handleBusinessPath = () => {
    navigation.navigate('BusinessLoginScreen');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.gradient}>
        {/* Logo/Brand Section */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Happy Inline</Text>
          <Text style={styles.tagline}>Your Service, Your Style</Text>

          {/* Trust Signal */}
          <View style={styles.trustBadge}>
            <Ionicons name="people" size={16} color="#FFD700" />
            <Text style={styles.trustText}>Trusted by 10,000+ professionals</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Customer Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCustomerPath}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconCircle}>
                <Ionicons name="search" size={28} color="#FF6B6B" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.primaryButtonText}>Find & Book Services</Text>
                <Text style={styles.buttonSubtext}>Browse shops and book appointments</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FF6B6B" />
            </View>
          </TouchableOpacity>

          {/* Business Owner Button */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBusinessPath}
            activeOpacity={0.8}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconCircleSecondary}>
                <Ionicons name="business" size={28} color="#FF6B6B" />
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.secondaryButtonText}>I Own a Business</Text>
                <Text style={styles.buttonSubtextSecondary}>Register and manage your shop</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FF6B6B" />
            </View>
          </TouchableOpacity>

          {/* Features Preview */}
          <View style={styles.features}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Real-time booking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Secure payments</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.featureText}>Easy management</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: '#9F9F87', // Your app's beige/tan color
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  trustText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconCircleSecondary: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 14,
    color: '#666',
  },
  buttonSubtextSecondary: {
    fontSize: 14,
    color: '#666',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default WelcomeScreen;
