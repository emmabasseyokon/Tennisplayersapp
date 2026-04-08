'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Week, Task } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Link from 'next/link'

interface Props { initialWeeks: Week[]; autoCreate?: boolean }

type TaskRow = { id?: string; name: string; points: number }
type WeekForm = { label: string; start_date: string; end_date: string; tasks: TaskRow[] }

const emptyTask = (): TaskRow => ({ name: '', points: 5 })

export function WeeksManager({ initialWeeks, autoCreate }: Props) {
  const [weeks, setWeeks] = useState<Week[]>(initialWeeks)
  const [createOpen, setCreateOpen] = useState(autoCreate ?? false)
  const [editWeek, setEditWeek] = useState<Week | null>(null)
  const [deleteWeek, setDeleteWeek] = useState<Week | null>(null)
  const [lockWeek, setLockWeek] = useState<Week | null>(null)
  const [form, setForm] = useState<WeekForm>({ label: '', start_date: '', end_date: '', tasks: [emptyTask()] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Track original tasks for diffing on edit
  const [originalTasks, setOriginalTasks] = useState<Task[]>([])

  const supabase = createClient()

  function suggestLabel(start: string) {
    if (!start) return ''
    const d = new Date(start)
    return `Week of ${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }

  function openCreate() {
    setError(null)
    setForm({ label: '', start_date: '', end_date: '', tasks: [emptyTask()] })
    setOriginalTasks([])
    setCreateOpen(true)
  }

  async function openEdit(week: Week) {
    setError(null)
    // Fetch existing tasks for this week
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('week_id', week.id)
      .order('sort_order')
    const existing = (tasks ?? []) as Task[]
    setOriginalTasks(existing)
    setForm({
      label: week.label,
      start_date: week.start_date,
      end_date: week.end_date,
      tasks: existing.length > 0
        ? existing.map(t => ({ id: t.id, name: t.name, points: t.points }))
        : [emptyTask()],
    })
    setEditWeek(week)
  }

  function closeModals() {
    setCreateOpen(false)
    setEditWeek(null)
    setDeleteWeek(null)
    setLockWeek(null)
    setError(null)
  }

  // ── Task form helpers ──────────────────────────────────────

  function updateTask(index: number, field: 'name' | 'points', value: string | number) {
    setForm(f => ({
      ...f,
      tasks: f.tasks.map((t, i) => i === index ? { ...t, [field]: value } : t),
    }))
  }

  function addTask() {
    setForm(f => ({ ...f, tasks: [...f.tasks, emptyTask()] }))
  }

  function removeTask(index: number) {
    setForm(f => ({ ...f, tasks: f.tasks.filter((_, i) => i !== index) }))
  }

  // ── Handlers ───────────────────────────────────────────────

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const validTasks = form.tasks.filter(t => t.name.trim())
    if (validTasks.length === 0) { setError('Add at least one task.'); return }
    setLoading(true)

    // Create week
    const { data: weekData, error: weekErr } = await supabase
      .from('weeks')
      .insert({ label: form.label, start_date: form.start_date, end_date: form.end_date })
      .select()
      .single()
    if (weekErr) { setError(weekErr.message); setLoading(false); return }

    // Create tasks
    const taskInserts = validTasks.map((t, i) => ({
      week_id: weekData.id,
      name: t.name.trim(),
      points: Number(t.points) || 5,
      sort_order: i,
    }))
    const { error: taskErr } = await supabase.from('tasks').insert(taskInserts)
    if (taskErr) { setError(taskErr.message); setLoading(false); return }

    setWeeks(prev => [weekData as Week, ...prev])
    setLoading(false)
    closeModals()
  }

  async function handleEdit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editWeek) return
    setError(null)
    const validTasks = form.tasks.filter(t => t.name.trim())
    if (validTasks.length === 0) { setError('Add at least one task.'); return }
    setLoading(true)

    // Update week
    const { data: weekData, error: weekErr } = await supabase
      .from('weeks')
      .update({ label: form.label, start_date: form.start_date, end_date: form.end_date })
      .eq('id', editWeek.id)
      .select()
      .single()
    if (weekErr) { setError(weekErr.message); setLoading(false); return }

    // Diff tasks: delete removed, update existing, insert new
    const currentIds = new Set(validTasks.filter(t => t.id).map(t => t.id!))
    const toDelete = originalTasks.filter(t => !currentIds.has(t.id))
    const toUpdate = validTasks.filter(t => t.id)
    const toInsert = validTasks.filter(t => !t.id)

    // Delete removed tasks
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('tasks')
        .delete()
        .in('id', toDelete.map(t => t.id))
      if (delErr) { setError(delErr.message); setLoading(false); return }
    }

    // Update existing tasks
    for (let i = 0; i < toUpdate.length; i++) {
      const t = toUpdate[i]
      const { error: upErr } = await supabase
        .from('tasks')
        .update({ name: t.name.trim(), points: Number(t.points) || 5, sort_order: i })
        .eq('id', t.id!)
      if (upErr) { setError(upErr.message); setLoading(false); return }
    }

    // Insert new tasks
    if (toInsert.length > 0) {
      const inserts = toInsert.map((t, i) => ({
        week_id: editWeek.id,
        name: t.name.trim(),
        points: Number(t.points) || 5,
        sort_order: toUpdate.length + i,
      }))
      const { error: insErr } = await supabase.from('tasks').insert(inserts)
      if (insErr) { setError(insErr.message); setLoading(false); return }
    }

    setWeeks(prev => prev.map(w => w.id === editWeek.id ? weekData as Week : w))
    setLoading(false)
    closeModals()
  }

  async function handleToggleLock() {
    if (!lockWeek) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('weeks')
      .update({ is_locked: !lockWeek.is_locked })
      .eq('id', lockWeek.id)
      .select()
      .single()
    if (err) { setError(err.message); setLoading(false); return }
    setWeeks(prev => prev.map(w => w.id === lockWeek.id ? data as Week : w))
    setLoading(false)
    setLockWeek(null)
  }

  async function handleDeleteWeek() {
    if (!deleteWeek) return
    setLoading(true)
    const { error: err } = await supabase.from('weeks').delete().eq('id', deleteWeek.id)
    if (err) { setError(err.message); setLoading(false); return }
    setWeeks(prev => prev.filter(w => w.id !== deleteWeek.id))
    setLoading(false)
    setDeleteWeek(null)
  }

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

                  {/* Desktop actions */}
                  <div className="hidden items-center gap-3 sm:flex">
                    {!week.is_locked && (
                      <Link href={`/admin/record/${week.id}`} className="text-xs font-medium text-blue-600 hover:underline">
                        Record Scores
                      </Link>
                    )}
                    <button onClick={() => openEdit(week)} className="text-xs text-gray-500 hover:text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => setLockWeek(week)} className="text-xs text-gray-500 hover:underline">
                      {week.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                    <button onClick={() => setDeleteWeek(week)} className="text-xs text-red-500 hover:text-red-700 hover:underline">Delete</button>
                  </div>

                  {/* Mobile kebab */}
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
                          <Link href={`/admin/record/${week.id}`} onClick={() => setOpenDropdown(null)}
                            className="block px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-gray-50">
                            Record Scores
                          </Link>
                        )}
                        <button onClick={() => { setOpenDropdown(null); openEdit(week) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                        <button onClick={() => { setOpenDropdown(null); setLockWeek(week) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
                          {week.is_locked ? 'Unlock' : 'Lock'}
                        </button>
                        <button onClick={() => { setOpenDropdown(null); setDeleteWeek(week) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      {deleteWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Delete Week</h2>
              <CloseBtn onClick={() => setDeleteWeek(null)} />
            </div>
            {error && <ErrorBanner msg={error} />}
            <p className="mb-1 text-sm text-gray-700">
              Are you sure you want to delete <span className="font-semibold">&ldquo;{deleteWeek.label}&rdquo;</span>?
            </p>
            <p className="mb-6 text-xs text-red-600">This will permanently remove the week, its tasks, and all scores.</p>
            <div className="flex gap-3">
              <Button onClick={handleDeleteWeek} loading={loading} className="flex-1 !bg-red-600 hover:!bg-red-700">Delete</Button>
              <CancelBtn onClick={() => setDeleteWeek(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Lock/Unlock confirmation modal */}
      {lockWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">{lockWeek.is_locked ? 'Unlock Week' : 'Lock Week'}</h2>
              <CloseBtn onClick={() => setLockWeek(null)} />
            </div>
            {error && <ErrorBanner msg={error} />}
            <p className="mb-6 text-sm text-gray-700">
              {lockWeek.is_locked
                ? <>Unlock <span className="font-semibold">&ldquo;{lockWeek.label}&rdquo;</span>? Scores will be editable again.</>
                : <>Lock <span className="font-semibold">&ldquo;{lockWeek.label}&rdquo;</span>? No more changes can be made.</>
              }
            </p>
            <div className="flex gap-3">
              <Button onClick={handleToggleLock} loading={loading} className="flex-1">{lockWeek.is_locked ? 'Unlock' : 'Lock'}</Button>
              <CancelBtn onClick={() => setLockWeek(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {createOpen ? 'Create New Week' : `Edit: ${editWeek?.label}`}
              </h2>
              <CloseBtn onClick={closeModals} />
            </div>

            {error && <ErrorBanner msg={error} />}

            <form onSubmit={createOpen ? handleCreate : handleEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start date *</label>
                <input required type="date" value={form.start_date}
                  onChange={e => {
                    const start = e.target.value
                    setForm(f => ({ ...f, start_date: start, label: f.label || suggestLabel(start) }))
                  }}
                  className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End date *</label>
                <input required type="date" value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Label *</label>
                <input required value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className={inputCls} placeholder="e.g. Week of March 24" />
              </div>

              {/* Tasks section */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Tasks *</label>
                <div className="space-y-2">
                  {form.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={task.name}
                        onChange={e => updateTask(i, 'name', e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder="Task name"
                      />
                      <input
                        type="number"
                        min="1"
                        value={task.points}
                        onChange={e => updateTask(i, 'points', Number(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-right focus:border-blue-500 focus:outline-none"
                        placeholder="pts"
                      />
                      {form.tasks.length > 1 && (
                        <button type="button" onClick={() => removeTask(i)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addTask}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                  + Add Task
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading} className="flex-1">
                  {createOpen ? 'Create Week' : 'Save Changes'}
                </Button>
                <CancelBtn onClick={closeModals} />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tiny helpers ──────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

function ErrorBanner({ msg }: { msg: string }) {
  return <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{msg}</div>
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-gray-400 hover:text-gray-600" aria-label="Close">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
      Cancel
    </button>
  )
}
