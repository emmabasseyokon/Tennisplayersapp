import { getWeeks, getLatestWeek } from '@/lib/queries/weeks'
import { getLeaderboardForWeek } from '@/lib/queries/scores'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'
import { WeekSelect } from '@/components/ui/WeekSelect'

interface Props {
  searchParams: Promise<{ week?: string }>
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams
  const [weeks, latestWeek] = await Promise.all([getWeeks(), getLatestWeek()])

  const activeWeekId = weekParam ?? latestWeek?.id
  const activeWeek = weeks.find(w => w.id === activeWeekId) ?? latestWeek

  const scores = activeWeekId ? await getLeaderboardForWeek(activeWeekId) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weekly Scoreboard</h1>
        <p className="mt-1 text-sm text-gray-500">Updates live as scores are recorded.</p>
      </div>

      {weeks.length > 0 && activeWeekId && (
        <WeekSelect weeks={weeks} activeWeekId={activeWeekId} basePath="/dashboard/leaderboard" />
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">{activeWeek?.label ?? 'All Time'}</h2>
        </CardHeader>
        <CardContent>
          {activeWeekId ? (
            <LeaderboardTable initialScores={scores} weekId={activeWeekId} />
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">No weeks created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
