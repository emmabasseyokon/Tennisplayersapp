import Link from 'next/link'
import { getPublicLeaderboardForWeek, getPublicWeeks, getPublicLatestWeek } from '@/lib/queries/public-scores'
import { WeekSelect } from '@/components/ui/WeekSelect'


interface Props {
  searchParams: Promise<{ week?: string }>
}

export default async function PublicWeeklyScoreboardPage({ searchParams }: Props) {
  const { week: weekParam } = await searchParams
  const [weeks, latestWeek] = await Promise.all([getPublicWeeks(), getPublicLatestWeek()])

  const activeWeekId = weekParam ?? latestWeek?.id
  const activeWeek = weeks.find(w => w.id === activeWeekId) ?? latestWeek
  const scores = activeWeekId ? await getPublicLeaderboardForWeek(activeWeekId) : []

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex rounded-xl bg-white/10 p-1">
        <Link
          href="/scores"
          className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-blue-200 hover:text-white"
        >
          Overall
        </Link>
        <div className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-semibold text-blue-900 shadow">
          Weekly
        </div>
      </div>

      {/* Week selector */}
      {weeks.length > 0 && activeWeekId && (
        <WeekSelect weeks={weeks} activeWeekId={activeWeekId} basePath="/scores/weekly" />
      )}

      {/* Week label */}
      {activeWeek && (
        <h2 className="text-lg font-semibold text-white">{activeWeek.label}</h2>
      )}

      {scores.length === 0 ? (
        <div className="rounded-2xl bg-white/10 py-16 text-center text-blue-200">
          {weeks.length === 0 ? 'No weeks created yet.' : 'No scores recorded for this week yet.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-medium uppercase tracking-wider text-blue-300">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {scores.map(score => (
                <tr key={score.member_id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-sm font-bold text-white">
                    #{score.rank}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{score.full_name}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold uppercase text-white">
                    {score.total_points} points
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
