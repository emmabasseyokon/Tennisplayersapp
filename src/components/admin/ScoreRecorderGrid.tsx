'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Week, Task, Profile, Submission } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props {
  week: Week
  tasks: Task[]
  members: Profile[]
  initialSubmissions: Submission[]
}

// Key: `${memberId}:${taskId}`
type CheckMap = Record<string, boolean>

export function ScoreRecorderGrid({ week, tasks, members, initialSubmissions }: Props) {
  const supabase = createClient()

  // Build initial check state from existing submissions
  const toKey = (memberId: string, taskId: string) => `${memberId}:${taskId}`

  const [checks, setChecks] = useState<CheckMap>(() => {
    const map: CheckMap = {}
    for (const s of initialSubmissions) {
      map[toKey(s.member_id, s.task_id)] = true
    }
    return map
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(memberId: string, taskId: string) {
    if (week.is_locked) return
    setChecks(prev => {
      const key = toKey(memberId, taskId)
      return { ...prev, [key]: !prev[key] }
    })
    setSaved(false)
  }

  async function saveAll() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    // Build desired submission set
    const desired: { week_id: string; member_id: string; task_id: string; points: number; recorded_by: string | null }[] = []
    for (const member of members) {
      for (const task of tasks) {
        if (checks[toKey(member.id, task.id)]) {
          desired.push({
            week_id: week.id,
            member_id: member.id,
            task_id: task.id,
            points: task.points,
            recorded_by: user?.id ?? null,
          })
        }
      }
    }

    // Existing submission keys
    const existingKeys = new Set(
      initialSubmissions.map(s => toKey(s.member_id, s.task_id))
    )

    // Inserts: checked but not in DB
    const toInsert = desired.filter(d => !existingKeys.has(toKey(d.member_id, d.task_id)))

    // Deletes: in DB but now unchecked
    const checkedKeys = new Set(desired.map(d => toKey(d.member_id, d.task_id)))
    const toDelete = initialSubmissions.filter(s => !checkedKeys.has(toKey(s.member_id, s.task_id)))

    const errors: string[] = []

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('submissions').insert(toInsert)
      if (insertErr) errors.push(insertErr.message)
    }
    if (toDelete.length > 0) {
      const ids = toDelete.map(s => s.id)
      const { error: deleteErr } = await supabase.from('submissions').delete().in('id', ids)
      if (deleteErr) errors.push(deleteErr.message)
    }

    if (errors.length > 0) {
      setError(errors.join('; '))
    } else {
      setSaved(true)
    }

    setSaving(false)
  }

  // Per-member point totals
  function memberPoints(memberId: string) {
    return tasks.reduce((sum, t) => checks[toKey(memberId, t.id)] ? sum + t.points : sum, 0)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Scores</h1>
          <p className="mt-1 text-sm text-gray-500">{week.label}</p>
        </div>
        {week.is_locked ? (
          <Badge variant="danger">Week Locked</Badge>
        ) : (
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-green-600">Saved!</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
            <Button onClick={saveAll} loading={saving}>Save All Changes</Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">Check the tasks each member completed this week. Points are automatically calculated.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium text-gray-700 min-w-[160px]">
                  Member
                </th>
                {tasks.map(task => (
                  <th key={task.id} className="px-3 py-3 text-center font-medium text-gray-700 min-w-[100px]">
                    <div>{task.name}</div>
                    <div className="text-xs font-normal text-blue-600">{task.points} pts</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-gray-700 min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white px-4 py-3 font-medium text-gray-800 hover:bg-gray-50">
                    {member.full_name}
                  </td>
                  {tasks.map(task => {
                    const checked = !!checks[toKey(member.id, task.id)]
                    return (
                      <td key={task.id} className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggle(member.id, task.id)}
                          disabled={week.is_locked}
                          className={`h-7 w-7 rounded-md border-2 transition-colors ${
                            checked
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-gray-300 bg-white hover:border-blue-400'
                          } ${week.is_locked ? 'cursor-not-allowed opacity-60' : ''}`}
                          aria-label={`${checked ? 'Uncheck' : 'Check'} ${task.name} for ${member.full_name}`}
                        >
                          {checked && (
                            <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {memberPoints(member.id)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {!week.is_locked && (
        <div className="flex justify-end">
          <Button onClick={saveAll} loading={saving} size="lg">Save All Changes</Button>
        </div>
      )}
    </div>
  )
}
