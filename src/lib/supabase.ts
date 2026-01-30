import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgiycnneceiwqqopcyki.supabase.co';
const supabaseAnonKey = 'sb_publishable_MBWpKXwJ4qsOyi4SGVhd0Q_828YDP7k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
