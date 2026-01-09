import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { getShopDetails } from '../../lib/shopAuth';

const ExclusiveCustomerRegistration = ({ route, navigation }) => {
  const { shopId } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [fetchingShop, setFetchingShop] = useState(true);
  const [shop, setShop] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchShopData();
    } else {
      Alert.alert('Error', 'No shop ID provided');
      navigation.goBack();
    }
  }, [shopId]);

  const fetchShopData = async () => {
    try {
      setFetchingShop(true);
      const { success, shop: shopData, error } = await getShopDetails(shopId);

      if (success && shopData) {
        setShop(shopData);
      } else {
        Alert.alert('Error', 'Could not load shop details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching shop:', error);
      Alert.alert('Error', 'Failed to load shop details');
      navigation.goBack();
    } finally {
      setFetchingShop(false);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }
    if (!password) {
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // 2. Wait a moment for profile to be created by trigger
      console.log('⏳ Waiting for profile creation...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Call the link-shop API to bind customer to shop
      // This API has proper error handling for edge cases like duplicate emails
      console.log('🔗 Calling link-shop API to bind customer to shop:', shopId);
      console.log('   Customer ID:', authData.user.id);
      console.log('   Shop ID:', shopId);

      const response = await fetch('https://www.happyinline.com/api/customer/link-shop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authData.user.id,
          shopId: shopId,
          name: name.trim(),
          phone: phone.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Link-shop API error:', result.error);
        // Handle specific error for duplicate email
        if (response.status === 409) {
          throw new Error(result.error || 'This email is already registered.');
        }
        throw new Error(result.error || 'Failed to link customer to shop');
      }

      console.log('✅ Customer successfully bound to shop!');
      console.log('   Shop:', result.shopName);

      // 4. Verify the update worked
      const { data: verifyData } = await supabase
        .from('profiles')
        .select('exclusive_shop_id, email, name')
        .eq('id', authData.user.id)
        .single();

      console.log('🔍 Verification - Profile after update:', verifyData);

      if (!verifyData?.exclusive_shop_id) {
        console.error('⚠️ WARNING: exclusive_shop_id was not saved!');
      }

      // Clear business reference from AsyncStorage after successful registration
      await AsyncStorage.removeItem('business_reference');
      console.log('✅ Business reference cleared after successful registration');

      Alert.alert(
        'Success!',
        `Welcome to ${shop?.name}! Your account has been created.`,
        [
          {
            text: 'Continue',
            onPress: async () => {
              // Small delay to ensure database update is fully propagated
              await new Promise(resolve => setTimeout(resolve, 500));

              // Force navigation to splash screen
              // The SplashScreen will handle routing based on user role
              navigation.reset({
                index: 0,
                routes: [{ name: 'SplashScreen' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      // Check multiple ways for "already registered" error
      const errorMessage = error.message || error.msg || '';
      const errorString = JSON.stringify(error).toLowerCase();
      const isAlreadyRegistered =
        errorMessage.toLowerCase().includes('already registered') ||
        errorString.includes('already registered') ||
        errorMessage.toLowerCase().includes('user already exists');

      if (isAlreadyRegistered) {
        // Log as warning instead of error (this is expected behavior)
        console.warn('⚠️ User already registered:', email);
        // Handle "user already registered" error with helpful dialog
        Alert.alert(
          'Account Already Exists',
          `The email ${email} is already registered with Happy InLine. Would you like to sign in instead?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: () => {
                // Navigate to login screen with the same shop ID
                navigation.navigate('ExclusiveCustomerLogin', { shopId });
              },
            },
          ]
        );
      } else {
        // Log actual errors
        console.error('❌ Registration error:', error);

        // Handle other errors
        Alert.alert(
          'Registration Failed',
          errorMessage || 'An unexpected error occurred. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    // Navigate to exclusive customer login with shop ID
    navigation.navigate('ExclusiveCustomerLogin', { shopId });
  };

  if (fetchingShop) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading shop details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header with Shop Branding */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>

            {shop?.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.shopLogo} resizeMode="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="storefront" size={40} color="#4A90E2" />
              </View>
            )}

            <Text style={styles.shopName}>{shop?.name}</Text>
            <Text style={styles.title}>Create Your Account</Text>
            <Text style={styles.subtitle}>
              Register to book appointments at {shop?.name}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={loading ? ['#CCCCCC', '#999999'] : ['#4A90E2', '#3A7BC8', '#2A6BA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButton}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Sign In Link */}
            <TouchableOpacity style={styles.signInContainer} onPress={handleSignIn}>
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    padding: 8,
    zIndex: 10,
  },
  shopLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginRight: 8,
  },
  signInContainer: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  signInText: {
    fontSize: 15,
    color: '#666',
  },
  signInLink: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});

export default ExclusiveCustomerRegistration;
