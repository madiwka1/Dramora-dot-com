-- Dramora seed: config defaults + demo content. All dramas are original.

insert into public.config (key, value, description) values
  ('tokens.starter',                 '50',   'Tokens every new account starts with'),
  ('tokens.invite_inviter',          '50',   'Tokens the inviter gets when an invited friend activates'),
  ('tokens.invite_friend',           '50',   'Bonus tokens the invited friend gets on activation'),
  ('tokens.paid_referral_bonus',     '200',  'Tokens the inviter gets when an invited friend subscribes'),
  ('tokens.cost_scene',              '10',   'Token cost to generate one scene'),
  ('tokens.cost_episode',            '50',   'Token cost to generate a full episode'),
  ('invites.max_rewarded_per_month', '10',   'Max invites per user per month that earn a reward'),
  ('invites.max_sent_per_day',       '20',   'Max invites a user can send per day'),
  ('invites.activation_rule',        '"vote_or_full_episode"', 'What an invited friend must do to activate the reward'),
  ('paywall.free_episodes',          '6',    'Episodes 1..N of every drama are free; the rest need the Pass'),
  ('room.min_players',               '2',    'Players needed before the host can start a room'),
  ('play.episode_seconds',          '30',   'Play mode: seconds each (fake) episode runs before the next choice'),
  ('play.choice_seconds',           '5',    'Play mode: seconds the player whose turn it is has to pick a scenario (then random)'),
  ('vote.timeout_seconds',           '120',  'Seconds before a room vote closes automatically'),
  ('vote.min_voters',                '1',    'Minimum votes needed to close a vote'),
  ('tokens.cost_unlock_episode',     '60',   'Tokens to unlock one paid episode without Dramora Plus'),
  ('plans.plus', '[
     {"id":"plus_weekly",  "period":"week",  "amountCents":599,   "compareAtCents":1299},
     {"id":"plus_monthly", "period":"month", "amountCents":1499,  "tokens":2200},
     {"id":"plus_yearly",  "period":"year",  "amountCents":10000}
   ]', 'Dramora Plus plans shown on the paywall (display only; Stripe price IDs live in env vars). tokens = granted each period'),
  ('paywall.payment_methods', '["apple-pay","google-pay","paypal","stripe"]',
   'Payment badges under the paywall button (files in public/payments/). Only list methods enabled in Stripe'),
  ('tokens.packs', '[
     {"id":"tokens_starter",  "name":"Starter",  "amountCents":299,  "tokens":300},
     {"id":"tokens_basic",    "name":"Basic",    "amountCents":499,  "tokens":575},
     {"id":"tokens_pro",      "name":"Pro",      "amountCents":1399, "tokens":1820},
     {"id":"tokens_ultimate", "name":"Ultimate", "amountCents":2499, "tokens":3750}
   ]', 'One-time token packs shown on the paywall (display only; Stripe price IDs live in env vars)'),
  ('catalog.new_days',               '14',   'Dramas newer than this many days get the New badge'),
  ('home.top_count',                 '10',   'How many dramas the Top list shows'),
  ('home.hero_rotate_seconds',       '6',    'Seconds between auto-advancing home hero slides'),
  ('legal.company_name',             '"Dramora, Inc."', 'Legal entity name shown in Terms, Privacy and the footer — REPLACE before launch'),
  ('legal.contact_email',            '"support@dramora.example"', 'Support / legal / privacy contact email — REPLACE before launch'),
  ('legal.governing_state',          '"Delaware"', 'State whose law governs the Terms — confirm with your lawyer'),
  ('legal.effective_date',           '"November 15, 2026"', 'Effective date shown on legal pages; update when they change'),
  ('legal.refund_window_days',       '7',    'Days to request a refund for an unintended renewal or unused token pack'),
  ('features.make_mode',             'false', 'Enable the Make (generate a drama) flow'),
  ('features.email_reminders',       'false', 'Enable "your group voted" email reminders');

insert into public.dramas (slug, title, synopsis, genre, cast_members, popularity, is_published, created_at) values
  ('vows-at-midnight', 'Vows at Midnight',
   'A wedding planner discovers her fiancé is marrying someone else — at the wedding she is planning.',
   'Romance',
   '[{"name":"Ava","role":"The Planner","avatarUrl":null},{"name":"Lucas","role":"The Groom","avatarUrl":null},{"name":"Mia","role":"The Best Friend","avatarUrl":null}]',
   98, true, '2026-11-12'),
  ('the-glass-crown', 'The Glass Crown',
   'A hotel maid inherits a billionaire''s empire, and the family that wants it back.', 'Drama', '[]', 91, true, '2026-11-10'),
  ('shadow-ledger', 'Shadow Ledger',
   'An accountant finds one number that doesn''t add up, and someone willing to kill for it.', 'Thriller', '[]', 87, true, '2026-11-06'),
  ('blood-moon-pact', 'Blood Moon Pact',
   'A small-town nurse makes a deal with a stranger who only appears at night.', 'Fantasy', '[]', 84, true, '2026-10-28');

