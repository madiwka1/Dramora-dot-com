import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  addDemoPlayer, advanceRoom, getRoom, joinRoom, makeChoice, myMemberId, pickCharacter, setRoomDrama, startRoom, subscribeRoom,
  type Room,
} from '../data'

export const useRoom = defineStore('room', () => {
  const room = ref<Room | null>(null)
  const me = ref('')
  const loading = ref(false)
  const busy = ref(false)
  const error = ref('') // short code → room.errors.* in en.json
  let code = ''
  let stop: (() => void) | undefined

  const joined = computed(() => !!room.value?.members.some((m) => m.memberId === me.value))
  const isHost = computed(() => !!room.value && room.value.hostId === me.value)
  const myCast = computed(() => room.value?.members.find((m) => m.memberId === me.value)?.castName ?? null)

  function fail(e: unknown) {
    console.error(e)
    error.value = e instanceof Error ? e.message : 'generic'
  }

  async function refresh() {
    room.value = await getRoom(code)
    if (room.value && !stop) stop = subscribeRoom(room.value.id, () => void refresh().catch(fail))
  }

  async function open(roomCode: string) {
    close()
    code = roomCode
    loading.value = true
    error.value = ''
    try {
      me.value = await myMemberId()
      await refresh()
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  function close() {
    stop?.()
    stop = undefined
    room.value = null
  }

  async function act(action: (roomId: string) => Promise<void>) {
    busy.value = true
    error.value = ''
    try {
      await action(room.value?.id ?? code)
      await refresh()
    } catch (e) {
      fail(e)
    } finally {
      busy.value = false
    }
  }

  // Play mode timer tick: quiet (no busy/error state); the server ignores calls that come too early.
  async function advance() {
    if (!room.value) return
    try {
      await advanceRoom(room.value.id)
      await refresh()
    } catch (e) {
      console.warn(e)
    }
  }

  return {
    room, me, loading, busy, error, joined, isHost, myCast, open, close, advance,
    choose: (choiceId: string) => act((id) => makeChoice(id, choiceId)),
    join: (name: string) => act(() => joinRoom(code, name)),
    setDrama: (dramaId: string) => act((id) => setRoomDrama(id, dramaId)),
    pick: (castName: string) => act((id) => pickCharacter(id, castName)),
    start: () => act(startRoom),
    addDemoPlayer: () => act(addDemoPlayer),
  }
})
