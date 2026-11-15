import type { RoomMember } from './rooms'

/**
 * Whose turn it is to choose: players rotate by join order — episode 1 → first player, episode 2 → second, …
 * Must match room_chooser() in the migration.
 */
export function chooserId(members: RoomMember[], episodeNumber: number): string | null {
  if (!members.length) return null
  const order = [...members].sort((a, b) =>
    a.joinedAt !== b.joinedAt ? (a.joinedAt < b.joinedAt ? -1 : 1) : a.memberId < b.memberId ? -1 : 1,
  )
  return order[(episodeNumber - 1) % order.length].memberId
}
