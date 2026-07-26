import type { DataAdapter } from '../types';
import { LocalAdapter } from './local';
import { SupabaseAdapter } from './supabase';

let adapter: DataAdapter | null = null;

/**
 * Escolhe o backend: Supabase quando as variáveis de ambiente existem,
 * senão localStorage (dá pra rodar o app inteiro sem configurar nada).
 */
export function getAdapter(): DataAdapter {
  if (adapter) return adapter;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  adapter = url && key ? new SupabaseAdapter(url, key) : new LocalAdapter();
  return adapter;
}
