import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rgvoxxdswabxtsgdnpgx.supabase.co';

// Paste your Supabase publishable key between the quotes.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gZZehNBoqNXU8xxcwJFlZA_ojZb7p_l';

export const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;