import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

// Subscription plans - matching the mobile app
export const PLANS = {
  basic: {
    id: 'basic',
    name: 'Back of the Line',
    price: 24.99,
    maxLicenses: 2,
    description: '1-2 service providers',
    features: [
      'Up to 2 service providers',
      'Unlimited bookings',
      'Customer messaging',
      'Appointment reminders',
      'Basic analytics',
    ],
    color: '#4A90E2',
    icon: 'person',
  },
  starter: {
    id: 'starter',
    name: 'Middle of the Line',
    price: 74.99,
    maxLicenses: 4,
    description: '3-4 service providers',
    features: [
      'Up to 4 service providers',
      'Everything in Basic',
      'Priority support',
      'Team scheduling',
      'Advanced analytics',
    ],
    color: '#34C759',
    icon: 'people',
  },
  professional: {
    id: 'professional',
    name: 'Front of the Line',
    price: 99.99,
    maxLicenses: 9,
    description: '5-9 service providers',
    features: [
      'Up to 9 service providers',
      'Everything in Starter',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
    color: '#FF9500',
    icon: 'star',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Skip The Line Pass',
    price: 149.99,
    maxLicenses: 14,
    description: '10-14 service providers',
    features: [
      'Up to 14 service providers',
      'Everything in Professional',
      'Multi-location support',
      'White-label options',
      'Account manager',
    ],
    color: '#AF52DE',
    icon: 'rocket',
  },
  unlimited: {
    id: 'unlimited',
    name: 'Never A Line - Unlimited',
    price: 199.00,
    maxLicenses: -1,
    description: 'Unlimited service providers',
    features: [
      'Unlimited service providers',
      'Everything in Enterprise',
      'Custom integrations',
      'SLA guarantee',
      '24/7 priority support',
    ],
    color: '#FF2D55',
    icon: 'infinite',
  },
} as const

export type PlanId = keyof typeof PLANS

export function getPlanById(planId: string) {
  return PLANS[planId as PlanId] || null
}

export function getUpgradePlans(currentPlan: string) {
  const planOrder = ['basic', 'starter', 'professional', 'enterprise', 'unlimited']
  const currentIndex = planOrder.indexOf(currentPlan)

  if (currentIndex === -1 || currentIndex === planOrder.length - 1) {
    return []
  }

  return planOrder.slice(currentIndex + 1).map(id => PLANS[id as PlanId])
}
