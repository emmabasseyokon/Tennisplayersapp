import { createClient } from '@/lib/supabase/server'
import type { Task, TaskCompletion } from '@/types/database.types'

export async function getTasksForWeek(weekId: string): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('week_id', weekId)
    .order('sort_order')

  if (error) throw error
  return data ?? []
}

export async function getTaskCompletionsForWeek(weekId: string): Promise<TaskCompletion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('week_id', weekId)

  if (error) throw error
  return data ?? []
}
