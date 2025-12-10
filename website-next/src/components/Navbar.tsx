'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Happy InLine" width={40} height={40} />
          <span className="text-lg font-semibold hidden sm:block">Happy InLine</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm text-white/80 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/privacy" className="text-sm text-white/80 hover:text-white transition-colors">
            Privacy
          </Link>

          {loading ? (
            <div className="w-20 h-8 bg-white/10 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm bg-[#0071E3] hover:bg-[#0077ED] px-4 py-2 rounded-full transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
