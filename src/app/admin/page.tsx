import { createClient } from '@/lib/supabase/server'
import { getLatestWeek, getWeeks } from '@/lib/queries/weeks'
import { getMembers } from '@/lib/queries/members'
import { Card, CardContent } from '@/components/ui/Card'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [latestWeek, weeks, members] = await Promise.all([
    getLatestWeek(),
    getWeeks(),
    getMembers(),
  ])

  // Count distinct members who have at least one task completion this week
  let scoredThisWeek = 0
  if (latestWeek) {
    const { data: completions } = await supabase
      .from('task_completions')
      .select('member_id')
      .eq('week_id', latestWeek.id)
    const uniqueMembers = new Set((completions ?? []).map(c => c.member_id))
    scoredThisWeek = uniqueMembers.size
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Manage scoring and members.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/weeks?create=1"
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 w-full sm:w-auto">
            Create Week
          </Link>
          <Link href="/admin/members?create=1"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto">
            Add Member
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Total Members</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Total Weeks</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{weeks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Scored This Week</p>
            <p className="mt-1 text-3xl font-bold text-blue-700">{scoredThisWeek ?? 0} / {members.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2">
        {latestWeek && !latestWeek.is_locked && (
          <Link href={`/admin/record/${latestWeek.id}`}
            className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-5 hover:bg-blue-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-900">Record Scores</p>
              <p className="text-sm text-blue-700">{latestWeek.label}</p>
            </div>
          </Link>
        )}
        <Link href="/admin/weeks"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:bg-gray-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Manage Weeks</p>
            <p className="text-sm text-gray-500">Open new week or lock existing</p>
          </div>
        </Link>
        <Link href="/admin/scoreboard"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:bg-gray-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-800">View Scoreboard</p>
            <p className="text-sm text-gray-500">All-time rankings</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
