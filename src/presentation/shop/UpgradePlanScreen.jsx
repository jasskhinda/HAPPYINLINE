import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  STRIPE_PLANS,
  getSubscriptionStatus,
  getUpgradeOptions,
  calculateUpgradeProration,
  upgradeSubscription,
  REFUND_DAYS
} from '../../lib/stripe';
import { checkLicenseAvailability } from '../../lib/auth';

const UpgradePlanScreen = ({ navigation, route }) => {
  // Now uses userId instead of shopId - subscription belongs to owner profile
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [upgradeOptions, setUpgradeOptions] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [proration, setProration] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState({ currentCount: 0, maxLicenses: 0 });

  useEffect(() => {
    loadSubscriptionData();
  }, [userId]);

  useEffect(() => {
    if (selectedPlan && currentSubscription?.subscription_plan) {
      const pror = calculateUpgradeProration(
        currentSubscription.subscription_plan,
        selectedPlan
      );
      setProration(pror);
    }
  }, [selectedPlan, currentSubscription]);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const [subscription, licenseData] = await Promise.all([
        getSubscriptionStatus(userId),
        checkLicenseAvailability()
      ]);

      if (subscription) {
        setCurrentSubscription(subscription);
        const options = getUpgradeOptions(subscription.subscription_plan);
        setUpgradeOptions(options);
      }

      setLicenseInfo({
        currentCount: licenseData.currentCount || 0,
        maxLicenses: licenseData.maxLicenses || 0
      });
    } catch (error) {
      console.error('Error loading subscription:', error);
      Alert.alert('Error', 'Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) {
      Alert.alert('Select Plan', 'Please select a plan to upgrade to');
      return;
    }

    const planDetails = STRIPE_PLANS[selectedPlan];
    const isRefundEligible = currentSubscription?.isRefundEligible;

    // Build confirmation message - warn about losing refund if still eligible
    let confirmMessage = `Upgrade to ${planDetails.name} plan?\n\n` +
      `New monthly rate: $${planDetails.amount}/month\n` +
      `Due today: $${proration?.prorationAmount || '0.00'}\n\n` +
      `Your new plan will include up to ${planDetails.providers} service providers.`;

    if (isRefundEligible) {
      confirmMessage += `\n\n⚠️ Note: Upgrading will forfeit your ${REFUND_DAYS}-day refund eligibility.`;
    }

    Alert.alert(
      'Confirm Upgrade',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            try {
              setUpgrading(true);

              const result = await upgradeSubscription(userId, selectedPlan);

              if (result.success) {
                Alert.alert(
                  'Upgrade Successful!',
                  `Your plan has been upgraded to ${planDetails.name}.\n\n` +
                  `You now have access to ${planDetails.providers} service provider licenses.`,
                  [
                    {
                      text: 'Great!',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                Alert.alert('Upgrade Failed', result.error || 'Unable to upgrade plan. Please try again.');
              }
            } catch (error) {
              console.error('Upgrade error:', error);
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setUpgrading(false);
            }
          }
        }
      ]
    );
  };

  const getPlanIcon = (planKey) => {
    switch (planKey) {
      case 'basic': return 'person';
      case 'starter': return 'people';
      case 'professional': return 'briefcase';
      case 'enterprise': return 'business';
      case 'unlimited': return 'infinite';
      default: return 'card';
    }
  };

  const getPlanColor = (planKey) => {
    switch (planKey) {
      case 'basic': return '#8E8E93';
      case 'starter': return '#007AFF';
      case 'professional': return '#34C759';
      case 'enterprise': return '#FF9500';
      case 'unlimited': return '#AF52DE';
      default: return '#0393d5';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0393d5" />
          <Text style={styles.loadingText}>Loading plan details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>No active subscription found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentPlanDetails = STRIPE_PLANS[currentSubscription.subscription_plan];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade Plan</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <Text style={styles.currentPlanLabel}>Current Plan</Text>
          <View style={styles.currentPlanContent}>
            <View style={[styles.planIconCircle, { backgroundColor: getPlanColor(currentSubscription.subscription_plan) + '20' }]}>
              <Ionicons
                name={getPlanIcon(currentSubscription.subscription_plan)}
                size={28}
                color={getPlanColor(currentSubscription.subscription_plan)}
              />
            </View>
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanName}>{currentPlanDetails?.name}</Text>
              <Text style={styles.currentPlanPrice}>${currentPlanDetails?.amount}/month</Text>
            </View>
          </View>
          <View style={styles.currentPlanStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{licenseInfo.currentCount}</Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{licenseInfo.maxLicenses}</Text>
              <Text style={styles.statLabel}>Max Licenses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentSubscription.refundDaysRemaining || 0}</Text>
              <Text style={styles.statLabel}>Refund Days</Text>
            </View>
          </View>
        </View>

        {/* Upgrade Options */}
        {upgradeOptions.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Upgrade Options</Text>
            <Text style={styles.sectionSubtitle}>
              Choose a plan with more licenses for your growing team
            </Text>

            {upgradeOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.upgradeCard,
                  selectedPlan === option.key && styles.upgradeCardSelected
                ]}
                onPress={() => setSelectedPlan(option.key)}
              >
                <View style={styles.upgradeCardHeader}>
                  <View style={[styles.planIconCircle, { backgroundColor: getPlanColor(option.key) + '20' }]}>
                    <Ionicons
                      name={getPlanIcon(option.key)}
                      size={24}
                      color={getPlanColor(option.key)}
                    />
                  </View>
                  <View style={styles.upgradeCardInfo}>
                    <Text style={styles.upgradePlanName}>{option.name}</Text>
                    <Text style={styles.upgradePlanLicenses}>{option.providers} licenses</Text>
                  </View>
                  <View style={styles.upgradePriceContainer}>
                    <Text style={styles.upgradePrice}>${option.amount}</Text>
                    <Text style={styles.upgradePricePeriod}>/month</Text>
                  </View>
                </View>

                {selectedPlan === option.key && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={24} color="#0393d5" />
                  </View>
                )}

                <Text style={styles.upgradeDescription}>{option.description}</Text>

                {option.key === 'unlimited' && (
                  <View style={styles.priorityBadge}>
                    <Ionicons name="star" size={14} color="#AF52DE" />
                    <Text style={styles.priorityBadgeText}>Priority Support</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Proration Summary */}
            {selectedPlan && proration && (
              <View style={styles.prorationCard}>
                <Text style={styles.prorationTitle}>Payment Summary</Text>
                <View style={styles.prorationRow}>
                  <Text style={styles.prorationLabel}>Credit from current plan</Text>
                  <Text style={styles.prorationValue}>-${proration.credit}</Text>
                </View>
                <View style={styles.prorationRow}>
                  <Text style={styles.prorationLabel}>New plan (prorated)</Text>
                  <Text style={styles.prorationValue}>${proration.charge}</Text>
                </View>
                <View style={[styles.prorationRow, styles.prorationTotal]}>
                  <Text style={styles.prorationTotalLabel}>Due Today</Text>
                  <Text style={styles.prorationTotalValue}>${proration.prorationAmount}</Text>
                </View>
                <Text style={styles.prorationNote}>
                  Your next billing will be ${proration.newMonthlyAmount}/month
                </Text>
              </View>
            )}

            {/* Upgrade Button */}
            <TouchableOpacity
              style={[
                styles.upgradeButton,
                (!selectedPlan || upgrading) && styles.upgradeButtonDisabled
              ]}
              onPress={handleUpgrade}
              disabled={!selectedPlan || upgrading}
            >
              {upgrading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="arrow-up-circle" size={24} color="#FFF" />
                  <Text style={styles.upgradeButtonText}>
                    {selectedPlan ? `Upgrade to ${STRIPE_PLANS[selectedPlan]?.name}` : 'Select a Plan'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.maxPlanCard}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
            <Text style={styles.maxPlanTitle}>You're on the Best Plan!</Text>
            <Text style={styles.maxPlanText}>
              You already have the Unlimited plan with unlimited licenses and priority support.
            </Text>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Ionicons name="help-circle" size={24} color="#0393d5" />
          <Text style={styles.helpText}>
            Need help choosing? Contact our support team for personalized recommendations.
          </Text>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerBackButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  currentPlanCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  currentPlanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  currentPlanInfo: {
    flex: 1,
  },
  currentPlanName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  currentPlanPrice: {
    fontSize: 16,
    color: '#0393d5',
    fontWeight: '600',
    marginTop: 2,
  },
  currentPlanStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  upgradeCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  upgradeCardSelected: {
    borderColor: '#0393d5',
    backgroundColor: '#F8FCFF',
  },
  upgradeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  upgradePlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  upgradePlanLicenses: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  upgradePriceContainer: {
    alignItems: 'flex-end',
  },
  upgradePrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0393d5',
  },
  upgradePricePeriod: {
    fontSize: 12,
    color: '#999',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  upgradeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 6,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AF52DE',
  },
  prorationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  prorationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  prorationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prorationLabel: {
    fontSize: 14,
    color: '#666',
  },
  prorationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  prorationTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
    paddingTop: 16,
  },
  prorationTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  prorationTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0393d5',
  },
  prorationNote: {
    fontSize: 13,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
  },
  upgradeButton: {
    backgroundColor: '#0393d5',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  upgradeButtonDisabled: {
    backgroundColor: '#CCC',
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  maxPlanCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginVertical: 24,
  },
  maxPlanTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  maxPlanText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#0393d5',
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: '#0393d5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UpgradePlanScreen;
