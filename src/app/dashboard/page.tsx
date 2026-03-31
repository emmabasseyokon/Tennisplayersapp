import { createClient } from '@/lib/supabase/server'
import { getLatestWeek } from '@/lib/queries/weeks'
import { getMemberSubmissionForWeek } from '@/lib/queries/scores'
import { Card, CardContent } from '@/components/ui/Card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const week = await getLatestWeek()
  const submission = week ? await getMemberSubmissionForWeek(user.id, week.id) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">
          {week ? `Current week: ${week.label}` : 'No active week yet.'}
        </p>
      </div>

      <Card>
        <CardContent className="py-5">
          <p className="text-sm font-medium text-gray-500">This Week&apos;s Points</p>
          <p className="mt-1 text-3xl font-bold text-blue-700">{submission?.points ?? 0}</p>
        </CardContent>
      </Card>

      {!submission && (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            No scores recorded yet for this week.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
