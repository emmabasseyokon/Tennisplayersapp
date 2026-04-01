import { getWeeks } from '@/lib/queries/weeks'
import { WeeksManager } from '@/components/admin/WeeksManager'

interface Props {
  searchParams: Promise<{ create?: string }>
}

export default async function AdminWeeksPage({ searchParams }: Props) {
  const { create } = await searchParams
  const weeks = await getWeeks()
  return <WeeksManager initialWeeks={weeks} autoCreate={create === '1'} />
}
