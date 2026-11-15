// Uploads public/posters and public/previews to the Supabase Storage bucket "media",
// using the same paths that supabase/seed.sql stores (e.g. posters/vows-at-midnight.jpg).
// Run: npm run upload-media   (reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local)
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key; never ship it to the browser
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')

const supabase = createClient(url, key)
const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4',
}

let failed = 0
for (const folder of ['posters', 'previews']) {
  for (const file of readdirSync(join('public', folder))) {
    const path = `${folder}/${file}`
    const { error } = await supabase.storage
      .from('media')
      .upload(path, readFileSync(join('public', path)), { contentType: contentTypes[extname(file)], upsert: true })
    console.log(error ? `✗ ${path}: ${error.message}` : `✓ ${path}`)
    if (error) failed++
  }
}
process.exit(failed ? 1 : 0)
