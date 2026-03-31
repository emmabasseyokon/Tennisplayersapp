'use client'

import { useRouter } from 'next/navigation'

interface Props {
  weeks: { id: string; label: string }[]
  activeWeekId: string
  basePath: string
}

export function WeekSelect({ weeks, activeWeekId, basePath }: Props) {
  const router = useRouter()

  return (
    <select
      value={activeWeekId}
      onChange={e => router.push(`${basePath}?week=${e.target.value}`)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:outline-none sm:w-64"
    >
      {weeks.map(w => (
        <option key={w.id} value={w.id}>{w.label}</option>
      ))}
    </select>
  )
}
