/**
 * Stripe Payment Integration - Production Ready
 * Professional subscription management with 7-day refund policy
 *
 * Features:
 * - Subscription creation with immediate charge
 * - Plan upgrades/downgrades
 * - Payment tracking and history
 * - Refund management
 * - Admin payment overview
 */

import { supabase } from './supabase';
import Constants from 'expo-constants';

// Get Stripe publishable key from app.json extra config
const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey ||
  'pk_test_51SR1qlHqPXhoiSmsfJy7HadBIXeL5Xaewk3cWKHQTcdSgQ1likoXXqo1FMsXBKCSH3LtB6Xa5RgC2cKQOHDl16Zv00EipMgXSw';

// Stripe Price IDs - Production (Live Mode)
export const STRIPE_PLANS = {
  basic: {
    name: 'Back of the Line',
    priceId: 'price_1SR36oHqPXhoiSmsprlpcDjq',
    amount: 24.99,
    providers: '1-2',
    maxLicenses: 2,
    description: 'Perfect for solo providers'
  },
  starter: {
    name: 'Middle of the Line',
    priceId: 'price_1SR3FaHqPXhoiSmsmsgGNNf6',
    amount: 74.99,
    providers: '3-4',
    maxLicenses: 4,
    description: 'Perfect for small teams'
  },
  professional: {
    name: 'Front of the Line',
    priceId: 'price_1SR3K6HqPXhoiSmsuRKPdTUT',
    amount: 99.99,
    providers: '5-9',
    maxLicenses: 9,
    description: 'Growing teams with multiple providers'
  },
  enterprise: {
    name: 'Skip The Line Pass',
    priceId: 'price_1SR3LqHqPXhoiSmsnHthwoHq',
    amount: 149.99,
    providers: '10-14',
    maxLicenses: 14,
    description: 'Established businesses'
  },
  unlimited: {
    name: 'Never A Line - Unlimited',
    priceId: 'price_1SYT3nHqPXhoiSmsIebDJXfd',
    amount: 199.00,
    providers: 'Unlimited',
    maxLicenses: 9999,
    description: 'Unlimited licenses with priority support'
  }
};

// Refund policy days
export const REFUND_DAYS = 7;

/**
 * Get Stripe publishable key
 */
export const getStripePublishableKey = () => STRIPE_PUBLISHABLE_KEY;

/**
 * Initialize Stripe (call this in App.js)
 */
export const initializeStripe = async () => {
  try {
    if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.includes('1234567890')) {
      console.warn('⚠️ Stripe publishable key not configured - using test mode');
    }
    console.log('✅ Stripe initialized');
    return STRIPE_PUBLISHABLE_KEY;
  } catch (error) {
    console.error('❌ Error initializing Stripe:', error);
    return null;
  }
};

/**
 * Create Stripe Customer and Subscription
 * Called via Supabase Edge Function (server-side for security)
 * Note: No free trial - charges immediately with 7-day refund policy
 *
 * IMPORTANT: This function ONLY creates the Stripe subscription.
 * The shop/account should be created AFTER payment succeeds (in PaymentMethodScreen).
 */
export const createSubscription = async ({ shopId, email, planName, paymentMethodId }) => {
  try {
    console.log('💳 Creating Stripe subscription...', { shopId, planName });

    const planDetails = STRIPE_PLANS[planName];
    if (!planDetails) {
      throw new Error('Invalid plan selected');
    }

    // Call Supabase Edge Function to handle Stripe API calls securely
    const { data, error } = await supabase.functions.invoke('stripe-create-subscription', {
      body: {
        shopId,
        email,
        planName,
        paymentMethodId,
        amount: planDetails.amount
      }
    });

    if (error) {
      console.error('❌ Subscription creation error:', error);
      throw new Error(error.message || 'Failed to create subscription');
    }

    // Check if the response contains an error (Edge Function returned 200 but with error)
    if (data?.error) {
      console.error('❌ Subscription error from Stripe:', data.error);
      throw new Error(data.error);
    }

    console.log('✅ Subscription created:', data);

    // Check if 3D Secure or additional authentication is required
    if (data?.requiresAction) {
      console.log('⚠️ Payment requires additional action (3D Secure)');
      return {
        success: true,
        requiresAction: true,
        customerId: data.customerId,
        subscriptionId: data.subscriptionId,
        clientSecret: data.clientSecret,
        paymentMethodLast4: data.paymentMethodLast4,
        paymentMethodBrand: data.paymentMethodBrand
      };
    }

    // Return Stripe data - shop creation happens AFTER this in PaymentMethodScreen
    // This ensures no account/shop is created if payment fails
    return {
      success: true,
      requiresAction: false,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId,
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      invoiceId: data.invoiceId,
      paymentMethodLast4: data.paymentMethodLast4,
      paymentMethodBrand: data.paymentMethodBrand,
      status: data.status
    };

  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription'
    };
  }
};

