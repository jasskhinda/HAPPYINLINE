import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { PLANS, getPlanById } from '@/lib/stripe'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile with subscription data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const currentPlan = profile?.subscription_plan
    ? getPlanById(profile.subscription_plan)
    : null

  const isActive = profile?.subscription_status === 'active'
  const isCancelled = profile?.subscription_status === 'cancelled'

  // Calculate days until refund expires
  const refundDaysRemaining = profile?.refund_eligible_until
    ? Math.max(0, Math.ceil((new Date(profile.refund_eligible_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Welcome, {profile?.name || 'Business Owner'}
            </h1>
            <p className="text-gray-400">
              Manage your Happy InLine subscription
            </p>
          </div>

          {/* Subscription Card */}
          <div className="bg-gradient-to-b from-[#1D1D1F] to-[#161617] rounded-3xl border border-white/10 overflow-hidden mb-8">
            {/* Plan Header */}
            <div
              className="p-8 border-b border-white/10"
              style={{ borderTopColor: currentPlan?.color || '#0071E3', borderTopWidth: '4px' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                  <h2 className="text-2xl font-bold" style={{ color: currentPlan?.color || '#0071E3' }}>
                    {currentPlan?.name || 'No Active Plan'}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    ${currentPlan?.price || '0'}<span className="text-lg text-gray-400">/mo</span>
                  </p>
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm mt-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      Active
                    </span>
                  )}
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm mt-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="p-8 space-y-6">
              {/* License Usage */}
              {currentPlan && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Service Providers</span>
                    <span>
                      {profile?.license_count || 0} / {currentPlan.maxLicenses === -1 ? 'Unlimited' : currentPlan.maxLicenses}
                    </span>
                  </div>
                  {currentPlan.maxLicenses !== -1 && (
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((profile?.license_count || 0) / currentPlan.maxLicenses) * 100)}%`,
                          backgroundColor: currentPlan.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Billing Info Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Next Billing Date</p>
                  <p className="font-medium">{formatDate(profile?.next_billing_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Subscription Started</p>
                  <p className="font-medium">{formatDate(profile?.subscription_start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Payment Method</p>
                  <p className="font-medium">
                    {profile?.payment_method_brand && profile?.payment_method_last4
                      ? `${profile.payment_method_brand} ****${profile.payment_method_last4}`
                      : 'N/A'}
                  </p>
                </div>
                {refundDaysRemaining > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Refund Eligible</p>
                    <p className="font-medium text-green-400">{refundDaysRemaining} days remaining</p>
                  </div>
                )}
              </div>

              {/* Plan Features */}
              {currentPlan && (
                <div className="pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-400 mb-4">Plan Features</p>
                  <ul className="grid grid-cols-2 gap-3">
                    {currentPlan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: currentPlan.color }}
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
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-8 pt-0 flex gap-4">
              {isActive && currentPlan?.id !== 'unlimited' && (
                <Link
                  href="/subscription/upgrade"
                  className="flex-1 py-3 px-6 bg-[#0071E3] hover:bg-[#0077ED] rounded-xl font-semibold text-center transition-colors"
                >
                  Upgrade Plan
                </Link>
              )}
              {isActive && (
                <Link
                  href="/subscription/cancel"
                  className="flex-1 py-3 px-6 bg-white/10 hover:bg-white/20 rounded-xl font-semibold text-center transition-colors"
                >
                  Cancel Subscription
                </Link>
              )}
              {isCancelled && (
                <Link
                  href="/subscription/resubscribe"
                  className="flex-1 py-3 px-6 bg-[#0071E3] hover:bg-[#0077ED] rounded-xl font-semibold text-center transition-colors"
                >
                  Resubscribe
                </Link>
              )}
              {!currentPlan && (
                <Link
                  href="/subscription/plans"
                  className="flex-1 py-3 px-6 bg-[#0071E3] hover:bg-[#0077ED] rounded-xl font-semibold text-center transition-colors"
                >
                  Choose a Plan
                </Link>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/billing/history"
              className="bg-[#1D1D1F] hover:bg-[#252527] border border-white/10 rounded-2xl p-6 transition-colors"
            >
              <svg className="w-8 h-8 text-[#0071E3] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-semibold mb-1">Billing History</h3>
              <p className="text-sm text-gray-400">View past payments and invoices</p>
            </Link>

            <Link
              href="/billing/payment-method"
              className="bg-[#1D1D1F] hover:bg-[#252527] border border-white/10 rounded-2xl p-6 transition-colors"
            >
              <svg className="w-8 h-8 text-[#0071E3] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="font-semibold mb-1">Payment Method</h3>
              <p className="text-sm text-gray-400">Update your card details</p>
            </Link>

            <a
              href="mailto:support@happyinline.com"
              className="bg-[#1D1D1F] hover:bg-[#252527] border border-white/10 rounded-2xl p-6 transition-colors"
            >
              <svg className="w-8 h-8 text-[#0071E3] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="font-semibold mb-1">Get Support</h3>
              <p className="text-sm text-gray-400">Contact our support team</p>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
