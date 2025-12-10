/**
 * Stripe Configuration - Shared with Mobile App
 * Same plans, same price IDs, same database
 */

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
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

// Refund policy days
export const REFUND_DAYS = 7;

/**
 * Get available upgrade options for a plan
 */
export const getUpgradeOptions = (currentPlan: string | null) => {
  const planOrder: PlanKey[] = ['basic', 'starter', 'professional', 'enterprise', 'unlimited'];
  const currentIndex = currentPlan ? planOrder.indexOf(currentPlan as PlanKey) : -1;

  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return planOrder.map(planKey => ({
      key: planKey,
      ...STRIPE_PLANS[planKey]
    }));
  }

  return planOrder.slice(currentIndex + 1).map(planKey => ({
    key: planKey,
    ...STRIPE_PLANS[planKey]
  }));
};

/**
 * Get plan color based on plan key
 */
export const getPlanColor = (planKey: string | null): string => {
  switch (planKey) {
    case 'basic': return '#8E8E93';
    case 'starter': return '#007AFF';
    case 'professional': return '#34C759';
    case 'enterprise': return '#FF9500';
    case 'unlimited': return '#AF52DE';
    default: return '#4A90E2';
  }
};
