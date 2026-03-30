import { createClient } from '@/lib/supabase/server'
import type { WeeklyScore } from '@/types/database.types'

export async function getLeaderboardForWeek(weekId: string): Promise<WeeklyScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('*')
    .eq('week_id', weekId)
    .order('rank', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getMemberScoreHistory(memberId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('*')
    .eq('member_id', memberId)
    .order('start_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getMemberSubmissionsForWeek(memberId: string, weekId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*, tasks(name, description)')
    .eq('member_id', memberId)
    .eq('week_id', weekId)

  if (error) throw error
  return data ?? []
}

export async function getAllTimeScoreboard() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weekly_scores')
    .select('member_id, full_name, total_points')

  if (error) throw error

  // Aggregate per member across all weeks
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

export async function getAllSubmissionsForWeek(weekId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('week_id', weekId)

  if (error) throw error
  return data ?? []
}
