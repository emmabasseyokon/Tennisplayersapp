import { getMembers } from '@/lib/queries/members'
import { MembersManager } from '@/components/admin/MembersManager'

interface Props {
  searchParams: Promise<{ create?: string }>
}

export default async function AdminMembersPage({ searchParams }: Props) {
  const { create } = await searchParams
  const members = await getMembers()
  return <MembersManager initialMembers={members} autoCreate={create === '1'} />
}
