import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** null = no Supabase configured → the data layer serves demo data. */
export const supabase = url && key ? createClient(url, key) : null

/** Unwrap a Supabase result; errors become Error(code) — server RPCs raise short codes (see migration). */
export function must<T>({ data, error }: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (error) throw new Error(error.code === '23505' ? 'taken' : error.message)
  return data as T
}
