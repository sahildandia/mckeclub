'use client'

import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import AdminDashboard from './AdminDashboard'
import Link from 'next/link'
import { GraduationCap, LogOut, ArrowLeft, LockKeyhole, LoaderCircle } from 'lucide-react'
import './admin.css'

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    }).catch(() => {
      setError('Unable to check your session. Please sign in again.')
    }).finally(() => setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')


    setSigningIn(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } catch {
      setError('Unable to sign in. Please try again.')
    } finally {
      setSigningIn(false)
    }
  }

  if (loading) return <div className="admin-shell admin-loading" role="status"><LoaderCircle size={20} className="admin-spin" /> Checking your session…</div>

  if (!session) {
    return (
      <div className="admin-shell">
        <Link href="/" className="admin-button"><ArrowLeft size={15} /> Registration form</Link>
        <section className="admin-panel admin-login">
          <div className="admin-brand-icon"><LockKeyhole size={22} aria-hidden="true" /></div>
          <p className="admin-eyebrow">MKCE · Club administration</p>
          <h1>Welcome back.</h1>
          <p className="admin-muted" style={{ marginTop: 8 }}>Sign in to manage registrations and seat allocations.</p>
          {error && <div className="admin-error" role="alert" style={{ marginTop: 20 }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div><label htmlFor="admin-email" className="admin-field-label">Email address</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="admin-control" placeholder="Your admin email" /></div>
            <div><label htmlFor="admin-password" className="admin-field-label">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="admin-control" placeholder="Enter your password" /></div>
            <button disabled={signingIn} type="submit" className="admin-button admin-button-primary">{signingIn && <LoaderCircle size={16} className="admin-spin" />}{signingIn ? 'Signing in…' : 'Sign in to dashboard'}</button>
          </form>
          <p className="admin-login-note">Access is restricted to authorized college administrators.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <div className="admin-brand-icon"><GraduationCap size={24} aria-hidden="true" /></div>
          <div><p className="admin-eyebrow">MKCE · Club administration</p><h1>Registration dashboard</h1><p className="admin-muted">An overview of students, clubs, and available seats.</p></div>
        </div>
        <div className="admin-actions">
          <Link href="/" className="admin-button"><ArrowLeft size={15} /> Registration form</Link>
          <button onClick={async () => {
            const { error } = await supabase.auth.signOut()
            if (error) setError('Unable to sign out. Please try again.')
            else setSession(null)
          }} className="admin-button"><LogOut size={15} /> Sign out</button>
        </div>
      </header>
      {error && <div className="admin-error" role="alert">{error}</div>}
      <AdminDashboard session={session} />
    </div>
  )
}
