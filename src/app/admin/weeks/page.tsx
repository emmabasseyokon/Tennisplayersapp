import { getWeeks } from '@/lib/queries/weeks'
import { WeeksManager } from '@/components/admin/WeeksManager'

export default async function AdminWeeksPage() {
  const weeks = await getWeeks()
  return <WeeksManager initialWeeks={weeks} />
}
