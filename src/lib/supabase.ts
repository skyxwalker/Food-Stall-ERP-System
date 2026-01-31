import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rpcvkeyjbmajuifpdbrb.supabase.co';
const supabaseAnonKey = 'sb_publishable_cEMQb9FyHJnAskittKoEYQ_I35bvmGL';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