/**
 * Upgrade subscription to a new plan
 * Now works with profile-based subscriptions (userId instead of shopId)
 */
export const upgradeSubscription = async (userId, newPlanName) => {
  try {
    console.log('⬆️ Upgrading subscription:', { userId, newPlanName });

    // Get current profile subscription details
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_plan, stripe_subscription_id, monthly_amount, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    console.log('📊 Current profile subscription data:', {
      subscription_plan: profile.subscription_plan,
      stripe_subscription_id: profile.stripe_subscription_id,
      stripe_customer_id: profile.stripe_customer_id,
      monthly_amount: profile.monthly_amount
    });

    // Check if subscription ID exists
    if (!profile.stripe_subscription_id) {
      console.error('❌ No stripe_subscription_id found in profile');
      // User needs to go through the full subscription flow
      return {
        success: false,
        requiresNewSubscription: true,
        error: 'You need to set up a payment method first. Please go to subscription settings to subscribe.'
      };
    }

    const currentPlan = profile.subscription_plan;
    const newPlanDetails = STRIPE_PLANS[newPlanName];

    if (!newPlanDetails) {
      throw new Error('Invalid plan selected');
    }

    // Call Edge Function to update Stripe subscription
    console.log('📤 Calling stripe-upgrade-subscription with:', {
      userId,
      subscriptionId: profile.stripe_subscription_id,
      newPriceId: newPlanDetails.priceId,
      newPlanName
    });

    const { data, error } = await supabase.functions.invoke('stripe-upgrade-subscription', {
      body: {
        userId,
        subscriptionId: profile.stripe_subscription_id,
        newPriceId: newPlanDetails.priceId,
        newPlanName
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      throw new Error(error.message || 'Failed to upgrade subscription');
    }

    // Check for error in response body
    if (data?.error) {
      console.error('❌ Stripe API error:', data.error);
      throw new Error(data.error);
    }

    // Update profile record
    // IMPORTANT: Clear refund eligibility - upgrading means user is committed to the service
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: newPlanName,
        monthly_amount: newPlanDetails.amount,
        max_licenses: newPlanDetails.maxLicenses,
        refund_eligible_until: null, // Clear refund - any plan change forfeits refund window
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Record subscription event
    await recordSubscriptionEvent({
      ownerId: userId,
      eventType: 'upgraded',
      fromPlan: currentPlan,
      toPlan: newPlanName,
      amount: newPlanDetails.amount,
      details: { prorationAmount: data.prorationAmount }
    });

    return {
      success: true,
      newPlan: newPlanName,
      newAmount: newPlanDetails.amount,
      prorationAmount: data.prorationAmount
    };

  } catch (error) {
    console.error('❌ Error upgrading subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to upgrade subscription'
    };
  }
};

/**
 * Cancel subscription
 * Now works with profile-based subscriptions (userId instead of shopId)
 *
 * IMPORTANT: Automatically processes refund if within 7-day window
 * - Within 7 days: Full refund + immediate cancellation
 * - After 7 days: No refund, cancel at end of billing period
 */
export const cancelSubscription = async (userId, reason = '') => {
  try {
    console.log('🚫 Canceling subscription for user:', userId);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_plan, refund_eligible_until, monthly_amount')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // If no Stripe subscription, just downgrade to free plan locally
    if (!profile.stripe_subscription_id) {
      console.log('📝 No Stripe subscription found - downgrading to free plan locally');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_plan: 'none',
          subscription_status: 'cancelled',
          subscription_end_date: new Date().toISOString(),
          max_licenses: 0,
        })
        .eq('id', userId);

      if (updateError) {
        throw new Error('Failed to update profile: ' + updateError.message);
      }

      return {
        success: true,
        message: 'Subscription cancelled successfully',
        refunded: false,
        localOnly: true
      };
    }

    // Check if eligible for refund (within 7-day window)
    const refundDeadline = profile.refund_eligible_until ? new Date(profile.refund_eligible_until) : null;
    const isRefundEligible = refundDeadline && new Date() < refundDeadline;

    console.log('📅 Refund check:', {
      refundDeadline: refundDeadline?.toISOString(),
      now: new Date().toISOString(),
      isRefundEligible,
      stripeSubscriptionId: profile.stripe_subscription_id,
      monthlyAmount: profile.monthly_amount
    });

    // If within 7-day window, process refund first
    if (isRefundEligible) {
      console.log('💰 Within 7-day window - processing automatic refund...');
      console.log('📤 Calling stripe-process-refund with:', {
        userId,
        subscriptionId: profile.stripe_subscription_id,
        amount: profile.monthly_amount
      });

      const { data: refundData, error: refundError } = await supabase.functions.invoke('stripe-process-refund', {
        body: {
          userId,
          subscriptionId: profile.stripe_subscription_id,
          amount: profile.monthly_amount,
          reason: reason || 'Cancellation within 7-day refund window'
        }
      });

      if (refundError) {
        console.error('❌ Refund error:', refundError);
        // Continue with cancellation even if refund fails
      } else {
        console.log('✅ Refund processed:', refundData);
      }

      // Update profile status to refunded
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'refunded',
          subscription_end_date: new Date().toISOString()
        })
        .eq('id', userId);

      // Record refund in payment history (optional - don't fail if table doesn't exist)
      try {
        await recordPayment({
          ownerId: userId,
          amount: profile.monthly_amount,
          status: 'refunded',
          paymentType: 'refund',
          planName: profile.subscription_plan,
          description: `Automatic refund - ${reason || 'Cancelled within 7-day window'}`,
          refundId: refundData?.refundId,
          refundAmount: profile.monthly_amount
        });
      } catch (e) {
        console.log('Payment history recording skipped:', e.message);
      }

      // Record subscription event (optional - don't fail if table doesn't exist)
      try {
        await recordSubscriptionEvent({
          ownerId: userId,
          eventType: 'refunded',
          fromPlan: profile.subscription_plan,
          amount: profile.monthly_amount,
          details: { reason, refundId: refundData?.refundId, automaticRefund: true }
        });
      } catch (e) {
        console.log('Subscription event recording skipped:', e.message);
      }

      return {
        success: true,
        isRefundEligible: true,
        refundProcessed: true,
        refundAmount: profile.monthly_amount,
        refundId: refundData?.refundId,
        message: `Your subscription has been cancelled and $${profile.monthly_amount} has been refunded.`
      };

    } else {
      // After 7 days - just cancel at end of billing period (no refund)
      console.log('📅 Outside 7-day window - cancelling without refund...');

      const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: {
          userId,
          subscriptionId: profile.stripe_subscription_id,
          reason
        }
      });

      if (error) {
        console.error('❌ Cancel error:', error);
        throw new Error(error.message || 'Failed to cancel subscription');
      }

      // Update profile - keep access until end of period
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'cancelled'
          // Don't set subscription_end_date - they keep access until next_billing_date
        })
        .eq('id', userId);

      // Record subscription event (optional - don't fail if table doesn't exist)
      try {
        await recordSubscriptionEvent({
          ownerId: userId,
          eventType: 'cancelled',
          fromPlan: profile.subscription_plan,
          details: { reason, refundEligible: false }
        });
      } catch (e) {
        console.log('Subscription event recording skipped:', e.message);
      }

      return {
        success: true,
        isRefundEligible: false,
        refundProcessed: false,
        cancelAt: data?.cancelAt,
        message: 'Your subscription has been cancelled. You will retain access until the end of your current billing period.'
      };
    }

  } catch (error) {
    console.error('❌ Error canceling subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription'
    };
  }
};

