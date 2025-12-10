'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'
import { PLANS, getUpgradePlans, getPlanById } from '@/lib/stripe'
import type { Profile } from '@/types/database'

export default function UpgradePlanPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  const upgradePlans = currentPlan
    ? getUpgradePlans(currentPlan.id)
    : Object.values(PLANS)

  const handleUpgrade = async () => {
    if (!selectedPlan || !profile) return

    setUpgrading(true)
    setError(null)

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: `${window.location.origin}/subscription/upgrade`,
          isUpgrade: !!currentPlan,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade plan')
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0071E3]"></div>
      </div>
    )
  }

  if (upgradePlans.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 px-6 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">You&apos;re on the Best Plan!</h1>
            <p className="text-gray-400 mb-8">
              You already have our Unlimited plan with all features included.
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

  const selectedPlanData = selectedPlan ? getPlanById(selectedPlan) : null

  // Calculate proration if upgrading
  const calculateProration = () => {
    if (!currentPlan || !selectedPlanData || !profile?.next_billing_date) return null

    const today = new Date()
    const nextBilling = new Date(profile.next_billing_date)
    const daysRemaining = Math.ceil((nextBilling.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const daysInMonth = 30

    const creditFromCurrent = (currentPlan.price / daysInMonth) * daysRemaining
    const chargeForNew = (selectedPlanData.price / daysInMonth) * daysRemaining
    const dueToday = Math.max(0, chargeForNew - creditFromCurrent)

    return {
      daysRemaining,
      credit: creditFromCurrent.toFixed(2),
      charge: chargeForNew.toFixed(2),
      dueToday: dueToday.toFixed(2),
      nextMonthly: selectedPlanData.price.toFixed(2),
    }
  }

  const proration = currentPlan ? calculateProration() : null

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold gradient-text mb-4">
              {currentPlan ? 'Upgrade Your Plan' : 'Choose Your Plan'}
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {currentPlan
                ? `You're currently on the ${currentPlan.name} plan. Upgrade to get more providers and features.`
                : 'Select the plan that fits your business needs.'}
            </p>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto mb-8 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Current Plan Badge */}
          {currentPlan && (
            <div className="max-w-2xl mx-auto mb-8 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Current Plan</p>
                <p className="font-semibold" style={{ color: currentPlan.color }}>
                  {currentPlan.name}
                </p>
              </div>
              <p className="text-xl font-bold">${currentPlan.price}/mo</p>
            </div>
          )}

          {/* Plan Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {upgradePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`text-left p-6 rounded-2xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-[#0071E3] bg-[#0071E3]/10'
                    : 'border-white/10 bg-[#1D1D1F] hover:border-white/30'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${plan.color}20` }}
                >
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: plan.color }}
                  />
                </div>

                <h3 className="text-xl font-bold mb-1" style={{ color: plan.color }}>
                  {plan.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                <p className="text-3xl font-bold mb-6">
                  ${plan.price}<span className="text-lg text-gray-400">/mo</span>
                </p>

                <ul className="space-y-2">
                  {plan.features.slice(0, 3).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: plan.color }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* Proration Details */}
          {selectedPlan && proration && (
            <div className="max-w-2xl mx-auto mb-8 bg-[#1D1D1F] border border-white/10 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Upgrade Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Credit from current plan ({proration.daysRemaining} days)</span>
                  <span className="text-green-400">-${proration.credit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Charge for new plan ({proration.daysRemaining} days)</span>
                  <span>${proration.charge}</span>
                </div>
                <hr className="border-white/10" />
                <div className="flex justify-between font-semibold">
                  <span>Due Today</span>
                  <span>${proration.dueToday}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Next monthly billing</span>
                  <span>${proration.nextMonthly}</span>
                </div>
              </div>

              {profile?.refund_eligible_until && new Date(profile.refund_eligible_until) > new Date() && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-400">
                  <strong>Note:</strong> Upgrading will forfeit your 7-day refund eligibility.
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={!selectedPlan || upgrading}
              className="flex-1 py-3 px-6 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
            >
              {upgrading ? 'Processing...' : currentPlan ? 'Upgrade Now' : 'Subscribe'}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
