'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SignOut, PencilSimple, Check, X, Lock, User } from '@phosphor-icons/react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Section = 'profile' | 'password'

export default function AccountPage() {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [user, setUser] = useState<SupabaseUser | null>(null)

  // Profile edit
  const [editingEmail, setEditingEmail] = useState(false)
  const [draftEmail, setDraftEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [activeSection, setActiveSection] = useState<Section>('profile')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setDraftEmail(user?.email ?? '')
    })
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleEmailSave = async () => {
    if (!draftEmail.trim() || draftEmail === user?.email) {
      setEditingEmail(false)
      return
    }
    setEmailLoading(true)
    setEmailMsg(null)
    const { error } = await supabase.auth.updateUser({ email: draftEmail.trim() })
    setEmailLoading(false)
    if (error) {
      setEmailMsg({ type: 'err', text: error.message })
    } else {
      setEmailMsg({ type: 'ok', text: 'Confirmation sent to new address.' })
      setEditingEmail(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'Password must be at least 8 characters.' })
      return
    }

    setPasswordLoading(true)
    // Re-authenticate first to verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    })
    if (signInError) {
      setPasswordLoading(false)
      setPasswordMsg({ type: 'err', text: 'Current password is incorrect.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      setPasswordMsg({ type: 'err', text: error.message })
    } else {
      setPasswordMsg({ type: 'ok', text: 'Password updated.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="mx-auto max-w-md px-5 pt-16 pb-10">
      {/* Avatar + email */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="mb-8 flex flex-col items-center gap-3"
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full font-mono text-xl font-semibold"
          style={{
            background: 'linear-gradient(135deg, #1f695d 0%, #00352e 100%)',
            color: '#ffffff',
          }}
        >
          {initials}
        </div>
        <p className="font-mono text-sm text-ledge-muted">{user?.email ?? '…'}</p>
      </motion.div>

      {/* Section toggle */}
      <div className="mb-6 flex rounded-lg border border-ledge-border bg-ledge-surface p-1">
        {(['profile', 'password'] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className="relative flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-mono text-xs font-semibold transition-colors"
            style={{ color: activeSection === s ? '#00352e' : '#6e9990' }}
          >
            {activeSection === s && (
              <motion.div
                layoutId="section-bg"
                className="absolute inset-0 rounded-md"
                style={{ background: 'rgba(0,53,46,0.08)' }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              />
            )}
            {s === 'profile' ? <User size={13} weight="bold" /> : <Lock size={13} weight="bold" />}
            <span className="relative capitalize">{s === 'password' ? 'Change Password' : 'Profile'}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex flex-col gap-4"
          >
            {/* Email field */}
            <div
              className="rounded-xl border border-ledge-border bg-ledge-surface p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,53,46,0.04)' }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ledge-muted">
                  Email
                </span>
                {!editingEmail ? (
                  <button
                    aria-label="Edit email"
                    onClick={() => { setEditingEmail(true); setEmailMsg(null) }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ledge-muted hover:text-ledge-data active:scale-90 transition-colors"
                  >
                    <PencilSimple size={13} weight="bold" />
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button
                      aria-label="Save email"
                      onClick={handleEmailSave}
                      disabled={emailLoading}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-500 hover:text-emerald-400 active:scale-90 transition-colors disabled:opacity-50"
                    >
                      <Check size={13} weight="bold" />
                    </button>
                    <button
                      aria-label="Cancel"
                      onClick={() => { setEditingEmail(false); setDraftEmail(user?.email ?? '') }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-ledge-muted hover:text-rose-400 active:scale-90 transition-colors"
                    >
                      <X size={13} weight="bold" />
                    </button>
                  </div>
                )}
              </div>

              {editingEmail ? (
                <input
                  type="email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border border-ledge-border bg-ledge-bg px-3 py-2 font-mono text-sm text-ledge-data focus:border-ledge-accent focus:outline-none"
                />
              ) : (
                <p className="font-mono text-sm text-ledge-data">{user?.email ?? '…'}</p>
              )}

              <AnimatePresence>
                {emailMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-2 text-xs ${emailMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {emailMsg.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Account metadata */}
            <div
              className="rounded-xl border border-ledge-border bg-ledge-surface p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,53,46,0.04)' }}
            >
              <span className="mb-3 block font-mono text-[11px] uppercase tracking-[0.14em] text-ledge-muted">
                Account Info
              </span>
              <dl className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <dt className="font-mono text-xs text-ledge-muted">User ID</dt>
                  <dd className="max-w-45 truncate font-mono text-[11px] text-ledge-data">
                    {user?.id ?? '…'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-mono text-xs text-ledge-muted">Joined</dt>
                  <dd className="font-mono text-[11px] text-ledge-data">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '…'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="font-mono text-xs text-ledge-muted">Provider</dt>
                  <dd className="font-mono text-[11px] text-ledge-data">
                    {user?.app_metadata?.provider ?? 'email'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Sign out */}
            <motion.button
              onClick={handleSignOut}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 py-3 font-mono text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <SignOut size={15} weight="bold" aria-hidden="true" />
              Sign Out
            </motion.button>
          </motion.div>
        ) : (
          <motion.form
            key="password"
            onSubmit={handlePasswordChange}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="flex flex-col gap-4"
          >
            <div
              className="flex flex-col gap-4 rounded-xl border border-ledge-border bg-ledge-surface p-4"
              style={{ boxShadow: '0 2px 12px rgba(0,53,46,0.04)' }}
            >
              {[
                { id: 'current-pw', label: 'Current Password', value: currentPassword, onChange: setCurrentPassword, auto: 'current-password' },
                { id: 'new-pw', label: 'New Password', value: newPassword, onChange: setNewPassword, auto: 'new-password' },
                { id: 'confirm-pw', label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword, auto: 'new-password' },
              ].map(({ id, label, value, onChange, auto }) => (
                <div key={id} className="flex flex-col gap-1.5">
                  <label
                    htmlFor={id}
                    className="font-mono text-[11px] uppercase tracking-[0.14em] text-ledge-muted"
                  >
                    {label}
                  </label>
                  <input
                    id={id}
                    type="password"
                    required
                    autoComplete={auto}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-ledge-border bg-ledge-bg px-3 py-2.5 font-mono text-sm text-ledge-data placeholder:text-ledge-border focus:border-ledge-accent focus:outline-none"
                  />
                </div>
              ))}

              <AnimatePresence>
                {passwordMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-xs ${passwordMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {passwordMsg.text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="submit"
              disabled={passwordLoading}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-full rounded-xl bg-ledge-accent py-3 font-mono text-sm font-semibold text-ledge-bg disabled:opacity-50"
            >
              {passwordLoading ? 'Updating…' : 'Update Password'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
