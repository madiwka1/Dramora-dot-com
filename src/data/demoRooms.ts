// Demo rooms live in localStorage and sync through 'storage' events, so two tabs of ONE browser
// can play together without a backend. Cross-device rooms need Supabase. Mirrors the migration's lobby RPCs.
import type { Room } from './rooms'
import { config, dramas, episodes, getUser, sessionId } from './demo'
import { chooserId } from './turns'

const KEY = 'dramora.demoRooms'
type Rooms = Record<string, Room> // by code; demo room id === code

const load = (): Rooms => JSON.parse(localStorage.getItem(KEY) ?? '{}')
const save = (rooms: Rooms) => localStorage.setItem(KEY, JSON.stringify(rooms))

/** One identity per browser tab (= the demo account id), so two tabs act as two players. */
export const memberId = sessionId

/** Return false from `change` to skip saving (avoids waking other tabs for no-op timer checks). */
function update(code: string, change: (room: Room) => void | false) {
  const rooms = load()
  const room = rooms[code.toUpperCase()]
  if (!room) throw new Error('room_not_found')
  if (change(room) !== false) save(rooms)
}
const now = () => new Date().toISOString()

const playable = (dramaId: string) => dramas.find((d) => d.id === dramaId && d.isPlayable)

// Demo players ("User 2", …) let one person test a room alone. They take any free character
// and give it up if a real player picks theirs.
const BOT = 'demo-bot-'
export const isBot = (memberId: string) => memberId.startsWith(BOT)
function botsPick(room: Room) {
  const cast = (room.dramaId && playable(room.dramaId)?.cast) || []
  for (const bot of room.members.filter((m) => isBot(m.memberId))) {
    if (bot.castName && cast.some((c) => c.name === bot.castName)) continue
    bot.castName = [...cast].reverse().find((c) => !room.members.some((m) => m.castName === c.name))?.name ?? null
  }
}

export function addBot(roomId: string) {
  update(roomId, (room) => {
    if (room.status !== 'lobby') throw new Error('room_started')
    const n = room.members.length + 1
    room.members.push({ memberId: `${BOT}${crypto.randomUUID()}`, displayName: `User ${n}`, castName: null, isGuest: true, joinedAt: now() })
    botsPick(room)
  })
}

export function create(displayName: string, dramaId: string | null): string {
  if (!getUser().isSubscriber) throw new Error('pass_required')
  if (dramaId && !playable(dramaId)) throw new Error('not_playable')
  const code = crypto.randomUUID().slice(0, 6).toUpperCase()
  const me = memberId()
  const rooms = load()
  rooms[code] = {
    id: code, code, hostId: me, dramaId, status: 'lobby', currentEpisodeId: null,
    phaseStartedAt: null, votes: [],
    members: [{ memberId: me, displayName, castName: null, isGuest: false, joinedAt: now() }],
  }
  save(rooms)
  return code
}

export function join(code: string, displayName: string) {
  update(code, (room) => {
    if (room.status === 'ended') throw new Error('room_not_found')
    const me = room.members.find((m) => m.memberId === memberId())
    if (me) me.displayName = displayName
    else room.members.push({ memberId: memberId(), displayName, castName: null, isGuest: true, joinedAt: now() })
  })
}

export function get(code: string): Room | null {
  const room = load()[code.toUpperCase()]
  // Rooms saved by older versions lack these fields.
  return room ? { ...room, votes: room.votes ?? [], phaseStartedAt: room.phaseStartedAt ?? null,
    members: room.members.map((m) => ({ ...m, joinedAt: m.joinedAt ?? '' })) } : null
}

export function setDrama(roomId: string, dramaId: string) {
  update(roomId, (room) => {
    if (!room.members.some((m) => m.memberId === memberId())) throw new Error('not_member')
    if (!playable(dramaId)) throw new Error('not_playable')
    if (room.status !== 'lobby') throw new Error('room_started')
    if (room.dramaId === dramaId) return
    room.dramaId = dramaId
    room.members.forEach((m) => (m.castName = null))
    botsPick(room)
  })
}

export function pick(roomId: string, castName: string) {
  update(roomId, (room) => {
    if (room.status !== 'lobby' || !room.dramaId) throw new Error('no_scenario')
    if (!playable(room.dramaId)?.cast.some((c) => c.name === castName)) throw new Error('unknown_character')
    const me = room.members.find((m) => m.memberId === memberId())
    if (!me) throw new Error('not_member')
    const holder = room.members.find((m) => m.castName === castName && m !== me)
    if (holder && !isBot(holder.memberId)) throw new Error('taken')
    if (holder) holder.castName = null // demo player steps aside
    me.castName = castName
    botsPick(room)
  })
}

export function start(roomId: string) {
  update(roomId, (room) => {
    if (room.status !== 'lobby') throw new Error('room_started')
    if (room.hostId !== memberId()) throw new Error('not_host')
    if (!room.dramaId) throw new Error('no_scenario')
    if (room.members.length < (config['room.min_players'] as number)) throw new Error('not_enough_players')
    if (room.members.some((m) => !m.castName)) throw new Error('characters_missing')
    room.status = 'playing'
    room.currentEpisodeId = episodes.find((e) => e.dramaId === room.dramaId && e.number === 1 && !e.isBranch)?.id ?? null
    room.phaseStartedAt = now()
    room.votes = []
  })
}

// Play mode (mirrors make_choice / advance_room in the migration).
const BOT_THINK_SECONDS = 2
const seconds = (key: string) => config[key] as number

function applyChoice(room: Room, member: string, choiceId: string) {
  const ep = episodes.find((e) => e.id === room.currentEpisodeId)
  const choice = ep?.choices.find((c) => c.id === choiceId)
  if (!ep || !choice) throw new Error('unknown_choice')
  room.votes = [...(room.votes ?? []), { episodeId: ep.id, memberId: member, choiceId }]
  room.currentEpisodeId = choice.nextEpisodeId
  room.status = 'playing'
  room.phaseStartedAt = now()
}

export function choose(roomId: string, choiceId: string) {
  update(roomId, (room) => {
    if (room.status !== 'voting') throw new Error('not_voting')
    const ep = episodes.find((e) => e.id === room.currentEpisodeId)
    if (!ep || chooserId(room.members, ep.number) !== memberId()) throw new Error('not_your_turn')
    applyChoice(room, memberId(), choiceId)
  })
}

export function advance(roomId: string) {
  update(roomId, (room) => {
    const ep = episodes.find((e) => e.id === room.currentEpisodeId)
    if (!ep || !room.phaseStartedAt) return false
    const elapsed = (Date.now() - Date.parse(room.phaseStartedAt)) / 1000
    if (room.status === 'playing' && elapsed >= seconds('play.episode_seconds')) {
      room.status = ep.choices.length ? 'voting' : 'ended'
      room.phaseStartedAt = now()
      return
    }
    if (room.status === 'voting') {
      const who = chooserId(room.members, ep.number)
      const botReady = !!who && isBot(who) && elapsed >= BOT_THINK_SECONDS
      if (who && (botReady || elapsed >= seconds('play.choice_seconds'))) {
        applyChoice(room, who, ep.choices[Math.floor(Math.random() * ep.choices.length)].id)
        return
      }
    }
    return false
  })
}

export function subscribe(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => e.key === KEY && onChange()
  addEventListener('storage', handler)
  return () => removeEventListener('storage', handler)
}
