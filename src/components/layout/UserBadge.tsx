'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignOut } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

export default function UserBadge() {
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useRef(createClient()).current

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null)
    })
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!email) return null

  const truncated = email.length > 16 ? `${email.slice(0, 13)}…` : email

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[11px] text-ledge-muted">{truncated}</span>
      <button
        aria-label="Sign out"
        onClick={handleSignOut}
        className="flex h-6 w-6 items-center justify-center rounded-full text-ledge-muted transition-colors hover:text-ledge-data active:scale-90"
      >
        <SignOut size={13} weight="bold" aria-hidden="true" />
      </button>
    </div>
  )
}
