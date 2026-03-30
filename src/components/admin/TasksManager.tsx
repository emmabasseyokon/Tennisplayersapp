'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props { initialTasks: Task[] }

const EMPTY = { name: '', description: '', points: 10 }

export function TasksManager({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (editing) {
      const { data, error: err } = await supabase
        .from('tasks')
        .update({ name: form.name, description: form.description || null, points: Number(form.points) })
        .eq('id', editing.id)
        .select()
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      setTasks(prev => prev.map(t => t.id === editing.id ? data as Task : t))
      setEditing(null)
    } else {
      const { data, error: err } = await supabase
        .from('tasks')
        .insert({ name: form.name, description: form.description || null, points: Number(form.points) })
        .select()
        .single()
      if (err) { setError(err.message); setLoading(false); return }
      setTasks(prev => [data as Task, ...prev])
    }

    setForm(EMPTY)
    setLoading(false)
  }

  async function toggleActive(task: Task) {
    const { data, error: err } = await supabase
      .from('tasks')
      .update({ is_active: !task.is_active })
      .eq('id', task.id)
      .select()
      .single()
    if (err) { alert(err.message); return }
    setTasks(prev => prev.map(t => t.id === task.id ? data as Task : t))
  }

  function startEdit(task: Task) {
    setEditing(task)
    setForm({ name: task.name, description: task.description ?? '', points: task.points })
  }

  function cancelEdit() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>

      {/* Form */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Task' : 'Add New Task'}</h2>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Task name *</label>
              <input
                required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Attended Service"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Optional details"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Points *</label>
              <input
                required type="number" min="1" value={form.points}
                onChange={e => setForm(f => ({ ...f, points: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" loading={loading}>{editing ? 'Save Changes' : 'Add Task'}</Button>
              {editing && <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Task list */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">All Tasks ({tasks.length})</h2>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No tasks yet. Add one above.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{task.name}</span>
                      <Badge variant={task.is_active ? 'success' : 'default'}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{task.description}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    <Badge variant="info">{task.points} pts</Badge>
                    <button onClick={() => startEdit(task)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleActive(task)} className="text-xs text-gray-500 hover:underline">
                      {task.is_active ? 'Deactivate' : 'Activate'}
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
