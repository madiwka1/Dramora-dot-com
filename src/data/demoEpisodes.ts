// Demo episode content: the single source for src/data/demo.ts AND supabase/seed.sql.
// After editing, regenerate the seed block: `node scripts/seed-episodes.ts` (prints SQL).
export interface DemoEpisode { slug: string; number: number; title: string; synopsis: string; durationSec: number; isBranch?: boolean }

export const demoTags: Record<string, string[]> = {
  'vows-at-midnight': ['Romance', 'Betrayal', 'Wedding', 'Female lead', 'Secrets'],
  'the-glass-crown': ['Rags to riches', 'Inheritance', 'Family feud', 'Female lead', 'Power'],
  'shadow-ledger': ['Thriller', 'Corporate', 'Conspiracy', 'Female lead', 'Suspense'],
  'blood-moon-pact': ['Fantasy', 'Supernatural', 'Forbidden romance', 'Small town', 'Female lead'],
}

const ep = (slug: string, list: [string, string][], durations = [72, 80, 68, 85, 76, 90, 70, 82, 78, 88]): DemoEpisode[] =>
  list.map(([title, synopsis], i) => ({ slug, number: i + 1, title, synopsis, durationSec: durations[i] }))

export const demoEpisodes: DemoEpisode[] = [
  ...ep('vows-at-midnight', [
    ['The Wrong Name', "Ava finalizes the seating chart for the season's biggest wedding and finds her fiancé Lucas printed as the groom."],
    ['The Locked Suite', 'Ava confronts Lucas in the bridal suite, but a knock at the door forces her to hide and listen.'],
    ['The Confession', 'Ava tells Lucas she knows everything. His answer changes what she thought this wedding was about.'],
    ['Rehearsal Dinner', "Smiling through the toasts, Ava notices the bride's father watching Lucas a little too closely."],
    ['Something Borrowed', 'A family heirloom goes missing, and every clue points to the planner.'],
    ["Mia's Secret", "Ava's best friend has been hiding a text thread with Lucas. She swears it isn't what it looks like."],
    ['The Prenup', 'Ava finds the prenup draft, and a clause written for someone who no longer exists.'],
    ['Last Fitting', 'The bride asks Ava one question that proves she knows more than she lets on.'],
    ['Speak Now', 'The officiant asks if anyone objects. The whole room turns toward Ava.'],
    ['Midnight', 'The vows are spoken at midnight, but not by the people anyone expected.'],
  ]),
  // Branch: the "Run before dawn" choice at the end of episode 2 leads here instead of "The Confession".
  { slug: 'vows-at-midnight', number: 3, title: 'The Escape', synopsis: 'Ava slips out before dawn with the guest list and a plan. Mia covers for her, for now.', durationSec: 80, isBranch: true },
  ...ep('the-glass-crown', [
    ['The Will', "A billionaire's will leaves everything to Rosa, the maid who cleaned his penthouse for six years."],
    ['Uninvited Heir', "Victor offers Rosa a check to disappear. She asks why his father didn't trust him."],
    ["The Widow's Tea", 'Celeste invites Rosa to tea and makes a friendly offer that sounds like a threat.'],
    ['Board Meeting', 'Rosa walks into her first board meeting in her uniform. Nobody laughs for long.'],
    ['The Safe', 'A hidden safe in the master suite opens with a code only Rosa would know.'],
    ['Old Photographs', "The safe holds photos of a young woman who looks exactly like Rosa's mother."],
    ["Victor's Deal", 'Victor proposes an alliance against Celeste. Rosa has to decide who is lying more.'],
    ['Fire on 40', 'A fire breaks out on the floor where the original will was stored.'],
    ['The Second Will', 'A lawyer produces a second will, dated the night before the old man died.'],
    ['The Glass Crown', 'Rosa learns what the old man meant by the crown, and why it was always hers.'],
  ]),
  ...ep('shadow-ledger', [
    ['Line 4,018', "Auditor Dana Reyes finds a single transfer that doesn't balance: $4.2 million to nowhere."],
    ['Overtime', 'Dana stays late to trace the money. Someone else in the building stays late too.'],
    ['The Shredder', 'Her printouts vanish overnight. The office shredder is still warm.'],
    ["Partner's Lunch", "The managing partner praises Dana's diligence and suggests she take a vacation."],
    ['Burner Phone', 'An unknown number texts Dana the next line of the ledger.'],
    ['The Witness', 'A former clerk agrees to talk, if Dana meets her alone, at night.'],
    ['Missing', 'The clerk never shows. Her apartment has been cleaned out.'],
    ['Follow the Money', 'The transfers lead to a charity run by a sitting judge.'],
    ['One Number', 'Dana finally sees the pattern: every payment is a date. The next one is tomorrow.'],
    ['No Way Out', "Trapped in the tower with the evidence, Dana makes one call that can't be undone."],
  ]),
  ...ep('blood-moon-pact', [
    ['Night Shift', 'Nurse Nora loses a patient on the night of the blood moon, until a stranger brings him back.'],
    ['The Terms', 'Silas explains the pact: for every life he saves, Nora owes him one night.'],
    ["Sheriff's Questions", "Jude notices the patient's chart was changed. He wants to know who signed it."],
    ['First Night', 'Nora keeps her side of the deal and learns where Silas goes before dawn.'],
    ['Missing Hours', "Townspeople wake up with gaps in their memory. Nora's is one of them."],
    ['Old Records', 'The hospital archive shows the same stranger and the same pact, in 1924.'],
    ["Jude's Warning", 'Jude tells Nora he saw Silas at a crime scene. Nora has to choose who to believe.'],
    ['Blood Moon Rising', 'The second blood moon arrives, and Silas asks for more than a night.'],
    ['Breaking the Pact', 'Nora finds a way to break the deal. It costs a life, maybe hers.'],
    ['Dawn', "At sunrise, someone takes Silas's place in the pact."],
  ]),
]

