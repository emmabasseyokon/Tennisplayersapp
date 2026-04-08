'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeeklyScore } from '@/types/database.types'
interface Props {
  initialScores: WeeklyScore[]
  weekId: string
}

export function LeaderboardTable({ initialScores, weekId }: Props) {
  const [scores, setScores] = useState<WeeklyScore[]>(initialScores)

  useEffect(() => {
    const supabase = createClient()

    // Re-fetch leaderboard whenever task completions change for this week
    const channel = supabase
      .channel(`leaderboard-${weekId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_completions', filter: `week_id=eq.${weekId}` },
        async () => {
          const { data } = await supabase
            .from('weekly_scores')
            .select('*')
            .eq('week_id', weekId)
            .order('rank', { ascending: true })
          if (data) setScores(data as WeeklyScore[])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [weekId])

  if (scores.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No scores recorded for this week yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-2 pr-3 sm:pb-3 sm:pr-4">Rank</th>
            <th className="pb-2 pr-3 sm:pb-3 sm:pr-4">Member</th>
            <th className="pb-2 text-right sm:pb-3">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.map((score) => (
            <tr key={score.member_id} className="hover:bg-gray-50">
              <td className="py-2 pr-3 text-sm font-bold text-gray-900 sm:py-3 sm:pr-4">
                #{score.rank}
              </td>
              <td className="py-2 pr-3 font-medium text-gray-800 sm:py-3 sm:pr-4">{score.full_name}</td>
              <td className="py-2 text-right text-sm font-bold uppercase text-gray-900 sm:py-3">
                {score.total_points} points
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
