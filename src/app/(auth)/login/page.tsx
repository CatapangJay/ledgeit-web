'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setPassword('')
    setConfirm('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signin') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (authError) {
        setError('Invalid email or password.')
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      setLoading(false)
      if (authError) {
        setError(authError.message)
      } else if (data.session) {
        // Email confirmation disabled — session is live, go straight to app
        router.push('/')
        router.refresh()
      } else {
        setSignedUp(true)
      }
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

        <AnimatePresence mode="wait">
          {signedUp ? (
            <motion.div
              key="signed-up"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <h1 className="mb-4 font-mono text-2xl font-semibold tracking-tighter text-ledge-data">
                Account created
              </h1>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm text-emerald-400">
                  Check your inbox to confirm <span className="font-semibold">{email}</span>, then sign in.
                </p>
              </div>
              <button
                onClick={() => { setSignedUp(false); switchMode('signin') }}
                className="mt-6 font-mono text-xs text-ledge-accent underline-offset-2 hover:underline"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <h1 className="mb-8 font-mono text-2xl font-semibold tracking-tighter text-ledge-data">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </h1>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-ledge-border bg-ledge-surface px-4 py-3 font-mono text-sm text-ledge-data placeholder:text-ledge-border focus:border-ledge-accent focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="font-mono text-[11px] uppercase tracking-[0.14em] text-ledge-muted"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    aria-label="Password"
                    required
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-ledge-border bg-ledge-surface px-4 py-3 font-mono text-sm text-ledge-data placeholder:text-ledge-border focus:border-ledge-accent focus:outline-none"
                  />
                </div>

                {mode === 'signup' && (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="confirm"
                      className="font-mono text-[11px] uppercase tracking-[0.14em] text-ledge-muted"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      aria-label="Confirm password"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-ledge-border bg-ledge-surface px-4 py-3 font-mono text-sm text-ledge-data placeholder:text-ledge-border focus:border-ledge-accent focus:outline-none"
                    />
                  </div>
                )}

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
                  {loading
                    ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                    : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </motion.button>
              </form>

              <p className="mt-6 text-center font-mono text-xs text-ledge-muted">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-ledge-accent underline-offset-2 hover:underline"
                >
                  {mode === 'signin' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
