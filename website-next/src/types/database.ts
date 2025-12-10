export interface Profile {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: 'customer' | 'barber' | 'owner' | 'manager' | 'super_admin'
  avatar_url: string | null

  // Subscription fields
  subscription_plan: string | null
  subscription_status: 'active' | 'cancelled' | 'refunded' | 'pending' | null
  subscription_start_date: string | null
  subscription_end_date: string | null
  next_billing_date: string | null
  refund_eligible_until: string | null
  monthly_amount: number | null
  max_licenses: number | null
  license_count: number | null

  // Stripe fields
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  payment_method_last4: string | null
  payment_method_brand: string | null

  created_at: string
  updated_at: string
}

export interface PaymentHistory {
  id: string
  owner_id: string
  shop_id: string | null
  amount: number
  status: 'succeeded' | 'failed' | 'refunded' | 'pending'
  payment_type: 'subscription' | 'refund' | 'upgrade'
  plan_name: string
  stripe_payment_intent_id: string | null
  stripe_invoice_id: string | null
  description: string | null
  receipt_url: string | null
  refund_id: string | null
  refund_amount: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface SubscriptionEvent {
  id: string
  owner_id: string
  shop_id: string | null
  event_type: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'refunded'
  from_plan: string | null
  to_plan: string | null
  amount: number | null
  stripe_event_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}
