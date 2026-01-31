import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://titpajxqzyjdnmkhzmxs.supabase.co';
const supabaseAnonKey = 'sb_publishable_RTU6HH6jN2u08xb9tdJZkg_PV8ivKiY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
