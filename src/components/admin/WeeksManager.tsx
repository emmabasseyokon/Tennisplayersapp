'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Week } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Link from 'next/link'

interface Props { initialWeeks: Week[] }

export function WeeksManager({ initialWeeks }: Props) {
  const [weeks, setWeeks] = useState<Week[]>(initialWeeks)
  const [form, setForm] = useState({ label: '', start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Suggest a label when dates are picked
  function suggestLabel(start: string, end: string) {
    if (!start) return ''
    const d = new Date(start)
    return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: err } = await supabase
      .from('weeks')
      .insert({ label: form.label, start_date: form.start_date, end_date: form.end_date })
      .select()
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setWeeks(prev => [data as Week, ...prev])
    setForm({ label: '', start_date: '', end_date: '' })
    setLoading(false)
  }

  async function toggleLock(week: Week) {
    if (!confirm(week.is_locked ? `Unlock "${week.label}"? Submissions can be edited.` : `Lock "${week.label}"? No more changes can be made.`)) return
    const { data, error: err } = await supabase
      .from('weeks')
      .update({ is_locked: !week.is_locked })
      .eq('id', week.id)
      .select()
      .single()
    if (err) { alert(err.message); return }
    setWeeks(prev => prev.map(w => w.id === week.id ? data as Week : w))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Weeks</h1>

      {/* Create form */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">Create New Week</h2></CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Start date *</label>
              <input
                required type="date" value={form.start_date}
                onChange={e => {
                  const start = e.target.value
                  setForm(f => ({
                    ...f,
                    start_date: start,
                    label: f.label || suggestLabel(start, f.end_date),
                  }))
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">End date *</label>
              <input
                required type="date" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Label *</label>
              <input
                required value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Week of March 24"
              />
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" loading={loading}>Create Week</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Weeks list */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">All Weeks ({weeks.length})</h2></CardHeader>
        <CardContent className="p-0">
          {weeks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No weeks yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {weeks.map(week => (
                <li key={week.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{week.label}</span>
                      <Badge variant={week.is_locked ? 'danger' : 'success'}>
                        {week.is_locked ? 'Locked' : 'Open'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(week.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(week.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!week.is_locked && (
                      <Link href={`/admin/record/${week.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                        Record Scores
                      </Link>
                    )}
                    <button onClick={() => toggleLock(week)} className="text-xs text-gray-500 hover:underline">
                      {week.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
