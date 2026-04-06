import { getMembers } from '@/lib/queries/members'
import { getWeeks } from '@/lib/queries/weeks'
import { MembersManager } from '@/components/admin/MembersManager'

interface Props {
  searchParams: Promise<{ create?: string }>
}

export default async function AdminMembersPage({ searchParams }: Props) {
  const { create } = await searchParams
  const [members, weeks] = await Promise.all([getMembers(), getWeeks()])
  return <MembersManager initialMembers={members} weeks={weeks} autoCreate={create === '1'} />
}
