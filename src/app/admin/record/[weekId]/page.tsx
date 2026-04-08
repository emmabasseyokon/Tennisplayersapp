import { notFound } from 'next/navigation'
import { getWeek } from '@/lib/queries/weeks'
import { getMembers } from '@/lib/queries/members'
import { getTasksForWeek, getTaskCompletionsForWeek } from '@/lib/queries/tasks'
import { ScoreRecorderGrid } from '@/components/admin/ScoreRecorderGrid'

interface Props {
  params: Promise<{ weekId: string }>
}

export default async function RecordScoresPage({ params }: Props) {
  const { weekId } = await params
  const [week, members, tasks, completions] = await Promise.all([
    getWeek(weekId),
    getMembers(),
    getTasksForWeek(weekId),
    getTaskCompletionsForWeek(weekId),
  ])

  if (!week) notFound()

  return (
    <ScoreRecorderGrid
      week={week}
      members={members}
      tasks={tasks}
      initialCompletions={completions}
    />
  )
}
