import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

const supabaseUrl = config.supabaseUrl;
const supabaseKey = config.supabaseKey;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and Key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
