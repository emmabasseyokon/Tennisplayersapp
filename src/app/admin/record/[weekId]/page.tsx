import { notFound } from 'next/navigation'
import { getWeek } from '@/lib/queries/weeks'
import { getActiveTasks } from '@/lib/queries/tasks'
import { getMembers } from '@/lib/queries/members'
import { getAllSubmissionsForWeek } from '@/lib/queries/scores'
import { ScoreRecorderGrid } from '@/components/admin/ScoreRecorderGrid'

interface Props {
  params: Promise<{ weekId: string }>
}

export default async function RecordScoresPage({ params }: Props) {
  const { weekId } = await params
  const [week, tasks, members, submissions] = await Promise.all([
    getWeek(weekId),
    getActiveTasks(),
    getMembers(),
    getAllSubmissionsForWeek(weekId),
  ])

  if (!week) notFound()

  return (
    <ScoreRecorderGrid
      week={week}
      tasks={tasks}
      members={members}
      initialSubmissions={submissions}
    />
  )
}
