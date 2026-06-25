import { supabase } from './src/config/db.js';

async function testDeleteDirectly() {
    try {
        console.log('Attempting direct delete of MARI BUSCUITS...');
        const { data, error } = await supabase
            .from('inventory')
            .delete()
            .eq('ingredient_name', 'MARI BUSCUITS');
            
        if (error) {
            console.error('Database Error:', error);
        } else {
            console.log('Successfully deleted! Data:', data);
        }
    } catch (e) {
        console.error('Unexpected JS error:', e);
    }
}

testDeleteDirectly();
