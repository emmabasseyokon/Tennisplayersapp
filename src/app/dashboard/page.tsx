import { createClient } from '@/lib/supabase/server'
import { getLatestWeek } from '@/lib/queries/weeks'
import { getMemberSubmissionsForWeek } from '@/lib/queries/scores'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [week, announcements] = await Promise.all([
    getLatestWeek(),
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(r => r.data ?? []),
  ])

  const submissions = week ? await getMemberSubmissionsForWeek(user.id, week.id) : []
  const totalPoints = submissions.reduce((sum, s) => sum + s.points, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">
          {week ? `Current week: ${week.label}` : 'No active week yet.'}
        </p>
      </div>

      {/* Score summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-gray-500">This Week&apos;s Points</p>
            <p className="mt-1 text-3xl font-bold text-blue-700">{totalPoints}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-gray-500">Tasks Completed</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{submissions.length}</p>
          </CardContent>
        </Card>
        <Card className="flex items-center justify-center bg-blue-700 text-white">
          <CardContent className="py-5 text-center">
            <p className="text-sm font-medium text-blue-100">View Leaderboard</p>
            <Link href="/dashboard/leaderboard" className="mt-1 block text-lg font-bold underline-offset-2 hover:underline">
              See Rankings
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* This week's tasks */}
      {submissions.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">Completed This Week</h2>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {submissions.map((sub) => {
                const task = sub as typeof sub & { tasks: { name: string; description: string | null } }
                return (
                  <li key={sub.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{task.tasks?.name}</p>
                      {task.tasks?.description && (
                        <p className="text-xs text-gray-500">{task.tasks.description}</p>
                      )}
                    </div>
                    <Badge variant="info">+{sub.points} pts</Badge>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">Announcements</h2>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {announcements.map((a) => (
                <li key={a.id} className="py-4">
                  <p className="font-medium text-gray-800">{a.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{a.body}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {announcements.length === 0 && submissions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            No activity recorded yet for this week.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
