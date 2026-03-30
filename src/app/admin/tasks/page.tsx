import { getAllTasks } from '@/lib/queries/tasks'
import { TasksManager } from '@/components/admin/TasksManager'

export default async function AdminTasksPage() {
  const tasks = await getAllTasks()
  return <TasksManager initialTasks={tasks} />
}
