'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateScoreboards() {
  revalidatePath('/admin/scoreboard')
  revalidatePath('/admin/weekly-scoreboard')
  revalidatePath('/scores')
  revalidatePath('/scores/weekly')
}
