'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/produk', label: 'Produk', icon: '📦' },
  { href: '/penjualan', label: 'Penjualan', icon: '🛒' },
  { href: '/laporan', label: 'Laporan', icon: '📈' },
]

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserEmail(user.email)
    }
    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <>
      {isOpen && <div className="mobile-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="TEOFFE" width={44} height={44} />
          </div>
          <div className="sidebar-brand-text">
            <h3>TEOFFE</h3>
            <p>sip happens.</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">A</div>
            <div className="sidebar-user-info">
              <p>Admin</p>
              <p>{userEmail || 'Loading...'}</p>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Keluar">
              ↗
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
