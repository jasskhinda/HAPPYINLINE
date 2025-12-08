import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { createSubscription, STRIPE_PLANS, REFUND_DAYS } from '../../lib/stripe';
import { supabase } from '../../lib/supabase';

// Helper to calculate refund eligibility date (7 days from now)
const getRefundEligibleDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + REFUND_DAYS);
  return date.toISOString();
};

// Helper to calculate next billing date (30 days from now)
const getNextBillingDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

const PaymentMethodScreen = ({ navigation, route }) => {
  const { businessData } = route.params;
  const { email, password, name, businessName, selectedPlan, selectedCategory, selectedBusinessType } = businessData;

  const { createPaymentMethod } = useStripe();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const planDetails = STRIPE_PLANS[selectedPlan];

  const handleAddPayment = async () => {
    if (!cardComplete) {
      Alert.alert('Incomplete Card', 'Please enter complete card details');
      return;
    }

    try {
      setLoading(true);

      // Step 0: Create the auth account FIRST (before payment)
      // This ensures we don't charge users who already have accounts
      console.log('🔍 Creating auth account first (before payment)...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: password,
        options: {
          data: {
            name: name,
            role: 'owner',
            business_name: businessName,
            selected_plan: selectedPlan,
            category_id: selectedCategory?.id,
            business_type_id: selectedBusinessType?.id,
          }
        }
      });

      if (authError) {
        console.log('❌ Auth error:', authError.message);
        if (authError.message?.includes('already registered')) {
          Alert.alert(
            'Email Already Registered',
            'This email is already associated with an account. Please sign in instead, or use a different email.',
            [
              { text: 'Sign In', onPress: () => navigation.navigate('BusinessLoginScreen') },
              { text: 'Use Different Email', onPress: () => navigation.goBack() }
            ]
          );
        } else {
          Alert.alert('Account Error', authError.message || 'Failed to create account');
        }
        setLoading(false);
        return;
      }

      // Check if user was actually created (not just returned existing)
      if (!authData.user?.id) {
        Alert.alert('Error', 'Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ Auth account created:', authData.user.id);
      const userId = authData.user.id;

      console.log('💳 Creating payment method...');

      // Step 1: Create payment method using Stripe
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (pmError) {
        console.error('❌ Payment method error:', pmError);
        Alert.alert('Payment Error', pmError.message || 'Failed to add payment method');
        setLoading(false);
        return;
      }

      console.log('✅ Payment method created:', paymentMethod.id);

      // Step 2: Create subscription via Supabase Edge Function (with temporary shopId)
      // We use email as temporary identifier, shop will be created after
      const result = await createSubscription({
        shopId: 'pending_' + Date.now(), // Temporary ID - will be updated
        email,
        planName: selectedPlan,
        paymentMethodId: paymentMethod.id,
      });

      if (!result.success) {
        // Payment failed - account was created but no subscription
        console.error('❌ Payment failed:', result.error);

        // Update profile to show payment is required
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'payment_failed',
            subscription_plan: null,
          })
          .eq('id', userId);

        Alert.alert(
          'Payment Failed',
          'Your account was created but payment could not be processed. You can sign in and add a payment method to activate your subscription.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                // Stay on payment screen to retry
              }
            },
            {
              text: 'Sign In Later',
              onPress: () => navigation.navigate('BusinessLoginScreen'),
              style: 'cancel'
            }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Payment successful!');

      // Step 3: Update the user's profile with subscription details
      // Account was already created in Step 0, use userId from there
      // Subscription belongs to the OWNER (profile), not a shop
      // Owner will create shops later using their license pool
      const currentPlanDetails = STRIPE_PLANS[selectedPlan];

      // Wait for profile to be created by auth trigger (with retry)
      let profileUpdateSuccess = false;
      let retryCount = 0;
      const maxRetries = 5;

      while (!profileUpdateSuccess && retryCount < maxRetries) {
        // Small delay to allow trigger to create profile
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();

        if (checkError || !existingProfile) {
          console.log(`⏳ Waiting for profile to be created... (attempt ${retryCount + 1}/${maxRetries})`);
          retryCount++;
          continue;
        }

        // Profile exists, now update it
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_plan: selectedPlan,
            subscription_status: 'active',
            subscription_start_date: new Date().toISOString(),
            next_billing_date: getNextBillingDate(),
            refund_eligible_until: getRefundEligibleDate(),
            monthly_amount: currentPlanDetails.amount,
            max_licenses: currentPlanDetails.maxLicenses,
            license_count: 0, // Start with 0 providers
            stripe_customer_id: result.customerId,
            stripe_subscription_id: result.subscriptionId,
            payment_method_last4: result.paymentMethodLast4,
            payment_method_brand: result.paymentMethodBrand,
            // Also store business info for when they create their shop
            business_name: businessName,
            preferred_category_id: selectedCategory?.id,
            preferred_business_type_id: selectedBusinessType?.id,
          })
          .eq('id', userId);

        if (!profileError) {
          profileUpdateSuccess = true;
        } else {
          console.log(`⚠️ Profile update failed, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
          retryCount++;
        }
      }

      if (!profileUpdateSuccess) {
        console.error('❌ Profile update error after payment: Max retries exceeded');
        Alert.alert(
          'Profile Update Error',
          'Payment was successful, but we couldn\'t save your subscription. Please contact support.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Profile updated with subscription');

      // Step 5: Navigate to success screen
      // Owner will create their shop/business AFTER logging in
      navigation.replace('PaymentSuccessScreen', {
        planName: planDetails.name,
        amount: planDetails.amount,
        refundDays: REFUND_DAYS,
        businessName: businessName,
      });

    } catch (error) {
      console.error('❌ Payment setup error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Payment is REQUIRED - no skip option for professional subscription model

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="card" size={40} color="#0393d5" />
            </View>
            <Text style={styles.title}>Complete Your Payment</Text>
            <Text style={styles.subtitle}>
              {REFUND_DAYS}-day money-back guarantee. Cancel anytime.
            </Text>
          </View>

          {/* Selected Plan Summary */}
          <View style={styles.planSummary}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{planDetails.name} Plan</Text>
              <View style={styles.refundBadge}>
                <Text style={styles.refundBadgeText}>{REFUND_DAYS}-DAY REFUND</Text>
              </View>
            </View>
            <Text style={styles.planPrice}>
              ${planDetails.amount}/month
            </Text>
            <Text style={styles.planProviders}>
              {planDetails.providers} service providers included
            </Text>
          </View>

          {/* Plan Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>What's included:</Text>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.benefitText}>Full access to all features</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.benefitText}>Unlimited bookings</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.benefitText}>Customer messaging</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              <Text style={styles.benefitText}>{REFUND_DAYS}-day money-back guarantee</Text>
            </View>
          </View>

          {/* Card Input */}
          <View style={styles.cardContainer}>
            <Text style={styles.cardLabel}>Card Information</Text>
            <CardField
              postalCodeEnabled={true}
              placeholders={{
                number: '•••• •••• •••• ••••',
              }}
              cardStyle={styles.card}
              style={styles.cardField}
              onCardChange={(cardDetails) => {
                setCardComplete(cardDetails.complete);
              }}
            />
          </View>

          {/* Important Notice */}
          <View style={styles.noticeContainer}>
            <Ionicons name="shield-checkmark" size={20} color="#0393d5" />
            <Text style={styles.noticeText}>
              Not satisfied? Get a full refund within {REFUND_DAYS} days. No questions asked.
            </Text>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, (!cardComplete || loading) && styles.disabledButton]}
            onPress={handleAddPayment}
            disabled={!cardComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  Pay ${planDetails.amount} Now
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#666" />
            <Text style={styles.securityText}>
              Secured by Stripe. Your payment info is encrypted.
            </Text>
          </View>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 30,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  planSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  refundBadge: {
    backgroundColor: '#0393d5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  refundBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0393d5',
    marginBottom: 4,
  },
  planProviders: {
    fontSize: 14,
    color: '#666',
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  cardContainer: {
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  cardField: {
    height: 50,
    marginVertical: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 12,
  },
  noticeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D0E8FF',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#0393d5',
    marginLeft: 12,
    lineHeight: 20,
    fontWeight: '500',
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
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
});

export default PaymentMethodScreen;
