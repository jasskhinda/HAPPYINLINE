'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { getCurrentUser, getSubscriptionStatus, createSubscription, SubscriptionStatus } from '@/lib/auth';
import { STRIPE_PLANS, PlanKey, getPlanColor } from '@/lib/stripe';
import {
  Check,
  ArrowLeft,
  Loader2,
  CreditCard,
  Users,
  Shield,
  Star
} from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CheckoutForm({
  selectedPlan,
  userId,
  email,
  onSuccess,
  onCancel
}: {
  selectedPlan: PlanKey;
  userId: string;
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create payment method
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setLoading(false);
        return;
      }

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        elements,
      });

      if (pmError) {
        setError(pmError.message || 'Failed to process payment');
        setLoading(false);
        return;
      }

      // Create subscription via Supabase Edge Function
      const result = await createSubscription({
        userId,
        email,
        planName: selectedPlan,
        paymentMethodId: paymentMethod.id
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to create subscription');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const planDetails = STRIPE_PLANS[selectedPlan];

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to plans
        </button>
        <h2 className="text-2xl font-bold text-white">Complete Your Subscription</h2>
        <p className="text-purple-300 mt-1">
          You&apos;re subscribing to {planDetails.name} at ${planDetails.amount}/month
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 rounded-lg p-4">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-300 mb-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium">7-Day Money Back Guarantee</span>
          </div>
          <p className="text-purple-200 text-sm">
            Not satisfied? Get a full refund within 7 days of your subscription.
          </p>
        </div>

        <button
          type="submit"
          disabled={!stripe || loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Subscribe - ${planDetails.amount}/month
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email || '');

      const subStatus = await getSubscriptionStatus(user.id);
      setSubscription(subStatus);
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planKey: PlanKey) => {
    setSelectedPlan(planKey);
    setShowCheckout(true);
  };

  const handleSuccess = () => {
    router.push('/dashboard?subscribed=true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading...</p>
        </div>
      </div>
    );
  }

  const planEntries = Object.entries(STRIPE_PLANS) as [PlanKey, typeof STRIPE_PLANS[PlanKey]][];
  const currentPlanIndex = subscription?.subscription_plan
    ? planEntries.findIndex(([key]) => key === subscription.subscription_plan)
    : -1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Happy Inline</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {showCheckout && selectedPlan && userId ? (
          <div className="max-w-lg mx-auto">
            <Elements
              stripe={stripePromise}
              options={{
                mode: 'subscription',
                amount: Math.round(STRIPE_PLANS[selectedPlan].amount * 100),
                currency: 'usd',
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#a855f7',
                    colorBackground: '#1e1b4b',
                    colorText: '#e9d5ff',
                    colorDanger: '#ef4444',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <CheckoutForm
                selectedPlan={selectedPlan}
                userId={userId}
                email={email}
                onSuccess={handleSuccess}
                onCancel={() => setShowCheckout(false)}
              />
            </Elements>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-4">
                Choose Your Plan
              </h2>
              <p className="text-purple-300 text-lg max-w-2xl mx-auto">
                Select the perfect plan for your business. All plans include our full feature set.
              </p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planEntries.map(([planKey, plan], index) => {
                const isCurrentPlan = subscription?.subscription_plan === planKey;
                const isUpgrade = currentPlanIndex !== -1 && index > currentPlanIndex;
                const isDowngrade = currentPlanIndex !== -1 && index < currentPlanIndex;
                const planColor = getPlanColor(planKey);

                return (
                  <div
                    key={planKey}
                    className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-6 border transition-all ${
                      isCurrentPlan
                        ? 'border-green-500/50 ring-2 ring-green-500/30'
                        : 'border-white/20 hover:border-purple-500/50'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Current Plan
                      </div>
                    )}

                    {/* Popular Badge for Professional */}
                    {planKey === 'professional' && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Popular
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="mb-6">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${planColor}30` }}
                      >
                        <Users className="w-6 h-6" style={{ color: planColor }} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                      <p className="text-purple-300 text-sm">{plan.description}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">${plan.amount}</span>
                        <span className="text-purple-300">/month</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center gap-2 text-purple-200">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span>{plan.providers} Provider{plan.providers !== '1-2' ? 's' : ''}</span>
                      </li>
                      <li className="flex items-center gap-2 text-purple-200">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span>Up to {plan.maxLicenses} licenses</span>
                      </li>
                      <li className="flex items-center gap-2 text-purple-200">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span>Full feature access</span>
                      </li>
                      <li className="flex items-center gap-2 text-purple-200">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span>7-day money back</span>
                      </li>
                    </ul>

                    {/* Action Button */}
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full bg-green-500/20 text-green-400 font-semibold py-3 rounded-lg border border-green-500/30"
                      >
                        Current Plan
                      </button>
                    ) : isDowngrade ? (
                      <button
                        disabled
                        className="w-full bg-white/5 text-purple-300/50 font-semibold py-3 rounded-lg border border-white/10 cursor-not-allowed"
                      >
                        Downgrade Not Available
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSelectPlan(planKey)}
                        className={`w-full font-semibold py-3 rounded-lg transition-all ${
                          isUpgrade
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                        }`}
                      >
                        {isUpgrade ? 'Upgrade' : 'Select Plan'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
