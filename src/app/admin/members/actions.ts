'use server'

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

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createMember(formData: FormData) {
  const { error: authErr } = await verifyAdmin()
  if (authErr) return { error: authErr }

  const email     = (formData.get('email')     as string ?? '').trim()
  const password  = (formData.get('password')  as string ?? '').trim()
  const full_name = (formData.get('full_name') as string ?? '').trim()

  // Server-side validation
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

  // Server-side validation
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
