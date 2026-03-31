'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/scoreboard', label: 'Overall Scoreboard' },
  { href: '/dashboard/leaderboard', label: 'Weekly Scoreboard' },
  { href: '/dashboard/my-scores', label: 'My Scores' },
]

interface Props {
  fullName: string
  children: React.ReactNode
}

export function DashboardShell({ fullName, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-blue-700 text-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo — always left */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-semibold">GMOV</span>
          </div>

          {/* Desktop right side: name + sign out */}
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-sm text-blue-100">{fullName}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-blue-100 hover:bg-blue-600 hover:text-white">
                Sign out
              </button>
            </form>
          </div>

          {/* Hamburger — mobile only, right side */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-blue-600 sm:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <nav className="border-t border-blue-600 bg-blue-700 px-2 py-2 sm:hidden">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-600 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            {/* Divider + user info + sign out */}
            <div className="mt-2 border-t border-blue-600 pt-2">
              <p className="px-4 py-2 text-xs text-blue-200">{fullName}</p>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-blue-100 hover:bg-blue-600 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-52 shrink-0 border-r border-gray-200 sm:block">
          <nav className="sticky top-[57px] space-y-1 px-3 pt-6">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-8 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
