'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Week, Member, Submission } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props {
  week: Week
  members: Member[]
  initialSubmissions: Submission[]
}

type PointMap = Record<string, string>

export function ScoreRecorderGrid({ week, members, initialSubmissions }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [values, setValues] = useState<PointMap>(() => {
    const map: PointMap = {}
    for (const s of initialSubmissions) {
      map[s.member_id] = String(s.points)
    }
    return map
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(memberId: string, value: string) {
    setValues(prev => ({ ...prev, [memberId]: value }))
  }

  async function save() {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const upserts = members
      .filter(m => values[m.id] !== '' && values[m.id] !== undefined)
      .map(m => ({
        week_id: week.id,
        member_id: m.id,
        points: Number(values[m.id]) || 0,
        recorded_by: user?.id ?? null,
      }))

    if (upserts.length === 0) {
      setSaving(false)
      return
    }

    const { error: err } = await supabase
      .from('submissions')
      .upsert(upserts, { onConflict: 'week_id,member_id' })

    if (err) {
      setError(err.message)
      setSaving(false)
    } else {
      router.push('/admin/scoreboard')
    }
  }

  const totalRecorded = members.filter(m => values[m.id] !== '' && values[m.id] !== undefined).length

  return (
    <div className="space-y-4">
      {/* Header row with Save button top-right on desktop */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Scores</h1>
          <p className="mt-1 text-sm text-gray-500">{week.label}</p>
          {week.is_locked && <Badge variant="danger" className="mt-2">Week Locked — Read Only</Badge>}
        </div>
        {!week.is_locked && (
          <div className="hidden sm:block">
            <Button onClick={save} loading={saving} size="lg">Save</Button>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500">{totalRecorded} of {members.length} members scored</p>

      <Card>
        <CardHeader>
          <p className="text-sm text-gray-500">Enter each member&apos;s point total for this week.</p>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100">
            {members.map((member, idx) => {
              const pts = values[member.id] ?? ''
              const hasScore = pts !== ''
              return (
                <li key={member.id} className={`flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <span className="w-6 shrink-0 text-sm text-gray-400">{idx + 1}</span>
                  <span className="flex-1 font-medium text-gray-800">{member.full_name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      disabled={week.is_locked}
                      value={pts}
                      onChange={e => handleChange(member.id, e.target.value)}
                      placeholder="0"
                      className={`w-24 rounded-lg border px-3 py-1.5 text-right text-sm font-semibold focus:outline-none disabled:bg-gray-100 ${
                        hasScore
                          ? 'border-blue-400 bg-blue-50 text-blue-700 focus:border-blue-500'
                          : 'border-gray-200 text-gray-700 focus:border-blue-500'
                      }`}
                    />
                    <span className="text-xs text-gray-400">pts</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Mobile save button — full width, shown only on small screens */}
      {!week.is_locked && (
        <div className="space-y-2 sm:hidden">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={save} loading={saving} size="lg" className="w-full">Save</Button>
        </div>
      )}
      {/* Desktop error — shown below the card */}
      {error && <p className="hidden text-sm text-red-600 sm:block">{error}</p>}
    </div>
  )
}
