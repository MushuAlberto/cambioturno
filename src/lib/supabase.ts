import { createClient } from '@supabase/supabase-js'

// Obtenemos y limpiamos las variables
let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// AUTO-CORRECTOR: Si la URL no empieza con http, se lo agregamos
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`
}

// Fallback si no hay nada en Vercel
const finalUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://hjmxciqgzwycrhhlmpzw.supabase.co';

console.log('--- ShiftFlow Debug ---');
console.log('URL Final usada:', finalUrl);
console.log('Anon Key presente:', !!supabaseAnonKey);
console.log('-----------------------');

export const supabase = createClient(finalUrl, supabaseAnonKey || 'placeholder')