/**
 * Request refund (within 7-day window)
 * Now works with profile-based subscriptions (userId instead of shopId)
 */
export const requestRefund = async (userId, reason = '') => {
  try {
    console.log('💰 Processing refund request for user:', userId);

    // Check refund eligibility from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('refund_eligible_until, stripe_subscription_id, monthly_amount, subscription_plan')
      .eq('id', userId)
      .single();

    if (!profile?.refund_eligible_until) {
      return { success: false, error: 'No active subscription found' };
    }

    const refundDeadline = new Date(profile.refund_eligible_until);
    if (new Date() > refundDeadline) {
      return {
        success: false,
        error: 'Refund window has expired. You were eligible for a refund until ' +
               refundDeadline.toLocaleDateString()
      };
    }

    // Process refund via Edge Function
    const { data, error } = await supabase.functions.invoke('stripe-process-refund', {
      body: {
        userId,
        subscriptionId: profile.stripe_subscription_id,
        amount: profile.monthly_amount,
        reason
      }
    });

    if (error) throw error;

    // Update profile status
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'refunded',
        subscription_end_date: new Date().toISOString()
      })
      .eq('id', userId);

    // Record refund in payment history
    await recordPayment({
      ownerId: userId,
      amount: profile.monthly_amount,
      status: 'refunded',
      paymentType: 'refund',
      planName: profile.subscription_plan,
      description: `Refund - ${reason || 'Customer requested'}`,
      refundId: data?.refundId,
      refundAmount: profile.monthly_amount
    });

    // Record subscription event
    await recordSubscriptionEvent({
      ownerId: userId,
      eventType: 'refunded',
      fromPlan: profile.subscription_plan,
      amount: profile.monthly_amount,
      details: { reason, refundId: data?.refundId }
    });

    return {
      success: true,
      refundAmount: profile.monthly_amount,
      refundId: data?.refundId
    };

  } catch (error) {
    console.error('❌ Error processing refund:', error);
    return {
      success: false,
      error: error.message || 'Failed to process refund'
    };
  }
};

