'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-full max-w-sm"
      >
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ledge-muted">
          LedgeIt
        </p>
        <h1 className="mb-8 font-mono text-2xl font-semibold tracking-tighter text-ledge-data">
          Sign in
        </h1>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
            >
              <p className="text-sm text-emerald-400">
                Magic link sent to{' '}
                <span className="font-semibold">{email}</span>
              </p>
              <p className="mt-1 text-xs text-ledge-muted">
                Check your inbox and click the link to sign in.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-ledge-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  aria-label="Email address"
                  role="textbox"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-ledge-border bg-ledge-surface px-4 py-3 font-mono text-sm text-ledge-data placeholder:text-ledge-border focus:border-ledge-accent focus:outline-none"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-rose-400"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="w-full rounded-lg bg-ledge-accent py-3 font-mono text-sm font-semibold text-ledge-bg disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
