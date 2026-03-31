'use server'

import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as string, user: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>()
  if (profile?.role !== 'admin') return { error: 'Not authorized' as string, user: null }
  return { error: null, user }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Generates a readable 10-char temporary password (no ambiguous chars like 0/O/I/l)
function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from(randomBytes(10))
    .map(b => chars[b % chars.length])
    .join('')
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createMember(formData: FormData) {
  const { error: authErr } = await verifyAdmin()
  if (authErr) return { error: authErr }

  const email     = (formData.get('email')     as string ?? '').trim()
  const password  = (formData.get('password')  as string ?? '').trim()
  const full_name = (formData.get('full_name') as string ?? '').trim()

  if (!full_name)               return { error: 'Full name is required.' }
  if (!EMAIL_RE.test(email))    return { error: 'Invalid email address.' }
  if (password.length < 6)      return { error: 'Password must be at least 6 characters.' }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name },
    email_confirm: true,
  })

  if (error) return { error: error.message }

  await adminClient
    .from('profiles')
    .update({ full_name })
    .eq('id', data.user.id)

  return { success: true, userId: data.user.id }
}

export async function updateMember(formData: FormData) {
  const { error: authErr } = await verifyAdmin()
  if (authErr) return { error: authErr }

  const userId    = (formData.get('user_id')   as string ?? '').trim()
  const full_name = (formData.get('full_name') as string ?? '').trim()
  const email     = (formData.get('email')     as string ?? '').trim()
  const password  = (formData.get('password')  as string ?? '').trim()

  if (!UUID_RE.test(userId))    return { error: 'Invalid user ID.' }
  if (!full_name)               return { error: 'Full name is required.' }
  if (!EMAIL_RE.test(email))    return { error: 'Invalid email address.' }
  if (password && password.length < 6) return { error: 'Password must be at least 6 characters.' }

  const adminClient = createAdminClient()

  const authUpdate: { email: string; password?: string } = { email }
  if (password) authUpdate.password = password

  const { error: authUpdateErr } = await adminClient.auth.admin.updateUserById(userId, authUpdate)
  if (authUpdateErr) return { error: authUpdateErr.message }

  const { error: profileErr } = await adminClient
    .from('profiles')
    .update({ full_name, email })
    .eq('id', userId)

  if (profileErr) return { error: profileErr.message }

  return { success: true }
}

export async function toggleMemberRole(userId: string, currentRole: string) {
  const { error: authErr } = await verifyAdmin()
  if (authErr) return { error: authErr }

  if (!UUID_RE.test(userId)) return { error: 'Invalid user ID.' }

  const newRole = currentRole === 'admin' ? 'member' : 'admin'

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true, newRole }
}

export async function deleteMember(userId: string) {
  const { error: authErr } = await verifyAdmin()
  if (authErr) return { error: authErr }

  if (!UUID_RE.test(userId)) return { error: 'Invalid user ID.' }

  const adminClient = createAdminClient()

  // Delete the auth user — the profile row is cascade-deleted via FK
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  return { success: true }
}

export type ImportResult = {
  full_name: string
  email: string
  status: 'success' | 'error'
  reason: string
  password: string
  userId?: string
}

export async function importMembers(
  rows: { full_name: string; email: string }[]
): Promise<{ error: string } | { results: ImportResult[] }> {
  const { error: authErr } = await verifyAdmin()
  if (authErr) return { error: authErr }

  if (!Array.isArray(rows) || rows.length === 0) return { error: 'No members provided.' }
  if (rows.length > 200) return { error: 'Maximum 200 members per import.' }

  const adminClient = createAdminClient()
  const results: ImportResult[] = []

  for (const row of rows) {
    const full_name = (row.full_name ?? '').trim()
    const email     = (row.email     ?? '').trim()

    // Per-row server-side validation
    if (!full_name) {
      results.push({ full_name, email, status: 'error', reason: 'Name is empty', password: '' })
      continue
    }
    if (!EMAIL_RE.test(email)) {
      results.push({ full_name, email, status: 'error', reason: 'Invalid email', password: '' })
      continue
    }

    const password = generatePassword()

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name },
      email_confirm: true,
    })

    if (error) {
      results.push({ full_name, email, status: 'error', reason: error.message, password: '' })
    } else {
      await adminClient.from('profiles').update({ full_name }).eq('id', data.user.id)
      results.push({ full_name, email, status: 'success', reason: '', password, userId: data.user.id })
    }
  }

  return { results }
}
