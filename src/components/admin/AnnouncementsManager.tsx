'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Announcement } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props { initialAnnouncements: Announcement[] }

export function AnnouncementsManager({ initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  function openModal() {
    setError(null)
    setForm({ title: '', body: '' })
    setModalOpen(true)
  }

  async function handlePost(e: React.SyntheticEvent<HTMLFormElement>) {
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
    setLoading(false)
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this announcement?')) return
    const { error: err } = await supabase.from('announcements').delete().eq('id', id)
    if (err) { alert(err.message); return }
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <Button onClick={openModal} className="w-full sm:w-auto">Add Announcement</Button>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">Posted Announcements ({announcements.length})</h2></CardHeader>
        <CardContent className="p-0">
          {announcements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No announcements posted yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {announcements.map(a => (
                <li key={a.id} className="px-4 py-3 sm:px-6 sm:py-4">
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
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

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Post Announcement</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

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
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading} className="flex-1">Post Announcement</Button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
