'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Week } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Link from 'next/link'

interface Props { initialWeeks: Week[] }

type WeekForm = { label: string; start_date: string; end_date: string }

export function WeeksManager({ initialWeeks }: Props) {
  const [weeks, setWeeks] = useState<Week[]>(initialWeeks)
  const [createOpen, setCreateOpen] = useState(false)
  const [editWeek, setEditWeek] = useState<Week | null>(null)
  const [form, setForm] = useState<WeekForm>({ label: '', start_date: '', end_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  function suggestLabel(start: string) {
    if (!start) return ''
    const d = new Date(start)
    return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }

  function openCreate() {
    setError(null)
    setForm({ label: '', start_date: '', end_date: '' })
    setCreateOpen(true)
  }

  function openEdit(week: Week) {
    setError(null)
    setForm({ label: week.label, start_date: week.start_date, end_date: week.end_date })
    setEditWeek(week)
  }

  function closeModals() {
    setCreateOpen(false)
    setEditWeek(null)
    setError(null)
  }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
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
    setLoading(false)
    closeModals()
  }

  async function handleEdit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editWeek) return
    setError(null)
    setLoading(true)
    const { data, error: err } = await supabase
      .from('weeks')
      .update({ label: form.label, start_date: form.start_date, end_date: form.end_date })
      .eq('id', editWeek.id)
      .select()
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setWeeks(prev => prev.map(w => w.id === editWeek.id ? data as Week : w))
    setLoading(false)
    closeModals()
  }

  async function toggleLock(week: Week) {
    if (!confirm(week.is_locked
      ? `Unlock "${week.label}"? Submissions can be edited.`
      : `Lock "${week.label}"? No more changes can be made.`
    )) return
    const { data, error: err } = await supabase
      .from('weeks')
      .update({ is_locked: !week.is_locked })
      .eq('id', week.id)
      .select()
      .single()
    if (err) { alert(err.message); return }
    setWeeks(prev => prev.map(w => w.id === week.id ? data as Week : w))
  }

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    if (!openDropdown) return
    function handleClick() { setOpenDropdown(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openDropdown])

  const modalOpen = createOpen || !!editWeek

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Weeks</h1>
        <Button onClick={openCreate} className="w-full sm:w-auto">Create Week</Button>
      </div>

      {/* Weeks list */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">All Weeks ({weeks.length})</h2></CardHeader>
        <CardContent className="p-0">
          {weeks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No weeks yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {weeks.map(week => (
                <li key={week.id} className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                  {/* Week info */}
                  <div>
                    <span className="font-medium text-gray-800">{week.label}</span>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(week.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(week.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="mt-1">
                      <Badge variant={week.is_locked ? 'danger' : 'success'}>
                        {week.is_locked ? 'Locked' : 'Open'}
                      </Badge>
                    </div>
                  </div>

                  {/* Desktop actions — text links */}
                  <div className="hidden items-center gap-3 sm:flex">
                    {!week.is_locked && (
                      <Link href={`/admin/record/${week.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                        Record Scores
                      </Link>
                    )}
                    <button onClick={() => openEdit(week)} className="text-xs text-gray-500 hover:text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => toggleLock(week)} className="text-xs text-gray-500 hover:underline">
                      {week.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>

                  {/* Mobile actions — 3-dot kebab menu */}
                  <div className="relative sm:hidden">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === week.id ? null : week.id) }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Options"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {openDropdown === week.id && (
                      <div className="absolute right-0 top-9 z-10 min-w-[150px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        {!week.is_locked && (
                          <Link
                            href={`/admin/record/${week.id}`}
                            onClick={() => setOpenDropdown(null)}
                            className="block px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-gray-50"
                          >
                            Record Scores
                          </Link>
                        )}
                        <button
                          onClick={() => { setOpenDropdown(null); openEdit(week) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setOpenDropdown(null); toggleLock(week) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {week.is_locked ? 'Unlock' : 'Lock'}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modal — shared for create and edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {createOpen ? 'Create New Week' : `Edit: ${editWeek?.label}`}
              </h2>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <form onSubmit={createOpen ? handleCreate : handleEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start date *</label>
                <input
                  required type="date" value={form.start_date}
                  onChange={e => {
                    const start = e.target.value
                    setForm(f => ({
                      ...f,
                      start_date: start,
                      label: f.label || suggestLabel(start),
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
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading} className="flex-1">
                  {createOpen ? 'Create Week' : 'Save Changes'}
                </Button>
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
