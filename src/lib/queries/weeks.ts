import { createClient } from '@/lib/supabase/server'
import type { Week } from '@/types/database.types'

export async function getWeeks(): Promise<Week[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getWeek(id: string): Promise<Week | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getLatestWeek(): Promise<Week | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('weeks')
    .select('*')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data
}
