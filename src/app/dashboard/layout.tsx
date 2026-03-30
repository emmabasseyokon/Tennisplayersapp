import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single<{ full_name: string; role: string }>()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-800">GMOV</span>
          </div>

          <nav className="hidden gap-6 sm:flex">
            <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">Home</Link>
            <Link href="/dashboard/leaderboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">Leaderboard</Link>
            <Link href="/dashboard/my-scores" className="text-sm font-medium text-gray-600 hover:text-gray-900">My Scores</Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">{profile?.full_name}</span>
            <form action="/api/auth/signout" method="POST">
              <button type="submit" className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex gap-4 border-t border-gray-100 px-4 py-2 sm:hidden">
          <Link href="/dashboard" className="text-sm font-medium text-gray-600">Home</Link>
          <Link href="/dashboard/leaderboard" className="text-sm font-medium text-gray-600">Leaderboard</Link>
          <Link href="/dashboard/my-scores" className="text-sm font-medium text-gray-600">My Scores</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  )
}
