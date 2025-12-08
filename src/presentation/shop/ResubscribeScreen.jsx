import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { createSubscription, STRIPE_PLANS } from '../../lib/stripe';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';

// Helper to calculate next billing date (30 days from now)
const getNextBillingDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};

const ResubscribeScreen = ({ navigation }) => {
  const { createPaymentMethod } = useStripe();
  const [step, setStep] = useState(1); // 1 = select plan, 2 = payment
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { user, profile } = await getCurrentUser();
      setCurrentUser({ user, profile });
    } catch (error) {
      console.error('Error loading user:', error);
      Alert.alert('Error', 'Failed to load user data');
      navigation.goBack();
    }
  };

  const plans = Object.entries(STRIPE_PLANS).map(([key, plan]) => ({
    key,
    ...plan,
  }));

  const handleSelectPlan = (planKey) => {
    setSelectedPlan(planKey);
  };

  const handleContinueToPayment = () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a subscription plan to continue.');
      return;
    }
    setStep(2);
  };

  const handlePayment = async () => {
    if (!cardComplete) {
      Alert.alert('Incomplete Card', 'Please enter complete card details');
      return;
    }

    if (!currentUser?.user?.id) {
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    try {
      setLoading(true);
      console.log('💳 Creating payment method for resubscription...');

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

      // Step 2: Create subscription via Supabase Edge Function
      const result = await createSubscription({
        shopId: 'resubscribe_' + Date.now(),
        email: currentUser.profile.email || currentUser.user.email,
        planName: selectedPlan,
        paymentMethodId: paymentMethod.id,
      });

      if (!result.success) {
        console.error('❌ Payment failed:', result.error);
        Alert.alert('Payment Failed', result.error || 'Failed to process payment. Please try again.');
        setLoading(false);
        return;
      }

      console.log('✅ Payment successful! Updating profile...');

      // Step 3: Update the user's profile with new subscription details
      // NOTE: Do NOT reset refund_eligible_until - refund is only for first-time subscribers
      // Resubscribers already used their 7-day trial/refund window
      const planDetails = STRIPE_PLANS[selectedPlan];
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: selectedPlan,
          subscription_status: 'active',
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: null, // Clear any previous end date
          next_billing_date: getNextBillingDate(),
          // refund_eligible_until: NOT SET - keeps old expired date or null
          monthly_amount: planDetails.amount,
          max_licenses: planDetails.maxLicenses,
          stripe_customer_id: result.customerId,
          stripe_subscription_id: result.subscriptionId,
          payment_method_last4: result.paymentMethodLast4,
          payment_method_brand: result.paymentMethodBrand,
        })
        .eq('id', currentUser.user.id);

      if (profileError) {
        console.error('❌ Profile update error:', profileError);
        Alert.alert(
          'Profile Update Error',
          'Payment was successful, but we couldn\'t save your subscription. Please contact support.',
        );
        setLoading(false);
        return;
      }

      console.log('✅ Profile updated with new subscription');

      // Success!
      Alert.alert(
        'Welcome Back!',
        `You've successfully resubscribed to the ${planDetails.name} plan.\n\n` +
        `Your subscription is now active with ${planDetails.providers} service provider licenses.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MainScreen'),
          },
        ],
      );

    } catch (error) {
      console.error('❌ Resubscription error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanSelection = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Select a plan to reactivate your subscription</Text>
      </View>

      <ScrollView
        style={styles.plansContainer}
        contentContainerStyle={styles.plansContent}
        showsVerticalScrollIndicator={false}
      >
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.key}
            style={[
              styles.planCard,
              selectedPlan === plan.key && styles.planCardSelected,
            ]}
            onPress={() => handleSelectPlan(plan.key)}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              {selectedPlan === plan.key && (
                <Ionicons name="checkmark-circle" size={24} color="#0393d5" />
              )}
            </View>
            <Text style={styles.planPrice}>${plan.amount}<Text style={styles.planPeriod}>/month</Text></Text>
            <Text style={styles.planProviders}>{plan.providers} service providers</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={24} color="#34C759" />
          <Text style={styles.guaranteeText}>
            {REFUND_DAYS}-day money-back guarantee. Cancel anytime.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selectedPlan && styles.continueButtonDisabled]}
          onPress={handleContinueToPayment}
          disabled={!selectedPlan}
        >
          <Text style={styles.continueButtonText}>Continue to Payment</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPaymentForm = () => {
    const planDetails = STRIPE_PLANS[selectedPlan];

    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(1)}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Complete Payment</Text>
          <Text style={styles.subtitle}>Reactivate your {planDetails?.name} subscription</Text>
        </View>

        <ScrollView
          style={styles.plansContainer}
          contentContainerStyle={styles.plansContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{planDetails?.name} Plan</Text>
              <Text style={styles.summaryValue}>${planDetails?.amount}/mo</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Providers</Text>
              <Text style={styles.summaryValue}>{planDetails?.providers}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total Today</Text>
              <Text style={styles.summaryTotalValue}>${planDetails?.amount}</Text>
            </View>
          </View>

          {/* Payment Form */}
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            <CardField
              postalCodeEnabled={false}
              placeholders={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={{
                backgroundColor: '#F8F9FA',
                textColor: '#000000',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E0E0E0',
              }}
              style={styles.cardField}
              onCardChange={(cardDetails) => {
                setCardComplete(cardDetails.complete);
              }}
            />
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="lock-closed" size={16} color="#666" />
            <Text style={styles.securityText}>
              Your payment is secure and encrypted
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.payButton, (!cardComplete || loading) && styles.payButtonDisabled]}
            onPress={handlePayment}
            disabled={!cardComplete || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#FFF" />
                <Text style={styles.payButtonText}>Pay ${planDetails?.amount}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0393d5" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {step === 1 ? renderPlanSelection() : renderPaymentForm()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  plansContainer: {
    flex: 1,
  },
  plansContent: {
    padding: 20,
    paddingBottom: 100,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardSelected: {
    borderColor: '#0393d5',
    backgroundColor: '#F0F8FF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0393d5',
    marginTop: 8,
  },
  planPeriod: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  planProviders: {
    fontSize: 15,
    color: '#333',
    marginTop: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  guaranteeText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    backgroundColor: '#0393d5',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#CCC',
  },
  continueButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#666',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0393d5',
  },
  paymentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  payButton: {
    backgroundColor: '#34C759',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: '#CCC',
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ResubscribeScreen;
