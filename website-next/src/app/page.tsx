import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,113,227,0.3),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_120%,rgba(0,113,227,0.15),transparent)]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <p className="text-[#0071E3] font-medium uppercase tracking-wide mb-6">Introducing</p>

          <div className="mb-12 animate-float">
            <Image
              src="/phone-mockup.png"
              alt="Happy InLine App"
              width={320}
              height={640}
              className="mx-auto drop-shadow-[0_30px_60px_rgba(0,113,227,0.4)]"
              priority
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-4">
            Happy InLine
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 italic mb-6">
            &quot;The Only Place You&apos;ll Be HAPPY In Line&quot;
          </p>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            Book appointments instantly with local service providers. No more waiting. No more lines. Just show up at your time.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="#"
              className="flex items-center gap-3 bg-white text-black px-6 py-4 rounded-full font-medium hover:scale-105 transition-transform"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              App Store - Coming Soon
            </a>
            <a
              href="#"
              className="flex items-center gap-3 bg-white/10 text-white border border-white/20 px-6 py-4 rounded-full font-medium hover:bg-white/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
              </svg>
              Google Play - Coming Soon
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              Built for modern life.
            </h2>
            <p className="text-lg text-gray-400">
              Everything you need to book services, all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Large Feature Card */}
            <div className="md:col-span-2 bg-gradient-to-b from-[#1D1D1F] to-[#161617] rounded-3xl p-10 border border-white/10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#00D4FF] flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2"/>
                      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2"/>
                      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Book in seconds</h3>
                  <p className="text-gray-400 text-lg">
                    Find available slots, pick your time, and confirm your appointment. It&apos;s that simple. No phone calls. No waiting on hold.
                  </p>
                </div>
                <div className="flex justify-center">
                  <svg viewBox="0 0 200 200" fill="none" className="w-48 h-48">
                    <circle cx="100" cy="100" r="80" stroke="url(#grad1)" strokeWidth="2" fill="none"/>
                    <circle cx="100" cy="100" r="60" stroke="url(#grad1)" strokeWidth="2" fill="none" opacity="0.5"/>
                    <circle cx="100" cy="100" r="40" stroke="url(#grad1)" strokeWidth="2" fill="none" opacity="0.3"/>
                    <circle cx="100" cy="100" r="8" fill="#0071E3"/>
                    <line x1="100" y1="100" x2="100" y2="50" stroke="#F5F5F7" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="100" y1="100" x2="140" y2="100" stroke="#0071E3" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0071E3"/>
                        <stop offset="100%" stopColor="#00D4FF"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            {[
              { icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z', title: 'Discover nearby', desc: 'Find the best-rated service providers in your area. Read reviews from real customers.' },
              { icon: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4l-10 10.01-3-3.01', title: 'Skip the wait', desc: 'Arrive at your scheduled time and get served immediately. Your time is valuable.' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Secure & private', desc: 'Your data is encrypted and protected. We never share your information without consent.' },
              { icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', title: 'Direct messaging', desc: 'Chat directly with service providers. Ask questions, share preferences, get updates.' },
            ].map((feature, i) => (
              <div key={i} className="bg-gradient-to-b from-[#1D1D1F] to-[#161617] rounded-3xl p-8 border border-white/10 hover:scale-[1.02] transition-transform">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0071E3] to-[#00D4FF] flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d={feature.icon} strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-black to-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
              One app. Every service.
            </h2>
            <p className="text-lg text-gray-400">
              From haircuts to home repairs, we&apos;ve got you covered.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {['Barbershops', 'Hair Salons', 'Nail Salons', 'Spas & Wellness', 'Beauty Services', 'Massage Therapy', 'Fitness Studios', 'Personal Training', 'Pet Grooming', 'Auto Detailing', 'Home Services', 'Professional Services', 'Healthcare', 'Tutoring', 'And More'].map((industry) => (
              <span
                key={industry}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-full hover:bg-[#0071E3] hover:border-[#0071E3] transition-colors cursor-default"
              >
                {industry}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 text-center bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(0,113,227,0.2),transparent)]">
        <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">
          Ready to skip the line?
        </h2>
        <p className="text-lg text-gray-400 mb-10">
          Download Happy InLine and start booking today.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href="#"
            className="flex items-center gap-3 bg-white text-black px-6 py-4 rounded-full font-medium hover:scale-105 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Coming Soon
          </a>
          <a
            href="#"
            className="flex items-center gap-3 bg-white/10 text-white border border-white/20 px-6 py-4 rounded-full font-medium hover:bg-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
            </svg>
            Coming Soon
          </a>
        </div>

        {/* Already a customer CTA */}
        <div className="mt-12 pt-8 border-t border-white/10 max-w-md mx-auto">
          <p className="text-gray-400 mb-4">Already a business owner?</p>
          <Link
            href="/login"
            className="text-[#0071E3] hover:underline font-medium"
          >
            Sign in to manage your subscription &rarr;
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
