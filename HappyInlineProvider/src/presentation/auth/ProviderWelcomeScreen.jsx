import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ProviderWelcomeScreen = ({ navigation }) => {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0A1A', '#111B2E', '#0D2847', '#0A1628']}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative gradient orbs */}
        <View style={styles.orbContainer}>
          <LinearGradient
            colors={['rgba(74,144,226,0.15)', 'rgba(74,144,226,0)']}
            style={styles.orbTopRight}
          />
          <LinearGradient
            colors={['rgba(99,102,241,0.1)', 'rgba(99,102,241,0)']}
            style={styles.orbBottomLeft}
          />
        </View>

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoGlow}>
              <Image
                source={require('../../../assets/logowithouttagline.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Happy InLine</Text>
            <View style={styles.titleAccentContainer}>
              <LinearGradient
                colors={['#4A90E2', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.titleAccentBadge}
              >
                <Text style={styles.titleAccent}>BUSINESS</Text>
              </LinearGradient>
            </View>
            <Text style={styles.subtitle}>
              The smart way to manage your business
            </Text>
          </View>

          {/* Business Types - Glass Cards */}
          <View style={styles.businessTypesContainer}>
            {[
              { icon: 'cut', label: 'Salons' },
              { icon: 'medical', label: 'Clinics' },
              { icon: 'cafe', label: 'Cafes' },
              { icon: 'briefcase', label: 'Services' },
            ].map((item, index) => (
              <View key={index} style={styles.businessType}>
                <View style={styles.businessTypeIcon}>
                  <LinearGradient
                    colors={['rgba(74,144,226,0.2)', 'rgba(99,102,241,0.1)']}
                    style={styles.businessTypeIconGradient}
                  >
                    <Ionicons name={item.icon} size={22} color="#7CB8FF" />
                  </LinearGradient>
                </View>
                <Text style={styles.businessTypeText}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Features Row */}
          <View style={styles.featuresContainer}>
            {[
              { icon: 'calendar', text: 'Smart Scheduling' },
              { icon: 'chatbubbles', text: 'Live Chat' },
              { icon: 'analytics', text: 'Analytics' },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIconCircle}>
                  <Ionicons name={feature.icon} size={16} color="#4A90E2" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProviderLoginScreen')}
              activeOpacity={0.85}
              style={styles.signInButtonWrapper}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F0F4FF']}
                style={styles.signInButton}
              >
                <Text style={styles.signInButtonText}>Get Started</Text>
                <View style={styles.signInArrowCircle}>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.platformText}>
              Built for businesses of all sizes
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 16,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: height * 0.05,
  },
  logoGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(74,144,226,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  titleAccentContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  titleAccentBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  titleAccent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200,210,230,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
  },
  businessTypesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  businessType: {
    alignItems: 'center',
    flex: 1,
  },
  businessTypeIcon: {
    marginBottom: 8,
  },
  businessTypeIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74,144,226,0.15)',
  },
  businessTypeText: {
    fontSize: 11,
    color: 'rgba(200,210,230,0.6)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  featureIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(74,144,226,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 11,
    color: 'rgba(200,210,230,0.5)',
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaSection: {
    alignItems: 'center',
  },
  signInButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#4A90E2',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D2847',
    letterSpacing: 0.3,
  },
  signInArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformText: {
    fontSize: 12,
    color: 'rgba(200,210,230,0.35)',
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default ProviderWelcomeScreen;
