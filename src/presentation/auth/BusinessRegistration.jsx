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
      console.log('📝 Starting business registration...');

      // 1. Create Supabase auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: name,
            role: 'owner', // Business owners get 'owner' role
          }
        }
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        Alert.alert('Registration Failed', authError.message);
        setLoading(false);
        return;
      }

      console.log('✅ Auth account created:', authData.user?.id);

      // 2. Store business registration data temporarily
      // We'll create the shop later when they complete setup
      const businessData = {
        email: email.toLowerCase().trim(),
        name: name,
        businessName: businessName,
        userId: authData.user?.id,
      };

      // Navigate to success screen
      navigation.replace('RegistrationSuccessScreen', {
        email: email.toLowerCase().trim(),
        businessName: businessName,
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 0: Introduction */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconHeader}>
              <View style={styles.largeIconCircle}>
                <Ionicons name="business" size={60} color="#FF6B6B" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Join Thousands of Professionals</Text>
            <Text style={styles.stepSubtitle}>
              Grow your business with Happy Inline
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.benefitText}>Manage bookings effortlessly</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.benefitText}>Accept payments online</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.benefitText}>Build your client base</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={styles.benefitText}>Free 30-day trial</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(1)}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
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
                    placeholder="owner@barbershop.com"
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
                    placeholder="Avon Barber Shop"
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
              <Ionicons name="arrow-back" size={20} color="#FF6B6B" />
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
                <ActivityIndicator size="large" color="#FF6B6B" />
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
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
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
                            <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
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
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
              <Ionicons name="arrow-back" size={20} color="#FF6B6B" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.iconHeader}>
              <View style={styles.largeIconCircle}>
                <Ionicons name="checkmark-circle" size={60} color="#FF6B6B" />
              </View>
            </View>

            <Text style={styles.stepTitle}>Review Your Information</Text>
            <Text style={styles.stepSubtitle}>
              Make sure everything looks good before registering
            </Text>

            <View style={styles.reviewContainer}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Business Name</Text>
                <Text style={styles.reviewValue}>{businessName}</Text>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Industry</Text>
                <Text style={styles.reviewValue}>
                  {selectedCategory?.icon} {selectedCategory?.name}
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
                <Ionicons name="information-circle" size={20} color="#FF6B6B" />
                <Text style={styles.reviewNoteText}>
                  This email will be your login username. After registration, you'll sign in to complete your business setup.
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
              <Ionicons name="arrow-back" size={20} color="#FF6B6B" />
              <Text style={styles.backButtonText}>Back to Edit</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
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
    backgroundColor: '#FFE5E5',
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
    backgroundColor: '#FF6B6B',
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
    color: '#FF6B6B',
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
    color: '#FF6B6B',
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
    color: '#FF6B6B',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    color: '#FF6B6B',
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
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minHeight: 140,
    justifyContent: 'center',
  },
  categoryCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFE5E5',
  },
  categoryIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryNameSelected: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 12,
    color: '#999',
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
    borderColor: '#FF6B6B',
    backgroundColor: '#FFE5E5',
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
    color: '#FF6B6B',
  },
  businessTypeDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});

export default BusinessRegistration;
