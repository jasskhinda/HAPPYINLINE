'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getSubscriptionStatus, signOut, SubscriptionStatus } from '@/lib/auth';
import { STRIPE_PLANS, getPlanColor } from '@/lib/stripe';
import {
  User,
  CreditCard,
  Calendar,
  Users,
  LogOut,
  ArrowUpCircle,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  Building2
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const subStatus = await getSubscriptionStatus(user.id);
      setSubscription(subStatus);
    } catch (err) {
      setError('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Happy Inline</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {subscription?.name || 'Business Owner'}!
          </h2>
          <p className="text-purple-300">
            Manage your subscription and business settings
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Card */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-purple-400" />
                Subscription
              </h3>
              {subscription?.isActive ? (
                <span className="flex items-center gap-1 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-gray-500/20 text-gray-400 px-3 py-1 rounded-full text-sm">
                  <XCircle className="w-4 h-4" />
                  Inactive
                </span>
              )}
            </div>

            {subscription?.subscription_plan && subscription.subscription_plan !== 'none' ? (
              <>
                {/* Current Plan */}
                <div
                  className="rounded-xl p-5 mb-6"
                  style={{
                    backgroundColor: `${getPlanColor(subscription.subscription_plan)}20`,
                    borderColor: getPlanColor(subscription.subscription_plan),
                    borderWidth: '1px'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-purple-300 text-sm mb-1">Current Plan</p>
                      <h4 className="text-2xl font-bold text-white">
                        {subscription.planDetails?.name || subscription.subscription_plan}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-300 text-sm mb-1">Monthly</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(subscription.monthly_amount)}
                      </p>
                    </div>
                  </div>
                  <p className="text-purple-200 text-sm">
                    {subscription.planDetails?.description}
                  </p>
                </div>

                {/* Subscription Details */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">Licenses</span>
                    </div>
                    <p className="text-white text-lg font-semibold">
                      {subscription.license_count || 0} / {subscription.max_licenses || 0}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Next Billing</span>
                    </div>
                    <p className="text-white text-lg font-semibold">
                      {formatDate(subscription.next_billing_date)}
                    </p>
                  </div>
                </div>

                {/* Refund Eligibility */}
                {subscription.isRefundEligible && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-yellow-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">Refund Window</span>
                    </div>
                    <p className="text-yellow-200 text-sm">
                      You have {subscription.refundDaysRemaining} days left to request a full refund.
                    </p>
                  </div>
                )}

                {/* Payment Method */}
                {subscription.payment_method_last4 && (
                  <div className="bg-white/5 rounded-lg p-4 mb-6">
                    <p className="text-purple-300 text-sm mb-1">Payment Method</p>
                    <p className="text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {subscription.payment_method_brand?.toUpperCase()} ending in {subscription.payment_method_last4}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {subscription.canUpgrade && (
                    <button
                      onClick={() => router.push('/subscribe')}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-2.5 rounded-lg transition-all"
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                      Upgrade Plan
                    </button>
                  )}
                  <button
                    onClick={() => router.push('/manage')}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg transition-all border border-white/20"
                  >
                    Manage Subscription
                  </button>
                </div>
              </>
            ) : (
              /* No Subscription */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-purple-400" />
                </div>
                <h4 className="text-xl font-semibold text-white mb-2">
                  No Active Subscription
                </h4>
                <p className="text-purple-300 mb-6">
                  Subscribe to start using Happy Inline for your business
                </p>
                <button
                  onClick={() => router.push('/subscribe')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-3 rounded-lg transition-all"
                >
                  View Plans & Subscribe
                </button>
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
              <User className="w-6 h-6 text-purple-400" />
              Profile
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-purple-300 text-sm mb-1">Name</p>
                <p className="text-white">{subscription?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-purple-300 text-sm mb-1">Email</p>
                <p className="text-white">{subscription?.email || 'N/A'}</p>
              </div>
              {subscription?.business_name && (
                <div>
                  <p className="text-purple-300 text-sm mb-1">Business</p>
                  <p className="text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    {subscription.business_name}
                  </p>
                </div>
              )}
              <div>
                <p className="text-purple-300 text-sm mb-1">Account Type</p>
                <p className="text-white capitalize">{subscription?.role || 'Customer'}</p>
              </div>
            </div>

            <button
              onClick={loadSubscriptionData}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-purple-300 py-2.5 rounded-lg transition-all border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
