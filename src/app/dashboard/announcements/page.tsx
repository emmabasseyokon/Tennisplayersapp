import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  const list = announcements ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="mt-1 text-sm text-gray-500">Updates and notices from leadership.</p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-800">{list.length} announcement{list.length !== 1 ? 's' : ''}</h2>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-100">
              {list.map(a => (
                <li key={a.id} className="px-4 py-4 sm:px-6 sm:py-5">
                  <p className="font-semibold text-gray-900">{a.title}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{a.body}</p>
                  <p className="mt-3 text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
