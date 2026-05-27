import { createClient } from '@supabase/supabase-js';

export const NEXT_PUBLIC_SUPABASE_URL = 'https://gzmopuneqebdjnpmpqjc.supabase.co';
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_P20SoQE';

export const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

