import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';

const BusinessRegistration = ({ navigation }) => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // NEW: Industry/category selection
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [selectedBusinessType, setSelectedBusinessType] = useState(null);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load business categories when step 2 is reached
  React.useEffect(() => {
    if (step === 2) {
      loadCategories();
    }
  }, [step]);

  // Load business types when category is selected
  React.useEffect(() => {
    if (selectedCategory) {
      loadBusinessTypes(selectedCategory.id);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data, error } = await supabase.rpc('get_business_categories');

      if (error) {
        console.error('Error loading categories:', error);
        Alert.alert('Error', 'Failed to load business categories');
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadBusinessTypes = async (categoryId) => {
    try {
      const { data, error } = await supabase.rpc('get_business_types_by_category', {
        p_category_id: categoryId
      });

      if (error) {
        console.error('Error loading business types:', error);
        return;
      }

      setBusinessTypes(data || []);
      setSelectedBusinessType(null); // Reset selection when category changes
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      console.log('📝 Creating business account...');

      // Create the account directly (no payment required for now)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: name,
            role: 'owner',
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      console.log('✅ Auth account created:', authData.user.id);

      // Update profile with business details
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: name,
          role: 'owner',
          business_name: businessName,
          business_category_id: selectedCategory?.id,
          business_type_id: selectedBusinessType?.id,
          // No subscription for now - they will subscribe on the website
          subscription_plan: null,
          subscription_status: null,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Don't fail the registration, profile can be updated later
      }

      // Show success message
      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: 'Welcome to Happy InLine',
        visibilityTime: 3000,
      });

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainScreen' }],
      });

    } catch (error) {
      console.error('❌ Registration error:', error);

      let errorMessage = 'Something went wrong. Please try again.';
      if (error.message?.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message?.includes('invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
        {/* STEP 0: Introduction */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconHeader}>
              <View style={styles.largeIconCircle}>
                <Ionicons name="business" size={60} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Join Thousands of Professionals</Text>
            <Text style={styles.stepSubtitle}>
              Grow your business with Happy Inline
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#0393d5" />
                <Text style={styles.benefitText}>Manage bookings effortlessly</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#0393d5" />
                <Text style={styles.benefitText}>Accept payments online</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#0393d5" />
                <Text style={styles.benefitText}>Build your client base</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#0393d5" />
                <Text style={styles.benefitText}>7-day money-back guarantee</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(1)}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('GetStarted')}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 1: Email & Basic Info */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Let's Get Started</Text>
            <Text style={styles.stepSubtitle}>Enter your business information</Text>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Email</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="owner@yourbusiness.com"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mike Johnson"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="storefront" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your Business Name"
                    placeholderTextColor="#999"
                    value={businessName}
                    onChangeText={setBusinessName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Choose a strong password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {password.length > 0 && password.length < 6 && (
                  <Text style={styles.helperText}>Password must be at least 6 characters</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter your password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <Text style={styles.helperText}>Passwords do not match</Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, (!email || !name || !businessName || !password || password !== confirmPassword || password.length < 6) && styles.disabledButton]}
              onPress={() => setStep(2)}
              disabled={!email || !name || !businessName || !password || password !== confirmPassword || password.length < 6}
            >
              <Text style={styles.primaryButtonText}>Continue to Business Type</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setStep(0)}>
              <Ionicons name="arrow-back" size={20} color="#0393d5" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>
                Already registered?{' '}
                <Text
                  style={styles.signInLink}
                  onPress={() => navigation.navigate('EmailAuthScreen', { isSignIn: true })}
                >
                  Sign In
                </Text>
              </Text>
            </View>
          </View>
        )}

        {/* STEP 2: Category & Business Type Selection */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What type of business do you run?</Text>
            <Text style={styles.stepSubtitle}>
              Select your industry to get started
            </Text>

            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0393d5" />
                <Text style={styles.loadingText}>Loading categories...</Text>
              </View>
            ) : (
              <>
                {/* Category Selection */}
                <Text style={styles.sectionLabel}>Choose Your Industry</Text>
                <View style={styles.categoriesGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        selectedCategory?.id === category.id && styles.categoryCardSelected
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Ionicons
                        name={category.icon || 'business-outline'}
                        size={48}
                        color="#FFFFFF"
                        style={styles.categoryIconComponent}
                      />
                      <Text style={[
                        styles.categoryName,
                        selectedCategory?.id === category.id && styles.categoryNameSelected
                      ]}>
                        {category.name}
                      </Text>
                      <Text style={styles.categoryCount}>
                        {category.type_count} types
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Business Type Selection */}
                {selectedCategory && businessTypes.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Select Your Business Type</Text>
                    <ScrollView style={styles.businessTypesList} showsVerticalScrollIndicator={false}>
                      {businessTypes.map((type) => (
                        <TouchableOpacity
                          key={type.id}
                          style={[
                            styles.businessTypeCard,
                            selectedBusinessType?.id === type.id && styles.businessTypeCardSelected
                          ]}
                          onPress={() => setSelectedBusinessType(type)}
                        >
                          <View style={styles.businessTypeInfo}>
                            <Text style={[
                              styles.businessTypeName,
                              selectedBusinessType?.id === type.id && styles.businessTypeNameSelected
                            ]}>
                              {type.name}
                            </Text>
                            <Text style={styles.businessTypeDescription}>
                              {type.description}
                            </Text>
                          </View>
                          {selectedBusinessType?.id === type.id && (
                            <Ionicons name="checkmark-circle" size={24} color="#09264b" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, (!selectedCategory || !selectedBusinessType) && styles.disabledButton]}
              onPress={() => setStep(3)}
              disabled={!selectedCategory || !selectedBusinessType}
            >
              <Text style={styles.primaryButtonText}>Continue to Review</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={20} color="#0393d5" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconHeader}>
              <View style={styles.largeIconCircle}>
                <Ionicons name="clipboard-outline" size={60} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Review Your Information</Text>
            <Text style={styles.stepSubtitle}>
              Make sure everything looks good before creating your account
            </Text>

            <View style={styles.reviewContainer}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Business Name</Text>
                <Text style={styles.reviewValue}>{businessName}</Text>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Industry</Text>
                <Text style={styles.reviewValue}>
                  {selectedCategory?.name}
                </Text>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Business Type</Text>
                <Text style={styles.reviewValue}>{selectedBusinessType?.name}</Text>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Owner Name</Text>
                <Text style={styles.reviewValue}>{name}</Text>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Business Email</Text>
                <Text style={styles.reviewValue}>{email}</Text>
              </View>

              <View style={styles.reviewNote}>
                <Ionicons name="information-circle" size={20} color="#0393d5" />
                <Text style={styles.reviewNoteText}>
                  Your account will be created with free access. You can activate your subscription anytime from our website to unlock all business features.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Ionicons name="checkmark" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(2)}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={20} color="#0393d5" />
              <Text style={styles.backButtonText}>Back to Edit</Text>
            </TouchableOpacity>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    paddingTop: 40,
    paddingBottom: 24,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  largeIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0393d5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  benefitsList: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000',
  },
  primaryButton: {
    backgroundColor: '#0393d5',
    borderRadius: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0393d5',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButtonText: {
    color: '#0393d5',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signInContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  signInText: {
    fontSize: 15,
    color: '#666',
  },
  signInLink: {
    color: '#0393d5',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#0393d5',
    marginTop: 6,
    marginLeft: 4,
  },
  reviewContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  reviewItem: {
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '600',
  },
  reviewNote: {
    flexDirection: 'row',
    backgroundColor: '#FFE5E5',
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  reviewNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  // NEW: Category & Business Type Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
    marginTop: 8,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#0393d5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0393d5',
    minHeight: 140,
    justifyContent: 'center',
  },
  categoryCardSelected: {
    borderColor: '#09264b',
    backgroundColor: '#09264b',
  },
  categoryIconComponent: {
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  businessTypesList: {
    maxHeight: 300,
    marginBottom: 24,
  },
  businessTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  businessTypeCardSelected: {
    borderColor: '#09264b',
    backgroundColor: '#F0F8FF',
  },
  businessTypeInfo: {
    flex: 1,
    marginRight: 12,
  },
  businessTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  businessTypeNameSelected: {
    color: '#09264b',
  },
  businessTypeDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // Pricing Styles
  pricingContainer: {
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingCardSelected: {
    borderColor: '#0393d5',
    borderWidth: 2,
    shadowColor: '#0393d5',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  popularCard: {
    borderColor: '#0393d5',
    borderWidth: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#0393d5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 56,
  },
  pricePeriod: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  featuresList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  titleWithInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  infoButton: {
    marginLeft: 8,
    padding: 4,
  },
  refundNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D0E8FF',
  },
  refundNoticeText: {
    fontSize: 14,
    color: '#0393d5',
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0393d5',
  },
  helpButtonText: {
    fontSize: 15,
    color: '#0393d5',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BusinessRegistration;
