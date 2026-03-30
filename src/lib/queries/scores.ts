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

export async function getAllSubmissionsForWeek(weekId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('week_id', weekId)

  if (error) throw error
  return data ?? []
}
