'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WeeklyScore } from '@/types/database.types'
import { Badge } from '@/components/ui/Badge'

interface Props {
  initialScores: WeeklyScore[]
  weekId: string
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function LeaderboardTable({ initialScores, weekId }: Props) {
  const [scores, setScores] = useState<WeeklyScore[]>(initialScores)

  useEffect(() => {
    const supabase = createClient()

    // Re-fetch leaderboard whenever submissions change for this week
    const channel = supabase
      .channel(`leaderboard-${weekId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `week_id=eq.${weekId}` },
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-3 pr-4">Rank</th>
            <th className="pb-3 pr-4">Member</th>
            <th className="pb-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {scores.map((score) => (
            <tr key={score.member_id} className="hover:bg-gray-50">
              <td className="py-3 pr-4 font-bold text-gray-600">
                {MEDAL[score.rank] ?? `#${score.rank}`}
              </td>
              <td className="py-3 pr-4 font-medium text-gray-800">{score.full_name}</td>
              <td className="py-3 text-right">
                <Badge variant="info">{score.total_points} pts</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