// 3 options per decision point (episodes 1–9; episode 10 ends the season). Key = episode number, or '3b' for the
// branch episode. A plain label leads to the next episode; [label, key] jumps to a specific one (branching);
// [label, key, video] also plays that clip (a path in public/ / the Storage 'media' bucket) after the choice.
type Option = string | [string, string] | [string, string, string]
export const demoChoices: Record<string, Record<string, Option[]>> = {
  'vows-at-midnight': {
    '1': ['Confront Lucas tonight', 'Tell Mia everything', 'Smile and keep planning'],
    '2': [['Tell Lucas the truth', '3'], ['Run before dawn', '3b'], ['Record their conversation', '3']],
    '3': [['Pretend to accept his deal', '4'], ['Warn the bride', '4'], ['Search his room', '4']],
    '3b': [['Go back to the venue', '4'], ['Call the bride anonymously', '4'], ["Dig into Lucas's past", '4']],
    '4': ["Read Claire's note now", 'Show the note to Mia', 'Follow Claire'],
    '5': ['Grab the pearls from his pocket', 'Stay silent and play along', 'Call Mia for an alibi'],
    '6': ['Forgive Mia', 'Demand the whole truth', 'Use the photo against Lucas'],
    '7': ['Lie to Lucas', 'Run with the folder', 'Tell him you know'],
    '8': ['Agree to object', 'Ask Claire for proof', 'Walk away from it all'],
    '9': ['Let Mia show the proof', 'Call the police', 'Give Lucas one last chance'],
  },
  'the-glass-crown': {
    '1': ['Accept the inheritance', 'Ask for time to think', 'Call the lawyer'],
    '2': ["Refuse Victor's check", 'Take the check and stay', 'Ask what he is hiding'],
    '3': ["Accept Celeste's offer", 'Record the conversation', 'Walk out'],
    '4': ['Fire the CFO', 'Ask Victor for help', 'Stay quiet and observe'],
    '5': ['Open the safe alone', 'Bring Victor', 'Call the police'],
    '6': ['Ask Celeste about the photos', 'Show Victor', 'Keep it secret'],
    '7': ['Ally with Victor', 'Warn Celeste', 'Trust no one'],
    '8': ['Save the documents', 'Save Celeste', 'Chase the arsonist'],
    '9': ['Contest the second will', 'Find the witness', 'Make a deal'],
  },
  'blood-moon-pact': {
    '1': ["Accept the stranger's help", 'Call the doctor', 'Ask his name'],
    '2': ['Agree to the pact', 'Refuse him', 'Tell Jude'],
    '3': ['Lie to Jude', 'Tell Jude everything', 'Change the chart back'],
    '4': ['Follow Silas', 'Stay home', 'Set a trap'],
    '5': ['Check your own memory', 'Ask the townspeople', 'Confront Silas'],
    '6': ['Steal the archive file', 'Ask the old nurse', 'Burn the records'],
    '7': ['Believe Jude', 'Believe Silas', 'Investigate yourself'],
    '8': ['Give him more', 'Refuse', 'Bargain'],
    '9': ['Break the pact', 'Keep the pact', 'Trade places'],
  },
}

/** Normalizes demoChoices into [label, sourceKey, targetKey] rows. */
export function choiceRows(slug: string): { src: string; label: string; dst: string; sort: number; video: string | null }[] {
  return Object.entries(demoChoices[slug] ?? {}).flatMap(([src, options]) =>
    options.map((o, i) => {
      const [label, dst, video] = Array.isArray(o) ? o : [o, String(parseInt(src) + 1)]
      return { src, label, dst, sort: i + 1, video: video ?? null }
    }),
  )
}