-- Media paths inside the Storage bucket 'media' (upload with: npm run upload-media).
-- Same files live in public/ for demo mode.
update public.dramas
set poster_url = 'posters/vows-at-midnight.jpg', backdrop_url = 'posters/vows-at-midnight-wide.jpg',
    preview_url = 'previews/vows-at-midnight.mp4'
where slug = 'vows-at-midnight';
update public.dramas
set poster_url = 'posters/blood-moon-pact.jpg', backdrop_url = 'posters/blood-moon-pact-wide.jpg'
where slug = 'blood-moon-pact';
update public.dramas
set poster_url = 'posters/the-glass-crown.jpg', backdrop_url = 'posters/the-glass-crown-wide.jpg'
where slug = 'the-glass-crown';
update public.dramas
set poster_url = 'posters/shadow-ledger.jpg', backdrop_url = 'posters/shadow-ledger-wide.jpg'
where slug = 'shadow-ledger';

-- Playable dramas: friends pick a character and vote at cliffhangers. The rest are watch-only.
update public.dramas set is_playable = true where slug = 'vows-at-midnight';
update public.dramas set is_playable = true, cast_members =
  '[{"name":"Rosa","role":"The Maid","avatarUrl":null},{"name":"Victor","role":"The Eldest Son","avatarUrl":null},{"name":"Celeste","role":"The Widow","avatarUrl":null}]'
where slug = 'the-glass-crown';
update public.dramas set is_playable = true, cast_members =
  '[{"name":"Nora","role":"The Nurse","avatarUrl":null},{"name":"Silas","role":"The Stranger","avatarUrl":null},{"name":"Jude","role":"The Sheriff","avatarUrl":null}]'
where slug = 'blood-moon-pact';

-- 10 episodes per drama; Vows at Midnight has one branch point (two alternative episode 3s).
-- Video URLs are added after rendering. Episodes past paywall.free_episodes need the Pass.
-- Generated by scripts/seed-episodes.ts from src/data/demoEpisodes.ts. Do not edit by hand.
update public.dramas set tags = array['Romance', 'Betrayal', 'Wedding', 'Female lead', 'Secrets'] where slug = 'vows-at-midnight';
update public.dramas set tags = array['Rags to riches', 'Inheritance', 'Family feud', 'Female lead', 'Power'] where slug = 'the-glass-crown';
update public.dramas set tags = array['Thriller', 'Corporate', 'Conspiracy', 'Female lead', 'Suspense'] where slug = 'shadow-ledger';
update public.dramas set tags = array['Fantasy', 'Supernatural', 'Forbidden romance', 'Small town', 'Female lead'] where slug = 'blood-moon-pact';

