'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Announcement } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props { initialAnnouncements: Announcement[] }

export function AnnouncementsManager({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [form, setForm] = useState({ title: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error: err } = await supabase
      .from('announcements')
      .insert({ title: form.title, body: form.body, created_by: user?.id ?? null })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }
    setAnnouncements(prev => [data as Announcement, ...prev])
    setForm({ title: '', body: '' })
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return
    const { error: err } = await supabase.from('announcements').delete().eq('id', id)
    if (err) { alert(err.message); return }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">Post Announcement</h2></CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={handlePost} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
              <input
                required value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Message *</label>
              <textarea
                required rows={4} value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Write your message here..."
              />
            </div>
            <Button type="submit" loading={loading}>Post Announcement</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">Posted Announcements ({announcements.length})</h2></CardHeader>
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No announcements posted yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {announcements.map(a => (
                <li key={a.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{a.title}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{a.body}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="shrink-0 text-xs text-red-500 hover:underline"
                    >
                      Delete
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
