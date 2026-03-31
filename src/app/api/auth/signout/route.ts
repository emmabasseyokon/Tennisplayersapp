import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // CSRF protection: reject requests that originate from a different host
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  if (origin) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        return new Response('Forbidden', { status: 403 })
      }
    } catch {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
