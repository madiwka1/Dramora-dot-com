import type { Drama } from '../data'

/** Poster background: the real image, or a stable gradient from the slug until posters are generated. */
export function posterStyle(d: Pick<Drama, 'slug' | 'posterUrl'>) {
  if (d.posterUrl) return { backgroundImage: `url("${d.posterUrl}")` }
  let h = 0
  for (const c of d.slug) h = (h * 31 + c.charCodeAt(0)) % 360
  return { backgroundImage: `linear-gradient(160deg, hsl(${h} 65% 38%), hsl(${(h + 50) % 360} 55% 10%))` }
}
