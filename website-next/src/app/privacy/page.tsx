import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold gradient-text mb-8">Privacy Policy</h1>

          <div className="prose prose-invert prose-lg max-w-none">
            <p className="text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
              <p className="text-gray-300 mb-4">
                Happy InLine collects information you provide directly to us, such as when you create an account, make a booking, or contact us for support.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Account information (name, email, phone number)</li>
                <li>Booking and appointment history</li>
                <li>Payment information (processed securely via Stripe)</li>
                <li>Communications with service providers</li>
                <li>Device information and usage data</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-300 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Develop new features and services</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">3. Information Sharing</h2>
              <p className="text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to outside parties except:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>With service providers you choose to book with</li>
                <li>With third-party service providers who assist in operating our app</li>
                <li>When required by law or to protect our rights</li>
                <li>With your consent</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">4. Data Security</h2>
              <p className="text-gray-300">
                We implement appropriate security measures to protect your personal information. All data is encrypted in transit using SSL/TLS. Payment information is processed by Stripe and never stored on our servers.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">5. Your Rights</h2>
              <p className="text-gray-300 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-2xl font-bold mb-4">6. Contact Us</h2>
              <p className="text-gray-300">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@happyinline.com" className="text-[#0071E3] hover:underline">
                  privacy@happyinline.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
