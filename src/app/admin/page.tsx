import Link from 'next/link'
import { getPlayers } from '@/lib/queries/players'
import { Card, CardContent } from '@/components/ui/Card'
import { AGE_CATEGORIES, ageYears, categoryFor } from '@/lib/age'

export default async function AdminDashboard() {
  const players = await getPlayers()
  const today = new Date()

  const counts = {
    total: players.length,
    male: 0,
    female: 0,
    withDoc: 0,
    byCategory: Object.fromEntries(AGE_CATEGORIES.map(c => [c, 0])) as Record<number, number>,
  }

  for (const p of players) {
    if (p.gender === 'male') counts.male++
    else counts.female++
    if (p.dob_document_url) counts.withDoc++
    const cat = categoryFor(ageYears(p.date_of_birth, today))
    if (cat !== null) counts.byCategory[cat]++
  }

  const docCoverage = counts.total === 0 ? 0 : Math.round((counts.withDoc / counts.total) * 100)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tennis Players</h1>
          <p className="mt-1 text-sm text-gray-500">Junior tournament age-screening database.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/players?create=1"
            className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 w-full sm:w-auto">
            Add Player
          </Link>
          <Link href="/admin/players"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto">
            View All
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Total Players</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{counts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">Male / Female</p>
            <p className="mt-1 text-3xl font-bold text-gray-800">{counts.male} / {counts.female}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-gray-500">DOB Document Coverage</p>
            <p className="mt-1 text-3xl font-bold text-green-700">{docCoverage}%</p>
            <p className="mt-1 text-xs text-gray-400">{counts.withDoc} of {counts.total} on file</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-5">
          <p className="mb-3 text-sm font-medium text-gray-700">Eligible by junior category (today)</p>
          <div className="grid grid-cols-5 gap-3">
            {AGE_CATEGORIES.map(c => (
              <div key={c} className="rounded-lg bg-gray-50 px-3 py-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">U{c}</p>
                <p className="mt-1 text-2xl font-bold text-gray-800">{counts.byCategory[c]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
