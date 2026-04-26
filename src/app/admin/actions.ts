'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Gender } from '@/types/database.types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DOC_BUCKET = 'dob-documents'
const MAX_DOC_BYTES = 5 * 1024 * 1024
const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

type ActionClient = Awaited<ReturnType<typeof createClient>>
type AdminAuth =
  | { ok: true; supabase: ActionClient }
  | { ok: false; error: string }

async function verifyAdmin(): Promise<AdminAuth> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (profile?.role !== 'admin') return { ok: false, error: 'Not authorized' }
  return { ok: true, supabase }
}

function parsePlayerInput(formData: FormData): { error: string } | {
  full_name: string
  date_of_birth: string
  gender: Gender
  notes: string | null
} {
  const full_name = ((formData.get('full_name') as string) ?? '').trim()
  const date_of_birth = ((formData.get('date_of_birth') as string) ?? '').trim()
  const gender = ((formData.get('gender') as string) ?? '').trim()
  const notes = ((formData.get('notes') as string) ?? '').trim()

  if (!full_name) return { error: 'Full name is required.' }
  if (!ISO_DATE_RE.test(date_of_birth)) return { error: 'Valid date of birth is required.' }
  const dob = new Date(date_of_birth + 'T00:00:00')
  if (Number.isNaN(dob.getTime())) return { error: 'Invalid date of birth.' }
  if (dob > new Date()) return { error: 'Date of birth cannot be in the future.' }
  if (dob < new Date('1950-01-01')) return { error: 'Date of birth is implausibly old.' }
  if (gender !== 'male' && gender !== 'female') return { error: 'Gender must be male or female.' }

  return {
    full_name,
    date_of_birth,
    gender: gender as Gender,
    notes: notes.length > 0 ? notes : null,
  }
}

async function uploadDocument(
  supabase: ActionClient,
  playerId: string,
  file: File,
): Promise<{ error: string } | { url: string }> {
  if (file.size > MAX_DOC_BYTES) return { error: 'Document must be 5MB or smaller.' }
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    return { error: 'Document must be JPG, PNG, WEBP, or PDF.' }
  }
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin'
  const path = `${playerId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(DOC_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) return { error: error.message }
  return { url: path }
}

async function removeDocument(supabase: ActionClient, path: string | null): Promise<void> {
  if (!path) return
  await supabase.storage.from(DOC_BUCKET).remove([path])
}

export async function createPlayer(
  formData: FormData,
): Promise<{ error: string } | { success: true; playerId: string }> {
  const auth = await verifyAdmin()
  if (!auth.ok) return { error: auth.error }
  const supabase = auth.supabase

  const parsed = parsePlayerInput(formData)
  if ('error' in parsed) return parsed

  const { data: inserted, error } = await supabase
    .from('players')
    .insert({
      full_name: parsed.full_name,
      date_of_birth: parsed.date_of_birth,
      gender: parsed.gender,
      notes: parsed.notes,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }

  const file = formData.get('dob_document') as File | null
  if (file && file.size > 0) {
    const upload = await uploadDocument(supabase, inserted.id, file)
    if ('error' in upload) {
      await supabase.from('players').delete().eq('id', inserted.id)
      return { error: upload.error }
    }
    const { error: updErr } = await supabase
      .from('players')
      .update({ dob_document_url: upload.url })
      .eq('id', inserted.id)
    if (updErr) return { error: updErr.message }
  }

  revalidatePath('/admin')
  return { success: true, playerId: inserted.id }
}

export async function updatePlayer(
  formData: FormData,
): Promise<{ error: string } | { success: true }> {
  const auth = await verifyAdmin()
  if (!auth.ok) return { error: auth.error }
  const supabase = auth.supabase

  const playerId = ((formData.get('player_id') as string) ?? '').trim()
  if (!UUID_RE.test(playerId)) return { error: 'Invalid player ID.' }

  const parsed = parsePlayerInput(formData)
  if ('error' in parsed) return parsed

  const { data: existing, error: existErr } = await supabase
    .from('players')
    .select('dob_document_url')
    .eq('id', playerId)
    .single<{ dob_document_url: string | null }>()
  if (existErr) return { error: existErr.message }

  const { error } = await supabase
    .from('players')
    .update({
      full_name: parsed.full_name,
      date_of_birth: parsed.date_of_birth,
      gender: parsed.gender,
      notes: parsed.notes,
    })
    .eq('id', playerId)
  if (error) return { error: error.message }

  const file = formData.get('dob_document') as File | null
  const removeDoc = formData.get('remove_dob_document') === '1'

  if (file && file.size > 0) {
    const upload = await uploadDocument(supabase, playerId, file)
    if ('error' in upload) return { error: upload.error }
    await removeDocument(supabase, existing.dob_document_url)
    const { error: updErr } = await supabase
      .from('players')
      .update({ dob_document_url: upload.url })
      .eq('id', playerId)
    if (updErr) return { error: updErr.message }
  } else if (removeDoc && existing.dob_document_url) {
    await removeDocument(supabase, existing.dob_document_url)
    const { error: updErr } = await supabase
      .from('players')
      .update({ dob_document_url: null })
      .eq('id', playerId)
    if (updErr) return { error: updErr.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function deletePlayer(
  playerId: string,
): Promise<{ error: string } | { success: true }> {
  const auth = await verifyAdmin()
  if (!auth.ok) return { error: auth.error }
  const supabase = auth.supabase

  if (!UUID_RE.test(playerId)) return { error: 'Invalid player ID.' }

  const { data: existing } = await supabase
    .from('players')
    .select('dob_document_url')
    .eq('id', playerId)
    .single<{ dob_document_url: string | null }>()

  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) return { error: error.message }

  if (existing?.dob_document_url) await removeDocument(supabase, existing.dob_document_url)

  revalidatePath('/admin')
  return { success: true }
}

export async function getDocumentSignedUrl(path: string): Promise<{ url: string } | { error: string }> {
  const auth = await verifyAdmin()
  if (!auth.ok) return { error: auth.error }
  const { data, error } = await auth.supabase.storage
    .from(DOC_BUCKET)
    .createSignedUrl(path, 60 * 5)
  if (error || !data) return { error: error?.message ?? 'Failed to generate URL' }
  return { url: data.signedUrl }
}
