'use client'

import { useState } from 'react'
import { createMember, updateMember, toggleMemberRole } from '@/app/admin/members/actions'
import type { Profile } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props { initialMembers: Profile[] }

export function MembersManager({ initialMembers }: Props) {
  const [members, setMembers] = useState<Profile[]>(initialMembers)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')

  // Edit modal
  const [editMember, setEditMember] = useState<Profile | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openCreate() {
    setError(null)
    setInviteEmail('')
    setInviteName('')
    setInvitePassword('')
    setCreateOpen(true)
  }

  function openEdit(member: Profile) {
    setError(null)
    setEditName(member.full_name)
    setEditEmail(member.email)
    setEditPassword('')
    setEditMember(member)
  }

  function closeModals() {
    setCreateOpen(false)
    setEditMember(null)
    setError(null)
  }

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.set('email', inviteEmail)
    formData.set('password', invitePassword)
    formData.set('full_name', inviteName)

    const result = await createMember(formData)
    if (result.error) { setError(result.error); setLoading(false); return }

    const newProfile: Profile = {
      id: result.userId!,
      full_name: inviteName,
      email: inviteEmail,
      role: 'member',
      avatar_url: null,
      created_at: new Date().toISOString(),
    }
    setMembers(prev => [...prev, newProfile].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setLoading(false)
    closeModals()
  }

  async function handleEdit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editMember) return
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.set('user_id', editMember.id)
    formData.set('full_name', editName)
    formData.set('email', editEmail)
    if (editPassword) formData.set('password', editPassword)

    const result = await updateMember(formData)
    if (result.error) { setError(result.error); setLoading(false); return }

    setMembers(prev => prev.map(m =>
      m.id === editMember.id ? { ...m, full_name: editName, email: editEmail } : m
    ))
    setLoading(false)
    closeModals()
  }

  async function toggleRole(member: Profile) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`Change ${member.full_name}'s role to ${newRole}?`)) return
    const result = await toggleMemberRole(member.id, member.role)
    if (result.error) { alert(result.error); return }
    setMembers(prev => prev.map(m =>
      m.id === member.id ? { ...m, role: result.newRole as 'admin' | 'member' } : m
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <Button onClick={openCreate}>Add Member</Button>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">All Members ({members.length})</h2></CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No members yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map(member => (
                <li key={member.id} className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{member.full_name}</span>
                      <Badge variant={member.role === 'admin' ? 'warning' : 'default'}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEdit(member)}
                      className="text-xs text-gray-500 hover:text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleRole(member)}
                      className="text-xs text-gray-500 hover:text-blue-600 hover:underline"
                    >
                      {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add New Member</h2>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full name *</label>
                <input
                  required value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email address *</label>
                <input
                  required type="email" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="member@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Temporary password *</label>
                <input
                  required type="password" minLength={6} value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading} className="flex-1">Create Account</Button>
                <button type="button" onClick={closeModals} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit Member</h2>
              <button onClick={closeModals} className="text-gray-400 hover:text-gray-600" aria-label="Close">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full name *</label>
                <input
                  required value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email address *</label>
                <input
                  required type="email" value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
                <input
                  type="password" minLength={6} value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Leave blank to keep current password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" loading={loading} className="flex-1">Save Changes</Button>
                <button type="button" onClick={closeModals} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
