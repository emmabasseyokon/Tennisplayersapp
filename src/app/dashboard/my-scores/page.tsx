import { createClient } from '@/lib/supabase/server'
import { getMemberScoreHistory } from '@/lib/queries/scores'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default async function MyScoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const history = await getMemberScoreHistory(user.id)

  const allTimeTotal = history.reduce((sum, w) => sum + w.total_points, 0)
  const bestRank = history.length > 0 ? Math.min(...history.map(w => w.rank)) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Scores</h1>
        <p className="mt-1 text-sm text-gray-500">Your full participation history.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-gray-500">All-Time Points</p>
            <p className="mt-1 text-3xl font-bold text-blue-700">{allTimeTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-gray-500">Weeks Participated</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{history.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm font-medium text-gray-500">Best Rank</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">
              {bestRank !== null ? `#${bestRank}` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History table */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">Week-by-Week History</h2>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No scores recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-4">Week</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4 text-center">Rank</th>
                    <th className="pb-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map((row) => (
                    <tr key={`${row.week_id}-${row.member_id}`} className="hover:bg-gray-50">
                      <td className="py-3 pr-4 font-medium text-gray-800">{row.week_label}</td>
                      <td className="py-3 pr-4 text-gray-500">
                        {new Date(row.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge variant={row.rank === 1 ? 'success' : row.rank <= 3 ? 'warning' : 'default'}>
                          #{row.rank}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold text-blue-700">{row.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
