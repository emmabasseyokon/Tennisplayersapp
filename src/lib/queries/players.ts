import { createClient } from '@/lib/supabase/server'
import type { Player } from '@/types/database.types'

export async function getPlayers(): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('full_name')

  if (error) throw error
  return data ?? []
}

export async function getPlayer(id: string): Promise<Player | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