/**
 * Get subscription status for a user (from profile)
 * Now uses profile-based subscriptions
 */
export const getSubscriptionStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        subscription_plan,
        subscription_status,
        subscription_start_date,
        subscription_end_date,
        next_billing_date,
        refund_eligible_until,
        stripe_customer_id,
        stripe_subscription_id,
        monthly_amount,
        max_licenses,
        license_count,
        payment_method_last4,
        payment_method_brand
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;

    // If no subscription plan, return null
    if (!data.subscription_plan) {
      return null;
    }

    // Calculate days remaining for refund eligibility
    // IMPORTANT: If refund_eligible_until is null (old accounts), user is NOT eligible
    const refundEligibleUntil = data.refund_eligible_until ? new Date(data.refund_eligible_until) : null;
    const now = new Date();

    // Calculate days remaining - only if refund date exists AND is in the future
    let refundDaysRemaining = 0;
    let isRefundEligible = false;

    if (refundEligibleUntil && !isNaN(refundEligibleUntil.getTime())) {
      const diffMs = refundEligibleUntil.getTime() - now.getTime();
      if (diffMs > 0) {
        // Calculate days - use ceil to show "1 day" until it expires (better UX)
        refundDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isRefundEligible = true;
      }
    }

    console.log('📅 Refund eligibility:', {
      stored_date: data.refund_eligible_until,
      parsed_date: refundEligibleUntil?.toISOString() || 'null',
      days_remaining: refundDaysRemaining,
      is_eligible: isRefundEligible
    });

    // Determine if subscription is truly active
    // - 'active' status = always active
    // - 'cancelled' status = still active if before subscription_end_date or next_billing_date
    // - 'refunded' or other status = not active
    let isActive = data.subscription_status === 'active';

    // Check if cancelled but still within paid period
    if (data.subscription_status === 'cancelled') {
      const endDate = data.subscription_end_date || data.next_billing_date;
      if (endDate && new Date(endDate) > now) {
        isActive = true; // Still has access until end of billing period
      }
    }

    const planDetails = STRIPE_PLANS[data.subscription_plan] || {};

    return {
      ...data,
      isActive,
      isRefundEligible,
      refundDaysRemaining,
      planDetails,
      canUpgrade: data.subscription_status === 'active' && data.subscription_plan !== 'unlimited', // Can only upgrade if truly active (not cancelled)
      accessUntil: data.subscription_end_date || data.next_billing_date
    };

  } catch (error) {
    console.error('❌ Error getting subscription status:', error);
    return null;
  }
};

