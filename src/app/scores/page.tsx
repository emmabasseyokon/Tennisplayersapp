import Link from 'next/link'
import { getPublicAllTimeScoreboard } from '@/lib/queries/public-scores'

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function PublicScoreboardPage() {
  const scoreboard = await getPublicAllTimeScoreboard()
  const topThree = scoreboard.slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex rounded-xl bg-white/10 p-1">
        <div className="flex-1 rounded-lg bg-white px-4 py-2 text-center text-sm font-semibold text-blue-900 shadow">
          Overall
        </div>
        <Link
          href="/scores/weekly"
          className="flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium text-blue-200 hover:text-white"
        >
          Weekly
        </Link>
      </div>

      {scoreboard.length === 0 ? (
        <div className="rounded-2xl bg-white/10 py-16 text-center text-blue-200">
          No scores recorded yet.
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {topThree.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {topThree.map(entry => (
                <div
                  key={entry.member_id}
                  className={`rounded-2xl p-4 text-center ${
                    entry.rank === 1
                      ? 'bg-yellow-400/20 ring-2 ring-yellow-400/50'
                      : entry.rank === 2
                        ? 'bg-gray-300/20'
                        : 'bg-orange-400/20'
                  }`}
                >
                  <div className="text-3xl">{MEDAL[entry.rank]}</div>
                  <p className="mt-1 font-bold text-white">{entry.full_name}</p>
                  <p className="text-2xl font-extrabold text-white">{entry.total_points}</p>
                  <p className="text-xs text-blue-200">points</p>
                  <p className="mt-1 text-xs text-blue-300">
                    {entry.weeks_participated} week{entry.weeks_participated !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Full table */}
          <div className="overflow-hidden rounded-2xl bg-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-medium uppercase tracking-wider text-blue-300">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3 text-center">Weeks</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {scoreboard.map(entry => (
                  <tr key={entry.member_id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-lg text-white">
                      {MEDAL[entry.rank] ?? <span className="text-sm text-blue-300">#{entry.rank}</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{entry.full_name}</td>
                    <td className="px-4 py-3 text-center text-blue-300">{entry.weeks_participated}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-block rounded-full bg-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-100">
                        {entry.total_points} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
