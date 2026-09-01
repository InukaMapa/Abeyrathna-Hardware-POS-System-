import { supabase } from './src/config/db.js';

async function testQuery() {
    try {
        const { data: shift, error } = await supabase
            .from('cash_shifts')
            .select('*')
            .order('shift_id', { ascending: false })
            .limit(1)
            .single();
        console.log('Latest shift:', shift);
    } catch (err) {
        console.error(err);
    }
}
testQuery();
