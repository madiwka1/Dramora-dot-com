-- Dramora initial schema. Tunable values live in public.config.
-- Guests join rooms through Supabase anonymous sign-in, so every room member has an auth.uid().

-- Config ---------------------------------------------------------------------
create table public.config (
  key         text primary key,
  value       jsonb not null,
  description text not null
);

create function public.cfg_int(p_key text) returns int
language sql stable set search_path = public as $$
  select (value)::int from config where key = p_key
$$;

-- Users: one profile row per signed-up (non-anonymous) auth user ---------------
create table public.users (
  id              uuid primary key references auth.users on delete cascade,
  display_name    text not null default '',
  is_subscriber   boolean not null default false,   -- set only by the Stripe webhook (service role)
  invite_code     text not null unique default substr(md5(gen_random_uuid()::text), 1, 8),
  referred_by     uuid references public.users on delete set null,
  referral_status text not null default 'none'
                  check (referral_status in ('none', 'pending', 'activated', 'paid')),
  created_at      timestamptz not null default now()
);

-- Content ----------------------------------------------------------------------
create table public.dramas (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  synopsis     text not null default '',
  genre        text not null,
  poster_url   text,                                  -- vertical 9:16 poster (cards, feed)
  backdrop_url text,                                  -- wide 16:9 key art (home hero)
  preview_url  text,                                  -- short muted clip that plays when hovering the poster
  cast_members jsonb not null default '[]',          -- [{name, role, avatarUrl}]
  popularity   int not null default 0,                -- ranks the Top list
  is_playable  boolean not null default false,        -- friends can pick characters and vote; otherwise watch-only
  tags         text[] not null default '{}',          -- chips on the watch page
  is_published boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.episodes (
  id           uuid primary key default gen_random_uuid(),
  drama_id     uuid not null references public.dramas on delete cascade,
  number       int not null,                          -- branch episodes share a number
  title        text not null,
  synopsis     text not null default '',
  is_branch    boolean not null default false,        -- reached only through a choice; hidden from the episode grid
  video_url    text,                                  -- never selectable by clients, see episode_video_url()
  duration_sec int not null default 0,
  is_free      boolean not null default false         -- extra free episodes beyond paywall.free_episodes
);
create index on public.episodes (drama_id, number);

create table public.choices (
  id              uuid primary key default gen_random_uuid(),
  episode_id      uuid not null references public.episodes on delete cascade,
  label           text not null,
  next_episode_id uuid not null references public.episodes on delete cascade,
  sort            int not null default 0,
  video_url       text                                -- optional clip played after this choice (Storage 'media' path)
);
create index on public.choices (episode_id);

-- Rooms ------------------------------------------------------------------------
create table public.rooms (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  drama_id           uuid references public.dramas,    -- chosen in the lobby; null until then
  host_id            uuid not null references public.users,
  current_episode_id uuid references public.episodes,
  status             text not null default 'lobby' check (status in ('lobby', 'playing', 'voting', 'ended')),
  phase_started_at   timestamptz,                      -- when the current episode / choice phase began (play timers)
  created_at         timestamptz not null default now()
);

create table public.room_members (
  room_id      uuid not null references public.rooms on delete cascade,
  member_id    uuid not null references auth.users on delete cascade,
  display_name text not null,
  cast_name    text,
  is_guest     boolean not null default true,
  joined_at    timestamptz not null default now(),
  primary key (room_id, member_id),
  unique (room_id, cast_name)                          -- one friend per character
);

create table public.votes (
  room_id    uuid not null,
  episode_id uuid not null references public.episodes,
  member_id  uuid not null,
  choice_id  uuid not null references public.choices,
  created_at timestamptz not null default now(),
  primary key (room_id, episode_id, member_id),      -- one vote per member per episode
  foreign key (room_id, member_id) references public.room_members on delete cascade
);

-- Token ledger (append-only; balance = sum(delta)) -----------------------------
create table public.token_transactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users on delete cascade,
  delta      int not null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index on public.token_transactions (user_id, created_at desc);

-- Episodes a free user unlocked with tokens (Dramora Plus members don't need this).
create table public.episode_unlocks (
  user_id    uuid not null references public.users on delete cascade,
  episode_id uuid not null references public.episodes on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

-- Helpers ----------------------------------------------------------------------
create function public.is_room_member(p_room uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from room_members where room_id = p_room and member_id = auth.uid())
$$;

-- Access rules ----------------------------------------------------
alter table public.config             enable row level security;
alter table public.users              enable row level security;
alter table public.dramas             enable row level security;
alter table public.episodes           enable row level security;
alter table public.choices            enable row level security;
alter table public.rooms              enable row level security;
alter table public.room_members       enable row level security;
alter table public.votes              enable row level security;
alter table public.token_transactions enable row level security;
alter table public.episode_unlocks    enable row level security;

-- Column limits: clients can't read video URLs or change subscription/referral fields.
revoke select on public.episodes from anon, authenticated;
grant select (id, drama_id, number, title, synopsis, is_branch, duration_sec, is_free) on public.episodes to anon, authenticated;
revoke update on public.users from anon, authenticated;
grant update (display_name) on public.users to authenticated;
revoke insert, update, delete on public.rooms, public.room_members from anon, authenticated;  -- lobby changes go through RPCs

create policy config_read     on public.config   for select using (true);
create policy users_read_own  on public.users    for select using (id = auth.uid());
create policy users_edit_own  on public.users    for update using (id = auth.uid());
create policy dramas_read     on public.dramas   for select using (is_published);
create policy episodes_read   on public.episodes for select
  using (exists (select 1 from public.dramas d where d.id = drama_id and d.is_published));
create policy choices_read    on public.choices  for select using (true);

create policy rooms_read   on public.rooms for select using (host_id = auth.uid() or public.is_room_member(id));

create policy members_read on public.room_members for select using (public.is_room_member(room_id));

create policy votes_read on public.votes for select using (public.is_room_member(room_id));
revoke insert, update, delete on public.votes from anon, authenticated;  -- choices go through make_choice()

create policy tokens_read_own on public.token_transactions for select using (user_id = auth.uid());
create policy unlocks_read_own on public.episode_unlocks for select using (user_id = auth.uid());
-- No insert/update/delete policies on token_transactions: only server functions write the ledger.

-- Server functions -------------------------------------------------------------
-- Lobby RPCs raise short error codes; the client maps them to i18n messages (room.errors.*).

create function public.is_playable_drama(p_drama uuid) returns boolean
language sql stable set search_path = public as $$
  select exists (select 1 from dramas where id = p_drama and is_playable and is_published)
$$;

-- Host creates a room (Pass required) and joins it. Returns the share code.
create function public.create_room(p_display_name text, p_drama uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare v_room uuid; v_code text;
begin
  if not exists (select 1 from users where id = auth.uid() and is_subscriber) then raise exception 'pass_required'; end if;
  if p_drama is not null and not is_playable_drama(p_drama) then raise exception 'not_playable'; end if;
  insert into rooms (drama_id, host_id) values (p_drama, auth.uid()) returning id, code into v_room, v_code;
  insert into room_members (room_id, member_id, display_name, is_guest) values (v_room, auth.uid(), p_display_name, false);
  return v_code;
end $$;

-- Join a room by code (guests included, via anonymous sign-in). Rooms aren't readable until you're a member.
create function public.join_room(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_room uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select id into v_room from rooms where code = upper(p_code) and status <> 'ended';
  if v_room is null then raise exception 'room_not_found'; end if;
  insert into room_members (room_id, member_id, display_name, is_guest)
  values (v_room, auth.uid(), p_display_name, coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false))
  on conflict (room_id, member_id) do update set display_name = excluded.display_name;
  return v_room;
end $$;

-- Any member picks the scenario while in the lobby. A new scenario means a new cast, so picks reset.
create function public.set_room_drama(p_room uuid, p_drama uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_status text; v_current uuid;
begin
  if not is_room_member(p_room) then raise exception 'not_member'; end if;
  if not is_playable_drama(p_drama) then raise exception 'not_playable'; end if;
  select status, drama_id into v_status, v_current from rooms where id = p_room for update;
  if v_status <> 'lobby' then raise exception 'room_started'; end if;
  if v_current is not distinct from p_drama then return; end if;
  update rooms set drama_id = p_drama where id = p_room;
  update room_members set cast_name = null where room_id = p_room;
end $$;

-- Each member picks one character from the scenario's cast. unique(room_id, cast_name) blocks doubles.
create function public.pick_character(p_room uuid, p_cast text) returns void
language plpgsql security definer set search_path = public as $$
declare v_drama uuid;
begin
  select drama_id into v_drama from rooms where id = p_room and status = 'lobby';
  if v_drama is null then raise exception 'no_scenario'; end if;
  if not exists (select 1 from dramas d, jsonb_array_elements(d.cast_members) c
                 where d.id = v_drama and c ->> 'name' = p_cast) then
    raise exception 'unknown_character';
  end if;
  update room_members set cast_name = p_cast where room_id = p_room and member_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
end $$;

-- Host starts once enough players joined and everyone has a character.
create function public.start_room(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_drama uuid; v_players int; v_unpicked int;
begin
  select drama_id into v_drama from rooms where id = p_room and status = 'lobby' for update;
  if not found then raise exception 'room_started'; end if;
  if not exists (select 1 from rooms where id = p_room and host_id = auth.uid()) then raise exception 'not_host'; end if;
  if v_drama is null then raise exception 'no_scenario'; end if;
  select count(*), count(*) filter (where cast_name is null) into v_players, v_unpicked
  from room_members where room_id = p_room;
  if v_players < cfg_int('room.min_players') then raise exception 'not_enough_players'; end if;
  if v_unpicked > 0 then raise exception 'characters_missing'; end if;
  update rooms
  set status = 'playing', phase_started_at = now(),
      current_episode_id = (select id from episodes where drama_id = v_drama and not is_branch order by number limit 1)
  where id = p_room;
end $$;

-- Play mode ----------------------------------------------------------------------
-- Each (fake) episode runs play.episode_seconds; then ONE player picks 1 of 3 choices within play.choice_seconds.
-- Turns rotate by join order: episode 1 → first player, episode 2 → second, … (client mirrors this in turns.ts).
create function public.room_chooser(p_room uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_number int; v_count int;
begin
  select e.number into v_number from rooms r join episodes e on e.id = r.current_episode_id where r.id = p_room;
  select count(*) into v_count from room_members where room_id = p_room;
  if v_number is null or v_count = 0 then return null; end if;
  return (select member_id from room_members where room_id = p_room
          order by joined_at, member_id offset (v_number - 1) % v_count limit 1);
end $$;

-- Internal: record the choice and start the next episode.
create function public.apply_choice(p_room uuid, p_episode uuid, p_member uuid, p_choice uuid, p_next uuid) returns void
language sql security definer set search_path = public as $$
  insert into votes (room_id, episode_id, member_id, choice_id) values (p_room, p_episode, p_member, p_choice)
  on conflict do nothing;
  update rooms set current_episode_id = p_next, status = 'playing', phase_started_at = now() where id = p_room;
$$;
revoke execute on function public.apply_choice(uuid, uuid, uuid, uuid, uuid) from public, anon, authenticated;

-- The player whose turn it is picks a scenario.
create function public.make_choice(p_room uuid, p_choice uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rooms; v_next uuid;
begin
  select * into r from rooms where id = p_room for update;
  if r.status is distinct from 'voting' then raise exception 'not_voting'; end if;
  if room_chooser(p_room) is distinct from auth.uid() then raise exception 'not_your_turn'; end if;
  select next_episode_id into v_next from choices where id = p_choice and episode_id = r.current_episode_id;
  if v_next is null then raise exception 'unknown_choice'; end if;
  perform apply_choice(p_room, r.current_episode_id, auth.uid(), p_choice, v_next);
end $$;

-- Any member's client calls this when a timer runs out; the server checks the clock itself.
-- Episode over → choice phase (or 'ended' after the last episode). Choice time over → random pick.
create function public.advance_room(p_room uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rooms; v_choice choices;
begin
  if not is_room_member(p_room) then raise exception 'not_member'; end if;
  select * into r from rooms where id = p_room for update;
  if r.status = 'playing' and now() >= r.phase_started_at + make_interval(secs => cfg_int('play.episode_seconds')) then
    update rooms
    set status = case when exists (select 1 from choices where episode_id = r.current_episode_id) then 'voting' else 'ended' end,
        phase_started_at = now()
    where id = p_room;
  elsif r.status = 'voting' and now() >= r.phase_started_at + make_interval(secs => cfg_int('play.choice_seconds')) then
    select * into v_choice from choices where episode_id = r.current_episode_id order by random() limit 1;
    perform apply_choice(p_room, r.current_episode_id, room_chooser(p_room), v_choice.id, v_choice.next_episode_id);
  end if;
end $$;

-- Video URL only for free episodes or subscribers (paid episodes need Dramora Plus).
create function public.episode_video_url(p_episode uuid) returns text
language sql stable security definer set search_path = public as $$
  select e.video_url from episodes e
  where e.id = p_episode
    and (e.is_free
         or e.number <= cfg_int('paywall.free_episodes')
         or exists (select 1 from users u where u.id = auth.uid() and u.is_subscriber)
         or exists (select 1 from episode_unlocks x where x.user_id = auth.uid() and x.episode_id = e.id))
$$;

create function public.token_balance() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from token_transactions where user_id = auth.uid()
$$;

-- Spend tokens for generation; checks the balance in the same transaction.
create function public.spend_tokens(p_item text) returns int
language plpgsql security definer set search_path = public as $$
declare v_cost int; v_balance int;
begin
  if p_item not in ('scene', 'episode') then raise exception 'unknown item'; end if;
  v_cost := cfg_int('tokens.cost_' || p_item);
  perform 1 from users where id = auth.uid() for update;   -- serialize spends per user
  if not found then raise exception 'not signed in'; end if;
  select coalesce(sum(delta), 0) into v_balance from token_transactions where user_id = auth.uid();
  if v_balance < v_cost then raise exception 'insufficient tokens'; end if;
  insert into token_transactions (user_id, delta, reason) values (auth.uid(), -v_cost, 'spend_' || p_item);
  return v_balance - v_cost;
end $$;

-- Unlock one paid episode with tokens; balance check + spend + unlock in one transaction.
create function public.unlock_episode(p_episode uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_cost int := cfg_int('tokens.cost_unlock_episode'); v_balance int;
begin
  perform 1 from users where id = auth.uid() for update;   -- serialize spends per user
  if not found then raise exception 'not_signed_in'; end if;
  select coalesce(sum(delta), 0) into v_balance from token_transactions where user_id = auth.uid();
  if exists (select 1 from episode_unlocks where user_id = auth.uid() and episode_id = p_episode) then return v_balance; end if;
  if not exists (select 1 from episodes where id = p_episode) then raise exception 'not_found'; end if;
  if v_balance < v_cost then raise exception 'insufficient_tokens'; end if;
  insert into token_transactions (user_id, delta, reason) values (auth.uid(), -v_cost, 'unlock_episode');
  insert into episode_unlocks (user_id, episode_id) values (auth.uid(), p_episode);
  return v_balance - v_cost;
end $$;

-- Create the profile + starter tokens when a real account appears
-- (new signup, or a guest linking an email/Google identity).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_anonymous then return new; end if;
  insert into users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), ''))
  on conflict (id) do nothing;
  if found then
    insert into token_transactions (user_id, delta, reason)
    values (new.id, cfg_int('tokens.starter'), 'starter');
  end if;
  return new;
end $$;

create trigger on_auth_user_ready
  after insert or update of is_anonymous on auth.users
  for each row execute function public.handle_new_user();

-- Storage ----------------------------------------------------------------------
-- media:    posters, wide key art, hover previews. Public read; DB columns hold paths like 'posters/x.jpg'.
-- episodes: full episode videos. Private; served through signed URLs once the player streams from Storage.
-- Uploads use the service role (scripts/upload-media.ts), so no client insert policies.
insert into storage.buckets (id, name, public)
values ('media', 'media', true), ('episodes', 'episodes', false)
on conflict (id) do nothing;

-- Realtime: live presence and vote counts in rooms.
alter publication supabase_realtime add table public.rooms, public.room_members, public.votes;
