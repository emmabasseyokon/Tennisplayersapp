import { createClient } from '@/lib/supabase/server'
import { AnnouncementsManager } from '@/components/admin/AnnouncementsManager'
import type { Announcement } from '@/types/database.types'

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  return <AnnouncementsManager initialAnnouncements={(data ?? []) as Announcement[]} />
}
