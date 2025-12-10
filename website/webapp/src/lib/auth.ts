import { getSupabaseClient } from './supabase';
import { STRIPE_PLANS, REFUND_DAYS } from './stripe';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  next_billing_date: string | null;
  refund_eligible_until: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_amount: number | null;
  max_licenses: number | null;
  license_count: number | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  business_name: string | null;
}

export interface SubscriptionStatus extends Profile {
  isActive: boolean;
  isRefundEligible: boolean;
  refundDaysRemaining: number;
  planDetails: typeof STRIPE_PLANS[keyof typeof STRIPE_PLANS] | Record<string, never>;
  canUpgrade: boolean;
  accessUntil: string | null;
}

/**
 * Sign in with email and password
 */
export const signInWithPassword = async (email: string, password: string) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    console.error('Login error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user, session: data.session };
};

/**
 * Sign out
 */
export const signOut = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const supabase = getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Get user profile
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
};

/**
 * Get subscription status for a user (from profile)
 */
export const getSubscriptionStatus = async (userId: string): Promise<SubscriptionStatus | null> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      name,
      role,
      business_name,
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

  if (error) {
    console.error('Error getting subscription status:', error);
    return null;
  }

  // If no subscription plan, return null
  if (!data.subscription_plan) {
    return {
      ...data,
      isActive: false,
      isRefundEligible: false,
      refundDaysRemaining: 0,
      planDetails: {},
      canUpgrade: true,
      accessUntil: null
    };
  }

  // Calculate refund eligibility
  const refundEligibleUntil = data.refund_eligible_until ? new Date(data.refund_eligible_until) : null;
  const now = new Date();

  let refundDaysRemaining = 0;
  let isRefundEligible = false;

  if (refundEligibleUntil && !isNaN(refundEligibleUntil.getTime())) {
    const diffMs = refundEligibleUntil.getTime() - now.getTime();
    if (diffMs > 0) {
      refundDaysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isRefundEligible = true;
    }
  }

  // Determine if subscription is truly active
  let isActive = data.subscription_status === 'active';

  // Check if cancelled but still within paid period
  if (data.subscription_status === 'cancelled') {
    const endDate = data.subscription_end_date || data.next_billing_date;
    if (endDate && new Date(endDate) > now) {
      isActive = true;
    }
  }

  const planDetails = STRIPE_PLANS[data.subscription_plan as keyof typeof STRIPE_PLANS] || {};

  return {
    ...data,
    isActive,
    isRefundEligible,
    refundDaysRemaining,
    planDetails,
    canUpgrade: data.subscription_status === 'active' && data.subscription_plan !== 'unlimited',
    accessUntil: data.subscription_end_date || data.next_billing_date
  };
};

/**
 * Create subscription via Edge Function
 */
export const createSubscription = async ({
  userId,
  email,
  planName,
  paymentMethodId
}: {
  userId: string;
  email: string;
  planName: string;
  paymentMethodId: string;
}) => {
  const supabase = getSupabaseClient();
  const planDetails = STRIPE_PLANS[planName as keyof typeof STRIPE_PLANS];

  if (!planDetails) {
    return { success: false, error: 'Invalid plan selected' };
  }

  const { data, error } = await supabase.functions.invoke('stripe-create-subscription', {
    body: {
      shopId: userId, // Using userId as the identifier
      email,
      planName,
      paymentMethodId,
      amount: planDetails.amount
    }
  });

  if (error) {
    console.error('Subscription creation error:', error);
    return { success: false, error: error.message || 'Failed to create subscription' };
  }

  if (data?.error) {
    return { success: false, error: data.error };
  }

  return { success: true, data };
};

/**
 * Upgrade subscription via Edge Function
 */
export const upgradeSubscription = async (userId: string, newPlanName: string) => {
  const supabase = getSupabaseClient();

  // Get current subscription details
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('subscription_plan, stripe_subscription_id, monthly_amount, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  if (!profile.stripe_subscription_id) {
    return {
      success: false,
      requiresNewSubscription: true,
      error: 'You need to set up a payment method first.'
    };
  }

  const newPlanDetails = STRIPE_PLANS[newPlanName as keyof typeof STRIPE_PLANS];
  if (!newPlanDetails) {
    return { success: false, error: 'Invalid plan selected' };
  }

  const { data, error } = await supabase.functions.invoke('stripe-upgrade-subscription', {
    body: {
      userId,
      subscriptionId: profile.stripe_subscription_id,
      newPriceId: newPlanDetails.priceId,
      newPlanName
    }
  });

  if (error) {
    return { success: false, error: error.message || 'Failed to upgrade subscription' };
  }

  if (data?.error) {
    return { success: false, error: data.error };
  }

  // Update profile record
  await supabase
    .from('profiles')
    .update({
      subscription_plan: newPlanName,
      monthly_amount: newPlanDetails.amount,
      max_licenses: newPlanDetails.maxLicenses,
      refund_eligible_until: null, // Clear refund - any plan change forfeits refund window
    })
    .eq('id', userId);

  return {
    success: true,
    newPlan: newPlanName,
    newAmount: newPlanDetails.amount,
    prorationAmount: data.prorationAmount
  };
};

/**
 * Cancel subscription via Edge Function
 */
export const cancelSubscription = async (userId: string, reason: string = '') => {
  const supabase = getSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, subscription_plan, refund_eligible_until, monthly_amount')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found' };
  }

  // If no Stripe subscription, just downgrade locally
  if (!profile.stripe_subscription_id) {
    await supabase
      .from('profiles')
      .update({
        subscription_plan: 'none',
        subscription_status: 'cancelled',
        subscription_end_date: new Date().toISOString(),
        max_licenses: 0,
      })
      .eq('id', userId);

    return {
      success: true,
      message: 'Subscription cancelled successfully',
      refunded: false
    };
  }

  // Check if eligible for refund
  const refundDeadline = profile.refund_eligible_until ? new Date(profile.refund_eligible_until) : null;
  const isRefundEligible = refundDeadline && new Date() < refundDeadline;

  if (isRefundEligible) {
    // Process refund
    const { data: refundData, error: refundError } = await supabase.functions.invoke('stripe-process-refund', {
      body: {
        userId,
        subscriptionId: profile.stripe_subscription_id,
        amount: profile.monthly_amount,
        reason: reason || 'Cancellation within 7-day refund window'
      }
    });

    // Update profile status
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'refunded',
        subscription_end_date: new Date().toISOString()
      })
      .eq('id', userId);

    return {
      success: true,
      isRefundEligible: true,
      refundProcessed: true,
      refundAmount: profile.monthly_amount,
      message: `Your subscription has been cancelled and $${profile.monthly_amount} has been refunded.`
    };
  } else {
    // Cancel at end of billing period
    const { data, error } = await supabase.functions.invoke('stripe-cancel-subscription', {
      body: {
        userId,
        subscriptionId: profile.stripe_subscription_id,
        reason
      }
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to cancel subscription' };
    }

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled'
      })
      .eq('id', userId);

    return {
      success: true,
      isRefundEligible: false,
      refundProcessed: false,
      cancelAt: data?.cancelAt,
      message: 'Your subscription has been cancelled. You will retain access until the end of your current billing period.'
    };
  }
};
