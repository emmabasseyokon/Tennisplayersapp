import { getAllTimeScoreboard } from '@/lib/queries/scores'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { ShareButton } from '@/components/ui/ShareButton'

export default async function AdminScoreboardPage() {
  const scoreboard = await getAllTimeScoreboard()
  const topThree = scoreboard.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoreboard</h1>
          <p className="mt-1 text-sm text-gray-500">All-time rankings based on total points earned.</p>
        </div>
        <ShareButton url={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/scores`} title="GMOV Overall Scoreboard" text="Check out the GMOV overall scoreboard!" />
      </div>

      {scoreboard.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            No scores recorded yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 podium */}
          {topThree.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {topThree.map(entry => (
                <Card
                  key={entry.member_id}
                  className={`text-center ${entry.rank === 1 ? 'border-yellow-300 bg-yellow-50 ring-2 ring-yellow-300' : entry.rank === 2 ? 'border-gray-300 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}
                >
                  <CardContent className="py-6">
                    <div className="text-2xl font-extrabold text-gray-900">#{entry.rank}</div>
                    <p className="mt-2 text-lg font-bold text-gray-900">{entry.full_name}</p>
                    <p className="mt-1 text-3xl font-extrabold text-gray-900">{entry.total_points} <span className="text-sm font-bold uppercase">points</span></p>
                    <p className="mt-2 text-xs text-gray-400">{entry.weeks_participated} week{entry.weeks_participated !== 1 ? 's' : ''}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Full table */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800">Full Rankings</h2>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-3 sm:px-6">Rank</th>
                      <th className="px-3 py-3 sm:px-6">Member</th>
                      <th className="px-3 py-3 text-center sm:px-6">Weeks</th>
                      <th className="px-3 py-3 text-right sm:px-6">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {scoreboard.map(entry => (
                      <tr key={entry.member_id} className={`hover:bg-gray-50 ${entry.rank <= 3 ? 'font-medium' : ''}`}>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900 sm:px-6">
                          #{entry.rank}
                        </td>
                        <td className="px-3 py-3 text-gray-800 sm:px-6">{entry.full_name}</td>
                        <td className="px-3 py-3 text-center text-gray-500 sm:px-6">{entry.weeks_participated}</td>
                        <td className="px-3 py-3 text-right text-sm font-bold uppercase text-gray-900 sm:px-6">
                          {entry.total_points} points
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
