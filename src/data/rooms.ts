// Rooms: create → share link → lobby (scenario + characters) → start. Server rules live in the migration RPCs.
import { must, supabase } from './supabase'
import * as demo from './demoRooms'

export type RoomStatus = 'lobby' | 'playing' | 'voting' | 'ended'
export interface RoomMember { memberId: string; displayName: string; castName: string | null; isGuest: boolean; joinedAt: string }
export interface Vote { episodeId: string; memberId: string; choiceId: string }
export interface Room {
  id: string; code: string; hostId: string; dramaId: string | null
  status: RoomStatus; currentEpisodeId: string | null; phaseStartedAt: string | null
  members: RoomMember[]; votes: Vote[] // votes in story order
}

/** Who "I" am in rooms. Guests get an anonymous Supabase session, so they need no account. */
export async function myMemberId(): Promise<string> {
  if (!supabase) return demo.memberId()
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session.user.id
  const { user } = must(await supabase.auth.signInAnonymously())
  return user!.id
}

export async function createRoom(displayName: string, dramaId: string | null): Promise<string> {
  if (!supabase) return demo.create(displayName, dramaId)
  return must(await supabase.rpc('create_room', { p_display_name: displayName, p_drama: dramaId }))
}

export async function joinRoom(code: string, displayName: string): Promise<void> {
  if (!supabase) return demo.join(code, displayName)
  await myMemberId()
  must(await supabase.rpc('join_room', { p_code: code, p_display_name: displayName }))
}

/** null when the room doesn't exist or (with Supabase) you haven't joined yet. */
export async function getRoom(code: string): Promise<Room | null> {
  if (!supabase) return demo.get(code)
  type Row = {
    id: string; code: string; host_id: string; drama_id: string | null; status: RoomStatus; current_episode_id: string | null
    phase_started_at: string | null
    room_members: { member_id: string; display_name: string; cast_name: string | null; is_guest: boolean; joined_at: string }[]
    votes: { episode_id: string; member_id: string; choice_id: string; created_at: string }[]
  }
  const r = must<Row | null>(
    await supabase
      .from('rooms')
      .select(
        'id, code, host_id, drama_id, status, current_episode_id, phase_started_at, ' +
          'room_members(member_id, display_name, cast_name, is_guest, joined_at), votes(episode_id, member_id, choice_id, created_at)',
      )
      .eq('code', code.toUpperCase())
      .maybeSingle(),
  )
  return r && {
    id: r.id, code: r.code, hostId: r.host_id, dramaId: r.drama_id, status: r.status, currentEpisodeId: r.current_episode_id,
    phaseStartedAt: r.phase_started_at,
    members: r.room_members.map((m) => ({
      memberId: m.member_id, displayName: m.display_name, castName: m.cast_name, isGuest: m.is_guest, joinedAt: m.joined_at,
    })),
    votes: [...r.votes]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((v) => ({ episodeId: v.episode_id, memberId: v.member_id, choiceId: v.choice_id })),
  }
}

export async function setRoomDrama(roomId: string, dramaId: string): Promise<void> {
  if (!supabase) return demo.setDrama(roomId, dramaId)
  must(await supabase.rpc('set_room_drama', { p_room: roomId, p_drama: dramaId }))
}

export async function pickCharacter(roomId: string, castName: string): Promise<void> {
  if (!supabase) return demo.pick(roomId, castName)
  must(await supabase.rpc('pick_character', { p_room: roomId, p_cast: castName }))
}

/** True for simulated demo players; real players can take their characters. */
export const isDemoPlayer = (memberId: string) => !supabase && demo.isBot(memberId)

/** Demo mode only: add a simulated friend ("User 2") who auto-picks a free character. */
export async function addDemoPlayer(roomId: string): Promise<void> {
  if (supabase) throw new Error('demo_only')
  demo.addBot(roomId)
}

export async function startRoom(roomId: string): Promise<void> {
  if (!supabase) return demo.start(roomId)
  must(await supabase.rpc('start_room', { p_room: roomId }))
}

/** Play mode: the player whose turn it is picks one of the episode's choices. */
export async function makeChoice(roomId: string, choiceId: string): Promise<void> {
  if (!supabase) return demo.choose(roomId, choiceId)
  must(await supabase.rpc('make_choice', { p_room: roomId, p_choice: choiceId }))
}

/** Play mode: ask the server to move on when a timer ran out (the server checks the clock). */
export async function advanceRoom(roomId: string): Promise<void> {
  if (!supabase) return demo.advance(roomId)
  must(await supabase.rpc('advance_room', { p_room: roomId }))
}

/** Calls onChange whenever the room or its members change. Returns an unsubscribe function. */
export function subscribeRoom(roomId: string, onChange: () => void): () => void {
  if (!supabase) return demo.subscribe(onChange)
  const client = supabase
  const channel = client
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe()
  return () => void client.removeChannel(channel)
}
