import { createClient } from '@/lib/supabase/server'
import { getLatestWeek, getWeeks } from '@/lib/queries/weeks'
import { getMembers } from '@/lib/queries/members'
import { getAllTasks } from '@/lib/queries/tasks'
import { Card, CardContent } from '@/components/ui/Card'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [latestWeek, weeks, members, tasks] = await Promise.all([
    getLatestWeek(),
    getWeeks(),
    getMembers(),
    getAllTasks(),
  ])

  const { count: submissionsThisWeek } = latestWeek
    ? await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('week_id', latestWeek.id)
    : { count: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Manage scoring, members, and tasks.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Total Members</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Active Tasks</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{tasks.filter(t => t.is_active).length}</p>
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
            <p className="text-sm text-gray-500">Submissions This Week</p>
            <p className="mt-1 text-3xl font-bold text-blue-700">{submissionsThisWeek ?? 0}</p>
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
      </div>
    </div>
  )
}
