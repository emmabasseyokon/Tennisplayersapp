import { getAllTimeScoreboard } from '@/lib/queries/scores'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function ScoreboardPage() {
  const scoreboard = await getAllTimeScoreboard()

  const topThree = scoreboard.slice(0, 3)
  const rest = scoreboard.slice(3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scoreboard</h1>
        <p className="mt-1 text-sm text-gray-500">All-time rankings based on total points earned.</p>
      </div>

      {scoreboard.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            No scores recorded yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 podium cards */}
          {topThree.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {topThree.map(entry => (
                <Card
                  key={entry.member_id}
                  className={`text-center ${entry.rank === 1 ? 'border-yellow-300 bg-yellow-50 ring-2 ring-yellow-300' : entry.rank === 2 ? 'border-gray-300 bg-gray-50' : 'border-orange-200 bg-orange-50'}`}
                >
                  <CardContent className="py-6">
                    <div className="text-4xl">{MEDAL[entry.rank]}</div>
                    <p className="mt-2 text-lg font-bold text-gray-900">{entry.full_name}</p>
                    <p className="mt-1 text-3xl font-extrabold text-blue-700">{entry.total_points}</p>
                    <p className="text-xs text-gray-500">points</p>
                    <p className="mt-2 text-xs text-gray-400">{entry.weeks_participated} week{entry.weeks_participated !== 1 ? 's' : ''} participated</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Full rankings table */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-gray-800">Full Rankings</h2>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3 text-center">Weeks</th>
                    <th className="px-6 py-3 text-right">Total Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {scoreboard.map(entry => (
                    <tr key={entry.member_id} className={`hover:bg-gray-50 ${entry.rank <= 3 ? 'font-medium' : ''}`}>
                      <td className="px-6 py-4 text-lg">
                        {MEDAL[entry.rank] ?? <span className="text-sm text-gray-500">#{entry.rank}</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-800">{entry.full_name}</td>
                      <td className="px-6 py-4 text-center text-gray-500">{entry.weeks_participated}</td>
                      <td className="px-6 py-4 text-right">
                        <Badge variant="info" className="text-sm">{entry.total_points} pts</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