insert into public.episodes (drama_id, number, title, synopsis, duration_sec, is_branch)
select d.id, v.number, v.title, v.synopsis, v.duration_sec, v.is_branch
from public.dramas d join (values
  ('vows-at-midnight', 1, 'The Wrong Name', 'Ava finalizes the seating chart for the season''s biggest wedding and finds her fiancé Lucas printed as the groom.', 72, false),
  ('vows-at-midnight', 2, 'The Locked Suite', 'Ava confronts Lucas in the bridal suite, but a knock at the door forces her to hide and listen.', 80, false),
  ('vows-at-midnight', 3, 'The Confession', 'Ava tells Lucas she knows everything. His answer changes what she thought this wedding was about.', 68, false),
  ('vows-at-midnight', 4, 'Rehearsal Dinner', 'Smiling through the toasts, Ava notices the bride''s father watching Lucas a little too closely.', 85, false),
  ('vows-at-midnight', 5, 'Something Borrowed', 'A family heirloom goes missing, and every clue points to the planner.', 76, false),
  ('vows-at-midnight', 6, 'Mia''s Secret', 'Ava''s best friend has been hiding a text thread with Lucas. She swears it isn''t what it looks like.', 90, false),
  ('vows-at-midnight', 7, 'The Prenup', 'Ava finds the prenup draft, and a clause written for someone who no longer exists.', 70, false),
  ('vows-at-midnight', 8, 'Last Fitting', 'The bride asks Ava one question that proves she knows more than she lets on.', 82, false),
  ('vows-at-midnight', 9, 'Speak Now', 'The officiant asks if anyone objects. The whole room turns toward Ava.', 78, false),
  ('vows-at-midnight', 10, 'Midnight', 'The vows are spoken at midnight, but not by the people anyone expected.', 88, false),
  ('vows-at-midnight', 3, 'The Escape', 'Ava slips out before dawn with the guest list and a plan. Mia covers for her, for now.', 80, true),
  ('the-glass-crown', 1, 'The Will', 'A billionaire''s will leaves everything to Rosa, the maid who cleaned his penthouse for six years.', 72, false),
  ('the-glass-crown', 2, 'Uninvited Heir', 'Victor offers Rosa a check to disappear. She asks why his father didn''t trust him.', 80, false),
  ('the-glass-crown', 3, 'The Widow''s Tea', 'Celeste invites Rosa to tea and makes a friendly offer that sounds like a threat.', 68, false),
  ('the-glass-crown', 4, 'Board Meeting', 'Rosa walks into her first board meeting in her uniform. Nobody laughs for long.', 85, false),
  ('the-glass-crown', 5, 'The Safe', 'A hidden safe in the master suite opens with a code only Rosa would know.', 76, false),
  ('the-glass-crown', 6, 'Old Photographs', 'The safe holds photos of a young woman who looks exactly like Rosa''s mother.', 90, false),
  ('the-glass-crown', 7, 'Victor''s Deal', 'Victor proposes an alliance against Celeste. Rosa has to decide who is lying more.', 70, false),
  ('the-glass-crown', 8, 'Fire on 40', 'A fire breaks out on the floor where the original will was stored.', 82, false),
  ('the-glass-crown', 9, 'The Second Will', 'A lawyer produces a second will, dated the night before the old man died.', 78, false),
  ('the-glass-crown', 10, 'The Glass Crown', 'Rosa learns what the old man meant by the crown, and why it was always hers.', 88, false),
  ('shadow-ledger', 1, 'Line 4,018', 'Auditor Dana Reyes finds a single transfer that doesn''t balance: $4.2 million to nowhere.', 72, false),
  ('shadow-ledger', 2, 'Overtime', 'Dana stays late to trace the money. Someone else in the building stays late too.', 80, false),
  ('shadow-ledger', 3, 'The Shredder', 'Her printouts vanish overnight. The office shredder is still warm.', 68, false),
  ('shadow-ledger', 4, 'Partner''s Lunch', 'The managing partner praises Dana''s diligence and suggests she take a vacation.', 85, false),
  ('shadow-ledger', 5, 'Burner Phone', 'An unknown number texts Dana the next line of the ledger.', 76, false),
  ('shadow-ledger', 6, 'The Witness', 'A former clerk agrees to talk, if Dana meets her alone, at night.', 90, false),
  ('shadow-ledger', 7, 'Missing', 'The clerk never shows. Her apartment has been cleaned out.', 70, false),
  ('shadow-ledger', 8, 'Follow the Money', 'The transfers lead to a charity run by a sitting judge.', 82, false),
  ('shadow-ledger', 9, 'One Number', 'Dana finally sees the pattern: every payment is a date. The next one is tomorrow.', 78, false),
  ('shadow-ledger', 10, 'No Way Out', 'Trapped in the tower with the evidence, Dana makes one call that can''t be undone.', 88, false),
  ('blood-moon-pact', 1, 'Night Shift', 'Nurse Nora loses a patient on the night of the blood moon, until a stranger brings him back.', 72, false),
  ('blood-moon-pact', 2, 'The Terms', 'Silas explains the pact: for every life he saves, Nora owes him one night.', 80, false),
  ('blood-moon-pact', 3, 'Sheriff''s Questions', 'Jude notices the patient''s chart was changed. He wants to know who signed it.', 68, false),
  ('blood-moon-pact', 4, 'First Night', 'Nora keeps her side of the deal and learns where Silas goes before dawn.', 85, false),
  ('blood-moon-pact', 5, 'Missing Hours', 'Townspeople wake up with gaps in their memory. Nora''s is one of them.', 76, false),
  ('blood-moon-pact', 6, 'Old Records', 'The hospital archive shows the same stranger and the same pact, in 1924.', 90, false),
  ('blood-moon-pact', 7, 'Jude''s Warning', 'Jude tells Nora he saw Silas at a crime scene. Nora has to choose who to believe.', 70, false),
  ('blood-moon-pact', 8, 'Blood Moon Rising', 'The second blood moon arrives, and Silas asks for more than a night.', 82, false),
  ('blood-moon-pact', 9, 'Breaking the Pact', 'Nora finds a way to break the deal. It costs a life, maybe hers.', 78, false),
  ('blood-moon-pact', 10, 'Dawn', 'At sunrise, someone takes Silas''s place in the pact.', 88, false)
) as v(slug, number, title, synopsis, duration_sec, is_branch) on v.slug = d.slug;

