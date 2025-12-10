'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { getPlanById } from '@/lib/stripe'
import type { Profile } from '@/types/database'

export default function CancelSubscriptionPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    fetchProfile()
  }, [router, supabase])

  const currentPlan = profile?.subscription_plan
    ? getPlanById(profile.subscription_plan)
    : null

  const isRefundEligible = profile?.refund_eligible_until
    ? new Date(profile.refund_eligible_until) > new Date()
    : false

  const refundDaysRemaining = profile?.refund_eligible_until
    ? Math.max(0, Math.ceil((new Date(profile.refund_eligible_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleCancel = async () => {
    if (!confirmed || !profile) return

    setCancelling(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-cancel-subscription`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            requestRefund: isRefundEligible,
          }),
        }
      )

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0071E3]"></div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 px-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Subscription Cancelled</h1>
            <p className="text-gray-400 mb-4">
              {isRefundEligible
                ? 'Your subscription has been cancelled and a refund has been processed. The refund will appear on your card within 5-10 business days.'
                : 'Your subscription has been cancelled. You can continue using your current plan until the end of your billing period.'}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              We&apos;re sorry to see you go. You can resubscribe anytime from your dashboard.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-[#0071E3] hover:bg-[#0077ED] rounded-xl font-semibold transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold gradient-text mb-4">Cancel Subscription</h1>
            <p className="text-gray-400">
              We&apos;re sorry to see you go. Before you cancel, please consider the following.
            </p>
          </div>

          {error && (
            <div className="mb-8 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Current Plan Summary */}
          <div className="bg-[#1D1D1F] border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold mb-4">Your Current Plan</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold" style={{ color: currentPlan?.color }}>
                  {currentPlan?.name}
                </p>
                <p className="text-gray-400 text-sm">{currentPlan?.description}</p>
              </div>
              <p className="text-2xl font-bold">${currentPlan?.price}/mo</p>
            </div>
          </div>

          {/* What You'll Lose */}
          <div className="bg-[#1D1D1F] border border-white/10 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold mb-4 text-red-400">What You&apos;ll Lose</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Your customers won&apos;t be able to book appointments online</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>All your service providers will lose access to the app</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Your QR code will no longer work for new registrations</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Customer messaging and notifications will stop</span>
              </li>
            </ul>
          </div>

          {/* Refund Eligibility */}
          {isRefundEligible ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-green-400">You&apos;re Eligible for a Full Refund</h3>
              </div>
              <p className="text-gray-300 text-sm">
                You have <strong>{refundDaysRemaining} days</strong> remaining in your 7-day money-back guarantee period.
                If you cancel now, you&apos;ll receive a full refund of <strong>${currentPlan?.price}</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-semibold text-yellow-400">No Refund Available</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Your 7-day refund period has expired. If you cancel now, you&apos;ll continue to have access
                until the end of your current billing period.
              </p>
            </div>
          )}

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-4 mb-8 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-white/30 bg-white/5 text-[#0071E3] focus:ring-[#0071E3] focus:ring-offset-0"
            />
            <span className="text-gray-300 text-sm">
              I understand that cancelling my subscription will remove access to all Happy InLine features
              for my business and team members.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 px-6 bg-[#0071E3] hover:bg-[#0077ED] rounded-xl font-semibold transition-colors"
            >
              Keep My Subscription
            </button>
            <button
              onClick={handleCancel}
              disabled={!confirmed || cancelling}
              className="flex-1 py-3 px-6 bg-red-500/20 hover:bg-red-500/30 text-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors border border-red-500/30"
            >
              {cancelling ? 'Cancelling...' : isRefundEligible ? 'Cancel & Get Refund' : 'Cancel Subscription'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
