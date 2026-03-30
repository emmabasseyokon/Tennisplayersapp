import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/types/database.types'

export async function getActiveTasks(): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data ?? []
}

export async function getAllTasks(): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('name')

  if (error) throw error
  return data ?? []
}
