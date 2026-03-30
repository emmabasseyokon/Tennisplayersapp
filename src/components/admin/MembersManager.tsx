'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props { initialMembers: Profile[] }

export function MembersManager({ initialMembers }: Props) {
  const [members, setMembers] = useState<Profile[]>(initialMembers)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    // Admin creates member via Supabase Auth admin API (requires service role)
    // For client-side, we use signUp — in production use a server action with service role key
    const { data, error: authErr } = await supabase.auth.signUp({
      email: inviteEmail,
      password: invitePassword,
      options: { data: { full_name: inviteName } },
    })

    if (authErr) { setError(authErr.message); setLoading(false); return }
    if (data.user) {
      setSuccess(`Account created for ${inviteEmail}. They can now log in.`)
      setInviteEmail('')
      setInviteName('')
      setInvitePassword('')
      // Profile is auto-created by the DB trigger, add to local state
      const newProfile: Profile = {
        id: data.user.id,
        full_name: inviteName,
        email: inviteEmail,
        role: 'member',
        avatar_url: null,
        created_at: new Date().toISOString(),
      }
      setMembers(prev => [...prev, newProfile].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    }
    setLoading(false)
  }

  async function toggleRole(member: Profile) {
    const newRole = member.role === 'admin' ? 'member' : 'admin'
    if (!confirm(`Change ${member.full_name}'s role to ${newRole}?`)) return
    const { data, error: err } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', member.id)
      .select()
      .single()
    if (err) { alert(err.message); return }
    setMembers(prev => prev.map(m => m.id === member.id ? data as Profile : m))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Members</h1>

      {/* Add member */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">Add New Member</h2></CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}
          <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-3">
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
            <div className="sm:col-span-3">
              <Button type="submit" loading={loading}>Create Account</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader><h2 className="font-semibold text-gray-800">All Members ({members.length})</h2></CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No members yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map(member => (
                <li key={member.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{member.full_name}</span>
                      <Badge variant={member.role === 'admin' ? 'warning' : 'default'}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{member.email}</p>
                  </div>
                  <button
                    onClick={() => toggleRole(member)}
                    className="text-xs text-gray-500 hover:text-blue-600 hover:underline"
                  >
                    {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
