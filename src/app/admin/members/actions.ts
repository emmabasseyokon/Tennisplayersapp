'use server'

import { createClient } from '@/lib/supabase/server'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as string, supabase: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (profile?.role !== 'admin') return { error: 'Not authorized' as string, supabase: null }
  return { error: null, supabase }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createMember(formData: FormData) {
  const { error: authErr, supabase } = await verifyAdmin()
  if (authErr || !supabase) return { error: authErr }

  const full_name = (formData.get('full_name') as string ?? '').trim()
  if (!full_name) return { error: 'Full name is required.' }

  const { data, error } = await supabase
    .from('members')
    .insert({ full_name })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { success: true, memberId: data.id }
}

export async function updateMember(formData: FormData) {
  const { error: authErr, supabase } = await verifyAdmin()
  if (authErr || !supabase) return { error: authErr }

  const memberId  = (formData.get('member_id') as string ?? '').trim()
  const full_name = (formData.get('full_name') as string ?? '').trim()

  if (!UUID_RE.test(memberId)) return { error: 'Invalid member ID.' }
  if (!full_name) return { error: 'Full name is required.' }

  const { error } = await supabase
    .from('members')
    .update({ full_name })
    .eq('id', memberId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteMember(memberId: string) {
  const { error: authErr, supabase } = await verifyAdmin()
  if (authErr || !supabase) return { error: authErr }

  if (!UUID_RE.test(memberId)) return { error: 'Invalid member ID.' }

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId)

  if (error) return { error: error.message }
  return { success: true }
}

export type ImportResult = {
  full_name: string
  points: number
  status: 'success' | 'error'
  reason: string
  memberId?: string
}

export async function importMembers(
  rows: { full_name: string; points: number }[]
): Promise<{ error: string } | { results: ImportResult[] }> {
  const { error: authErr, supabase } = await verifyAdmin()
  if (authErr || !supabase) return { error: authErr ?? 'Not authorized' }

  if (!Array.isArray(rows) || rows.length === 0) return { error: 'No members provided.' }
  if (rows.length > 200) return { error: 'Maximum 200 members per import.' }

  const results: ImportResult[] = []

  for (const row of rows) {
    const full_name = (row.full_name ?? '').trim()
    const points    = Number(row.points) || 0

    if (!full_name) {
      results.push({ full_name, points, status: 'error', reason: 'Name is empty' })
      continue
    }

    const { data, error } = await supabase
      .from('members')
      .insert({ full_name })
      .select('id')
      .single()

    if (error) {
      results.push({ full_name, points, status: 'error', reason: error.message })
      continue
    }

    results.push({ full_name, points, status: 'success', reason: '', memberId: data.id })
  }

  return { results }
}
