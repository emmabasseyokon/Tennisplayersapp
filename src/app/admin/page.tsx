import { getPlayers } from '@/lib/queries/players'
import { PlayersManager } from '@/components/admin/PlayersManager'

interface Props {
  searchParams: Promise<{ create?: string }>
}

export default async function AdminDashboard({ searchParams }: Props) {
  const { create } = await searchParams
  const players = await getPlayers()
  return <PlayersManager initialPlayers={players} autoCreate={create === '1'} />
}