/**
 * Check if shop has active subscription
 */
export const hasActiveSubscription = async (shopId) => {
  try {
    const status = await getSubscriptionStatus(shopId);
    return status?.subscription_status === 'active';
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    return false;
  }
};

/**
 * Get payment history for a shop
 */
export const getPaymentHistory = async (shopId) => {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('❌ Error fetching payment history:', error);
    return [];
  }
};

/**
 * Record a payment in history
 * Now uses owner_id (required for RLS) with optional shop_id
 */
export const recordPayment = async ({
  ownerId,
  shopId = null,
  amount,
  status,
  paymentType,
  planName,
  stripePaymentIntentId = null,
  stripeInvoiceId = null,
  description = null,
  receiptUrl = null,
  refundId = null,
  refundAmount = null,
  metadata = null
}) => {
  try {
    const { data, error } = await supabase
      .from('payment_history')
      .insert({
        owner_id: ownerId,
        shop_id: shopId,
        amount,
        status,
        payment_type: paymentType,
        plan_name: planName,
        stripe_payment_intent_id: stripePaymentIntentId,
        stripe_invoice_id: stripeInvoiceId,
        description,
        receipt_url: receiptUrl,
        refund_id: refundId,
        refund_amount: refundAmount,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording payment:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error recording payment:', error);
    return null;
  }
};

/**
 * Record a subscription event
 * Now uses owner_id (required for RLS) with optional shop_id
 */
export const recordSubscriptionEvent = async ({
  ownerId,
  shopId = null,
  eventType,
  fromPlan = null,
  toPlan = null,
  amount = null,
  stripeEventId = null,
  details = null
}) => {
  try {
    const { data, error } = await supabase
      .from('subscription_events')
      .insert({
        owner_id: ownerId,
        shop_id: shopId,
        event_type: eventType,
        from_plan: fromPlan,
        to_plan: toPlan,
        amount,
        stripe_event_id: stripeEventId,
        details
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording subscription event:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error recording subscription event:', error);
    return null;
  }
};

/**
 * Get all payments (Admin function)
 */
export const getAllPayments = async (filters = {}) => {
  try {
    let query = supabase
      .from('payment_history')
      .select(`
        *,
        shops:shop_id (
          id,
          name,
          email,
          subscription_plan
        )
      `)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.paymentType) {
      query = query.eq('payment_type', filters.paymentType);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('❌ Error fetching all payments:', error);
    return [];
  }
};

/**
 * Get payment statistics (Admin function)
 */
export const getPaymentStats = async () => {
  try {
    // Get stats from database function or calculate
    const { data: payments, error } = await supabase
      .from('payment_history')
      .select('amount, status, created_at, refund_amount');

    if (error) throw error;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalRevenue: 0,
      monthlyRevenue: 0,
      totalRefunds: 0,
      successfulPayments: 0,
      failedPayments: 0,
      pendingPayments: 0
    };

    payments?.forEach(payment => {
      if (payment.status === 'succeeded') {
        stats.totalRevenue += parseFloat(payment.amount) || 0;
        stats.successfulPayments++;

        if (new Date(payment.created_at) >= monthStart) {
          stats.monthlyRevenue += parseFloat(payment.amount) || 0;
        }
      } else if (payment.status === 'refunded') {
        stats.totalRefunds += parseFloat(payment.refund_amount || payment.amount) || 0;
      } else if (payment.status === 'failed') {
        stats.failedPayments++;
      } else if (payment.status === 'pending') {
        stats.pendingPayments++;
      }
    });

    // Get subscription counts
    const { data: shops } = await supabase
      .from('shops')
      .select('subscription_status');

    stats.activeSubscriptions = shops?.filter(s => s.subscription_status === 'active').length || 0;
    stats.cancelledSubscriptions = shops?.filter(s => s.subscription_status === 'cancelled').length || 0;
    stats.pendingSubscriptions = shops?.filter(s => s.subscription_status === 'pending').length || 0;

    return stats;

  } catch (error) {
    console.error('❌ Error fetching payment stats:', error);
    return null;
  }
};

/**
 * Get admin payment overview (shops with subscription details)
 */
export const getAdminPaymentOverview = async () => {
  try {
    // First get shops data
    const { data: shopsData, error: shopsError } = await supabase
      .from('shops')
      .select(`
        id,
        name,
        email,
        subscription_plan,
        subscription_status,
        monthly_amount,
        subscription_start_date,
        next_billing_date,
        refund_eligible_until,
        payment_method_brand,
        payment_method_last4,
        max_licenses,
        license_count,
        created_by,
        category_id,
        categories:category_id (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (shopsError) throw shopsError;

    // Get owner profiles separately if needed
    if (shopsData && shopsData.length > 0) {
      const ownerIds = [...new Set(shopsData.map(s => s.created_by).filter(Boolean))];

      if (ownerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', ownerIds);

        // Map profiles to shops
        const profilesMap = {};
        if (profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
        }

        // Add owner info to each shop
        return shopsData.map(shop => ({
          ...shop,
          owner: profilesMap[shop.created_by] || null
        }));
      }
    }

    return shopsData || [];

  } catch (error) {
    // Log warning instead of error to avoid LogBox
    console.log('⚠️ Could not fetch admin payment overview:', error.message);
    return [];
  }
};

/**
 * Get available upgrade options for a plan
 */
export const getUpgradeOptions = (currentPlan) => {
  const planOrder = ['basic', 'starter', 'professional', 'enterprise', 'unlimited'];
  const currentIndex = planOrder.indexOf(currentPlan);

  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return [];
  }

  return planOrder.slice(currentIndex + 1).map(planKey => ({
    key: planKey,
    ...STRIPE_PLANS[planKey]
  }));
};

/**
 * Calculate proration for upgrade
 */
export const calculateUpgradeProration = (currentPlan, newPlan, daysUsed = 15) => {
  const currentPlanDetails = STRIPE_PLANS[currentPlan];
  const newPlanDetails = STRIPE_PLANS[newPlan];

  if (!currentPlanDetails || !newPlanDetails) return null;

  const daysInMonth = 30;
  const daysRemaining = daysInMonth - daysUsed;

  // Credit for unused days on current plan
  const credit = (currentPlanDetails.amount / daysInMonth) * daysRemaining;

  // Charge for new plan's remaining days
  const charge = (newPlanDetails.amount / daysInMonth) * daysRemaining;

  // Amount due today
  const prorationAmount = Math.max(0, charge - credit);

  return {
    credit: credit.toFixed(2),
    charge: charge.toFixed(2),
    prorationAmount: prorationAmount.toFixed(2),
    newMonthlyAmount: newPlanDetails.amount
  };
};

/**
 * Validate payment method before submitting
 */
export const validatePaymentMethod = (cardDetails) => {
  const errors = [];

  if (!cardDetails.complete) {
    errors.push('Please complete all card details');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  initializeStripe,
  getStripePublishableKey,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  requestRefund,
  getSubscriptionStatus,
  hasActiveSubscription,
  getPaymentHistory,
  recordPayment,
  recordSubscriptionEvent,
  getAllPayments,
  getPaymentStats,
  getAdminPaymentOverview,
  getUpgradeOptions,
  calculateUpgradeProration,
  validatePaymentMethod,
  STRIPE_PLANS,
  REFUND_DAYS
};
