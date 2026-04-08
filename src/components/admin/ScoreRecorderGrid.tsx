'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Week, Member, Task, TaskCompletion } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { revalidateScoreboards } from '@/app/admin/actions'

interface Props {
  week: Week
  members: Member[]
  tasks: Task[]
  initialCompletions: TaskCompletion[]
}

// composite key for tracking completions
function key(memberId: string, taskId: string) {
  return `${memberId}:${taskId}`
}

export function ScoreRecorderGrid({ week, members, tasks, initialCompletions }: Props) {
  const supabase = createClient()
  const router = useRouter()

  // Set of "memberId:taskId" keys representing checked tasks
  const [checked, setChecked] = useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const c of initialCompletions) {
      set.add(key(c.member_id, c.task_id))
    }
    return set
  })

  // Track initial state for diffing on save
  const [initialKeys] = useState<Set<string>>(() => {
    const set = new Set<string>()
    for (const c of initialCompletions) {
      set.add(key(c.member_id, c.task_id))
    }
    return set
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(memberId: string, taskId: string) {
    const k = key(memberId, taskId)
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function getMemberTotal(memberId: string) {
    return tasks.reduce((sum, task) => {
      return sum + (checked.has(key(memberId, task.id)) ? task.points : 0)
    }, 0)
  }

  async function save() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    // Diff: find new completions and removed completions
    const toInsert: { week_id: string; member_id: string; task_id: string; recorded_by: string | null }[] = []
    const toDeleteKeys: string[] = []

    // New completions (in checked but not in initial)
    for (const k of checked) {
      if (!initialKeys.has(k)) {
        const [memberId, taskId] = k.split(':')
        toInsert.push({
          week_id: week.id,
          member_id: memberId,
          task_id: taskId,
          recorded_by: user?.id ?? null,
        })
      }
    }

    // Removed completions (in initial but not in checked)
    for (const k of initialKeys) {
      if (!checked.has(k)) {
        toDeleteKeys.push(k)
      }
    }

    // Insert new completions
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase
        .from('task_completions')
        .insert(toInsert)
      if (insErr) { setError(insErr.message); setSaving(false); return }
    }

    // Delete removed completions
    if (toDeleteKeys.length > 0) {
      for (const k of toDeleteKeys) {
        const [memberId, taskId] = k.split(':')
        await supabase
          .from('task_completions')
          .delete()
          .eq('week_id', week.id)
          .eq('member_id', memberId)
          .eq('task_id', taskId)
      }
    }

    await revalidateScoreboards()
    router.push('/admin/scoreboard')
  }

  const totalMaxPoints = tasks.reduce((sum, t) => sum + t.points, 0)

  if (tasks.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Scores</h1>
          <p className="mt-1 text-sm text-gray-500">{week.label}</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-400">No tasks defined for this week.</p>
            <p className="mt-2 text-sm text-gray-400">
              <a href="/admin/weeks" className="text-blue-600 hover:underline">Add tasks</a> in the Weeks manager first.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Scores</h1>
          <p className="mt-1 text-sm text-gray-500">{week.label} — {tasks.length} task{tasks.length !== 1 ? 's' : ''}, max {totalMaxPoints} pts</p>
          {week.is_locked && <Badge variant="danger" className="mt-2">Week Locked — Read Only</Badge>}
        </div>
        {!week.is_locked && (
          <div className="hidden sm:block">
            <Button onClick={save} loading={saving} size="lg">Save</Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Checkbox grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 sm:px-4">Member</th>
                  {tasks.map(task => (
                    <th key={task.id} className="px-2 py-3 text-center sm:px-3">
                      <div className="whitespace-nowrap">{task.name}</div>
                      <div className="mt-0.5 text-[10px] font-normal text-gray-400">{task.points} pts</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right sm:px-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member, idx) => {
                  const total = getMemberTotal(member.id)
                  return (
                    <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="sticky left-0 z-10 whitespace-nowrap px-3 py-3 font-medium text-gray-800 sm:px-4" style={{ backgroundColor: idx % 2 === 0 ? 'white' : 'rgb(249 250 251 / 0.5)' }}>
                        {member.full_name}
                      </td>
                      {tasks.map(task => {
                        const isChecked = checked.has(key(member.id, task.id))
                        return (
                          <td key={task.id} className="px-2 py-3 text-center sm:px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={week.is_locked}
                              onChange={() => toggle(member.id, task.id)}
                              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                          </td>
                        )
                      })}
                      <td className="px-3 py-3 text-right font-bold text-gray-900 sm:px-4">
                        {total}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile save button */}
      {!week.is_locked && (
        <div className="sm:hidden">
          <Button onClick={save} loading={saving} size="lg" className="w-full">Save</Button>
        </div>
      )}
    </div>
  )
}
