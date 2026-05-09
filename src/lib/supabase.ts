import { createClient } from '@supabase/supabase-js'

// Obtenemos y limpiamos las variables
let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// AUTO-CORRECTOR: Si la URL no empieza con http, se lo agregamos
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`
}

console.log('--- ShiftFlow Connection Status ---');
console.log('URL Base:', supabaseUrl ? 'Detectada' : 'No detectada');
console.log('Protocolo OK:', supabaseUrl.startsWith('https://'));
console.log('----------------------------------');

// Usamos una URL válida por defecto para evitar que el SDK de Supabase crashee la app
const finalUrl = supabaseUrl && supabaseUrl.startsWith('http') 
  ? supabaseUrl 
  : 'https://hjmxciqgzwycrhhlmpzw.supabase.co'; // Tu URL real como respaldo

export const supabase = createClient(finalUrl, supabaseAnonKey || 'placeholder')
