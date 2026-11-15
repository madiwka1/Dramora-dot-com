// In-memory mirror of supabase/seed.sql so the UI runs without a backend.
// Used only when VITE_SUPABASE_* is unset. Delete once Supabase is connected.
import type { Drama, Episode, PlusPlan, TokenPack, TokenTransaction, User } from '.'
import { choiceRows, demoEpisodes, demoTags } from './demoEpisodes'

export const config: Record<string, unknown> = {
  'tokens.starter': 50,
  'tokens.invite_inviter': 50,
  'tokens.invite_friend': 50,
  'tokens.paid_referral_bonus': 200,
  'tokens.cost_scene': 10,
  'tokens.cost_episode': 50,
  'invites.max_rewarded_per_month': 10,
  'invites.max_sent_per_day': 20,
  'invites.activation_rule': 'vote_or_full_episode',
  'paywall.free_episodes': 6,
  'room.min_players': 2,
  'play.episode_seconds': 5, // demo pace; the real default (seed.sql) is 30
  'play.choice_seconds': 5,
  'vote.timeout_seconds': 120,
  'vote.min_voters': 1,
  'tokens.cost_unlock_episode': 60,
  'plans.plus': [
    { id: 'plus_weekly', period: 'week', amountCents: 599, compareAtCents: 1299 },
    { id: 'plus_monthly', period: 'month', amountCents: 1499, tokens: 2200 },
    { id: 'plus_yearly', period: 'year', amountCents: 10000 },
  ] satisfies PlusPlan[],
  'paywall.payment_methods': ['apple-pay', 'google-pay', 'paypal', 'stripe'],
  'tokens.packs': [
    { id: 'tokens_starter', name: 'Starter', amountCents: 299, tokens: 300 },
    { id: 'tokens_basic', name: 'Basic', amountCents: 499, tokens: 575 },
    { id: 'tokens_pro', name: 'Pro', amountCents: 1399, tokens: 1820 },
    { id: 'tokens_ultimate', name: 'Ultimate', amountCents: 2499, tokens: 3750 },
  ] satisfies TokenPack[],
  'catalog.new_days': 14,
  'home.top_count': 10,
  'home.hero_rotate_seconds': 6,
  'legal.company_name': 'Dramora, Inc.', // placeholders — replace before launch
  'legal.contact_email': 'support@dramora.example',
  'legal.governing_state': 'Delaware',
  'legal.effective_date': 'November 15, 2026',
  'legal.refund_window_days': 7,
  'features.make_mode': false,
  'features.email_reminders': false,
}

const d = (slug: string, title: string, synopsis: string, genre: string, popularity: number, createdAt: string): Drama =>
  ({ id: slug, slug, title, synopsis, genre, posterUrl: null, backdropUrl: null, previewUrl: null, cast: [], tags: demoTags[slug] ?? [], popularity, isPlayable: false, createdAt })

export const dramas: Drama[] = [
  {
    ...d('vows-at-midnight', 'Vows at Midnight',
      'A wedding planner discovers her fiancé is marrying someone else — at the wedding she is planning.',
      'Romance', 98, '2026-11-12'),
    posterUrl: '/posters/vows-at-midnight.jpg',
    backdropUrl: '/posters/vows-at-midnight-wide.jpg',
    previewUrl: '/previews/vows-at-midnight.mp4',
    isPlayable: true,
    cast: [
      { name: 'Ava', role: 'The Planner', avatarUrl: null },
      { name: 'Lucas', role: 'The Groom', avatarUrl: null },
      { name: 'Mia', role: 'The Best Friend', avatarUrl: null },
    ],
  },
  {
    ...d('the-glass-crown', 'The Glass Crown', "A hotel maid inherits a billionaire's empire, and the family that wants it back.", 'Drama', 91, '2026-11-10'),
    posterUrl: '/posters/the-glass-crown.jpg',
    backdropUrl: '/posters/the-glass-crown-wide.jpg',
    isPlayable: true,
    cast: [
      { name: 'Rosa', role: 'The Maid', avatarUrl: null },
      { name: 'Victor', role: 'The Eldest Son', avatarUrl: null },
      { name: 'Celeste', role: 'The Widow', avatarUrl: null },
    ],
  },
  {
    ...d('shadow-ledger', 'Shadow Ledger', "An accountant finds one number that doesn't add up, and someone willing to kill for it.", 'Thriller', 87, '2026-11-06'),
    posterUrl: '/posters/shadow-ledger.jpg',
    backdropUrl: '/posters/shadow-ledger-wide.jpg',
  },
  {
    ...d('blood-moon-pact', 'Blood Moon Pact', 'A small-town nurse makes a deal with a stranger who only appears at night.', 'Fantasy', 84, '2026-10-28'),
    posterUrl: '/posters/blood-moon-pact.jpg',
    backdropUrl: '/posters/blood-moon-pact-wide.jpg',
    isPlayable: true,
    cast: [
      { name: 'Nora', role: 'The Nurse', avatarUrl: null },
      { name: 'Silas', role: 'The Stranger', avatarUrl: null },
      { name: 'Jude', role: 'The Sheriff', avatarUrl: null },
    ],
  },
]

