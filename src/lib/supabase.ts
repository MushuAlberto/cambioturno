import { createClient } from '@supabase/supabase-js'

// Limpiamos posibles espacios en blanco que puedan venir de Vercel/Env
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Registro de diagnóstico (Seguro, no expone llaves)
console.log('--- ShiftFlow Debug ---');
console.log('Supabase URL detectada:', supabaseUrl ? 'SÍ (Formato OK)' : 'NO (Vacía)');
console.log('Supabase Key detectada:', supabaseAnonKey ? 'SÍ (Formato OK)' : 'NO (Vacía)');
console.log('-----------------------');

// Solo inicializamos si tenemos una URL válida que empiece por http
const isValidUrl = supabaseUrl.startsWith('http');

if (!isValidUrl) {
  console.error('CRÍTICO: La URL de Supabase no es válida o está ausente.');
}

export const supabase = createClient(
  isValidUrl ? supabaseUrl : 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)