-- 3 options per decision point; the group (or the player whose turn it is) picks one.
insert into public.choices (episode_id, label, next_episode_id, sort, video_url)
select src.id, v.label, dst.id, v.sort, v.video_url
from (values
  ('vows-at-midnight', 1, false, 'Confront Lucas tonight', 2, false, 1, null::text),
  ('vows-at-midnight', 1, false, 'Tell Mia everything', 2, false, 2, null::text),
  ('vows-at-midnight', 1, false, 'Smile and keep planning', 2, false, 3, null::text),
  ('vows-at-midnight', 2, false, 'Tell Lucas the truth', 3, false, 1, null::text),
  ('vows-at-midnight', 2, false, 'Run before dawn', 3, true, 2, null::text),
  ('vows-at-midnight', 2, false, 'Record their conversation', 3, false, 3, null::text),
  ('vows-at-midnight', 3, false, 'Pretend to accept his deal', 4, false, 1, null::text),
  ('vows-at-midnight', 3, false, 'Warn the bride', 4, false, 2, null::text),
  ('vows-at-midnight', 3, false, 'Search his room', 4, false, 3, null::text),
  ('vows-at-midnight', 4, false, 'Read Claire''s note now', 5, false, 1, null::text),
  ('vows-at-midnight', 4, false, 'Show the note to Mia', 5, false, 2, null::text),
  ('vows-at-midnight', 4, false, 'Follow Claire', 5, false, 3, null::text),
  ('vows-at-midnight', 5, false, 'Grab the pearls from his pocket', 6, false, 1, null::text),
  ('vows-at-midnight', 5, false, 'Stay silent and play along', 6, false, 2, null::text),
  ('vows-at-midnight', 5, false, 'Call Mia for an alibi', 6, false, 3, null::text),
  ('vows-at-midnight', 6, false, 'Forgive Mia', 7, false, 1, null::text),
  ('vows-at-midnight', 6, false, 'Demand the whole truth', 7, false, 2, null::text),
  ('vows-at-midnight', 6, false, 'Use the photo against Lucas', 7, false, 3, null::text),
  ('vows-at-midnight', 7, false, 'Lie to Lucas', 8, false, 1, null::text),
  ('vows-at-midnight', 7, false, 'Run with the folder', 8, false, 2, null::text),
  ('vows-at-midnight', 7, false, 'Tell him you know', 8, false, 3, null::text),
  ('vows-at-midnight', 8, false, 'Agree to object', 9, false, 1, null::text),
  ('vows-at-midnight', 8, false, 'Ask Claire for proof', 9, false, 2, null::text),
  ('vows-at-midnight', 8, false, 'Walk away from it all', 9, false, 3, null::text),
  ('vows-at-midnight', 9, false, 'Let Mia show the proof', 10, false, 1, null::text),
  ('vows-at-midnight', 9, false, 'Call the police', 10, false, 2, null::text),
  ('vows-at-midnight', 9, false, 'Give Lucas one last chance', 10, false, 3, null::text),
  ('vows-at-midnight', 3, true, 'Go back to the venue', 4, false, 1, null::text),
  ('vows-at-midnight', 3, true, 'Call the bride anonymously', 4, false, 2, null::text),
  ('vows-at-midnight', 3, true, 'Dig into Lucas''s past', 4, false, 3, null::text),
  ('the-glass-crown', 1, false, 'Accept the inheritance', 2, false, 1, null::text),
  ('the-glass-crown', 1, false, 'Ask for time to think', 2, false, 2, null::text),
  ('the-glass-crown', 1, false, 'Call the lawyer', 2, false, 3, null::text),
  ('the-glass-crown', 2, false, 'Refuse Victor''s check', 3, false, 1, null::text),
  ('the-glass-crown', 2, false, 'Take the check and stay', 3, false, 2, null::text),
  ('the-glass-crown', 2, false, 'Ask what he is hiding', 3, false, 3, null::text),
  ('the-glass-crown', 3, false, 'Accept Celeste''s offer', 4, false, 1, null::text),
  ('the-glass-crown', 3, false, 'Record the conversation', 4, false, 2, null::text),
  ('the-glass-crown', 3, false, 'Walk out', 4, false, 3, null::text),
  ('the-glass-crown', 4, false, 'Fire the CFO', 5, false, 1, null::text),
  ('the-glass-crown', 4, false, 'Ask Victor for help', 5, false, 2, null::text),
  ('the-glass-crown', 4, false, 'Stay quiet and observe', 5, false, 3, null::text),
  ('the-glass-crown', 5, false, 'Open the safe alone', 6, false, 1, null::text),
  ('the-glass-crown', 5, false, 'Bring Victor', 6, false, 2, null::text),
  ('the-glass-crown', 5, false, 'Call the police', 6, false, 3, null::text),
  ('the-glass-crown', 6, false, 'Ask Celeste about the photos', 7, false, 1, null::text),
  ('the-glass-crown', 6, false, 'Show Victor', 7, false, 2, null::text),
  ('the-glass-crown', 6, false, 'Keep it secret', 7, false, 3, null::text),
  ('the-glass-crown', 7, false, 'Ally with Victor', 8, false, 1, null::text),
  ('the-glass-crown', 7, false, 'Warn Celeste', 8, false, 2, null::text),
  ('the-glass-crown', 7, false, 'Trust no one', 8, false, 3, null::text),
  ('the-glass-crown', 8, false, 'Save the documents', 9, false, 1, null::text),
  ('the-glass-crown', 8, false, 'Save Celeste', 9, false, 2, null::text),
  ('the-glass-crown', 8, false, 'Chase the arsonist', 9, false, 3, null::text),
  ('the-glass-crown', 9, false, 'Contest the second will', 10, false, 1, null::text),
  ('the-glass-crown', 9, false, 'Find the witness', 10, false, 2, null::text),
  ('the-glass-crown', 9, false, 'Make a deal', 10, false, 3, null::text),
  ('blood-moon-pact', 1, false, 'Accept the stranger''s help', 2, false, 1, null::text),
  ('blood-moon-pact', 1, false, 'Call the doctor', 2, false, 2, null::text),
  ('blood-moon-pact', 1, false, 'Ask his name', 2, false, 3, null::text),
  ('blood-moon-pact', 2, false, 'Agree to the pact', 3, false, 1, null::text),
  ('blood-moon-pact', 2, false, 'Refuse him', 3, false, 2, null::text),
  ('blood-moon-pact', 2, false, 'Tell Jude', 3, false, 3, null::text),
  ('blood-moon-pact', 3, false, 'Lie to Jude', 4, false, 1, null::text),
  ('blood-moon-pact', 3, false, 'Tell Jude everything', 4, false, 2, null::text),
  ('blood-moon-pact', 3, false, 'Change the chart back', 4, false, 3, null::text),
  ('blood-moon-pact', 4, false, 'Follow Silas', 5, false, 1, null::text),
  ('blood-moon-pact', 4, false, 'Stay home', 5, false, 2, null::text),
  ('blood-moon-pact', 4, false, 'Set a trap', 5, false, 3, null::text),
  ('blood-moon-pact', 5, false, 'Check your own memory', 6, false, 1, null::text),
  ('blood-moon-pact', 5, false, 'Ask the townspeople', 6, false, 2, null::text),
  ('blood-moon-pact', 5, false, 'Confront Silas', 6, false, 3, null::text),
  ('blood-moon-pact', 6, false, 'Steal the archive file', 7, false, 1, null::text),
  ('blood-moon-pact', 6, false, 'Ask the old nurse', 7, false, 2, null::text),
  ('blood-moon-pact', 6, false, 'Burn the records', 7, false, 3, null::text),
  ('blood-moon-pact', 7, false, 'Believe Jude', 8, false, 1, null::text),
  ('blood-moon-pact', 7, false, 'Believe Silas', 8, false, 2, null::text),
  ('blood-moon-pact', 7, false, 'Investigate yourself', 8, false, 3, null::text),
  ('blood-moon-pact', 8, false, 'Give him more', 9, false, 1, null::text),
  ('blood-moon-pact', 8, false, 'Refuse', 9, false, 2, null::text),
  ('blood-moon-pact', 8, false, 'Bargain', 9, false, 3, null::text),
  ('blood-moon-pact', 9, false, 'Break the pact', 10, false, 1, null::text),
  ('blood-moon-pact', 9, false, 'Keep the pact', 10, false, 2, null::text),
  ('blood-moon-pact', 9, false, 'Trade places', 10, false, 3, null::text)
) as v(slug, src_number, src_branch, label, dst_number, dst_branch, sort, video_url)
join public.dramas d on d.slug = v.slug
join public.episodes src on src.drama_id = d.id and src.number = v.src_number and src.is_branch = v.src_branch
join public.episodes dst on dst.drama_id = d.id and dst.number = v.dst_number and dst.is_branch = v.dst_branch;
