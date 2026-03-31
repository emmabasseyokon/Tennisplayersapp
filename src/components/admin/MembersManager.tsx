'use client'

import { useEffect, useRef, useState } from 'react'
import { createMember, updateMember, toggleMemberRole, importMembers } from '@/app/admin/members/actions'
import type { ImportResult } from '@/app/admin/members/actions'
import type { Profile } from '@/types/database.types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props { initialMembers: Profile[] }

// ── CSV parsing ───────────────────────────────────────────────────────────────

type ParsedRow = { full_name: string; email: string; rowNum: number; error?: string }

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else { current += ch }
  }
  result.push(current.trim())
  return result
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseCSV(text: string): { rows: ParsedRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], error: 'CSV has no data rows.' }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim())
  const nameIdx  = headers.findIndex(h => h === 'full_name' || h === 'name')
  const emailIdx = headers.findIndex(h => h === 'email')

  if (nameIdx === -1) return { rows: [], error: 'Missing column: full_name (or name)' }
  if (emailIdx === -1) return { rows: [], error: 'Missing column: email' }

  const seenEmails = new Set<string>()
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols      = parseCSVLine(lines[i])
    const full_name = (cols[nameIdx]  ?? '').replace(/^["']|["']$/g, '').trim()
    const email     = (cols[emailIdx] ?? '').replace(/^["']|["']$/g, '').trim().toLowerCase()

    if (!full_name && !email) continue // skip blank lines

    let error: string | undefined
    if (!full_name)             error = 'Name is empty'
    else if (!EMAIL_RE.test(email)) error = 'Invalid email'
    else if (seenEmails.has(email)) error = 'Duplicate email in file'
    else seenEmails.add(email)

    rows.push({ full_name, email, rowNum: i + 1, error })
  }

  if (rows.length === 0) return { rows: [], error: 'No data rows found.' }
  return { rows }
}

// ── Credentials download ──────────────────────────────────────────────────────

function downloadCredentials(results: ImportResult[]) {
  const successful = results.filter(r => r.status === 'success')
  const header = 'Full Name,Email,Temporary Password\n'
  const body   = successful
    .map(r => `"${r.full_name.replace(/"/g, '""')}","${r.email}","${r.password}"`)
    .join('\n')
  const blob = new Blob([header + body], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'member-credentials.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MembersManager({ initialMembers }: Props) {
  const [members, setMembers] = useState<Profile[]>(initialMembers)

  // Create modal
  const [createOpen, setCreateOpen]     = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteName, setInviteName]     = useState('')
  const [invitePassword, setInvitePassword] = useState('')

  // Edit modal
  const [editMember, setEditMember]   = useState<Profile | null>(null)
  const [editName, setEditName]       = useState('')
  const [editEmail, setEditEmail]     = useState('')
  const [editPassword, setEditPassword] = useState('')

  // Import modal
  const [importOpen, setImportOpen]       = useState(false)
  const [importRows, setImportRows]       = useState<ParsedRow[]>([])
  const [parseError, setParseError]       = useState<string | null>(null)
  const [importing, setImporting]         = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return
    function handleClick() { setOpenDropdown(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openDropdown])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setError(null); setInviteEmail(''); setInviteName(''); setInvitePassword('')
    setCreateOpen(true)
  }

  function openEdit(member: Profile) {
    setError(null); setEditName(member.full_name); setEditEmail(member.email); setEditPassword('')
    setEditMember(member)
  }

  function openImport() {
    setParseError(null); setImportRows([]); setImportResults(null)
    setImportOpen(true)
    // reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function closeModals() {
    setCreateOpen(false); setEditMember(null); setImportOpen(false)
    setImportResults(null); setImportRows([]); setParseError(null)
    setError(null)
  }

  // ── File parsing ─────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows, error: err } = parseCSV(ev.target?.result as string)
      if (err) { setParseError(err); setImportRows([]) }
      else     { setParseError(null); setImportRows(rows) }
    }
    reader.readAsText(file)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setLoading(true)
    const fd = new FormData()
    fd.set('email', inviteEmail); fd.set('password', invitePassword); fd.set('full_name', inviteName)
    const result = await createMember(fd)
    if (result.error) { setError(result.error); setLoading(false); return }
    const newProfile: Profile = {
      id: result.userId!, full_name: inviteName, email: inviteEmail,
      role: 'member', avatar_url: null, created_at: new Date().toISOString(),
    }
    setMembers(prev => [...prev, newProfile].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    setLoading(false); closeModals()
  }

  async function handleEdit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editMember) return; setError(null); setLoading(true)
    const fd = new FormData()
    fd.set('user_id', editMember.id); fd.set('full_name', editName); fd.set('email', editEmail)
    if (editPassword) fd.set('password', editPassword)
    const result = await updateMember(fd)
    if (result.error) { setError(result.error); setLoading(false); return }
    setMembers(prev => prev.map(m =>
      m.id === editMember.id ? { ...m, full_name: editName, email: editEmail } : m
    ))
    setLoading(false); closeModals()
  }

  async function handleImport() {
    const validRows = importRows.filter(r => !r.error)
    if (validRows.length === 0) return
    setImporting(true)
    const res = await importMembers(validRows.map(r => ({ full_name: r.full_name, email: r.email })))
    setImporting(false)
    if ('error' in res) { setParseError(res.error); return }
    setImportResults(res.results)
    // Add successfully created members to the live list
    const newProfiles: Profile[] = res.results
      .filter(r => r.status === 'success')
      .map(r => ({
        id: r.userId!, full_name: r.full_name, email: r.email,
        role: 'member' as const, avatar_url: null, created_at: new Date().toISOString(),
      }))
    if (newProfiles.length > 0) {
      setMembers(prev => [...prev, ...newProfiles].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    }
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

  // ── Derived ───────────────────────────────────────────────────────────────────

  const validImportRows   = importRows.filter(r => !r.error)
  const invalidImportRows = importRows.filter(r => r.error)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={openImport} className="w-full sm:w-auto">Import Members</Button>
          <Button onClick={openCreate} className="w-full sm:w-auto">Add Member</Button>
        </div>
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
                  {/* Member info */}
                  <div>
                    <span className="font-medium text-gray-800">{member.full_name}</span>
                    <p className="mt-0.5 text-xs text-gray-500">{member.email}</p>
                    <div className="mt-1">
                      <Badge variant={member.role === 'admin' ? 'warning' : 'default'}>{member.role}</Badge>
                    </div>
                  </div>

                  {/* Desktop actions — text links */}
                  <div className="hidden items-center gap-3 sm:flex">
                    <button onClick={() => openEdit(member)} className="text-xs text-gray-500 hover:text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleRole(member)} className="text-xs text-gray-500 hover:text-blue-600 hover:underline">
                      {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                  </div>

                  {/* Mobile actions — 3-dot kebab menu */}
                  <div className="relative sm:hidden">
                    <button
                      onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === member.id ? null : member.id) }}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label="Options"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    {openDropdown === member.id && (
                      <div className="absolute right-0 top-9 z-10 min-w-[150px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button
                          onClick={() => { setOpenDropdown(null); openEdit(member) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setOpenDropdown(null); toggleRole(member) }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {member.role === 'admin' ? 'Remove admin' : 'Make admin'}
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

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <ModalHeader title="Add New Member" onClose={closeModals} />
            {error && <ErrorBanner msg={error} />}
            <form onSubmit={handleCreate} className="space-y-4">
              <Field label="Full name *">
                <input required value={inviteName} onChange={e => setInviteName(e.target.value)}
                  className={inputCls} placeholder="John Doe" />
              </Field>
              <Field label="Email address *">
                <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className={inputCls} placeholder="member@example.com" />
              </Field>
              <Field label="Temporary password *">
                <input required type="password" minLength={6} value={invitePassword}
                  onChange={e => setInvitePassword(e.target.value)} className={inputCls} placeholder="Min 6 characters" />
              </Field>
              <ModalActions primary={<Button type="submit" loading={loading} className="flex-1">Create Account</Button>} onCancel={closeModals} />
            </form>
          </div>
        </div>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────────── */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <ModalHeader title="Edit Member" onClose={closeModals} />
            {error && <ErrorBanner msg={error} />}
            <form onSubmit={handleEdit} className="space-y-4">
              <Field label="Full name *">
                <input required value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email address *">
                <input required type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className={inputCls} />
              </Field>
              <Field label="New password">
                <input type="password" minLength={6} value={editPassword}
                  onChange={e => setEditPassword(e.target.value)} className={inputCls}
                  placeholder="Leave blank to keep current password" />
              </Field>
              <ModalActions primary={<Button type="submit" loading={loading} className="flex-1">Save Changes</Button>} onCancel={closeModals} />
            </form>
          </div>
        </div>
      )}

      {/* ── Import modal ─────────────────────────────────────────────────────── */}
      {importOpen && !importResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <ModalHeader title="Import Members from CSV" onClose={closeModals} />

            {/* Format guide */}
            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-medium">Required CSV columns:</p>
              <p className="mt-1 font-mono text-xs">full_name, email</p>
              <p className="mt-1 text-xs text-blue-600">Temporary passwords are auto-generated. You'll get a downloadable credentials sheet after import.</p>
            </div>

            {/* File input */}
            <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-blue-400">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-gray-600">
                {importRows.length > 0 ? `${importRows.length} rows parsed` : 'Choose a CSV file'}
              </span>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </label>

            {parseError && <ErrorBanner msg={parseError} />}

            {/* Preview table */}
            {importRows.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-3 text-sm">
                  {validImportRows.length > 0 && (
                    <span className="font-medium text-green-700">✓ {validImportRows.length} valid</span>
                  )}
                  {invalidImportRows.length > 0 && (
                    <span className="font-medium text-red-600">✗ {invalidImportRows.length} will be skipped</span>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-200 text-left font-medium uppercase tracking-wider text-gray-500">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importRows.map(row => (
                        <tr key={row.rowNum} className={row.error ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 text-gray-400">{row.rowNum}</td>
                          <td className="px-3 py-2 text-gray-800">{row.full_name || <span className="italic text-gray-400">empty</span>}</td>
                          <td className="px-3 py-2 text-gray-600">{row.email || <span className="italic text-gray-400">empty</span>}</td>
                          <td className="px-3 py-2">
                            {row.error
                              ? <span className="text-red-600">✗ {row.error}</span>
                              : <span className="text-green-600">✓ valid</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <ModalActions
              primary={
                <Button
                  onClick={handleImport}
                  loading={importing}
                  disabled={validImportRows.length === 0}
                  className="flex-1"
                >
                  Import {validImportRows.length > 0 ? `${validImportRows.length} Members` : ''}
                </Button>
              }
              onCancel={closeModals}
            />
          </div>
        </div>
      )}

      {/* ── Import results modal ─────────────────────────────────────────────── */}
      {importOpen && importResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <ModalHeader title="Import Complete" onClose={closeModals} />

            {/* Summary */}
            <div className="mb-4 flex gap-4 text-sm font-medium">
              <span className="text-green-700">
                ✓ {importResults.filter(r => r.status === 'success').length} imported
              </span>
              {importResults.filter(r => r.status === 'error').length > 0 && (
                <span className="text-red-600">
                  ✗ {importResults.filter(r => r.status === 'error').length} failed
                </span>
              )}
            </div>

            {/* Results table */}
            <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200 text-left font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Temp Password</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {importResults.map((r, i) => (
                    <tr key={i} className={r.status === 'error' ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2 text-gray-800">{r.full_name}</td>
                      <td className="px-3 py-2 text-gray-600">{r.email}</td>
                      <td className="px-3 py-2 font-mono text-gray-700">
                        {r.status === 'success' ? r.password : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.status === 'success'
                          ? <span className="text-green-600">✓ created</span>
                          : <span className="text-red-600">✗ {r.reason}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              {importResults.some(r => r.status === 'success') && (
                <Button
                  variant="outline"
                  onClick={() => downloadCredentials(importResults)}
                  className="flex-1"
                >
                  Download Credentials CSV
                </Button>
              )}
              <Button onClick={closeModals} className="flex-1">Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tiny shared sub-components ────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function ErrorBanner({ msg }: { msg: string }) {
  return <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{msg}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function ModalActions({ primary, onCancel }: { primary: React.ReactNode; onCancel: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      {primary}
      <button type="button" onClick={onCancel}
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Cancel
      </button>
    </div>
  )
}
