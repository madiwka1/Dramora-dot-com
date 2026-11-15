// The only place the app talks to a backend. Swap Supabase = rewrite this folder only.
import { must, supabase } from './supabase'
import * as demo from './demo'

export * from './rooms'
export { chooserId } from './turns'

export const isDemo = !supabase

/** DB holds Storage paths ('posters/x.jpg') → public URL of the 'media' bucket. Full URLs pass through. */
function mediaUrl(path: string | null): string | null {
  if (!path || /^https?:\/\//.test(path) || !supabase) return path
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export interface CastMember { name: string; role: string; avatarUrl: string | null }
export interface Drama {
  id: string; slug: string; title: string; synopsis: string; genre: string
  posterUrl: string | null; backdropUrl: string | null; previewUrl: string | null; cast: CastMember[]; tags: string[]; popularity: number; isPlayable: boolean; createdAt: string
}
export interface Choice { id: string; label: string; nextEpisodeId: string; sort: number; videoUrl: string | null }
export interface Episode {
  id: string; dramaId: string; number: number; title: string; synopsis: string
  durationSec: number; isFree: boolean; isBranch: boolean; choices: Choice[]
}
export interface User { id: string; displayName: string; isSubscriber: boolean; inviteCode: string }
export interface TokenTransaction { id: string; delta: number; reason: string; createdAt: string }
/** Paywall products, read from Config `plans.plus` and `tokens.packs`. Prices are display-only; Stripe charges. */
export interface PlusPlan { id: string; period: 'week' | 'month' | 'year'; amountCents: number; compareAtCents?: number; tokens?: number }
export interface TokenPack { id: string; name: string; amountCents: number; tokens: number }

export async function getConfig(): Promise<Record<string, unknown>> {
  if (!supabase) return { ...demo.config }
  const rows = must(await supabase.from('config').select('key, value'))
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function listDramas(): Promise<Drama[]> {
  if (!supabase) return [...demo.dramas]
  const rows = must(
    await supabase
      .from('dramas')
      .select('id, slug, title, synopsis, genre, poster_url, backdrop_url, preview_url, cast_members, tags, popularity, is_playable, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
  )
  return rows.map((r) => ({
    id: r.id, slug: r.slug, title: r.title, synopsis: r.synopsis, genre: r.genre,
    posterUrl: mediaUrl(r.poster_url), backdropUrl: mediaUrl(r.backdrop_url), previewUrl: mediaUrl(r.preview_url), cast: r.cast_members, tags: r.tags, popularity: r.popularity, isPlayable: r.is_playable, createdAt: r.created_at,
  }))
}

/** Episodes of a drama in play order (branch episodes included; the grid hides them). */
export async function listEpisodes(dramaId: string): Promise<Episode[]> {
  if (!supabase) return demo.episodes.filter((e) => e.dramaId === dramaId)
  const rows = must(
    await supabase
      .from('episodes')
      .select('id, drama_id, number, title, synopsis, duration_sec, is_free, is_branch, choices!episode_id(id, label, next_episode_id, sort, video_url)')
      .eq('drama_id', dramaId)
      .order('number'),
  )
  return rows.map((r) => ({
    id: r.id, dramaId: r.drama_id, number: r.number, title: r.title, synopsis: r.synopsis,
    durationSec: r.duration_sec, isFree: r.is_free, isBranch: r.is_branch,
    choices: (r.choices as { id: string; label: string; next_episode_id: string; sort: number; video_url: string | null }[])
      .map((c) => ({ id: c.id, label: c.label, nextEpisodeId: c.next_episode_id, sort: c.sort, videoUrl: mediaUrl(c.video_url) }))
      .sort((a, b) => a.sort - b.sort),
  }))
}

export async function listUnlockedEpisodeIds(): Promise<string[]> {
  if (!supabase) return demo.getUnlocked()
  const rows = must(await supabase.from('episode_unlocks').select('episode_id'))
  return rows.map((r) => r.episode_id)
}

/** Spend tokens to unlock one paid episode (server checks the balance). */
export async function unlockEpisode(episodeId: string): Promise<void> {
  if (!supabase) return demo.unlock(episodeId)
  must(await supabase.rpc('unlock_episode', { p_episode: episodeId }))
}

/** Playable URL, or null if locked (server checks the Pass) or not rendered yet. */
export async function getEpisodeVideoUrl(episodeId: string): Promise<string | null> {
  if (!supabase) return null // demo episodes have no video files yet
  return must(await supabase.rpc('episode_video_url', { p_episode: episodeId }))
}

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return demo.getUser()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  type Row = { id: string; display_name: string; is_subscriber: boolean; invite_code: string }
  const r = must<Row | null>(
    await supabase.from('users').select('id, display_name, is_subscriber, invite_code').eq('id', data.user.id).maybeSingle(),
  )
  return r && { id: r.id, displayName: r.display_name, isSubscriber: r.is_subscriber, inviteCode: r.invite_code }
}

export async function updateDisplayName(displayName: string): Promise<void> {
  if (!supabase) return demo.rename(displayName)
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('not_signed_in')
  must(await supabase.from('users').update({ display_name: displayName }).eq('id', data.user.id))
}

export async function getTokenTransactions(userId: string): Promise<TokenTransaction[]> {
  if (!supabase) return demo.getTransactions()
  const rows = must(
    await supabase
      .from('token_transactions')
      .select('id, delta, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  )
  return rows.map((r) => ({ id: r.id, delta: r.delta, reason: r.reason, createdAt: r.created_at }))
}

// TODO: 'create-checkout' / 'customer-portal' Edge Functions don't exist yet; demo mode simulates them.
/** productId = a PlusPlan.id or TokenPack.id. Stripe Checkout offers Apple Pay / Google Pay / card. */
export async function startCheckout(productId: string): Promise<void> {
  if (!supabase) return demo.checkout(productId)
  const { url } = must(await supabase.functions.invoke<{ url: string }>('create-checkout', { body: { productId } }))
  location.assign(url)
}

export async function cancelSubscription(): Promise<void> {
  if (!supabase) return demo.cancel()
  const { url } = must(await supabase.functions.invoke<{ url: string }>('customer-portal'))
  location.assign(url)
}
