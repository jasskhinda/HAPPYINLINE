import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default async function BillingHistoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch payment history
  const { data: payments } = await supabase
    .from('payment_history')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-500/20 text-green-400'
      case 'failed':
        return 'bg-red-500/20 text-red-400'
      case 'refunded':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'pending':
        return 'bg-blue-500/20 text-blue-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'Subscription'
      case 'upgrade':
        return 'Plan Upgrade'
      case 'refund':
        return 'Refund'
      default:
        return type
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">Billing History</h1>
              <p className="text-gray-400">View your past payments and invoices</p>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Payments Table */}
          {payments && payments.length > 0 ? (
            <div className="bg-[#1D1D1F] border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Date</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Description</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-400">Amount</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-400">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-sm">
                        {formatDate(payment.created_at)}
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{payment.plan_name}</p>
                        {payment.description && (
                          <p className="text-sm text-gray-400">{payment.description}</p>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {getPaymentTypeLabel(payment.payment_type)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {payment.status === 'refunded' && payment.refund_amount ? (
                          <span className="text-yellow-400">-{formatAmount(payment.refund_amount)}</span>
                        ) : (
                          formatAmount(payment.amount)
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {payment.receipt_url && (
                          <a
                            href={payment.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0071E3] hover:underline text-sm"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[#1D1D1F] border border-white/10 rounded-2xl p-12 text-center">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">No Payment History</h3>
              <p className="text-gray-400">
                Your payment history will appear here once you make your first payment.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
