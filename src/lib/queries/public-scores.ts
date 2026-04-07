import { createAdminClient } from '@/lib/supabase/admin'
import type { WeeklyScore } from '@/types/database.types'

/** Public queries — use admin client to bypass RLS for unauthenticated visitors */

export async function getPublicAllTimeScoreboard() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('member_id, full_name, total_points')

  if (error) throw error

  const map = new Map<string, { member_id: string; full_name: string; total_points: number; weeks_participated: number }>()
  for (const row of data ?? []) {
    const existing = map.get(row.member_id)
    if (existing) {
      existing.total_points += row.total_points
      existing.weeks_participated += 1
    } else {
      map.set(row.member_id, {
        member_id: row.member_id,
        full_name: row.full_name,
        total_points: row.total_points,
        weeks_participated: 1,
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_points - a.total_points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))
}

export async function getPublicLeaderboardForWeek(weekId: string): Promise<WeeklyScore[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('*')
    .eq('week_id', weekId)
    .order('rank', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getPublicWeeks() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getPublicLatestWeek() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}
