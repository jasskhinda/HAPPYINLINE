'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCurrentUser,
  getSubscriptionStatus,
  cancelSubscription,
  SubscriptionStatus
} from '@/lib/auth';
import { getPlanColor } from '@/lib/stripe';
import {
  ArrowLeft,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Loader2,
  Calendar,
  CreditCard,
  Clock,
  DollarSign,
  ArrowUpCircle
} from 'lucide-react';

export default function ManagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelResult, setCancelResult] = useState<{
    success: boolean;
    message: string;
    refunded?: boolean;
    refundAmount?: number;
  } | null>(null);

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
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    setCancelling(true);

    try {
      const result = await cancelSubscription(subscription.id, cancelReason);

      if (result.success) {
        setCancelResult({
          success: true,
          message: result.message || 'Subscription cancelled successfully',
          refunded: result.refundProcessed,
          refundAmount: result.refundAmount
        });
        // Refresh subscription data
        await loadSubscriptionData();
      } else {
        setCancelResult({
          success: false,
          message: result.error || 'Failed to cancel subscription'
        });
      }
    } catch (err) {
      setCancelResult({
        success: false,
        message: 'An unexpected error occurred'
      });
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const planColor = getPlanColor(subscription?.subscription_plan || null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
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

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-white mb-8">Manage Subscription</h2>

        {/* Cancel Result Message */}
        {cancelResult && (
          <div
            className={`mb-6 rounded-xl p-4 flex items-start gap-3 ${
              cancelResult.success
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            }`}
          >
            {cancelResult.success ? (
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            )}
            <div>
              <p className={cancelResult.success ? 'text-green-200' : 'text-red-200'}>
                {cancelResult.message}
              </p>
              {cancelResult.refunded && cancelResult.refundAmount && (
                <p className="text-green-300 text-sm mt-1">
                  ${cancelResult.refundAmount.toFixed(2)} has been refunded to your payment method.
                </p>
              )}
            </div>
          </div>
        )}

        {subscription?.subscription_plan && subscription.subscription_plan !== 'none' ? (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border"
              style={{ borderColor: `${planColor}50` }}
            >
              <h3 className="text-xl font-semibold text-white mb-4">Current Plan</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-purple-300 text-sm mb-1">Plan</p>
                  <p className="text-2xl font-bold text-white">
                    {subscription.planDetails?.name || subscription.subscription_plan}
                  </p>
                </div>
                <div>
                  <p className="text-purple-300 text-sm mb-1">Monthly Amount</p>
                  <p className="text-2xl font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-green-400" />
                    {subscription.monthly_amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Started</span>
                  </div>
                  <p className="text-white">
                    {formatDate(subscription.subscription_start_date)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Next Billing</span>
                  </div>
                  <p className="text-white">
                    {formatDate(subscription.next_billing_date)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm">Status</span>
                  </div>
                  <p className="text-white capitalize">
                    {subscription.subscription_status}
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              {subscription.payment_method_last4 && (
                <div className="mt-6 bg-white/5 rounded-lg p-4">
                  <p className="text-purple-300 text-sm mb-1">Payment Method</p>
                  <p className="text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {subscription.payment_method_brand?.toUpperCase()} ending in{' '}
                    {subscription.payment_method_last4}
                  </p>
                </div>
              )}
            </div>

            {/* Refund Eligibility */}
            {subscription.isRefundEligible && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-yellow-200">
                    Refund Window Active
                  </h3>
                </div>
                <p className="text-yellow-200/80">
                  You have <strong>{subscription.refundDaysRemaining} days</strong> remaining
                  to receive a full refund. If you cancel now, you will receive a complete
                  refund of ${subscription.monthly_amount?.toFixed(2)}.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-4">
              {subscription.canUpgrade && (
                <button
                  onClick={() => router.push('/subscribe')}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg transition-all"
                >
                  <ArrowUpCircle className="w-5 h-5" />
                  Upgrade Plan
                </button>
              )}

              {subscription.subscription_status === 'active' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 px-6 py-3 rounded-lg transition-all border border-red-500/30"
                >
                  <XCircle className="w-5 h-5" />
                  Cancel Subscription
                </button>
              )}

              {subscription.subscription_status === 'cancelled' && subscription.accessUntil && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 w-full">
                  <p className="text-orange-200">
                    Your subscription is cancelled but you have access until{' '}
                    <strong>{formatDate(subscription.accessUntil)}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Active Subscription</h3>
            <p className="text-purple-300 mb-6">
              You don&apos;t have an active subscription to manage.
            </p>
            <button
              onClick={() => router.push('/subscribe')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-3 rounded-lg transition-all"
            >
              View Plans
            </button>
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Cancel Subscription?</h3>
            </div>

            {subscription?.isRefundEligible ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
                <p className="text-green-200 text-sm">
                  You&apos;re eligible for a full refund of ${subscription.monthly_amount?.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-purple-300 mb-4">
                Your subscription will remain active until the end of your billing period.
                You won&apos;t be charged again.
              </p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Reason for cancelling (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let us know why you're leaving..."
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition-all border border-white/20"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
