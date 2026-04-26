'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
  getDocumentSignedUrl,
} from '@/app/admin/actions'
import type { Player, Gender } from '@/types/database.types'
import {
  AGE_CATEGORIES,
  ageYears,
  categoryFor,
  daysUntilNextBirthday,
  formatDate,
  type AgeCategory,
} from '@/lib/age'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

interface Props {
  initialPlayers: Player[]
  autoCreate?: boolean
}

type Filters = {
  search: string
  gender: '' | Gender
  category: '' | AgeCategory
}

export function PlayersManager({ initialPlayers, autoCreate }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [filters, setFilters] = useState<Filters>({ search: '', gender: '', category: '' })
  const [refDate, setRefDate] = useState<string>(() => new Date().toISOString().slice(0, 10))

  const [createOpen, setCreateOpen] = useState(autoCreate ?? false)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  useEffect(() => {
    if (!openDropdown) return
    function handleClick() { setOpenDropdown(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openDropdown])

  function closeModals() {
    setCreateOpen(false)
    setEditPlayer(null)
    setDeletingPlayer(null)
    setError(null)
  }

  const ref = useMemo(() => new Date(refDate + 'T00:00:00'), [refDate])

  const enriched = useMemo(() => {
    return players.map(p => {
      const age = ageYears(p.date_of_birth, ref)
      const cat = categoryFor(age)
      const daysToBirthday = daysUntilNextBirthday(p.date_of_birth, ref)
      return { ...p, age, category: cat, daysToBirthday }
    })
  }, [players, ref])

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return enriched.filter(p => {
      if (q && !p.full_name.toLowerCase().includes(q)) return false
      if (filters.gender && p.gender !== filters.gender) return false
      if (filters.category) {
        if (p.category === null || p.category > filters.category) return false
      }
      return true
    })
  }, [enriched, filters])

  async function handleDelete() {
    if (!deletingPlayer) return
    setLoading(true)
    const result = await deletePlayer(deletingPlayer.id)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    setPlayers(prev => prev.filter(p => p.id !== deletingPlayer.id))
    setLoading(false)
    setDeletingPlayer(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tennis player register for age screening at junior tournaments.
          </p>
        </div>
        <Button onClick={() => { setError(null); setCreateOpen(true) }} className="w-full sm:w-auto">
          Add Player
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 py-4 sm:grid-cols-4">
          <Field label="Search by name">
            <input
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="e.g. Maria"
              className={inputCls}
            />
          </Field>
          <Field label="Gender">
            <select
              value={filters.gender}
              onChange={e => setFilters(f => ({ ...f, gender: e.target.value as Filters['gender'] }))}
              className={inputCls}
            >
              <option value="">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Eligible for category">
            <select
              value={filters.category === '' ? '' : String(filters.category)}
              onChange={e => setFilters(f => ({
                ...f,
                category: e.target.value === '' ? '' : (Number(e.target.value) as AgeCategory),
              }))}
              className={inputCls}
            >
              <option value="">All</option>
              {AGE_CATEGORIES.map(c => (
                <option key={c} value={c}>U{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Age as of">
            <input
              type="date"
              value={refDate}
              onChange={e => setRefDate(e.target.value || new Date().toISOString().slice(0, 10))}
              className={inputCls}
            />
          </Field>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-800">
            Players ({visible.length}{visible.length !== players.length ? ` of ${players.length}` : ''})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {players.length === 0 ? 'No players yet.' : 'No players match the current filters.'}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {visible.map(p => {
                const agingUpSoon = p.daysToBirthday <= 30
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800">{p.full_name}</span>
                        <CategoryBadge category={p.category} />
                        <GenderBadge gender={p.gender} />
                        {p.dob_document_url && <DocBadge />}
                        {agingUpSoon && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                            Birthday in {p.daysToBirthday}d
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        DOB {formatDate(p.date_of_birth)} · age {p.age}
                      </div>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden items-center gap-3 sm:flex">
                      <button onClick={() => { setError(null); setEditPlayer(p) }} className="text-xs text-gray-500 hover:text-green-700 hover:underline">Edit</button>
                      <button onClick={() => setDeletingPlayer(p)} className="text-xs text-red-500 hover:text-red-700 hover:underline">Delete</button>
                    </div>

                    {/* Mobile menu */}
                    <div className="relative sm:hidden">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenDropdown(openDropdown === p.id ? null : p.id) }}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Options"
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                      {openDropdown === p.id && (
                        <div className="absolute right-0 top-9 z-10 min-w-[150px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                          <button onClick={() => { setOpenDropdown(null); setError(null); setEditPlayer(p) }} className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">Edit</button>
                          <button onClick={() => { setOpenDropdown(null); setDeletingPlayer(p) }} className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Delete</button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <PlayerFormModal
          title="Add Player"
          submitLabel="Add Player"
          onClose={closeModals}
          error={error}
          setError={setError}
          onSubmitted={newPlayer => {
            setPlayers(prev => [...prev, newPlayer].sort((a, b) => a.full_name.localeCompare(b.full_name)))
            closeModals()
          }}
        />
      )}

      {editPlayer && (
        <PlayerFormModal
          title="Edit Player"
          submitLabel="Save Changes"
          player={editPlayer}
          onClose={closeModals}
          error={error}
          setError={setError}
          onSubmitted={updated => {
            setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p))
            closeModals()
          }}
        />
      )}

      {deletingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <ModalHeader title="Delete Player" onClose={() => setDeletingPlayer(null)} />
            {error && <ErrorBanner msg={error} />}
            <p className="mb-1 text-sm text-gray-700">
              Are you sure you want to delete <span className="font-semibold">{deletingPlayer.full_name}</span>?
            </p>
            <p className="mb-6 text-xs text-red-600">This will also delete the uploaded DOB document, if any.</p>
            <div className="flex gap-3">
              <Button onClick={handleDelete} loading={loading} className="flex-1 !bg-red-600 hover:!bg-red-700">Delete</Button>
              <button type="button" onClick={() => setDeletingPlayer(null)} className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormModalProps {
  title: string
  submitLabel: string
  player?: Player
  onClose: () => void
  onSubmitted: (player: Player) => void
  error: string | null
  setError: (msg: string | null) => void
}

function PlayerFormModal({ title, submitLabel, player, onClose, onSubmitted, error, setError }: FormModalProps) {
  const isEdit = !!player
  const [fullName, setFullName] = useState(player?.full_name ?? '')
  const [dob, setDob] = useState(player?.date_of_birth ?? '')
  const [gender, setGender] = useState<Gender | ''>(player?.gender ?? '')
  const [notes, setNotes] = useState(player?.notes ?? '')
  const [removeDoc, setRemoveDoc] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)

  async function viewDoc() {
    if (!player?.dob_document_url) return
    const res = await getDocumentSignedUrl(player.dob_document_url)
    if ('error' in res) { setError(res.error); return }
    window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const fd = new FormData()
    fd.set('full_name', fullName)
    fd.set('date_of_birth', dob)
    fd.set('gender', gender)
    fd.set('notes', notes)
    if (isEdit) fd.set('player_id', player!.id)
    if (isEdit && removeDoc) fd.set('remove_dob_document', '1')

    const file = fileRef.current?.files?.[0]
    if (file) fd.set('dob_document', file)

    let next: Player
    if (isEdit) {
      const result = await updatePlayer(fd)
      setSubmitting(false)
      if ('error' in result) { setError(result.error); return }
      next = {
        ...player!,
        full_name: fullName,
        date_of_birth: dob,
        gender: gender as Gender,
        notes: notes || null,
        dob_document_url: removeDoc && !file
          ? null
          : (file ? player!.dob_document_url ?? '' : player!.dob_document_url),
      }
    } else {
      const result = await createPlayer(fd)
      setSubmitting(false)
      if ('error' in result) { setError(result.error); return }
      next = {
        id: result.playerId,
        full_name: fullName,
        date_of_birth: dob,
        gender: gender as Gender,
        notes: notes || null,
        dob_document_url: file ? '' : null,
        created_at: new Date().toISOString(),
      }
    }

    onSubmitted(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <ModalHeader title={title} onClose={onClose} />
        {error && <ErrorBanner msg={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name *">
            <input required value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="Maria Hernandez" />
          </Field>

          <Field label="Date of birth *">
            <input
              type="date"
              required
              max={today}
              min="1950-01-01"
              value={dob}
              onChange={e => setDob(e.target.value)}
              className={inputCls}
            />
            {dob && (
              <p className="mt-1 text-xs text-gray-500">
                Current age: {ageYears(dob)} · {(() => {
                  const c = categoryFor(ageYears(dob))
                  return c ? `eligible up to U${c}` : 'no junior category'
                })()}
              </p>
            )}
          </Field>

          <Field label="Gender *">
            <select required value={gender} onChange={e => setGender(e.target.value as Gender | '')} className={inputCls}>
              <option value="" disabled>Choose…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>

          <Field label="DOB document (passport, birth certificate)">
            {player?.dob_document_url && !removeDoc && (
              <div className="mb-2 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="text-gray-700">Document on file</span>
                <button type="button" onClick={viewDoc} className="text-green-700 hover:underline">View</button>
                <button type="button" onClick={() => setRemoveDoc(true)} className="text-red-600 hover:underline">Remove</button>
              </div>
            )}
            {player?.dob_document_url && removeDoc && (
              <div className="mb-2 flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <span>Document will be removed on save.</span>
                <button type="button" onClick={() => setRemoveDoc(false)} className="hover:underline">Undo</button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-lime-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-800 hover:file:bg-lime-200"
            />
            <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP, or PDF · max 5MB</p>
          </Field>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Optional"
            />
          </Field>

          <ModalActions
            primary={<Button type="submit" loading={submitting} className="flex-1">{submitLabel}</Button>}
            onCancel={onClose}
          />
        </form>
      </div>
    </div>
  )
}

// ── Badges ───────────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: AgeCategory | null }) {
  if (category === null) {
    return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">Senior</span>
  }
  return (
    <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-900">
      U{category}
    </span>
  )
}

function GenderBadge({ gender }: { gender: Gender }) {
  const cls = gender === 'female' ? 'bg-pink-100 text-pink-800' : 'bg-sky-100 text-sky-800'
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}>
      {gender === 'female' ? 'F' : 'M'}
    </span>
  )
}

function DocBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800">
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      DOB doc
    </span>
  )
}

// ── Tiny shared sub-components ────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-lime-500 focus:outline-none'

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