export const episodes: Episode[] = demoEpisodes.map((e) => ({
  id: `${e.slug}-${e.number}${e.isBranch ? 'b' : ''}`, dramaId: e.slug, number: e.number, title: e.title,
  synopsis: e.synopsis, durationSec: e.durationSec, isFree: false, isBranch: !!e.isBranch,
  choices: choiceRows(e.slug)
    .filter((c) => c.src === `${e.number}${e.isBranch ? 'b' : ''}`)
    .map((c) => ({ id: `${e.slug}-${c.src}-c${c.sort}`, label: c.label, nextEpisodeId: `${e.slug}-${c.dst}`, sort: c.sort,
      videoUrl: c.video && `/${c.video}` })),
}))

/** One demo identity per browser session (tab); rooms use the same id, so every joiner is a different player. */
export function sessionId(): string {
  let id = sessionStorage.getItem('dramora.memberId')
  if (!id) sessionStorage.setItem('dramora.memberId', (id = crypto.randomUUID()))
  return id
}
const tag = (parseInt(sessionId().replaceAll('-', '').slice(0, 8), 16) % 9000) + 1000 // 1000–9999
let user: User = { id: sessionId(), displayName: `User ${tag}`, isSubscriber: false, inviteCode: `USER${tag}` }
const transactions: TokenTransaction[] = [
  { id: 't2', delta: 50, reason: 'invite_inviter', createdAt: '2026-11-13T18:20:00Z' },
  { id: 't1', delta: 50, reason: 'starter', createdAt: '2026-11-10T09:00:00Z' },
]

export const getUser = (): User => ({ ...user })
export const getTransactions = (): TokenTransaction[] => [...transactions]

function grant(delta: number, reason: string) {
  transactions.unshift({ id: crypto.randomUUID(), delta, reason, createdAt: new Date().toISOString() })
}

export function checkout(productId: string) {
  const plan = (config['plans.plus'] as PlusPlan[]).find((p) => p.id === productId)
  if (plan) {
    user = { ...user, isSubscriber: true }
    if (plan.tokens) grant(plan.tokens, 'subscriber_monthly')
    return
  }
  const pack = (config['tokens.packs'] as TokenPack[]).find((p) => p.id === productId)
  if (!pack) throw new Error('unknown_product')
  grant(pack.tokens, 'token_pack')
}

const unlocked = new Set<string>()
export const getUnlocked = () => [...unlocked]

export function unlock(episodeId: string) {
  if (unlocked.has(episodeId)) return
  const cost = config['tokens.cost_unlock_episode'] as number
  if (transactions.reduce((sum, t) => sum + t.delta, 0) < cost) throw new Error('insufficient_tokens')
  grant(-cost, 'unlock_episode')
  unlocked.add(episodeId)
}

export function rename(displayName: string) {
  user = { ...user, displayName }
}

export function cancel() {
  user = { ...user, isSubscriber: false }
}
